export type UserRole = 'SUPER_ADMIN' | 'HOME_ADMIN' | 'HOME_USER';

export type SplitType = 'EQUAL' | 'PERCENTAGE' | 'EXACT';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type PaymentMethod = 'CASH' | 'BKASH' | 'NAGAD' | 'BANK' | 'OTHER';

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  householdId?: string | null;
  householdName?: string | null;
}

export interface Category {
  _id: string;
  nameBn: string;
  nameEn: string;
  type: 'EXPENSE' | 'INCOME';
  icon: string;
  color: string;
  isGlobal?: boolean;
}

export interface PersonalIncome {
  _id: string;
  userId: string;
  amountPaisa: number;
  source: string;
  categoryId?: string | null;
  date: string;
  note?: string;
  clientUuid?: string;
}

export interface PersonalExpense {
  _id: string;
  userId: string;
  amountPaisa: number;
  title: string;
  categoryId?: string | null;
  date: string;
  note?: string;
  clientUuid?: string;
}

export interface ExpenseSplitItem {
  userId: string;
  sharePaisa: number;
  percentageBasisPoints?: number;
}

export interface HouseholdExpense {
  _id: string;
  householdId: string;
  paidByUserId?: string | null;
  paidFromFund: boolean;
  amountPaisa: number;
  categoryId?: string | null;
  title: string;
  date: string;
  note?: string;
  splitType: SplitType;
  splits: ExpenseSplitItem[];
  approvalStatus: ApprovalStatus;
  approvedByUserId?: string | null;
  clientUuid?: string;
}

export interface ExpenseRequest {
  _id: string;
  householdId: string;
  requestedByUserId: string;
  amountPaisa: number;
  categoryId?: string | null;
  title: string;
  date: string;
  note?: string;
  splitType: SplitType;
  splits: ExpenseSplitItem[];
  status: ApprovalStatus;
  rejectionReason?: string;
  clientUuid?: string;
}

export interface Contribution {
  _id: string;
  householdId: string;
  userId: string;
  amountPaisa: number;
  date: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  note?: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  clientUuid?: string;
}

export interface Settlement {
  _id: string;
  householdId: string;
  fromUserId: string;
  toUserId?: string | null;
  amountPaisa: number;
  date: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  note?: string;
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  clientUuid?: string;
}

export interface MemberBalanceSummary {
  userId: string;
  userName: string;
  totalPaidPaisa: number;
  totalOwedPaisa: number;
  totalContributedPaisa: number;
  netBalancePaisa: number;
}

export interface SettlementTransaction {
  fromUserId: string;
  toUserId: string;
  amountPaisa: number;
}

export interface HouseholdFinancialOverview {
  householdId: string;
  openingBalancePaisa: number;
  totalFundContributionsPaisa: number;
  totalApprovedExpensesPaisa: number;
  currentFundBalancePaisa: number;
  pendingRequestsCount: number;
  pendingRequestsPaisa: number;
  memberBalances: MemberBalanceSummary[];
  recommendedSettlements: SettlementTransaction[];
}

export type SyncQueueAction = 'CREATE' | 'UPDATE' | 'DELETE';

export type SyncEntityType =
  | 'PERSONAL_INCOME'
  | 'PERSONAL_EXPENSE'
  | 'HOUSEHOLD_EXPENSE'
  | 'EXPENSE_REQUEST'
  | 'CONTRIBUTION'
  | 'SETTLEMENT'
  | 'FINANCIAL_ACCOUNT'
  | 'PERSON'
  | 'PERSONAL_TRANSACTION'
  | 'ACCOUNT_TRANSFER';

export interface FinancialAccount {
  _id: string;
  userId: string;
  householdId?: string | null;
  name: string;
  type: 'CASH' | 'BANK' | 'MOBILE_BANKING' | 'SAVINGS' | 'OTHER';
  accountNumber?: string;
  bankName?: string;
  openingBalancePaisa: number;
  currentBalancePaisa: number;
  isArchived: boolean;
  notes?: string;
  clientUuid: string;
}

export type PersonRelationshipType = 'FAMILY' | 'FRIEND' | 'RELATIVE' | 'CUSTOMER' | 'OTHER';

export interface Person {
  _id: string;
  userId: string;
  householdId?: string | null;
  name: string;
  phone?: string;
  relationship: PersonRelationshipType;
  address?: string;
  notes?: string;
  openingReceivablePaisa: number;
  openingPayablePaisa: number;
  currentReceivablePaisa: number;
  currentPayablePaisa: number;
  isArchived: boolean;
  clientUuid: string;
}

