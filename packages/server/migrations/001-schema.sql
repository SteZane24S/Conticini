-- Conti
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revision TEXT NOT NULL,
  base_revision TEXT,
  name TEXT NOT NULL,
  initial_balance_cents INTEGER NOT NULL,
  opened_on TEXT NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0
);

-- Settori
CREATE TABLE sectors (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revision TEXT NOT NULL,
  base_revision TEXT,
  name TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_sectors_name ON sectors(name) WHERE deleted_at IS NULL;

-- Categorie
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revision TEXT NOT NULL,
  base_revision TEXT,
  sector_id TEXT NOT NULL REFERENCES sectors(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('entrata', 'uscita'))
);
CREATE UNIQUE INDEX idx_categories_sector_name ON categories(sector_id, name) WHERE deleted_at IS NULL;
CREATE INDEX idx_categories_sector ON categories(sector_id);

-- Movimenti
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revision TEXT NOT NULL,
  base_revision TEXT,
  date TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  category_id TEXT REFERENCES categories(id),
  description TEXT NOT NULL,
  description_norm TEXT NOT NULL,
  transfer_group_id TEXT
);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_transfer_group ON transactions(transfer_group_id);
CREATE INDEX idx_transactions_description_norm ON transactions(description_norm);

-- Cicli di stipendio
CREATE TABLE salary_cycles (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revision TEXT NOT NULL,
  base_revision TEXT,
  salary_transaction_id TEXT NOT NULL REFERENCES transactions(id),
  start_date TEXT NOT NULL,
  expected_next_date TEXT,
  expected_amount_cents INTEGER
);
CREATE UNIQUE INDEX idx_salary_cycles_transaction ON salary_cycles(salary_transaction_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_salary_cycles_start_date ON salary_cycles(start_date);

-- Spese fisse
CREATE TABLE recurring_expenses (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revision TEXT NOT NULL,
  base_revision TEXT,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('monthly', 'every_n_months', 'yearly')),
  interval INTEGER,
  anchor_day INTEGER NOT NULL,
  anchor_month INTEGER,
  start_date TEXT NOT NULL,
  end_date TEXT,
  amount_cents INTEGER NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  mode TEXT NOT NULL CHECK (mode IN ('auto', 'manual')),
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_recurring_expenses_category ON recurring_expenses(category_id);

-- Occorrenze delle spese fisse
CREATE TABLE recurring_occurrences (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revision TEXT NOT NULL,
  base_revision TEXT,
  recurring_id TEXT NOT NULL REFERENCES recurring_expenses(id),
  period TEXT NOT NULL,
  due_date TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  mode TEXT NOT NULL CHECK (mode IN ('auto', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'skipped')) DEFAULT 'pending',
  transaction_id TEXT REFERENCES transactions(id)
);
CREATE UNIQUE INDEX idx_recurring_occurrences_period ON recurring_occurrences(recurring_id, period) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_recurring_occurrences_transaction ON recurring_occurrences(transaction_id) WHERE deleted_at IS NULL AND transaction_id IS NOT NULL;
CREATE INDEX idx_recurring_occurrences_due_date ON recurring_occurrences(due_date);

-- Previsioni di spesa
CREATE TABLE budget_defaults (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revision TEXT NOT NULL,
  base_revision TEXT,
  category_id TEXT NOT NULL REFERENCES categories(id),
  amount_cents INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_budget_defaults_category ON budget_defaults(category_id) WHERE deleted_at IS NULL;

CREATE TABLE budget_overrides (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revision TEXT NOT NULL,
  base_revision TEXT,
  cycle_id TEXT NOT NULL REFERENCES salary_cycles(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  amount_cents INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_budget_overrides_cycle_category ON budget_overrides(cycle_id, category_id) WHERE deleted_at IS NULL;

-- Regole di categoria
CREATE TABLE category_rules (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revision TEXT NOT NULL,
  base_revision TEXT,
  pattern TEXT NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  priority INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_category_rules_active ON category_rules(active);

-- Registro delle modifiche
CREATE TABLE change_log (
  op_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  base_revision TEXT,
  revision TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_change_log_entity ON change_log(entity, entity_id);
