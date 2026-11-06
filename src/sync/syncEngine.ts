import NetInfo, { NetInfoState } from "@react-native-community/netinfo";
import { API_BASE_URL } from "../constants/api";
import { LocalDbService } from "../database/sqlite";
import { ApiClient } from "../services/apiClient";
import { AuthStorage } from "../services/authStorage";

export type SyncStatus = "IDLE" | "SYNCING" | "OFFLINE" | "ERROR";

type SyncListener = (status: SyncStatus, pendingCount: number) => void;

export class SyncEngine {
  private static isRunning = false;
  private static status: SyncStatus = "IDLE";
  private static listeners: Set<SyncListener> = new Set();
  private static unsubscribeNetInfo: (() => void) | null = null;

  public static subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.status, 0);
    return () => this.listeners.delete(listener);
  }

  private static notify(status: SyncStatus, pendingCount = 0) {
    this.status = status;
    this.listeners.forEach((l) => l(status, pendingCount));
  }

  public static async init(): Promise<void> {
    await LocalDbService.init();
    await LocalDbService.purgePermanentFailedSyncItems().catch(() => {});

    // Subscribe to network connectivity changes
    this.unsubscribeNetInfo = NetInfo.addEventListener(
      (state: NetInfoState) => {
        const isOnline = !!(
          state.isConnected && state.isInternetReachable !== false
        );
        if (isOnline) {
          console.log(
            "[SyncEngine] Network reconnected. Triggering automatic background sync...",
          );
          this.syncNow().catch((err) =>
            console.log("[SyncEngine] Auto-sync error:", err),
          );
        } else {
          this.notify("OFFLINE");
        }
      },
    );

    // Check initial network and trigger first sync if online
    const state = await NetInfo.fetch();
    if (state.isConnected) {
      this.syncNow().catch(() => {});
    } else {
      this.notify("OFFLINE");
    }
  }

  public static destroy(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
  }

  public static async isBackendReachable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const healthUrl = API_BASE_URL.replace("/api/v1", "/api/health");
      const res = await fetch(healthUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Main synchronization execution: Push pending local changes, then pull server updates
   */
  public static async syncNow(): Promise<{ pushed: number; pulled: boolean }> {
    if (this.isRunning) {
      return { pushed: 0, pulled: false };
    }

    const token = await AuthStorage.getAccessToken();
    if (!token) {
      // User not logged in, skip network sync
      return { pushed: 0, pulled: false };
    }

    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      this.notify("OFFLINE");
      return { pushed: 0, pulled: false };
    }

    const reachable = await this.isBackendReachable();
    if (!reachable) {
      this.notify("OFFLINE");
      return { pushed: 0, pulled: false };
    }

    this.isRunning = true;
    this.notify("SYNCING");

    let pushedCount = 0;

    try {
      // Clean up any unrecoverable rejected items before push
      await LocalDbService.purgePermanentFailedSyncItems().catch(() => {});

      // ==================== 1. PUSH PHASE ====================
      const pendingItems = await LocalDbService.getPendingSyncItems();

      if (pendingItems.length > 0) {
        const changes = pendingItems.map((item) => ({
          clientUuid: item.clientUuid,
          action: item.action,
          entityType: item.entityType,
          clientTimestamp: item.clientTimestamp,
          payload: JSON.parse(item.payload),
        }));

        const pushResponse = await ApiClient.pushSync(changes);

        if (pushResponse.success && pushResponse.data?.results) {
          for (const res of pushResponse.data.results) {
            if (res.status === "SUCCESS") {
              await LocalDbService.markSyncItemCompleted(res.clientUuid);
              pushedCount++;
            } else {
              const isPermanentRejection =
                res.message?.includes("ক্লোজ করা হয়েছে") ||
                res.message?.includes("অনুমতি নেই") ||
                res.message?.includes("পাওয়া যায়নি");

              if (isPermanentRejection) {
                console.warn(
                  `[SyncEngine] Dropping unresolvable rejected item ${res.clientUuid} (${res.message}). Local record will reconcile via pull.`,
                );
                await LocalDbService.markSyncItemCompleted(res.clientUuid);
              } else {
                await LocalDbService.markSyncItemFailed(
                  res.clientUuid,
                  res.message || "Push sync failed",
                );
              }
            }
          }
        }
      }

      // ==================== 2. PULL PHASE ====================
      const lastSyncedStr = await LocalDbService.getMeta("last_synced_at");
      const lastSyncedAt = lastSyncedStr ? parseInt(lastSyncedStr, 10) : 0;

      const pullResponse = await ApiClient.pullSync(lastSyncedAt);

      if (pullResponse.success && pullResponse.data) {
        const { changes, serverTimestamp } = pullResponse.data;

        // Apply categories
        if (changes.categories && changes.categories.length > 0) {
          await LocalDbService.saveCategories(changes.categories);
        }

        // Apply personal incomes
        if (changes.personalIncomes && changes.personalIncomes.length > 0) {
          for (const inc of changes.personalIncomes) {
            await LocalDbService.savePersonalIncome(inc, 1);
          }
        }

        // Apply personal expenses
        if (changes.personalExpenses && changes.personalExpenses.length > 0) {
          for (const exp of changes.personalExpenses) {
            await LocalDbService.savePersonalExpense(exp, 1);
          }
        }

        // Apply household expenses
        if (changes.householdExpenses && changes.householdExpenses.length > 0) {
          for (const hExp of changes.householdExpenses) {
            await LocalDbService.saveHouseholdExpense(hExp, 1);
          }
        }

        // Apply expense requests (status updates like APPROVED or REJECTED)
        if (changes.expenseRequests && changes.expenseRequests.length > 0) {
          for (const req of changes.expenseRequests) {
            await LocalDbService.saveExpenseRequest(req, 1);
          }
        }

        // Apply contributions
        if (changes.contributions && changes.contributions.length > 0) {
          for (const c of changes.contributions) {
            await LocalDbService.saveContribution(c, 1);
          }
        }

        // Apply settlements
        if (changes.settlements && changes.settlements.length > 0) {
          for (const s of changes.settlements) {
            await LocalDbService.saveSettlement(s, 1);
          }
        }

        // Apply financial accounts
        if (changes.financialAccounts && changes.financialAccounts.length > 0) {
          for (const acc of changes.financialAccounts) {
            await LocalDbService.upsertFinancialAccount(acc, 1);
          }
        }

        // Apply people / contacts
        if (changes.people && changes.people.length > 0) {
          for (const p of changes.people) {
            await LocalDbService.upsertPerson(p, 1);
          }
        }

        // Apply personal transactions
        if (changes.personalTransactions && changes.personalTransactions.length > 0) {
          for (const tx of changes.personalTransactions) {
            await LocalDbService.upsertPersonalTransaction(tx, 1);
          }
        }

        // Apply account transfers
        if (changes.accountTransfers && changes.accountTransfers.length > 0) {
          for (const tr of changes.accountTransfers) {
            await LocalDbService.upsertAccountTransfer(tr, 1);
          }
        }

        // Update last synced timestamp
        await LocalDbService.setMeta("last_synced_at", String(serverTimestamp));
      }

      const remainingPending = await LocalDbService.getPendingSyncItems();
      this.notify("IDLE", remainingPending.length);

      return { pushed: pushedCount, pulled: true };
    } catch (error: any) {
      const isAuthError =
        error?.message?.includes("অবৈধ টোকেন") ||
        error?.message?.includes("মেয়াদ শেষ") ||
        error?.message?.includes("অনুমোদনহীন") ||
        error?.message?.includes("INVALID_TOKEN");

      if (isAuthError) {
        console.warn(
          "[SyncEngine] Auth token is invalid or expired. Clearing stale tokens.",
        );
        await AuthStorage.clearTokens();
        this.notify("OFFLINE", 0);
        return { pushed: pushedCount, pulled: false };
      }

      console.error("[SyncEngine] Sync failed:", error);
      const remainingPending = await LocalDbService.getPendingSyncItems();
      this.notify("ERROR", remainingPending.length);
      return { pushed: pushedCount, pulled: false };
    } finally {
      this.isRunning = false;
    }
  }
}