export type TransactionDirection = 'GIVE' | 'RECEIVE' | 'BORROW' | 'TRANSFER';

export type TransactionFlowType =
  | 'LOAN'
  | 'ADVANCE'
  | 'GIFT'
  | 'FAMILY_EXPENSE'
  | 'HOUSEHOLD_CONTRIBUTION'
  | 'BORROW_REPAYMENT'
  | 'INCOME'
  | 'LOAN_REPAYMENT'
  | 'ADVANCE_REFUND'
  | 'FAMILY_REFUND'
  | 'BORROW'
  | 'OTHER_RECEIPT'
  | 'OTHER';

export interface PersonalTransaction {
  _id: string;
  userId: string;
  householdId?: string | null;
  accountId: string | { _id: string; name: string; type: string };
  personId?: string | { _id: string; name: string; phone?: string; relationship?: string } | null;
  direction: TransactionDirection;
  flowType: TransactionFlowType;
  amountPaisa: number;
  date: string;
  dueDate?: string | null;
  purpose?: string;
  description?: string;
  notes?: string;
  isRecoverable: boolean;
  settledAmountPaisa: number;
  status: 'ACTIVE' | 'PARTIALLY_SETTLED' | 'SETTLED' | 'REVERSED' | 'CANCELLED';
  parentTransactionId?: string | null;
  interestPaisa?: number;
  reversalReason?: string;
  clientUuid: string;
}

export interface AccountTransfer {
  _id: string;
  userId: string;
  householdId?: string | null;
  fromAccountId: string | { _id: string; name: string; type: string };
  toAccountId: string | { _id: string; name: string; type: string };
  amountPaisa: number;
  date: string;
  notes?: string;
  isReversed: boolean;
  reversalReason?: string;
  clientUuid: string;
}

export interface PersonalFinancialOverview {
  totalIncomePaisa: number;
  totalPersonalExpensesPaisa: number;
  totalHouseholdContributionsPaisa: number;
  totalMoneyLentPaisa: number;
  totalMoneyBorrowedPaisa: number;
  totalMoneyReceivablePaisa: number;
  totalMoneyPayablePaisa: number;
  totalCashBalancePaisa: number;
  totalBankBalancePaisa: number;
  totalAvailableBalancePaisa: number;
  totalAssetsPaisa: number;
  totalLiabilitiesPaisa: number;
  netWorthPaisa: number;

  // Dedicated Family Money Classification Metrics
  totalFamilyExpensesPaisa: number;
  totalFamilyLoansPaisa: number;
  outstandingFamilyReceivablesPaisa: number;
  totalFamilyAdvancesPaisa: number;
  outstandingAdvancesPaisa: number;
  totalFamilyContributionsPaisa: number;
  totalMoneyReturnedPaisa: number;
  totalFamilyGiftsPaisa: number;
}

export interface FamilyFinanceSummary {
  totalFamilyExpensesPaisa: number;
  totalFamilyLoansPaisa: number;
  outstandingFamilyReceivablesPaisa: number;
  totalFamilyAdvancesPaisa: number;
  outstandingAdvancesPaisa: number;
  totalFamilyContributionsPaisa: number;
  totalMoneyReturnedPaisa: number;
  totalFamilyGiftsPaisa: number;
}

export interface WhatIfProjection {
  currentAvailableMoneyPaisa: number;
  totalReceivablePaisa: number;
  totalPayablePaisa: number;
  afterPayingEveryonePaisa: number;
  afterReceivingAllMoneyPaisa: number;
  fullySettledPositionPaisa: number;
  isDeficit: boolean;
  insufficientNotice?: string;
}

export interface ReceivableItem {
  _id: string;
  clientUuid: string;
  person: { _id: string; name: string; phone?: string; relationship: PersonRelationshipType } | null;
  account: { _id: string; name: string; type: string };
  flowType: TransactionFlowType;
  originalAmountPaisa: number;
  settledAmountPaisa: number;
  remainingReceivablePaisa: number;
  date: string;
  dueDate?: string | null;
  isOverdue: boolean;
  purpose?: string;
  status: string;
  repayments: PersonalTransaction[];
}

export interface PayableItem {
  _id: string;
  clientUuid: string;
  lender: { _id: string; name: string; phone?: string; relationship: PersonRelationshipType } | null;
  account: { _id: string; name: string; type: string };
  flowType: TransactionFlowType;
  originalAmountPaisa: number;
  settledAmountPaisa: number;
  remainingPayablePaisa: number;
  date: string;
  dueDate?: string | null;
  isOverdue: boolean;
  purpose?: string;
  status: string;
  repayments: PersonalTransaction[];
}

