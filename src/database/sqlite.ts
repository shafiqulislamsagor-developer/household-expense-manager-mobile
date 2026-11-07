import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';
import {
  PersonalIncome,
  PersonalExpense,
  HouseholdExpense,
  ExpenseRequest,
  Contribution,
  Settlement,
  Category,
  SyncQueueItem,
  SyncEntityType,
  FinancialAccount,
  Person,
  PersonalTransaction,
  AccountTransfer,
} from '../types';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('household_expense.db');
    await dbInstance.execAsync(CREATE_TABLES_SQL);
    try {
      await dbInstance.execAsync(
        'ALTER TABLE household_expenses ADD COLUMN is_post_closing_adjustment INTEGER DEFAULT 0;'
      );
    } catch {}
    try {
      await dbInstance.execAsync(
        'ALTER TABLE household_expenses ADD COLUMN post_closing_notes TEXT;'
      );
    } catch {}
    try {
      await dbInstance.execAsync(
        'ALTER TABLE expense_requests ADD COLUMN is_post_closing_adjustment INTEGER DEFAULT 0;'
      );
    } catch {}
    try {
      await dbInstance.execAsync(
        'ALTER TABLE expense_requests ADD COLUMN post_closing_notes TEXT;'
      );
    } catch {}
  }
  return dbInstance;
}

export class LocalDbService {
  public static async init(): Promise<void> {
    await getDb();
  }

