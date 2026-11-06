export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  type TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  is_global INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS personal_incomes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount_paisa INTEGER NOT NULL,
  source TEXT NOT NULL,
  category_id TEXT,
  date TEXT NOT NULL,
  note TEXT,
  client_uuid TEXT UNIQUE,
  is_synced INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS personal_expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount_paisa INTEGER NOT NULL,
  title TEXT NOT NULL,
  category_id TEXT,
  date TEXT NOT NULL,
  note TEXT,
  client_uuid TEXT UNIQUE,
  is_synced INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS household_expenses (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  paid_by_user_id TEXT,
  paid_from_fund INTEGER DEFAULT 0,
  amount_paisa INTEGER NOT NULL,
  category_id TEXT,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  split_type TEXT DEFAULT 'EQUAL',
  splits_json TEXT,
  approval_status TEXT DEFAULT 'APPROVED',
  client_uuid TEXT UNIQUE,
  is_synced INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS expense_requests (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  requested_by_user_id TEXT NOT NULL,
  amount_paisa INTEGER NOT NULL,
  category_id TEXT,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  split_type TEXT DEFAULT 'EQUAL',
  splits_json TEXT,
  status TEXT DEFAULT 'PENDING',
  rejection_reason TEXT,
  client_uuid TEXT UNIQUE,
  is_synced INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS contributions (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount_paisa INTEGER NOT NULL,
  date TEXT NOT NULL,
  payment_method TEXT DEFAULT 'CASH',
  reference TEXT,
  note TEXT,
  status TEXT DEFAULT 'VERIFIED',
  client_uuid TEXT UNIQUE,
  is_synced INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT,
  amount_paisa INTEGER NOT NULL,
  date TEXT NOT NULL,
  payment_method TEXT DEFAULT 'CASH',
  reference TEXT,
  note TEXT,
  status TEXT DEFAULT 'COMPLETED',
  client_uuid TEXT UNIQUE,
  is_synced INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS financial_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  household_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  account_number TEXT,
  bank_name TEXT,
  opening_balance_paisa INTEGER DEFAULT 0,
  current_balance_paisa INTEGER DEFAULT 0,
  is_archived INTEGER DEFAULT 0,
  notes TEXT,
  client_uuid TEXT UNIQUE,
  is_synced INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  household_id TEXT,
  name TEXT NOT NULL,
  phone TEXT,
  relationship TEXT NOT NULL,
  address TEXT,
  notes TEXT,
  opening_receivable_paisa INTEGER DEFAULT 0,
  opening_payable_paisa INTEGER DEFAULT 0,
  current_receivable_paisa INTEGER DEFAULT 0,
  current_payable_paisa INTEGER DEFAULT 0,
  is_archived INTEGER DEFAULT 0,
  client_uuid TEXT UNIQUE,
  is_synced INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS personal_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  household_id TEXT,
  account_id TEXT NOT NULL,
  person_id TEXT,
  direction TEXT NOT NULL,
  flow_type TEXT NOT NULL,
  amount_paisa INTEGER NOT NULL,
  date TEXT NOT NULL,
  due_date TEXT,
  purpose TEXT,
  description TEXT,
  notes TEXT,
  is_recoverable INTEGER DEFAULT 0,
  settled_amount_paisa INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  parent_transaction_id TEXT,
  interest_paisa INTEGER DEFAULT 0,
  reversal_reason TEXT,
  client_uuid TEXT UNIQUE,
  is_synced INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS account_transfers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  household_id TEXT,
  from_account_id TEXT NOT NULL,
  to_account_id TEXT NOT NULL,
  amount_paisa INTEGER NOT NULL,
  date TEXT NOT NULL,
  notes TEXT,
  is_reversed INTEGER DEFAULT 0,
  reversal_reason TEXT,
  client_uuid TEXT UNIQUE,
  is_synced INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS family_fund_transactions (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  date TEXT NOT NULL,
  month TEXT NOT NULL,
  direction TEXT NOT NULL,
  type TEXT NOT NULL,
  amount_paisa INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'CASH',
  source_account_id TEXT,
  member_user_id TEXT,
  reference TEXT,
  note TEXT,
  verified_by_user_id TEXT,
  client_uuid TEXT UNIQUE,
  is_synced INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS monthly_expense_plans (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  month TEXT NOT NULL,
  total_planned_budget_paisa INTEGER NOT NULL,
  items_json TEXT,
  member_expected_json TEXT,
  is_locked INTEGER DEFAULT 0,
  notes TEXT,
  client_uuid TEXT UNIQUE,
  is_synced INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS household_loans (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  lender_name TEXT NOT NULL,
  lender_phone TEXT,
  principal_paisa INTEGER NOT NULL,
  interest_paisa INTEGER DEFAULT 0,
  repaid_paisa INTEGER DEFAULT 0,
  start_date TEXT NOT NULL,
  due_date TEXT,
  status TEXT DEFAULT 'ACTIVE',
  notes TEXT,
  repayments_json TEXT,
  client_uuid TEXT UNIQUE,
  is_synced INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS family_money_transfers (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  from_account_id TEXT NOT NULL,
  to_account_id TEXT NOT NULL,
  amount_paisa INTEGER NOT NULL,
  date TEXT NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT DEFAULT 'CONFIRMED',
  unspent_remaining_paisa INTEGER DEFAULT 0,
  note TEXT,
  client_uuid TEXT UNIQUE,
  is_synced INTEGER DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS room_configurations (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  room_name TEXT NOT NULL,
  monthly_rent_paisa INTEGER NOT NULL,
  assigned_member_user_ids_json TEXT,
  notes TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_uuid TEXT UNIQUE NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  client_timestamp INTEGER NOT NULL,
  attempts INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PENDING',
  error_message TEXT
);
`;

