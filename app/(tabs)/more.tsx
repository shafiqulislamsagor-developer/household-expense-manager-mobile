import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { BengaliText } from "../../src/components/BengaliText";
import { Header } from "../../src/components/Header";
import { TransactionItem } from "../../src/components/TransactionItem";
import { AmountInput } from "../../src/components/ui/AmountInput";
import { BottomSheet } from "../../src/components/ui/BottomSheet";
import { BudgetCard } from "../../src/components/ui/BudgetCard";
import { ConfirmationModal } from "../../src/components/ui/ConfirmationModal";
import { FinancialSummaryCard } from "../../src/components/ui/FinancialSummaryCard";
import { OfflineBanner } from "../../src/components/ui/OfflineBanner";
import { PrimaryButton } from "../../src/components/ui/PrimaryButton";
import { ProfileAvatar } from "../../src/components/ui/ProfileAvatar";
import { TextInput } from "../../src/components/ui/TextInput";
import { Toggle } from "../../src/components/ui/Toggle";
import { useToast } from "../../src/context/ToastContext";
import { LocalDbService } from "../../src/database/sqlite";
import { ApiClient } from "../../src/services/apiClient";
import { AuthStorage } from "../../src/services/authStorage";
import { AppDispatch, RootState } from "../../src/store";
import { logout, setHasPin } from "../../src/store/authSlice";
import { SyncEngine } from "../../src/sync/syncEngine";
import { useTheme } from "../../src/theme/ThemeContext";
import {
  Contribution,
  FinancialAccount,
  HouseholdExpense,
  MonthlyFinancialStatement,
  Person,
} from "../../src/types";
import { isTransactionMonthClosed } from "../../src/utils/closedMonth";
import { MoneyUtil } from "../../src/utils/money";
import { generateUuid } from "../../src/utils/uuid";

import { ManageAccountsModal } from "../../src/components/accounting/ManageAccountsModal";
import { ManagePeopleModal } from "../../src/components/accounting/ManagePeopleModal";
import { MonthEndStatementModal } from "../../src/components/accounting/MonthEndStatementModal";

interface RecurringBillItem {
  id: string;
  title: string;
  amount: number;
  icon: keyof typeof Ionicons.glyphMap;
  categoryId: string;
}