export interface MonthlyFinancialStatement {
  year: number;
  month: number;
  income: {
    totalPaisa: number;
    sources: Array<{ title: string; amountPaisa: number; date: string }>;
  };
  expenses: {
    totalPaisa: number;
    personalExpensesPaisa: number;
    familyExpensesPaisa: number;
    householdContributionsPaisa: number;
    interestExpensesPaisa: number;
    otherExpensesPaisa: number;
  };
  receivables: {
    totalLentPaisa: number;
    totalReceivedBackPaisa: number;
    remainingReceivablePaisa: number;
  };
  payables: {
    totalBorrowedPaisa: number;
    totalRepaidPaisa: number;
    remainingPayablePaisa: number;
  };
  netSavingsPaisa: number;
  closingNetWorthPaisa: number;
}

export interface SyncQueueItem {
  id?: number;
  clientUuid: string;
  action: SyncQueueAction;
  entityType: SyncEntityType;
  payload: string; // JSON string
  clientTimestamp: number;
  attempts: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED' | 'COMPLETED';
  errorMessage?: string;
}

// ==================== ADVANCED FAMILY FUND & EXPENSE SHARING ====================
export type FamilyFundingSource = 'HOUSEHOLD_FUND' | 'MEMBER_PERSONAL_ACCOUNT';
export type FamilyExpenseSharingMethod = 'EQUAL_SPLIT' | 'PERCENTAGE_SPLIT' | 'CUSTOM_AMOUNT_SPLIT';

export interface FamilyFundSummary {
  householdId: string;
  month?: string;
  openingBalancePaisa: number;
  totalMoneyReceivedPaisa: number;
  totalMemberContributionsPaisa: number;
  totalOtherFamilyIncomePaisa: number;
  totalFamilyExpensesPaisa: number;
  totalMoneyPaidPaisa: number;
  currentFundBalancePaisa: number;
  totalOutstandingMemberDuesPaisa: number;
  totalHouseholdReceivablesPaisa: number;
  totalHouseholdPayablesPaisa: number;
  totalOutstandingFamilyLoansPaisa: number;
  actualFundCashPaisa: number;
  memberDuesOutstandingPaisa: number;
  householdLiabilitiesPaisa: number;
}

export interface MemberDueDetail {
  userId: string;
  userName: string;
  phone?: string;
  openingDuePaisa: number;
  assignedExpenseSharesPaisa: number;
  confirmedPaymentsPaisa: number;
  validCreditsPaisa: number;
  netDuePaisa: number;
  creditBalancePaisa: number;
  pendingPaymentsCount: number;
  pendingPaymentsPaisa: number;
  status: 'PAID' | 'PARTIAL' | 'OVERDUE' | 'UNPAID' | 'CREDIT';
}

export interface MonthlyExpensePlanItem {
  id?: string;
  categoryId?: string;
  categoryName: string;
  plannedAmountPaisa: number;
  actualSpentPaisa: number;
  variancePaisa: number;
  note?: string;
}

export interface MemberExpectedContribution {
  userId: string;
  userName: string;
  expectedAmountPaisa: number;
  actualPaidPaisa: number;
  remainingDuePaisa: number;
}

export interface MonthlyExpensePlanSummary {
  householdId: string;
  month: string;
  totalPlannedBudgetPaisa: number;
  totalActualExpensePaisa: number;
  remainingBudgetPaisa: number;
  budgetUsedPercentage: number;
  items: MonthlyExpensePlanItem[];
  memberExpectedContributions: MemberExpectedContribution[];
  isLocked: boolean;
}

export interface FamilyFundTransaction {
  _id: string;
  householdId: string;
  date: string;
  month: string;
  direction: 'INFLOW' | 'OUTFLOW';
  type: string;
  amountPaisa: number;
  paymentMethod: string;
  sourceAccountId?: string;
  memberUserId?: { _id: string; name: string; phone?: string } | string;
  reference?: string;
  note?: string;
  verifiedByUserId?: { _id: string; name: string } | string;
  clientUuid?: string;
}

export interface HouseholdLoan {
  _id: string;
  householdId: string;
  lenderName: string;
  lenderPhone?: string;
  principalPaisa: number;
  interestPaisa: number;
  repaidPaisa: number;
  startDate: string;
  dueDate?: string;
  status: 'ACTIVE' | 'PARTIALLY_REPAID' | 'REPAID' | 'DEFAULTED';
  notes?: string;
  repayments: Array<{
    amountPaisa: number;
    date: string;
    paymentMethod: string;
    reference?: string;
    note?: string;
  }>;
}


