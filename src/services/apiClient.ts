import { API_BASE_URL } from '../constants/api';
import { AuthStorage } from './authStorage';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

export class ApiClient {
  private static onUnauthorizedCallback: (() => void) | null = null;

  public static setOnUnauthorized(callback: () => void) {
    this.onUnauthorizedCallback = callback;
  }

  public static async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = await AuthStorage.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };

    const config: RequestInit = {
      method: options.method || 'GET',
      headers,
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    };

    try {
      const response = await fetch(url, config);
      const json = await response.json();

      if (!response.ok) {
        if (
          response.status === 401 &&
          (json.code === 'INVALID_TOKEN' ||
            json.code === 'TOKEN_EXPIRED' ||
            json.code === 'UNAUTHORIZED' ||
            json.message?.includes('অবৈধ টোকেন') ||
            json.message?.includes('মেয়াদ শেষ'))
        ) {
          await AuthStorage.clearTokens();
          if (this.onUnauthorizedCallback) {
            this.onUnauthorizedCallback();
          }
        }
        throw new Error(json.message || `সার্ভার ত্রুটি: ${response.status}`);
      }

      return json;
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        throw new Error('সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করুন।');
      }
      throw error;
    }
  }

  // ==================== AUTH ====================
  public static login(phone: string, password: string) {
    return this.request('/auth/login', { method: 'POST', body: { phone, password } });
  }

  public static getProfile() {
    return this.request('/auth/me');
  }

  public static changePassword(oldPassword: string, newPassword: string) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: { oldPassword, newPassword },
    });
  }

  // ==================== SUPER ADMIN ====================
  public static createHousehold(data: { name: string; code: string; address?: string }) {
    return this.request('/households', { method: 'POST', body: data });
  }

  public static listHouseholds() {
    return this.request('/households');
  }

  public static createHouseholdAdmin(data: {
    name: string;
    phone: string;
    email?: string;
    password: string;
    householdId: string;
  }) {
    return this.request('/users/admin', { method: 'POST', body: data });
  }

  public static updateHouseholdStatus(id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') {
    return this.request(`/households/${id}/status`, { method: 'PATCH', body: { status } });
  }

  public static updateHousehold(
    id: string,
    data: { name?: string; code?: string; address?: string; status?: string; adminUserId?: string | null }
  ) {
    return this.request(`/households/${id}`, { method: 'PUT', body: data });
  }

  public static listAllUsers() {
    return this.request('/users/all');
  }

  public static updateUser(
    id: string,
    data: {
      name?: string;
      phone?: string;
      password?: string;
      role?: string;
      householdId?: string | null;
      isActive?: boolean;
    }
  ) {
    return this.request(`/users/${id}`, { method: 'PUT', body: data });
  }

  public static resetUserPassword(id: string, password: string) {
    return this.request(`/users/${id}/password`, { method: 'PATCH', body: { password } });
  }

  public static toggleUserStatus(userId: string) {
    return this.request(`/users/${userId}/toggle-status`, { method: 'PATCH' });
  }

  // ==================== MEMBERS ====================
  public static addMember(data: { name: string; phone: string; email?: string; password: string }) {
    return this.request('/users/member', { method: 'POST', body: data });
  }

  public static listMembers() {
    return this.request('/users/members');
  }

  // ==================== EXPENSES ====================
  public static createPersonalIncome(data: any) {
    return this.request('/expenses/personal-incomes', { method: 'POST', body: data });
  }

  public static listPersonalIncomes() {
    return this.request('/expenses/personal-incomes');
  }

  public static updatePersonalIncome(id: string, data: any) {
    return this.request(`/expenses/personal-incomes/${id}`, { method: 'PUT', body: data });
  }

  public static deletePersonalIncome(id: string) {
    return this.request(`/expenses/personal-incomes/${id}`, { method: 'DELETE' });
  }

  public static createPersonalExpense(data: any) {
    return this.request('/expenses/personal-expenses', { method: 'POST', body: data });
  }

  public static listPersonalExpenses() {
    return this.request('/expenses/personal-expenses');
  }

  public static updatePersonalExpense(id: string, data: any) {
    return this.request(`/expenses/personal-expenses/${id}`, { method: 'PUT', body: data });
  }

  public static deletePersonalExpense(id: string) {
    return this.request(`/expenses/personal-expenses/${id}`, { method: 'DELETE' });
  }

  public static createHouseholdExpense(data: any) {
    return this.request('/expenses/household-expenses', { method: 'POST', body: data });
  }

  public static listHouseholdExpenses() {
    return this.request('/expenses/household-expenses');
  }

  public static updateHouseholdExpense(id: string, data: any) {
    return this.request(`/expenses/household-expenses/${id}`, { method: 'PUT', body: data });
  }

  public static deleteHouseholdExpense(id: string) {
    return this.request(`/expenses/household-expenses/${id}`, { method: 'DELETE' });
  }

  public static submitExpenseRequest(data: any) {
    return this.request('/expenses/expense-requests', { method: 'POST', body: data });
  }

  public static listExpenseRequests() {
    return this.request('/expenses/expense-requests');
  }

  public static updateExpenseRequest(id: string, data: any) {
    return this.request(`/expenses/expense-requests/${id}`, { method: 'PUT', body: data });
  }

  public static deleteExpenseRequest(id: string) {
    return this.request(`/expenses/expense-requests/${id}`, { method: 'DELETE' });
  }

  public static reviewExpenseRequest(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string,
    paidFromFund = false
  ) {
    return this.request(`/expenses/expense-requests/${id}/review`, {
      method: 'PATCH',
      body: { status, rejectionReason, paidFromFund },
    });
  }

  public static addContribution(data: any) {
    return this.request('/expenses/contributions', { method: 'POST', body: data });
  }

  public static listContributions() {
    return this.request('/expenses/contributions');
  }

  public static updateContribution(id: string, data: any) {
    return this.request(`/expenses/contributions/${id}`, { method: 'PUT', body: data });
  }

  public static deleteContribution(id: string) {
    return this.request(`/expenses/contributions/${id}`, { method: 'DELETE' });
  }

  public static recordSettlement(data: any) {
    return this.request('/expenses/settlements', { method: 'POST', body: data });
  }

  public static listSettlements() {
    return this.request('/expenses/settlements');
  }

  // ==================== SETTLEMENTS & REPORTS ====================
  public static getFinancialOverview() {
    return this.request('/settlements/overview');
  }

  public static getClosedMonths() {
    return this.request('/settlements/closed-months');
  }

  public static closeMonth(year: number, month: number) {
    return this.request('/settlements/close-month', {
      method: 'POST',
      body: { year, month },
    });
  }

  // ==================== CATEGORIES ====================
  public static listCategories() {
    return this.request('/categories');
  }

  // ==================== FINANCIAL ACCOUNTS ====================
  public static createAccount(data: any) {
    return this.request('/accounts', { method: 'POST', body: data });
  }

  public static getAccounts(includeArchived = false) {
    return this.request(`/accounts?includeArchived=${includeArchived}`);
  }

  public static getAccountById(id: string) {
    return this.request(`/accounts/${id}`);
  }

  public static updateAccount(id: string, data: any) {
    return this.request(`/accounts/${id}`, { method: 'PUT', body: data });
  }

  public static transferBetweenAccounts(data: any) {
    return this.request('/accounts/transfer', { method: 'POST', body: data });
  }

  public static reverseTransfer(id: string, reason?: string) {
    return this.request(`/accounts/transfer/${id}/reverse`, { method: 'POST', body: { reason } });
  }

  // ==================== PEOPLE & CONTACTS ====================
  public static createPerson(data: any) {
    return this.request('/people', { method: 'POST', body: data });
  }

  public static getPeople(includeArchived = false) {
    return this.request(`/people?includeArchived=${includeArchived}`);
  }

  public static getPersonDetails(id: string) {
    return this.request(`/people/${id}`);
  }

  public static updatePerson(id: string, data: any) {
    return this.request(`/people/${id}`, { method: 'PUT', body: data });
  }

  // ==================== PERSONAL FINANCE ====================
  public static giveMoney(data: any) {
    return this.request('/personal-finance/give', { method: 'POST', body: data });
  }

  public static receiveMoney(data: any) {
    return this.request('/personal-finance/receive', { method: 'POST', body: data });
  }

  public static borrowMoney(data: any) {
    return this.request('/personal-finance/borrow', { method: 'POST', body: data });
  }

  public static repayBorrowedMoney(data: any) {
    return this.request('/personal-finance/repay-borrow', { method: 'POST', body: data });
  }

  public static getReceivables(filter?: { personId?: string; isOverdue?: boolean }) {
    const params = new URLSearchParams();
    if (filter?.personId) params.append('personId', filter.personId);
    if (filter?.isOverdue) params.append('isOverdue', 'true');
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/personal-finance/receivables${q}`);
  }

  public static getPayables(filter?: { personId?: string; isOverdue?: boolean }) {
    const params = new URLSearchParams();
    if (filter?.personId) params.append('personId', filter.personId);
    if (filter?.isOverdue) params.append('isOverdue', 'true');
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/personal-finance/payables${q}`);
  }

  public static getPersonalOverview(period?: { startDate?: string; endDate?: string }) {
    const params = new URLSearchParams();
    if (period?.startDate) params.append('startDate', period.startDate);
    if (period?.endDate) params.append('endDate', period.endDate);
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/personal-finance/overview${q}`);
  }

  public static getWhatIfProjections() {
    return this.request('/personal-finance/what-if');
  }

  public static getMonthlyStatement(year?: number, month?: number) {
    const params = new URLSearchParams();
    if (year) params.append('year', year.toString());
    if (month) params.append('month', month.toString());
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/personal-finance/monthly-statement${q}`);
  }

  public static reversePersonalTransaction(id: string, reason?: string) {
    return this.request(`/personal-finance/reverse/${id}`, { method: 'POST', body: { reason } });
  }

  public static getFamilySummary() {
    return this.request('/personal-finance/family-summary');
  }

  public static getFamilyTransactions(view?: string, personId?: string) {
    const params = new URLSearchParams();
    if (view) params.append('view', view);
    if (personId) params.append('personId', personId);
    const q = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/personal-finance/family-transactions${q}`);
  }

  // ==================== ADVANCED FAMILY FUND & EXPENSE SHARING ====================
  public static getHouseholdMembers() {
    return this.listMembers();
  }

  public static recordContribution(data: any) {
    return this.addContribution(data);
  }

  public static getFamilyFundSummary(month?: string) {
    const q = month ? `?month=${month}` : '';
    return this.request(`/family-fund/summary${q}`);
  }

  public static getMemberDues(month?: string) {
    const q = month ? `?month=${month}` : '';
    return this.request(`/family-fund/member-dues${q}`);
  }

  public static createFamilyFundExpense(data: any) {
    return this.request('/family-fund/expenses', { method: 'POST', body: data });
  }

  public static confirmMemberPayment(contributionId: string) {
    return this.request(`/family-fund/confirm-payment/${contributionId}`, { method: 'POST' });
  }

  public static reimburseMember(data: any) {
    return this.request('/family-fund/reimburse', { method: 'POST', body: data });
  }

  public static recordHouseholdLoan(data: any) {
    return this.request('/family-fund/loans', { method: 'POST', body: data });
  }

  public static repayHouseholdLoan(loanId: string, data: any) {
    return this.request(`/family-fund/loans/${loanId}/repay`, { method: 'POST', body: data });
  }

  public static listHouseholdLoans() {
    return this.request('/family-fund/loans');
  }

  public static getMonthlyPlan(month?: string) {
    const q = month ? `?month=${month}` : '';
    return this.request(`/family-fund/plan${q}`);
  }

  public static saveMonthlyPlan(data: any) {
    return this.request('/family-fund/plan', { method: 'POST', body: data });
  }

  public static closeAccountingPeriod(year: number, month: number) {
    return this.request('/family-fund/close-period', { method: 'POST', body: { year, month } });
  }

  public static listFundTransactions(month?: string) {
    const q = month ? `?month=${month}` : '';
    return this.request(`/family-fund/transactions${q}`);
  }

  public static getComprehensiveStatement(month?: string) {
    const q = month ? `?month=${month}` : '';
    return this.request(`/family-fund/statement${q}`);
  }

  // ==================== FAMILY TRANSFERS & CUSTODY WALLETS ====================
  public static transferFamilyMoney(data: {
    toUserId: string;
    fromAccountId: string;
    toAccountId?: string;
    amountPaisa: number;
    date?: string;
    purpose: string;
    note?: string;
    clientUuid?: string;
  }) {
    return this.request('/transfers', { method: 'POST', body: data });
  }

  public static returnUnusedCash(transferId: string, data: {
    amountPaisa: number;
    targetAccountId?: string;
    note?: string;
  }) {
    return this.request(`/transfers/${transferId}/return-unused`, { method: 'POST', body: data });
  }

  public static listFamilyTransfers() {
    return this.request('/transfers');
  }

  // ==================== ROOM CONFIGURATION ====================
  public static listRooms() {
    return this.request('/rooms');
  }

  public static createRoom(data: {
    roomName: string;
    monthlyRentPaisa: number;
    assignedMemberUserIds?: string[];
    notes?: string;
  }) {
    return this.request('/rooms', { method: 'POST', body: data });
  }

  public static updateRoom(roomId: string, data: any) {
    return this.request(`/rooms/${roomId}`, { method: 'PUT', body: data });
  }

  public static deleteRoom(roomId: string) {
    return this.request(`/rooms/${roomId}`, { method: 'DELETE' });
  }

  // ==================== MEMBER PROFILES & FAMILY RESPONSIBILITIES ====================
  public static listMemberProfiles() {
    return this.request('/member-profiles');
  }

  public static getMemberProfile(userId: string) {
    return this.request(`/member-profiles/${userId}`);
  }

  public static updateMemberProfile(userId: string, data: any) {
    return this.request(`/member-profiles/${userId}`, { method: 'PUT', body: data });
  }

  // ==================== SYNC ====================
  public static pushSync(changes: any[]) {
    return this.request('/sync/push', { method: 'POST', body: { changes } });
  }

  public static pullSync(sinceTimestamp: number) {
    return this.request(`/sync/pull?since=${sinceTimestamp}`);
  }
}