  // ==================== SYNC QUEUE ====================
  public static async enqueueSync(
    clientUuid: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    entityType: SyncEntityType,
    payload: any
  ): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_queue (client_uuid, action, entity_type, payload, client_timestamp, attempts, status)
       VALUES (?, ?, ?, ?, ?, 0, 'PENDING');`,
      [clientUuid, action, entityType, JSON.stringify(payload), Date.now()]
    );
  }

  public static async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM sync_queue 
       WHERE status = 'PENDING' 
          OR (status = 'FAILED' AND attempts < 3 AND error_message NOT LIKE '%ক্লোজ করা হয়েছে%') 
       ORDER BY id ASC;`
    );
    return rows.map((r) => ({
      id: r.id,
      clientUuid: r.client_uuid,
      action: r.action,
      entityType: r.entity_type,
      payload: r.payload,
      clientTimestamp: r.client_timestamp,
      attempts: r.attempts,
      status: r.status,
      errorMessage: r.error_message,
    }));
  }

  public static async markSyncItemCompleted(clientUuid: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `DELETE FROM sync_queue WHERE client_uuid = ?;`,
      [clientUuid]
    );
  }

  public static async markSyncItemFailed(clientUuid: string, error: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE sync_queue SET status = 'FAILED', attempts = attempts + 1, error_message = ? WHERE client_uuid = ?;`,
      [error, clientUuid]
    );
  }

  public static async purgePermanentFailedSyncItems(): Promise<number> {
    const db = await getDb();
    const result = await db.runAsync(
      `DELETE FROM sync_queue 
       WHERE status = 'FAILED' 
         AND (attempts >= 3 OR error_message LIKE '%ক্লোজ করা হয়েছে%');`
    );
    return result.changes;
  }

  // ==================== META ====================
  public static async getMeta(key: string): Promise<string | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM meta WHERE key = ?;`,
      [key]
    );
    return row ? row.value : null;
  }

  public static async setMeta(key: string, value: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?);`,
      [key, value]
    );
  }

  // ==================== PERSONAL INCOMES ====================
  public static async savePersonalIncome(income: PersonalIncome, isSynced = 0): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO personal_incomes (id, user_id, amount_paisa, source, category_id, date, note, client_uuid, is_synced, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        income._id,
        income.userId,
        income.amountPaisa,
        income.source,
        income.categoryId || null,
        income.date,
        income.note || '',
        income.clientUuid || income._id,
        isSynced,
        new Date().toISOString(),
      ]
    );
  }

  public static async getPersonalIncomes(userId: string): Promise<PersonalIncome[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM personal_incomes WHERE user_id = ? ORDER BY date DESC;`,
      [userId]
    );
    return rows.map((r) => ({
      _id: r.id,
      userId: r.user_id,
      amountPaisa: r.amount_paisa,
      source: r.source,
      categoryId: r.category_id,
      date: r.date,
      note: r.note,
      clientUuid: r.client_uuid,
    }));
  }

  public static async deletePersonalIncome(idOrUuid: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `DELETE FROM personal_incomes WHERE id = ? OR client_uuid = ?;`,
      [idOrUuid, idOrUuid]
    );
  }

  // ==================== PERSONAL EXPENSES ====================
  public static async savePersonalExpense(expense: PersonalExpense, isSynced = 0): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO personal_expenses (id, user_id, amount_paisa, title, category_id, date, note, client_uuid, is_synced, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        expense._id,
        expense.userId,
        expense.amountPaisa,
        expense.title,
        expense.categoryId || null,
        expense.date,
        expense.note || '',
        expense.clientUuid || expense._id,
        isSynced,
        new Date().toISOString(),
      ]
    );
  }

  public static async getPersonalExpenses(userId: string): Promise<PersonalExpense[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM personal_expenses WHERE user_id = ? ORDER BY date DESC;`,
      [userId]
    );
    return rows.map((r) => ({
      _id: r.id,
      userId: r.user_id,
      amountPaisa: r.amount_paisa,
      title: r.title,
      categoryId: r.category_id,
      date: r.date,
      note: r.note,
      clientUuid: r.client_uuid,
    }));
  }

  public static async deletePersonalExpense(idOrUuid: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `DELETE FROM personal_expenses WHERE id = ? OR client_uuid = ?;`,
      [idOrUuid, idOrUuid]
    );
  }

  // ==================== HOUSEHOLD EXPENSES ====================
  public static async saveHouseholdExpense(expense: HouseholdExpense, isSynced = 0): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO household_expenses (id, household_id, paid_by_user_id, paid_from_fund, amount_paisa, category_id, title, date, note, split_type, splits_json, approval_status, is_post_closing_adjustment, post_closing_notes, client_uuid, is_synced, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        expense._id,
        expense.householdId,
        expense.paidByUserId || null,
        expense.paidFromFund ? 1 : 0,
        expense.amountPaisa,
        expense.categoryId || null,
        expense.title,
        expense.date,
        expense.note || '',
        expense.splitType || 'EQUAL',
        JSON.stringify(expense.splits || []),
        expense.approvalStatus || 'APPROVED',
        expense.isPostClosingAdjustment ? 1 : 0,
        expense.postClosingNotes || '',
        expense.clientUuid || expense._id,
        isSynced,
        new Date().toISOString(),
      ]
    );
  }

  public static async getHouseholdExpenses(householdId: string): Promise<HouseholdExpense[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM household_expenses WHERE household_id = ? ORDER BY date DESC;`,
      [householdId]
    );
    return rows.map((r) => ({
      _id: r.id,
      householdId: r.household_id,
      paidByUserId: r.paid_by_user_id,
      paidFromFund: !!r.paid_from_fund,
      amountPaisa: r.amount_paisa,
      categoryId: r.category_id,
      title: r.title,
      date: r.date,
      note: r.note,
      splitType: r.split_type,
      splits: r.splits_json ? JSON.parse(r.splits_json) : [],
      approvalStatus: r.approval_status,
      isPostClosingAdjustment: !!r.is_post_closing_adjustment,
      postClosingNotes: r.post_closing_notes,
      clientUuid: r.client_uuid,
    }));
  }

  public static async deleteHouseholdExpense(idOrUuid: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `DELETE FROM household_expenses WHERE id = ? OR client_uuid = ?;`,
      [idOrUuid, idOrUuid]
    );
  }

  // ==================== EXPENSE REQUESTS ====================
  public static async saveExpenseRequest(req: ExpenseRequest, isSynced = 0): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO expense_requests (id, household_id, requested_by_user_id, amount_paisa, category_id, title, date, note, split_type, splits_json, status, rejection_reason, is_post_closing_adjustment, post_closing_notes, client_uuid, is_synced, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        req._id,
        req.householdId,
        req.requestedByUserId,
        req.amountPaisa,
        req.categoryId || null,
        req.title,
        req.date,
        req.note || '',
        req.splitType || 'EQUAL',
        JSON.stringify(req.splits || []),
        req.status || 'PENDING',
        req.rejectionReason || '',
        req.isPostClosingAdjustment ? 1 : 0,
        req.postClosingNotes || '',
        req.clientUuid || req._id,
        isSynced,
        new Date().toISOString(),
      ]
    );
  }

  public static async getExpenseRequests(householdId: string): Promise<ExpenseRequest[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM expense_requests WHERE household_id = ? ORDER BY date DESC;`,
      [householdId]
    );
    return rows.map((r) => ({
      _id: r.id,
      householdId: r.household_id,
      requestedByUserId: r.requested_by_user_id,
      amountPaisa: r.amount_paisa,
      categoryId: r.category_id,
      title: r.title,
      date: r.date,
      note: r.note,
      splitType: r.split_type,
      splits: r.splits_json ? JSON.parse(r.splits_json) : [],
      status: r.status,
      rejectionReason: r.rejection_reason,
      isPostClosingAdjustment: !!r.is_post_closing_adjustment,
      postClosingNotes: r.post_closing_notes,
      clientUuid: r.client_uuid,
    }));
  }

  public static async deleteExpenseRequest(idOrUuid: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `DELETE FROM expense_requests WHERE id = ? OR client_uuid = ?;`,
      [idOrUuid, idOrUuid]
    );
  }

  // ==================== CONTRIBUTIONS ====================
  public static async saveContribution(c: Contribution, isSynced = 0): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO contributions (id, household_id, user_id, amount_paisa, date, payment_method, reference, note, status, client_uuid, is_synced, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        c._id,
        c.householdId,
        c.userId,
        c.amountPaisa,
        c.date,
        c.paymentMethod || 'CASH',
        c.reference || '',
        c.note || '',
        c.status || 'VERIFIED',
        c.clientUuid || c._id,
        isSynced,
        new Date().toISOString(),
      ]
    );
  }

  public static async getContributions(householdId: string): Promise<Contribution[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM contributions WHERE household_id = ? ORDER BY date DESC;`,
      [householdId]
    );
    return rows.map((r) => ({
      _id: r.id,
      householdId: r.household_id,
      userId: r.user_id,
      amountPaisa: r.amount_paisa,
      date: r.date,
      paymentMethod: r.payment_method,
      reference: r.reference,
      note: r.note,
      status: r.status,
      clientUuid: r.client_uuid,
    }));
  }

  public static async deleteContribution(idOrUuid: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `DELETE FROM contributions WHERE id = ? OR client_uuid = ?;`,
      [idOrUuid, idOrUuid]
    );
  }

  // ==================== SETTLEMENTS ====================
  public static async saveSettlement(s: Settlement, isSynced = 0): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO settlements (id, household_id, from_user_id, to_user_id, amount_paisa, date, payment_method, reference, note, status, client_uuid, is_synced, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        s._id,
        s.householdId,
        s.fromUserId,
        s.toUserId || null,
        s.amountPaisa,
        s.date,
        s.paymentMethod || 'CASH',
        s.reference || '',
        s.note || '',
        s.status || 'COMPLETED',
        s.clientUuid || s._id,
        isSynced,
        new Date().toISOString(),
      ]
    );
  }

  public static async getSettlements(householdId: string): Promise<Settlement[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM settlements WHERE household_id = ? ORDER BY date DESC;`,
      [householdId]
    );
    return rows.map((r) => ({
      _id: r.id,
      householdId: r.household_id,
      fromUserId: r.from_user_id,
      toUserId: r.to_user_id,
      amountPaisa: r.amount_paisa,
      date: r.date,
      paymentMethod: r.payment_method,
      reference: r.reference,
      note: r.note,
      status: r.status,
      clientUuid: r.client_uuid,
    }));
  }

  public static async deleteSettlement(idOrUuid: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `DELETE FROM settlements WHERE id = ? OR client_uuid = ?;`,
      [idOrUuid, idOrUuid]
    );
  }

  // ==================== FINANCIAL ACCOUNTS ====================
  public static async upsertFinancialAccount(acc: any, isSynced = 1): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO financial_accounts (
        id, user_id, household_id, name, type, account_number, bank_name,
        opening_balance_paisa, current_balance_paisa, is_archived, notes, client_uuid, is_synced, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        acc._id || acc.id || acc.clientUuid,
        acc.userId || '',
        acc.householdId || null,
        acc.name,
        acc.type,
        acc.accountNumber || '',
        acc.bankName || '',
        acc.openingBalancePaisa || 0,
        acc.currentBalancePaisa || 0,
        acc.isArchived ? 1 : 0,
        acc.notes || '',
        acc.clientUuid || acc._id,
        isSynced,
        new Date().toISOString(),
      ]
    );
  }

  public static async getFinancialAccounts(userId?: string, includeArchived = false): Promise<FinancialAccount[]> {
    const db = await getDb();
    let query = `SELECT * FROM financial_accounts WHERE 1=1`;
    const params: any[] = [];
    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }
    if (!includeArchived) {
      query += ` AND is_archived = 0`;
    }
    query += ` ORDER BY name ASC;`;
    const rows = await db.getAllAsync<any>(query, params);
    return rows.map((r) => ({
      _id: r.id,
      userId: r.user_id,
      householdId: r.household_id,
      name: r.name,
      type: r.type,
      accountNumber: r.account_number,
      bankName: r.bank_name,
      openingBalancePaisa: r.opening_balance_paisa,
      currentBalancePaisa: r.current_balance_paisa,
      isArchived: !!r.is_archived,
      notes: r.notes,
      clientUuid: r.client_uuid,
    }));
  }

  public static async deleteFinancialAccount(idOrUuid: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(`DELETE FROM financial_accounts WHERE id = ? OR client_uuid = ?;`, [idOrUuid, idOrUuid]);
  }

  // ==================== PEOPLE & CONTACTS ====================
  public static async upsertPerson(p: any, isSynced = 1): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO people (
        id, user_id, household_id, name, phone, relationship, address, notes,
        opening_receivable_paisa, opening_payable_paisa, current_receivable_paisa,
        current_payable_paisa, is_archived, client_uuid, is_synced, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        p._id || p.id || p.clientUuid,
        p.userId || '',
        p.householdId || null,
        p.name,
        p.phone || '',
        p.relationship,
        p.address || '',
        p.notes || '',
        p.openingReceivablePaisa || 0,
        p.openingPayablePaisa || 0,
        p.currentReceivablePaisa || 0,
        p.currentPayablePaisa || 0,
        p.isArchived ? 1 : 0,
        p.clientUuid || p._id,
        isSynced,
        new Date().toISOString(),
      ]
    );
  }

  public static async getPeople(userId?: string, includeArchived = false): Promise<Person[]> {
    const db = await getDb();
    let query = `SELECT * FROM people WHERE 1=1`;
    const params: any[] = [];
    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }
    if (!includeArchived) {
      query += ` AND is_archived = 0`;
    }
    query += ` ORDER BY name ASC;`;
    const rows = await db.getAllAsync<any>(query, params);
    return rows.map((r) => ({
      _id: r.id,
      userId: r.user_id,
      householdId: r.household_id,
      name: r.name,
      phone: r.phone,
      relationship: r.relationship,
      address: r.address,
      notes: r.notes,
      openingReceivablePaisa: r.opening_receivable_paisa,
      openingPayablePaisa: r.opening_payable_paisa,
      currentReceivablePaisa: r.current_receivable_paisa,
      currentPayablePaisa: r.current_payable_paisa,
      isArchived: !!r.is_archived,
      clientUuid: r.client_uuid,
    }));
  }

  public static async deletePerson(idOrUuid: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(`DELETE FROM people WHERE id = ? OR client_uuid = ?;`, [idOrUuid, idOrUuid]);
  }

  // ==================== PERSONAL TRANSACTIONS ====================
  public static async upsertPersonalTransaction(tx: any, isSynced = 1): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO personal_transactions (
        id, user_id, household_id, account_id, person_id, direction, flow_type,
        amount_paisa, date, due_date, purpose, description, notes, is_recoverable,
        settled_amount_paisa, status, parent_transaction_id, interest_paisa,
        reversal_reason, client_uuid, is_synced, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        tx._id || tx.id || tx.clientUuid,
        tx.userId || '',
        tx.householdId || null,
        typeof tx.accountId === 'object' ? tx.accountId?._id : tx.accountId,
        typeof tx.personId === 'object' ? tx.personId?._id : tx.personId || null,
        tx.direction,
        tx.flowType,
        tx.amountPaisa || 0,
        tx.date,
        tx.dueDate || null,
        tx.purpose || '',
        tx.description || '',
        tx.notes || '',
        tx.isRecoverable ? 1 : 0,
        tx.settledAmountPaisa || 0,
        tx.status || 'ACTIVE',
        tx.parentTransactionId || null,
        tx.interestPaisa || 0,
        tx.reversalReason || '',
        tx.clientUuid || tx._id,
        isSynced,
        new Date().toISOString(),
      ]
    );
  }

  public static async getPersonalTransactions(userId?: string): Promise<PersonalTransaction[]> {
    const db = await getDb();
    let query = `SELECT * FROM personal_transactions WHERE 1=1`;
    const params: any[] = [];
    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }
    query += ` ORDER BY date DESC;`;
    const rows = await db.getAllAsync<any>(query, params);
    return rows.map((r) => ({
      _id: r.id,
      userId: r.user_id,
      householdId: r.household_id,
      accountId: r.account_id,
      personId: r.person_id,
      direction: r.direction,
      flowType: r.flow_type,
      amountPaisa: r.amount_paisa,
      date: r.date,
      dueDate: r.due_date,
      purpose: r.purpose,
      description: r.description,
      notes: r.notes,
      isRecoverable: !!r.is_recoverable,
      settledAmountPaisa: r.settled_amount_paisa,
      status: r.status,
      parentTransactionId: r.parent_transaction_id,
      interestPaisa: r.interest_paisa,
      reversalReason: r.reversal_reason,
      clientUuid: r.client_uuid,
    }));
  }

  public static async deletePersonalTransaction(idOrUuid: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(`DELETE FROM personal_transactions WHERE id = ? OR client_uuid = ?;`, [idOrUuid, idOrUuid]);
  }

  // ==================== ACCOUNT TRANSFERS ====================
  public static async upsertAccountTransfer(tr: any, isSynced = 1): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO account_transfers (
        id, user_id, household_id, from_account_id, to_account_id, amount_paisa,
        date, notes, is_reversed, reversal_reason, client_uuid, is_synced, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        tr._id || tr.id || tr.clientUuid,
        tr.userId || '',
        tr.householdId || null,
        typeof tr.fromAccountId === 'object' ? tr.fromAccountId?._id : tr.fromAccountId,
        typeof tr.toAccountId === 'object' ? tr.toAccountId?._id : tr.toAccountId,
        tr.amountPaisa || 0,
        tr.date,
        tr.notes || '',
        tr.isReversed ? 1 : 0,
        tr.reversalReason || '',
        tr.clientUuid || tr._id,
        isSynced,
        new Date().toISOString(),
      ]
    );
  }

  public static async getAccountTransfers(userId?: string): Promise<AccountTransfer[]> {
    const db = await getDb();
    let query = `SELECT * FROM account_transfers WHERE 1=1`;
    const params: any[] = [];
    if (userId) {
      query += ` AND user_id = ?`;
      params.push(userId);
    }
    query += ` ORDER BY date DESC;`;
    const rows = await db.getAllAsync<any>(query, params);
    return rows.map((r) => ({
      _id: r.id,
      userId: r.user_id,
      householdId: r.household_id,
      fromAccountId: r.from_account_id,
      toAccountId: r.to_account_id,
      amountPaisa: r.amount_paisa,
      date: r.date,
      notes: r.notes,
      isReversed: !!r.is_reversed,
      reversalReason: r.reversal_reason,
      clientUuid: r.client_uuid,
    }));
  }

  // ==================== CATEGORIES ====================
  public static async saveCategories(cats: Category[]): Promise<void> {
    const db = await getDb();
    for (const c of cats) {
      await db.runAsync(
        `INSERT OR REPLACE INTO categories (id, name_bn, name_en, type, icon, color, is_global)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [c._id, c.nameBn, c.nameEn, c.type, c.icon, c.color, c.isGlobal ? 1 : 0]
      );
    }
  }

  public static async getCategories(): Promise<Category[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(`SELECT * FROM categories ORDER BY name_bn ASC;`);
    return rows.map((r) => ({
      _id: r.id,
      nameBn: r.name_bn,
      nameEn: r.name_en,
      type: r.type,
      icon: r.icon,
      color: r.color,
      isGlobal: !!r.is_global,
    }));
  }

  // ==================== FAMILY FUND TRANSACTIONS ====================
  public static async upsertFamilyFundTransaction(tx: any, isSynced = 1): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO family_fund_transactions (
        id, household_id, date, month, direction, type, amount_paisa,
        payment_method, source_account_id, member_user_id, reference, note,
        verified_by_user_id, client_uuid, is_synced, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        tx._id || tx.id || tx.clientUuid,
        tx.householdId,
        tx.date,
        tx.month,
        tx.direction,
        tx.type,
        tx.amountPaisa,
        tx.paymentMethod || 'CASH',
        tx.sourceAccountId || null,
        typeof tx.memberUserId === 'object' ? tx.memberUserId?._id : tx.memberUserId || null,
        tx.reference || '',
        tx.note || '',
        typeof tx.verifiedByUserId === 'object' ? tx.verifiedByUserId?._id : tx.verifiedByUserId || null,
        tx.clientUuid || tx._id,
        isSynced,
        new Date().toISOString(),
      ]
    );
  }

  public static async getFamilyFundTransactions(householdId: string, month?: string): Promise<any[]> {
    const db = await getDb();
    let query = `SELECT * FROM family_fund_transactions WHERE household_id = ?`;
    const params: any[] = [householdId];
    if (month) {
      query += ` AND month = ?`;
      params.push(month);
    }
    query += ` ORDER BY date DESC;`;
    const rows = await db.getAllAsync<any>(query, params);
    return rows.map((r) => ({
      _id: r.id,
      householdId: r.household_id,
      date: r.date,
      month: r.month,
      direction: r.direction,
      type: r.type,
      amountPaisa: r.amount_paisa,
      paymentMethod: r.payment_method,
      sourceAccountId: r.source_account_id,
      memberUserId: r.member_user_id,
      reference: r.reference,
      note: r.note,
      verifiedByUserId: r.verified_by_user_id,
      clientUuid: r.client_uuid,
    }));
  }
}