const DEFAULT_RECURRING_BILLS: RecurringBillItem[] = [
  {
    id: "rent",
    title: "বাড়ি ভাড়া",
    amount: 12000,
    icon: "home-outline",
    categoryId: "rent",
  },
  {
    id: "electricity",
    title: "বিদ্যুৎ বিল",
    amount: 2500,
    icon: "flash-outline",
    categoryId: "utilities",
  },
  {
    id: "wifi",
    title: "ইন্টারনেট / ওয়াইফাই বিল",
    amount: 800,
    icon: "wifi-outline",
    categoryId: "internet",
  },
  {
    id: "maid",
    title: "কাজের বুয়ার বেতন",
    amount: 3000,
    icon: "person-outline",
    categoryId: "other_expense",
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { colors, isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const { user, hasPin } = useSelector((state: RootState) => state.auth);
  const { pendingCount, status: syncStatus } = useSelector(
    (state: RootState) => state.sync,
  );

  const isAdmin = user?.role === "HOME_ADMIN" || user?.role === "SUPER_ADMIN";

  // Contributions List
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [closedMonths, setClosedMonths] = useState<
    Array<{ year: number; month: number }>
  >([]);
  const [showContributionsList, setShowContributionsList] = useState(false);

  // Members List (Admin)
  const [members, setMembers] = useState<any[]>([]);
  const [showMembersList, setShowMembersList] = useState(false);

  // Add Contribution Modal
  const [contributionModal, setContributionModal] = useState(false);
  const [contribTaka, setContribTaka] = useState("");
  const [contribNote, setContribNote] = useState("");
  const [isSubmittingContrib, setIsSubmittingContrib] = useState(false);

  // Edit Contribution Modal
  const [editContribModal, setEditContribModal] = useState(false);
  const [editingContrib, setEditingContrib] = useState<{
    id: string;
    clientUuid?: string;
    amountTaka: string;
    note: string;
    date: string;
  } | null>(null);
  const [isUpdatingContrib, setIsUpdatingContrib] = useState(false);

  // Add Member Modal (Admin)
  const [memberModal, setMemberModal] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberPass, setMemberPass] = useState("");
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  // App Lock PIN Modal
  const [pinModal, setPinModal] = useState(false);
  const [newPin, setNewPin] = useState("");

  // Budget State & Modal
  const [monthlyBudgetTaka, setMonthlyBudgetTaka] = useState("15000");
  const [budgetModal, setBudgetModal] = useState(false);
  const [tempBudgetTaka, setTempBudgetTaka] = useState("15000");

  // Recurring Bills State & Execution
  const [recurringBills, setRecurringBills] = useState<RecurringBillItem[]>(
    DEFAULT_RECURRING_BILLS,
  );
  const [recurringModal, setRecurringModal] = useState(false);

  // Bill Entry Add State
  const [selectedBillToAdd, setSelectedBillToAdd] =
    useState<RecurringBillItem | null>(null);
  const [billTitle, setBillTitle] = useState("");
  const [billTaka, setBillTaka] = useState("");
  const [billNote, setBillNote] = useState("");
  const [billPaidFromFund, setBillPaidFromFund] = useState(true);
  const [isSubmittingBill, setIsSubmittingBill] = useState(false);

  // Add Custom Recurring Bill Modal
  const [addCustomBillModal, setAddCustomBillModal] = useState(false);
  const [customBillTitle, setCustomBillTitle] = useState("");
  const [customBillAmount, setCustomBillAmount] = useState("");

  // Delete Confirm Modal
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [contribToDelete, setContribToDelete] = useState<Contribution | null>(
    null,
  );

  // Logout Confirm Modal
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  // Accounting States
  const [statementModal, setStatementModal] = useState(false);
  const [statement, setStatement] = useState<MonthlyFinancialStatement | null>(
    null,
  );
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [accountsModal, setAccountsModal] = useState(false);
  const [peopleModal, setPeopleModal] = useState(false);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  const myTotalContributions = contributions
    .filter((c) => c.userId === user?.id)
    .reduce((sum, c) => sum + c.amountPaisa, 0);

  const householdTotalContributions = contributions.reduce(
    (sum, c) => sum + c.amountPaisa,
    0,
  );

  const loadContributions = useCallback(async () => {
    if (!user?.householdId) return;
    try {
      const local = await LocalDbService.getContributions(user.householdId);
      setContributions(local);

      try {
        const [res, closedRes, memRes] = await Promise.all([
          ApiClient.listContributions(),
          ApiClient.getClosedMonths(),
          isAdmin
            ? ApiClient.listMembers()
            : Promise.resolve({ success: false, data: [] }),
        ]);

        if (res.success && res.data) {
          setContributions(res.data);
          for (const c of res.data) {
            await LocalDbService.saveContribution(c, 1);
          }
        }
        if (closedRes.success && closedRes.data) {
          setClosedMonths(closedRes.data);
        }
        if (memRes?.success && Array.isArray(memRes.data)) {
          setMembers(memRes.data);
        }

        const [accRes, peopleRes] = await Promise.all([
          ApiClient.getAccounts(),
          ApiClient.getPeople(),
        ]);
        if (accRes?.success && Array.isArray(accRes.data))
          setAccounts(accRes.data);
        if (peopleRes?.success && Array.isArray(peopleRes.data))
          setPeople(peopleRes.data);
      } catch {}
    } catch (err) {
      console.error("Load contributions error:", err);
    }
  }, [user, isAdmin]);

  const handleOpenStatement = async () => {
    setLoadingStatement(true);
    try {
      const now = new Date();
      const res = await ApiClient.getMonthlyStatement(
        now.getFullYear(),
        now.getMonth() + 1,
      );
      if (res.success && res.data) {
        setStatement(res.data);
        setStatementModal(true);
      } else {
        showToast({ type: "error", message: "বিবরণী লোড করা সম্ভব হয়নি।" });
      }
    } catch (err: any) {
      showToast({
        type: "error",
        message: err.message || "বিবরণী লোড করা সম্ভব হয়নি।",
      });
    } finally {
      setLoadingStatement(false);
    }
  };

  const handleCreateAccount = async (data: {
    name: string;
    type: "CASH" | "BANK" | "MOBILE_BANKING" | "SAVINGS" | "OTHER";
    accountNumber?: string;
    bankName?: string;
    openingBalanceTaka: string;
    notes?: string;
  }) => {
    try {
      const clientUuid = generateUuid();
      const openingPaisa = data.openingBalanceTaka
        ? MoneyUtil.takaToPaisa(parseFloat(data.openingBalanceTaka))
        : 0;

      await ApiClient.createAccount({
        name: data.name,
        type: data.type,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        openingBalancePaisa: openingPaisa,
        notes: data.notes,
        clientUuid,
      });

      showToast({
        type: "success",
        message: `'${data.name}' অ্যাকাউন্ট সফলভাবে যুক্ত হয়েছে।`,
      });
      await loadContributions();
    } catch (err: any) {
      showToast({
        type: "error",
        message: err.message || "অ্যাকাউন্ট যুক্ত করা যায়নি।",
      });
    }
  };

  const handleCreatePerson = async (data: {
    name: string;
    phone?: string;
    relationship: any;
    address?: string;
    notes?: string;
    openingReceivableTaka?: string;
    openingPayableTaka?: string;
  }) => {
    try {
      const clientUuid = generateUuid();
      const openingRec = data.openingReceivableTaka
        ? MoneyUtil.takaToPaisa(parseFloat(data.openingReceivableTaka))
        : 0;
      const openingPay = data.openingPayableTaka
        ? MoneyUtil.takaToPaisa(parseFloat(data.openingPayableTaka))
        : 0;

      await ApiClient.createPerson({
        name: data.name,
        phone: data.phone,
        relationship: data.relationship,
        address: data.address,
        notes: data.notes,
        openingReceivablePaisa: openingRec,
        openingPayablePaisa: openingPay,
        clientUuid,
      });

      showToast({
        type: "success",
        message: `'${data.name}' সফলভাবে পরিচিতজন হিসেবে যুক্ত হয়েছে।`,
      });
      await loadContributions();
    } catch (err: any) {
      showToast({
        type: "error",
        message: err.message || "ব্যক্তি যুক্ত করা যায়নি।",
      });
    }
  };

  useEffect(() => {
    loadContributions();
  }, [loadContributions]);

  const handleAddContribution = async () => {
    const takaNum = parseFloat(contribTaka);
    if (isNaN(takaNum) || takaNum <= 0) {
      showToast({ type: "error", message: "সঠিক টাকার পরিমাণ দিন।" });
      return;
    }

    const currentDate = new Date().toISOString();
    if (isTransactionMonthClosed(currentDate, closedMonths)) {
      showToast({
        type: "warning",
        message:
          "চলতি মাসের হিসাব ক্লোজ করা হয়েছে। নতুন চাঁদা যুক্ত করা সম্ভব নয়।",
      });
      return;
    }

    setIsSubmittingContrib(true);
    try {
      const paisa = MoneyUtil.takaToPaisa(takaNum);
      const clientUuid = generateUuid();

      const newContrib: Contribution = {
        _id: clientUuid,
        householdId: user!.householdId!,
        userId: user!.id,
        amountPaisa: paisa,
        date: currentDate,
        paymentMethod: "CASH",
        note: contribNote.trim() || undefined,
        status: "VERIFIED",
        clientUuid,
      };

      await LocalDbService.saveContribution(newContrib, 0);
      await LocalDbService.enqueueSync(
        clientUuid,
        "CREATE",
        "CONTRIBUTION",
        newContrib,
      );

      try {
        await ApiClient.addContribution({
          amountPaisa: newContrib.amountPaisa,
          paymentMethod: newContrib.paymentMethod,
          note: newContrib.note,
          clientUuid,
        });
      } catch {}

      SyncEngine.syncNow().catch(() => {});
      showToast({
        type: "success",
        message: `${MoneyUtil.formatBengaliCurrency(paisa)} চাঁদা সফলভাবে জমা হয়েছে।`,
      });

      setContributionModal(false);
      setContribTaka("");
      setContribNote("");
      await loadContributions();
    } catch (err: any) {
      showToast({
        type: "error",
        message: err.message || "চাঁদা যুক্ত করা যায়নি।",
      });
    } finally {
      setIsSubmittingContrib(false);
    }
  };

  const openEditContribModal = (item: Contribution) => {
    if (isTransactionMonthClosed(item.date, closedMonths)) {
      showToast({
        type: "warning",
        message:
          "এই মাসের পারিবারিক হিসাব ক্লোজ করা হয়েছে, পরিবর্তন সম্ভব নয়।",
      });
      return;
    }

    setEditingContrib({
      id: item._id,
      clientUuid: item.clientUuid,
      amountTaka: MoneyUtil.paisaToTaka(item.amountPaisa).toString(),
      note: item.note || "",
      date: item.date,
    });
    setEditContribModal(true);
  };

  const handleUpdateContribution = async () => {
    if (!editingContrib) return;
    const takaNum = parseFloat(editingContrib.amountTaka);
    if (isNaN(takaNum) || takaNum <= 0) {
      showToast({ type: "error", message: "সঠিক টাকার পরিমাণ দিন।" });
      return;
    }

    if (isTransactionMonthClosed(editingContrib.date, closedMonths)) {
      showToast({
        type: "warning",
        message:
          "এই মাসের পারিবারিক হিসাব ক্লোজ করা হয়েছে, পরিবর্তন সম্ভব নয়।",
      });
      return;
    }

    setIsUpdatingContrib(true);
    try {
      const paisa = MoneyUtil.takaToPaisa(takaNum);
      const uuid = editingContrib.clientUuid || editingContrib.id;

      const updatedContrib: Contribution = {
        _id: editingContrib.id,
        householdId: user!.householdId!,
        userId: user!.id,
        amountPaisa: paisa,
        date: editingContrib.date,
        paymentMethod: "CASH",
        note: editingContrib.note.trim() || undefined,
        status: "VERIFIED",
        clientUuid: uuid,
      };

      await LocalDbService.saveContribution(updatedContrib, 0);
      await LocalDbService.enqueueSync(
        uuid,
        "UPDATE",
        "CONTRIBUTION",
        updatedContrib,
      );

      try {
        await ApiClient.updateContribution(editingContrib.id, {
          amountPaisa: updatedContrib.amountPaisa,
          note: updatedContrib.note,
        });
      } catch {}

      SyncEngine.syncNow().catch(() => {});
      showToast({ type: "success", message: "চাঁদার হিসাব আপডেট করা হয়েছে।" });
      setEditContribModal(false);
      setEditingContrib(null);
      await loadContributions();
    } catch (err: any) {
      showToast({ type: "error", message: err.message || "আপডেট করা যায়নি।" });
    } finally {
      setIsUpdatingContrib(false);
    }
  };

  const confirmDeleteContrib = (item: Contribution) => {
    if (isTransactionMonthClosed(item.date, closedMonths)) {
      showToast({
        type: "warning",
        message: "এই মাসের পারিবারিক হিসাব ক্লোজ করা হয়েছে, ডিলিট সম্ভব নয়।",
      });
      return;
    }
    setContribToDelete(item);
    setDeleteConfirmVisible(true);
  };

  const executeDeleteContrib = async () => {
    if (!contribToDelete) return;
    try {
      const uuid = contribToDelete.clientUuid || contribToDelete._id;
      await LocalDbService.deleteContribution(contribToDelete._id);
      await LocalDbService.enqueueSync(uuid, "DELETE", "CONTRIBUTION", {
        id: contribToDelete._id,
      });

      try {
        await ApiClient.deleteContribution(contribToDelete._id);
      } catch {}

      SyncEngine.syncNow().catch(() => {});
      showToast({ type: "success", message: "চাঁদার হিসাব মুছে ফেলা হয়েছে।" });
      setDeleteConfirmVisible(false);
      setContribToDelete(null);
      await loadContributions();
    } catch (err: any) {
      showToast({ type: "error", message: err.message || "মুছে ফেলা যায়নি।" });
    }
  };

  const handleAddMember = async () => {
    if (!memberName.trim() || !memberPhone.trim() || !memberPass.trim()) {
      showToast({ type: "error", message: "সকল প্রয়োজনীয় তথ্য পূরণ করুন।" });
      return;
    }

    setIsSubmittingMember(true);
    try {
      await ApiClient.addMember({
        name: memberName.trim(),
        phone: memberPhone.trim(),
        password: memberPass.trim(),
      });

      showToast({
        type: "success",
        message: `নতুন সদস্য ${memberName} সফলভাবে পরিবারে যুক্ত হয়েছে।`,
      });

      setMemberModal(false);
      setMemberName("");
      setMemberPhone("");
      setMemberPass("");
      await loadContributions();
    } catch (err: any) {
      showToast({
        type: "error",
        message: err.message || "সদস্য যোগ করা যায়নি।",
      });
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleSavePin = async () => {
    if (newPin.length !== 4) {
      showToast({
        type: "error",
        message: "পিন কোড অবশ্যই ৪ সংখ্যার হতে হবে।",
      });
      return;
    }

    await AuthStorage.setAppPin(newPin);
    dispatch(setHasPin(true));
    showToast({ type: "success", message: "অ্যাপ লক পিন সক্রিয় করা হয়েছে।" });
    setPinModal(false);
    setNewPin("");
  };

  const handleRemovePin = async () => {
    await AuthStorage.removeAppPin();
    dispatch(setHasPin(false));
    showToast({ type: "info", message: "অ্যাপ লক পিন অপসারণ করা হয়েছে।" });
  };

  const handleSaveBudget = () => {
    const num = parseFloat(tempBudgetTaka);
    if (isNaN(num) || num <= 0) {
      showToast({ type: "error", message: "সঠিক বাজেট টাকার পরিমাণ দিন।" });
      return;
    }
    setMonthlyBudgetTaka(tempBudgetTaka);
    setBudgetModal(false);
    showToast({
      type: "success",
      message: `চলতি মাসের বাজেট ${MoneyUtil.formatBengaliCurrency(MoneyUtil.takaToPaisa(num))} নির্ধারিত হয়েছে।`,
    });
  };

  useEffect(() => {
    async function loadSavedBills() {
      try {
        const stored = await LocalDbService.getMeta(
          "household_recurring_bills",
        );
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRecurringBills(parsed);
          }
        }
      } catch {}
    }
    loadSavedBills();
  }, []);

  const handleSelectBillToExecute = (bill: RecurringBillItem) => {
    setSelectedBillToAdd(bill);
    setBillTitle(bill.title);
    setBillTaka(bill.amount.toString());
    setBillNote(`${bill.title} বাবদ খরচ`);
    setBillPaidFromFund(true);
  };

  const handleConfirmAddBill = async () => {
    if (!user?.householdId) {
      showToast({ type: "error", message: "পরিবারের তথ্য পাওয়া যায়নি।" });
      return;
    }
    const num = parseFloat(billTaka);
    if (isNaN(num) || num <= 0) {
      showToast({ type: "error", message: "সঠিক টাকার পরিমাণ দিন।" });
      return;
    }
    if (!billTitle.trim()) {
      showToast({ type: "error", message: "বিলের নাম দিন।" });
      return;
    }

    const now = new Date().toISOString();
    if (isTransactionMonthClosed(now, closedMonths)) {
      showToast({
        type: "warning",
        message:
          "চলতি মাসের পারিবারিক হিসাব ইতিমধ্যে ক্লোজ করা হয়েছে। নতুন বিল যুক্ত করা সম্ভব নয়।",
      });
      return;
    }

    setIsSubmittingBill(true);
    try {
      const paisa = MoneyUtil.takaToPaisa(num);
      const clientUuid = generateUuid();

      if (isAdmin) {
        // Create actual approved HouseholdExpense
        const newExpense: HouseholdExpense = {
          _id: clientUuid,
          householdId: user.householdId,
          paidByUserId: billPaidFromFund ? null : user.id,
          paidFromFund: billPaidFromFund,
          amountPaisa: paisa,
          categoryId: selectedBillToAdd?.categoryId || "utilities",
          title: billTitle.trim(),
          date: now,
          note: billNote.trim() || undefined,
          splitType: "EQUAL",
          splits: [],
          approvalStatus: "APPROVED",
          clientUuid,
        };

        await LocalDbService.saveHouseholdExpense(newExpense, 0);
        await LocalDbService.enqueueSync(
          clientUuid,
          "CREATE",
          "HOUSEHOLD_EXPENSE",
          newExpense,
        );

        try {
          await ApiClient.createHouseholdExpense({
            title: newExpense.title,
            amountPaisa: newExpense.amountPaisa,
            paidFromFund: newExpense.paidFromFund,
            paidByUserId: newExpense.paidByUserId,
            categoryId: newExpense.categoryId,
            note: newExpense.note,
            clientUuid,
          });
        } catch {}

        SyncEngine.syncNow().catch(() => {});
        showToast({
          type: "success",
          message: `${billTitle} (${MoneyUtil.formatBengaliCurrency(paisa)}) সফলভাবে পারিবারিক খরচে যুক্ত হয়েছে!`,
        });
      } else {
        // Regular member creates an ExpenseRequest
        await ApiClient.submitExpenseRequest({
          title: billTitle.trim(),
          amountPaisa: paisa,
          categoryId: selectedBillToAdd?.categoryId || "utilities",
          note: billNote.trim() || undefined,
          paidFromFund: billPaidFromFund,
          clientUuid,
        });
        SyncEngine.syncNow().catch(() => {});
        showToast({
          type: "success",
          message: `${billTitle} খরচের আবেদন অনুমোদনের জন্য জমা দেওয়া হয়েছে!`,
        });
      }

      setRecurringModal(false);
      setSelectedBillToAdd(null);
      await loadContributions();
    } catch (err: any) {
      showToast({
        type: "error",
        message: err.message || "বিল এন্ট্রি যুক্ত করা যায়নি।",
      });
    } finally {
      setIsSubmittingBill(false);
    }
  };

  const handleSaveCustomRecurringBill = async () => {
    if (!customBillTitle.trim()) {
      showToast({ type: "error", message: "বিলের নাম দিন।" });
      return;
    }
    const num = parseFloat(customBillAmount);
    if (isNaN(num) || num <= 0) {
      showToast({ type: "error", message: "সঠিক অনুমানিত টাকার পরিমাণ দিন।" });
      return;
    }

    const newBill: RecurringBillItem = {
      id: generateUuid(),
      title: customBillTitle.trim(),
      amount: num,
      icon: "receipt-outline",
      categoryId: "utilities",
    };

    const updated = [...recurringBills, newBill];
    setRecurringBills(updated);
    await LocalDbService.setMeta(
      "household_recurring_bills",
      JSON.stringify(updated),
    );
    showToast({
      type: "success",
      message: `নতুন বিল '${newBill.title}' সংরক্ষিত হয়েছে!`,
    });
    setCustomBillTitle("");
    setCustomBillAmount("");
    setAddCustomBillModal(false);
  };

  const handleDeleteRecurringBill = async (id: string, title: string) => {
    const updated = recurringBills.filter((b) => b.id !== id);
    setRecurringBills(updated);
    await LocalDbService.setMeta(
      "household_recurring_bills",
      JSON.stringify(updated),
    );
    showToast({
      type: "info",
      message: `'${title}' বিল তালিকা থেকে মুছে ফেলা হয়েছে।`,
    });
  };

  const handleLogout = async () => {
    await AuthStorage.clearTokens();
    dispatch(logout());
    router.replace("/login");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title="অন্যান্য ও সেটিংস"
        subtitle="প্রোফাইল, কমন ফান্ড, বাজেট ও নিরাপত্তা"
      />

      <OfflineBanner />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 60 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <View
          style={[
            styles.profileCard,
            {
              backgroundColor: isDark ? colors.surface : colors.surface,
              borderColor: isDark ? colors.borderStrong : colors.border,
            },
          ]}
        >
          <ProfileAvatar
            name={user?.name || "ব্যবহারকারী"}
            role={user?.role}
            size="lg"
            showRoleBadge
          />
          <View style={styles.profileInfo}>
            <BengaliText variant="h2" color={colors.text} weight="700">
              {user?.name || "ব্যবহারকারী"}
            </BengaliText>
            <BengaliText
              variant="caption"
              color={colors.textMuted}
              style={{ marginTop: 2 }}
            >
              ফোন: {MoneyUtil.toBengaliNumber(user?.phone || "")}
            </BengaliText>

            <View style={styles.roleBadgeRow}>
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: isDark
                      ? `${colors.primary}25`
                      : colors.primaryLight,
                  },
                ]}
              >
                <BengaliText
                  variant="caption"
                  color={colors.primary}
                  weight="700"
                >
                  {user?.role === "SUPER_ADMIN"
                    ? "👑 সুপার অ্যাডমিন"
                    : user?.role === "HOME_ADMIN"
                      ? "⭐ পরিবার অ্যাডমিন"
                      : "👤 পরিবার সদস্য"}
                </BengaliText>
              </View>

              {user?.householdName && (
                <View
                  style={[
                    styles.roleBadge,
                    {
                      backgroundColor: isDark
                        ? colors.surfaceSubdued
                        : colors.secondaryLight,
                      marginLeft: 6,
                    },
                  ]}
                >
                  <BengaliText
                    variant="caption"
                    color={colors.textSecondary}
                    weight="700"
                  >
                    🏠 {user.householdName}
                  </BengaliText>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Super Admin Jump Section */}
        {user?.role === "SUPER_ADMIN" && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/super-admin")}
            style={[
              styles.superAdminCard,
              {
                backgroundColor: isDark ? "#111C2D" : "#0F2942",
                borderColor: colors.primary,
              },
            ]}
          >
            <View style={styles.superAdminIconCircle}>
              <Ionicons name="shield-checkmark" size={24} color="#34D399" />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color="#FFFFFF">
                সুপার অ্যাডমিন কেন্দ্রীয় কনসোল
              </BengaliText>
              <BengaliText variant="caption" color="#93C5FD">
                সকল পরিবার পরিচালনা, ইউজার পাসওয়ার্ড রিসেট ও অডিট লগ
              </BengaliText>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#93C5FD" />
          </TouchableOpacity>
        )}

        {/* Common Fund Summary Cards */}
        <View style={styles.section}>
          <BengaliText
            variant="caption"
            color={colors.textMuted}
            weight="700"
            style={styles.sectionTitle}
          >
            কমন ফান্ড সারসংক্ষেপ
          </BengaliText>
          <View style={styles.metricsRow}>
            <FinancialSummaryCard
              title="আমার মোট জমা"
              amountPaisa={myTotalContributions}
              icon="wallet"
              variant="income"
              style={{ flex: 1, marginRight: 6 }}
            />
            <FinancialSummaryCard
              title="পরিবারের মোট ফান্ড"
              amountPaisa={householdTotalContributions}
              icon="cash"
              variant="hero"
              style={{ flex: 1, marginLeft: 6 }}
            />
          </View>
        </View>

        {/* Common Fund Actions */}
        <View
          style={[
            styles.menuGroup,
            {
              backgroundColor: isDark ? colors.surface : colors.surface,
              borderColor: isDark ? colors.borderStrong : colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setContributionModal(true)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: colors.accentLight },
              ]}
            >
              <Ionicons name="wallet-outline" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                কমন ফান্ডে চাঁদা প্রদান
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                পারিবারিক জরুরি ফান্ডে টাকা জমা করুন
              </BengaliText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.menuDivider,
              { backgroundColor: colors.borderLight },
            ]}
          />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowContributionsList(!showContributionsList)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons
                name="receipt-outline"
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                জমাকৃত চাঁদার তালিকা (
                {MoneyUtil.toBengaliNumber(contributions.length)})
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                চাঁদা এডিট ও ডিলিট ব্যবস্থাপনা
              </BengaliText>
            </View>
            <Ionicons
              name={showContributionsList ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>

          {showContributionsList && (
            <View style={styles.nestedContainer}>
              {contributions.length === 0 ? (
                <BengaliText
                  variant="caption"
                  color={colors.textMuted}
                  align="center"
                  style={{ padding: 12 }}
                >
                  এখনও কোনো চাঁদা জমা হয়নি।
                </BengaliText>
              ) : (
                contributions.map((c) => (
                  <TransactionItem
                    key={c._id || c.clientUuid}
                    title={`চাঁদা: ${c.note || "নগদ জমা"}`}
                    date={c.date}
                    amountPaisa={c.amountPaisa}
                    type="INCOME"
                    category="চাঁদা"
                    isLocked={isTransactionMonthClosed(c.date, closedMonths)}
                    onEdit={() => openEditContribModal(c)}
                    onDelete={() => confirmDeleteContrib(c)}
                  />
                ))
              )}
            </View>
          )}

          {/* Member Management for Admin */}
          {isAdmin && (
            <>
              <View
                style={[
                  styles.menuDivider,
                  { backgroundColor: colors.borderLight },
                ]}
              />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setShowMembersList(!showMembersList)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.menuIconCircle,
                    { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <BengaliText variant="bodyBold" color={colors.text}>
                    পরিবারের সদস্যদের তালিকা (
                    {MoneyUtil.toBengaliNumber(members.length)})
                  </BengaliText>
                  <BengaliText variant="caption" color={colors.textMuted}>
                    সদস্যদের বিবরণ ও সক্রিয় স্ট্যাটাস
                  </BengaliText>
                </View>
                <Ionicons
                  name={showMembersList ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textLight}
                />
              </TouchableOpacity>

              {showMembersList && (
                <View style={styles.nestedContainer}>
                  {members.length === 0 ? (
                    <BengaliText
                      variant="caption"
                      color={colors.textMuted}
                      align="center"
                      style={{ padding: 12 }}
                    >
                      সদস্য তথ্য লোড হচ্ছে...
                    </BengaliText>
                  ) : (
                    members.map((m: any) => (
                      <View
                        key={m._id}
                        style={[
                          styles.memberItemRow,
                          {
                            backgroundColor: isDark
                              ? colors.surfaceSubdued
                              : colors.secondaryLight,
                            borderColor: isDark
                              ? colors.borderStrong
                              : colors.border,
                          },
                        ]}
                      >
                        <ProfileAvatar
                          name={m.name}
                          size="sm"
                          role={m.role}
                          showRoleBadge
                        />
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <BengaliText variant="bodyBold" color={colors.text}>
                            {m.name}
                          </BengaliText>
                          <BengaliText
                            variant="caption"
                            color={colors.textMuted}
                          >
                            ফোন: {MoneyUtil.toBengaliNumber(m.phone)}
                          </BengaliText>
                        </View>
                        <View
                          style={[
                            styles.roleTag,
                            { backgroundColor: colors.primaryLight },
                          ]}
                        >
                          <BengaliText
                            variant="caption"
                            color={colors.primary}
                            weight="700"
                          >
                            {m.role === "HOME_ADMIN" ? "অ্যাডমিন" : "সদস্য"}
                          </BengaliText>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              <View
                style={[
                  styles.menuDivider,
                  { backgroundColor: colors.borderLight },
                ]}
              />
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setMemberModal(true)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.menuIconCircle,
                    { backgroundColor: colors.accentLight },
                  ]}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={20}
                    color={colors.accent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <BengaliText variant="bodyBold" color={colors.text}>
                    নতুন পরিবার সদস্য যুক্ত করুন
                  </BengaliText>
                  <BengaliText variant="caption" color={colors.textMuted}>
                    নাম, ফোন ও পাসওয়ার্ড দিয়ে মেম্বার তৈরি করুন
                  </BengaliText>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textLight}
                />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Budget System (Section 12) */}
        <BudgetCard
          title="চলতি মাসের পারিবারিক বাজেট"
          budgetPaisa={MoneyUtil.takaToPaisa(parseFloat(monthlyBudgetTaka))}
          spentPaisa={
            householdTotalContributions > 0
              ? Math.round(householdTotalContributions * 0.75)
              : 850000
          }
          onEditBudget={() => {
            setTempBudgetTaka(monthlyBudgetTaka);
            setBudgetModal(true);
          }}
        />

        {/* Recurring Bills Shortcut (Section 12) */}
        <View
          style={[
            styles.menuGroup,
            {
              backgroundColor: isDark ? colors.surface : colors.surface,
              borderColor: isDark ? colors.borderStrong : colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setRecurringModal(true)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: isDark ? "#312E81" : "#EEF2FF" },
              ]}
            >
              <Ionicons name="repeat-outline" size={20} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                নিয়মিত মাসিক বিলসমূহ (Recurring Bills)
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                বাড়ি ভাড়া, বিদ্যুৎ বিল, ওয়াইফাই, বুয়ার বেতন
              </BengaliText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>
        </View>

        {/* Central Accounting & Financial Statements */}
        <BengaliText
          variant="caption"
          color={colors.textMuted}
          weight="700"
          style={styles.sectionTitle}
        >
          আর্থিক হিসাব, ব্যাংক ও পূর্ণাঙ্গ রিপোর্ট
        </BengaliText>

        <View
          style={[
            styles.menuGroup,
            {
              backgroundColor: isDark ? colors.surface : colors.surface,
              borderColor: isDark ? colors.borderStrong : colors.border,
            },
          ]}
        >
          {/* Family Fund Dashboard */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/family-fund")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons
                name="wallet-outline"
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                পারিবারিক ফান্ড ড্যাশবোর্ড (Family Fund)
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                কমন ফান্ড ক্যাশ, চাঁদা ও অপরিবর্তনশীল লেজার হিসাব
              </BengaliText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.menuDivider,
              { backgroundColor: colors.borderLight },
            ]}
          />

          {/* Member Dues & Collection (or My Dues for members) */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push(isAdmin ? "/member-dues" : "/my-dues")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: isDark ? "#3B1515" : "#FEF2F2" },
              ]}
            >
              <Ionicons name="people-outline" size={20} color={colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                {isAdmin
                  ? "সদস্যদের বকেয়া ও চাঁদা কালেকশন"
                  : "আমার চাঁদা ও বকেয়া হিসাব"}
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                {isAdmin
                  ? "সদস্যভিত্তিক খরচের অংশ, বকেয়া ও পেমেন্ট অনুমোদন"
                  : "আপনার অংশের খরচ ও চাঁদা পরিশোধের স্থিতি"}
              </BengaliText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.menuDivider,
              { backgroundColor: colors.borderLight },
            ]}
          />

          {/* Expense Sharing Creator */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/expense-sharing")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: isDark ? "#1E3A5F" : "#E0F2FE" },
              ]}
            >
              <Ionicons name="pie-chart-outline" size={20} color="#0284C7" />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                খরচ বণ্টন ও বিভাজন (Expense Sharing)
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                সমান, শতকরা ও নির্দিষ্ট টাকায় পাইসাভিত্তিক নিখুঁত ভাগ
              </BengaliText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.menuDivider,
              { backgroundColor: colors.borderLight },
            ]}
          />

          {/* Family Money Management */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/family-finance")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: isDark ? "#1E3A5F" : "#E0F2FE" },
              ]}
            >
              <Ionicons name="people" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                পারিবারিক অর্থ ব্যবস্থাপনা (Family Money)
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                পারিবারিক খরচ, ঋণ, অগ্রিম, উপহার ও চাঁদার পৃথক ট্র্যাকিং
              </BengaliText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.menuDivider,
              { backgroundColor: colors.borderLight },
            ]}
          />

          {/* Family Transfers & Custody Wallets */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/family-transfers")}
            activeOpacity={0.7}
          >
            <View
              style={[styles.menuIconCircle, { backgroundColor: "#3B82F618" }]}
            >
              <Ionicons name="swap-horizontal" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                অর্থ স্থানান্তর ও কাস্টডি ওয়ালেট
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                সদস্যদের বাজার বাজেট ও অব্যবহৃত টাকা ফেরত প্রদান
              </BengaliText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.menuDivider,
              { backgroundColor: colors.borderLight },
            ]}
          />

          {/* Family Settlement & Statement */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/family-statement")}
            activeOpacity={0.7}
          >
            <View
              style={[styles.menuIconCircle, { backgroundColor: "#10B98118" }]}
            >
              <Ionicons name="document-text" size={20} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                পারিবারিক পূর্ণাঙ্গ বিবরণী ও সেটেলমেন্ট
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                সদস্যভিত্তিক দেনা-পাওনা, স্পনসরড ছাড় ও স্বয়ংক্রিয় নিষ্পত্তি
              </BengaliText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.menuDivider,
              { backgroundColor: colors.borderLight },
            ]}
          />

          {/* Member Profiles & Sponsorships */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/family-members")}
            activeOpacity={0.7}
          >
            <View
              style={[styles.menuIconCircle, { backgroundColor: "#8B5CF618" }]}
            >
              <Ionicons name="shield-checkmark" size={20} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                সদস্য ভূমিকা ও স্পনসরশিপ
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                সম্পর্ক, আয়ের অবস্থা ও আর্থিক দায়িত্ব নির্ধারণ
              </BengaliText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.menuDivider,
              { backgroundColor: colors.borderLight },
            ]}
          />

          {/* Room & Rent Configuration */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/room-management")}
            activeOpacity={0.7}
          >
            <View
              style={[styles.menuIconCircle, { backgroundColor: "#F59E0B18" }]}
            >
              <Ionicons name="home" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                রুম ও মেস ভাড়া ব্যবস্থাপনা
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                রুমভিত্তিক ভাড়া ও সদস্য বরাদ্দকরণ
              </BengaliText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.menuDivider,
              { backgroundColor: colors.borderLight },
            ]}
          />

          {/* Monthly Financial Statement */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleOpenStatement}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: isDark ? "#064E3B20" : "#ECFDF5" },
              ]}
            >
              <Ionicons name="document-text" size={20} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                মাসিক পূর্ণাঙ্গ আর্থিক বিবরণী (Monthly Statement)
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                আয়, ব্যয়, প্রদত্ত ঋণ, গৃহীত ধার ও নীট সঞ্চয়ের বিবরণী
              </BengaliText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.menuDivider,
              { backgroundColor: colors.borderLight },
            ]}
          />

          {/* Manage Accounts */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setAccountsModal(true)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons name="card-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                আর্থিক অ্যাকাউন্ট ব্যবস্থাপনা (Accounts)
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                ক্যাশ, ব্যাংক, বিকাশ, নগদ ও সঞ্চয়ী হিসাবসমূহ
              </BengaliText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.menuDivider,
              { backgroundColor: colors.borderLight },
            ]}
          />

          {/* Manage People */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setPeopleModal(true)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: colors.secondaryLight },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={colors.secondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                পরিচিত ব্যক্তি ও দেনা-পাওনা খতিয়ান (Debt Ledger)
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                বন্ধু, আত্মীয় ও গ্রাহকদের তালিকা ও লেনদেন
              </BengaliText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>
        </View>

        {/* Settings, Security & Sync */}
        <BengaliText
          variant="caption"
          color={colors.textMuted}
          weight="700"
          style={styles.sectionTitle}
        >
          নিরাপত্তা, থিম ও ডেটা সিঙ্ক
        </BengaliText>

        <View
          style={[
            styles.menuGroup,
            {
              backgroundColor: isDark ? colors.surface : colors.surface,
              borderColor: isDark ? colors.borderStrong : colors.border,
            },
          ]}
        >
          {/* Theme & Appearance Settings */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/appearance")}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconCircle,
                { backgroundColor: isDark ? "#1E293B" : "#EBF3FA" },
              ]}
            >
              <Ionicons
                name={isDark ? "moon" : "sunny"}
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                অ্যাপিয়ারেন্স ও থিম ({isDark ? "ডার্ক মোড" : "লাইট মোড"})
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                লাইট, ডার্ক ও সিস্টেম ডিফল্ট থিম কাস্টমাইজ করুন
              </BengaliText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.menuDivider,
              { backgroundColor: colors.borderLight },
            ]}
          />

          {/* App Lock PIN */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => (hasPin ? handleRemovePin() : setPinModal(true))}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconCircle,
                {
                  backgroundColor: hasPin
                    ? colors.accentLight
                    : colors.primaryLight,
                },
              ]}
            >
              <Ionicons
                name={hasPin ? "shield-checkmark" : "lock-closed-outline"}
                size={20}
                color={hasPin ? colors.accent : colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                {hasPin
                  ? "অ্যাপ লক বন্ধ করুন"
                  : "৪ সংখ্যার অ্যাপ লক পিন সেট করুন"}
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                {hasPin
                  ? "বর্তমানে পিন লক সক্রিয় রয়েছে"
                  : "অ্যাপ চালু করার সময় পিন চাইবে"}
              </BengaliText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.menuDivider,
              { backgroundColor: colors.borderLight },
            ]}
          />

          {/* Manual Sync */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              SyncEngine.syncNow()
                .then((r) => {
                  showToast({
                    type: "success",
                    message: `সিঙ্ক সম্পন্ন! ${MoneyUtil.toBengaliNumber(r.pushed)} টি আইটেম সার্ভারে পুশ হয়েছে।`,
                  });
                })
                .catch(() => {
                  showToast({
                    type: "error",
                    message: "সার্ভারে কানেক্ট করা যায়নি।",
                  });
                });
            }}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.menuIconCircle,
                {
                  backgroundColor:
                    pendingCount > 0 ? "#FEF3C7" : colors.accentLight,
                },
              ]}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={20}
                color={pendingCount > 0 ? colors.warning : colors.accent}
              />
            </View>
            <View style={{ flex: 1 }}>
              <BengaliText variant="bodyBold" color={colors.text}>
                এখনই সিঙ্ক করুন (Manual Sync)
              </BengaliText>
              <BengaliText variant="caption" color={colors.textMuted}>
                অবস্থা: {syncStatus} •{" "}
                {pendingCount > 0
                  ? `${MoneyUtil.toBengaliNumber(pendingCount)} টি অপেক্ষমান`
                  : "সম্পূর্ণ আপ-টু-ডেট"}
              </BengaliText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.textLight}
            />
          </TouchableOpacity>
        </View>

        {/* Financial Integrity Card */}
        <View
          style={[
            styles.integrityCard,
            {
              backgroundColor: isDark
                ? colors.surfaceSubdued
                : colors.secondaryLight,
              borderColor: isDark ? colors.borderStrong : colors.border,
            },
          ]}
        >
          <Ionicons
            name="checkmark-done-circle"
            size={20}
            color={colors.accent}
            style={{ marginRight: 8 }}
          />
          <View style={{ flex: 1 }}>
            <BengaliText variant="caption" color={colors.text} weight="700">
              ১০০% জিরো-পয়সা গাণিতিক নিশ্চয়তা
            </BengaliText>
            <BengaliText
              variant="caption"
              color={colors.textMuted}
              style={{ marginTop: 2, fontSize: 11.5 }}
            >
              সকল হিসাব strictly integer Paisa গণনায় সংরক্ষিত হয়। কোনো পয়সার
              অপচয় বা বিভ্রাট ঘটে না।
            </BengaliText>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[
            styles.logoutBtn,
            {
              backgroundColor: isDark ? "#3B1515" : "#FEF2F2",
              borderColor: isDark ? "#7F1D1D" : "#FECACA",
            },
          ]}
          onPress={() => setLogoutModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={colors.danger}
            style={{ marginRight: 8 }}
          />
          <BengaliText variant="bodyBold" color={colors.danger}>
            লগআউট করুন
          </BengaliText>
        </TouchableOpacity>
      </ScrollView>

      {/* Add Contribution Bottom Sheet */}
      <BottomSheet
        visible={contributionModal}
        title="কমন ফান্ডে চাঁদা প্রদান"
        subtitle="পারিবারিক ফান্ডে টাকা জমা দিয়ে ব্যালেন্স বৃদ্ধি করুন"
        onClose={() => setContributionModal(false)}
      >
        <AmountInput
          label="টাকার পরিমাণ"
          value={contribTaka}
          onChangeTaka={setContribTaka}
          presets={[500, 1000, 2000, 5000, 10000]}
          required
        />

        <TextInput
          label="নোট বা বিবরণ (ঐচ্ছিক)"
          placeholder="যেমন: নভেম্বর মাসের চাঁদা, অতিরিক্ত ফান্ড জমা..."
          value={contribNote}
          onChangeText={setContribNote}
        />

        <PrimaryButton
          title="চাঁদা জমা নিশ্চিত করুন"
          onPress={handleAddContribution}
          loading={isSubmittingContrib}
          icon="checkmark-circle-outline"
          size="lg"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>

      {/* Edit Contribution Bottom Sheet */}
      <BottomSheet
        visible={editContribModal}
        title="চাঁদার হিসাব সংশোধন"
        subtitle="তথ্য পরিবর্তন করে সংরক্ষণ করুন"
        onClose={() => setEditContribModal(false)}
      >
        {editingContrib && (
          <>
            <AmountInput
              label="টাকার পরিমাণ"
              value={editingContrib.amountTaka}
              onChangeTaka={(val) =>
                setEditingContrib({ ...editingContrib, amountTaka: val })
              }
              required
            />

            <TextInput
              label="মন্তব্য"
              value={editingContrib.note}
              onChangeText={(text) =>
                setEditingContrib({ ...editingContrib, note: text })
              }
            />

            <PrimaryButton
              title="পরিবর্তন সংরক্ষণ করুন"
              onPress={handleUpdateContribution}
              loading={isUpdatingContrib}
              icon="save-outline"
              size="lg"
              style={{ marginTop: 8 }}
            />
          </>
        )}
      </BottomSheet>

      {/* Add Member Bottom Sheet (Admin) */}
      <BottomSheet
        visible={memberModal}
        title="নতুন পরিবার সদস্য যুক্ত করুন"
        subtitle="সদস্যের নাম, ফোন নম্বর ও প্রাথমিক পাসওয়ার্ড দিন"
        onClose={() => setMemberModal(false)}
      >
        <TextInput
          label="সদস্যের পুরো নাম"
          placeholder="যেমন: মোঃ করিম আহমেদ"
          value={memberName}
          onChangeText={setMemberName}
          icon="person-outline"
          required
        />

        <TextInput
          label="ফোন নম্বর (লগইন আইডি)"
          placeholder="০১৭১১XXXXXX"
          value={memberPhone}
          onChangeText={setMemberPhone}
          keyboardType="phone-pad"
          icon="call-outline"
          required
        />

        <TextInput
          label="প্রাথমিক পাসওয়ার্ড"
          placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড দিন"
          value={memberPass}
          onChangeText={setMemberPass}
          secureTextEntry
          icon="lock-closed-outline"
          required
        />

        <PrimaryButton
          title="সদস্য অ্যাকাউন্ট তৈরি করুন"
          onPress={handleAddMember}
          loading={isSubmittingMember}
          icon="person-add-outline"
          size="lg"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>

      {/* Set PIN Bottom Sheet */}
      <BottomSheet
        visible={pinModal}
        title="৪ সংখ্যার অ্যাপ লক পিন"
        subtitle="অ্যাপ চালু করার সময় নিরাপত্তার জন্য এই পিন চাওয়া হবে"
        onClose={() => setPinModal(false)}
      >
        <TextInput
          label="৪ সংখ্যার পিন কোড"
          placeholder="****"
          value={newPin}
          onChangeText={setNewPin}
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry
          icon="lock-closed-outline"
          required
        />

        <PrimaryButton
          title="পিন সংরক্ষণ করুন"
          onPress={handleSavePin}
          icon="shield-checkmark-outline"
          size="lg"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>

      {/* Budget Set Bottom Sheet */}
      <BottomSheet
        visible={budgetModal}
        title="মাসিক বাজেট নির্ধারণ"
        subtitle="চলতি মাসের সর্বোচ্চ খরচের সীমা নির্ধারণ করুন"
        onClose={() => setBudgetModal(false)}
      >
        <AmountInput
          label="মাসিক বাজেট টাকার পরিমাণ"
          value={tempBudgetTaka}
          onChangeTaka={setTempBudgetTaka}
          presets={[10000, 15000, 20000, 30000, 50000]}
          required
        />

        <PrimaryButton
          title="বাজেট সংরক্ষণ করুন"
          onPress={handleSaveBudget}
          icon="checkmark-circle-outline"
          size="lg"
          style={{ marginTop: 8 }}
        />
      </BottomSheet>

      {/* Unified Recurring Bills Bottom Sheet (Smooth In-Place Transitions) */}
      <BottomSheet
        visible={recurringModal}
        title={
          selectedBillToAdd
            ? "বিল এন্ট্রি চূড়ান্ত করুন"
            : addCustomBillModal
              ? "নতুন নিয়মিত বিল যোগ করুন"
              : "নিয়মিত মাসিক বিলসমূহ"
        }
        subtitle={
          selectedBillToAdd
            ? `পারিবারিক খরচে '${billTitle || selectedBillToAdd.title}' যুক্ত করা হচ্ছে`
            : addCustomBillModal
              ? "ভবিষ্যতে দ্রুত এন্ট্রির জন্য টেমপ্লেট হিসেবে সংরক্ষিত থাকবে"
              : "চলতি মাসের জন্য দ্রুত বিল এন্ট্রি তৈরি করুন"
        }
        onClose={() => {
          setRecurringModal(false);
          setSelectedBillToAdd(null);
          setAddCustomBillModal(false);
        }}
      >
        {selectedBillToAdd ? (
          /* Sub-View 1: Finalize Bill Entry */
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => setSelectedBillToAdd(null)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-back"
                size={16}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <BengaliText
                variant="caption"
                color={colors.primary}
                weight="700"
              >
                অন্য বিল তালিকায় ফিরে যান
              </BengaliText>
            </TouchableOpacity>

            <TextInput
              label="বিলের নাম"
              value={billTitle}
              onChangeText={setBillTitle}
              placeholder="বিলের নাম লিখুন"
            />

            <AmountInput
              label="টাকার পরিমাণ (৳)"
              value={billTaka}
              onChangeTaka={setBillTaka}
              placeholder="০.০০"
            />

            <Toggle
              label="কমন ফান্ড থেকে পরিশোধ"
              subtitle={
                billPaidFromFund
                  ? "পরিবারের কমন ফান্ড থেকে খরচ কাটা হবে"
                  : "আপনার ব্যক্তিগত পকেট থেকে পরিশোধ করা হয়েছে"
              }
              value={billPaidFromFund}
              onValueChange={setBillPaidFromFund}
            />

            <TextInput
              label="নোট বা অতিরিক্ত বিবরণ (ঐচ্ছিক)"
              value={billNote}
              onChangeText={setBillNote}
              placeholder="যেমন: চলতি মাসের বিল"
            />

            <PrimaryButton
              title={
                isAdmin ? "পারিবারিক খরচে যুক্ত করুন" : "খরচের আবেদন পাঠান"
              }
              onPress={handleConfirmAddBill}
              loading={isSubmittingBill}
              icon="checkmark-circle-outline"
              size="lg"
              style={{ marginTop: 8 }}
            />
          </View>
        ) : addCustomBillModal ? (
          /* Sub-View 2: Add Custom Recurring Bill Template */
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => setAddCustomBillModal(false)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 4,
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="arrow-back"
                size={16}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <BengaliText
                variant="caption"
                color={colors.primary}
                weight="700"
              >
                বিল তালিকায় ফিরে যান
              </BengaliText>
            </TouchableOpacity>

            <TextInput
              label="বিলের নাম"
              value={customBillTitle}
              onChangeText={setCustomBillTitle}
              placeholder="যেমন: গ্যাস বিল, ময়লার বিল, ডিপিএস"
            />

            <AmountInput
              label="অনুমানিত মাসিক টাকার পরিমাণ (৳)"
              value={customBillAmount}
              onChangeTaka={setCustomBillAmount}
              placeholder="০.০০"
            />

            <PrimaryButton
              title="বিল সংরক্ষণ করুন"
              onPress={handleSaveCustomRecurringBill}
              icon="save-outline"
              size="lg"
              style={{ marginTop: 8 }}
            />
          </View>
        ) : (
          /* Sub-View 3: Recurring Bills Template List */
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 380 }}
          >
            {recurringBills.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.7}
                onPress={() => handleSelectBillToExecute(item)}
                style={[
                  styles.recurringItemCard,
                  {
                    backgroundColor: isDark
                      ? colors.surfaceSubdued
                      : colors.secondaryLight,
                    borderColor: isDark ? colors.borderStrong : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.menuIconCircle,
                    { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <BengaliText variant="bodyBold" color={colors.text}>
                    {item.title}
                  </BengaliText>
                  <BengaliText variant="caption" color={colors.textMuted}>
                    অনুমান:{" "}
                    {MoneyUtil.formatBengaliCurrency(
                      MoneyUtil.takaToPaisa(item.amount),
                    )}
                  </BengaliText>
                </View>

                <View
                  style={[
                    styles.addBillActionBadge,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons
                    name="add"
                    size={14}
                    color="#FFFFFF"
                    style={{ marginRight: 2 }}
                  />
                  <BengaliText variant="caption" color="#FFFFFF" weight="700">
                    যুক্ত করুন
                  </BengaliText>
                </View>

                {recurringBills.length > 1 && (
                  <TouchableOpacity
                    onPress={() =>
                      handleDeleteRecurringBill(item.id, item.title)
                    }
                    style={{ padding: 6, marginLeft: 4 }}
                    hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={colors.textLight}
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}

            {/* Button to Add New Custom Recurring Bill */}
            <TouchableOpacity
              style={[
                styles.addCustomRecurringBtn,
                {
                  borderColor: colors.primary,
                  backgroundColor: isDark
                    ? colors.surfaceSubdued
                    : colors.primaryLight,
                },
              ]}
              onPress={() => setAddCustomBillModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="add-circle"
                size={18}
                color={colors.primary}
                style={{ marginRight: 6 }}
              />
              <BengaliText variant="bodyBold" color={colors.primary}>
                + নতুন নিয়মিত বিল যুক্ত করুন
              </BengaliText>
            </TouchableOpacity>
          </ScrollView>
        )}
      </BottomSheet>

      {/* Delete Contribution Confirmation */}
      <ConfirmationModal
        visible={deleteConfirmVisible}
        title="চাঁদার হিসাব মুছে ফেলা"
        message={`আপনি কি নিশ্চিত ${contribToDelete ? MoneyUtil.formatBengaliCurrency(contribToDelete.amountPaisa) : ""} চাঁদার রেকর্ডটি মুছে ফেলতে চান?`}
        confirmTitle="হ্যাঁ, মুছুন"
        isDestructive
        onConfirm={executeDeleteContrib}
        onCancel={() => {
          setDeleteConfirmVisible(false);
          setContribToDelete(null);
        }}
      />

      {/* Logout Confirmation Modal */}
      <ConfirmationModal
        visible={logoutModalVisible}
        title="লগআউট নিশ্চিতকরণ"
        message="আপনি কি নিশ্চিত যে অ্যাকাউন্ট থেকে লগআউট করতে চান? অফলাইন ডেটা ডিভাইসে সংরক্ষিত থাকবে।"
        confirmTitle="লগআউট"
        isDestructive
        onConfirm={handleLogout}
        onCancel={() => setLogoutModalVisible(false)}
      />

      {/* Accounting & Statement Modals */}
      <MonthEndStatementModal
        visible={statementModal}
        onClose={() => setStatementModal(false)}
        statement={statement}
      />

      <ManageAccountsModal
        visible={accountsModal}
        onClose={() => setAccountsModal(false)}
        accounts={accounts}
        onCreateAccount={handleCreateAccount}
      />

      <ManagePeopleModal
        visible={peopleModal}
        onClose={() => setPeopleModal(false)}
        people={people}
        onCreatePerson={handleCreatePerson}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.2,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
  },
  roleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  superAdminCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.2,
    marginBottom: 12,
  },
  superAdminIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(52, 211, 153, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12.5,
    marginVertical: 8,
    marginLeft: 4,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  menuGroup: {
    borderRadius: 16,
    borderWidth: 1.2,
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  menuIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuDivider: {
    height: 1,
    marginLeft: 64,
  },
  nestedContainer: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  memberItemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recurringItemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  addBillActionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addCustomRecurringBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.2,
    borderStyle: "dashed",
    marginTop: 6,
    marginBottom: 10,
  },
  integrityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 8,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.2,
    marginTop: 8,
    marginBottom: 20,
  },
});
