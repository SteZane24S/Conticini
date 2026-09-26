-- ricostruzione-tabelle
-- Fase 7: account_id diventa nullable su transactions, recurring_expenses, recurring_occurrences;
-- nuove tabelle per rettifiche (account_readings) e ancore del totale (total_anchors, total_anchor_covered_transactions).

CREATE TABLE transactions_new (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revision TEXT NOT NULL,
  base_revision TEXT,
  date TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  account_id TEXT REFERENCES accounts(id),
  category_id TEXT REFERENCES categories(id),
  description TEXT NOT NULL,
  description_norm TEXT NOT NULL,
  transfer_group_id TEXT,
  linked_position_id TEXT REFERENCES debt_credit_positions(id)
);

INSERT INTO transactions_new (
  id, created_at, updated_at, deleted_at, revision, base_revision,
  date, amount_cents, account_id, category_id, description, description_norm,
  transfer_group_id, linked_position_id
)
SELECT
  id, created_at, updated_at, deleted_at, revision, base_revision,
  date, amount_cents, account_id, category_id, description, description_norm,
  transfer_group_id, linked_position_id
FROM transactions;

DROP TABLE transactions;
ALTER TABLE transactions_new RENAME TO transactions;

CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_transfer_group ON transactions(transfer_group_id);
CREATE INDEX idx_transactions_description_norm ON transactions(description_norm);
CREATE INDEX idx_transactions_linked_position ON transactions(linked_position_id);

CREATE TABLE recurring_expenses_new (
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
  account_id TEXT REFERENCES accounts(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  mode TEXT NOT NULL CHECK (mode IN ('auto', 'manual')),
  active INTEGER NOT NULL DEFAULT 1
);

INSERT INTO recurring_expenses_new (
  id, created_at, updated_at, deleted_at, revision, base_revision,
  name, rule_type, interval, anchor_day, anchor_month, start_date, end_date,
  amount_cents, account_id, category_id, mode, active
)
SELECT
  id, created_at, updated_at, deleted_at, revision, base_revision,
  name, rule_type, interval, anchor_day, anchor_month, start_date, end_date,
  amount_cents, account_id, category_id, mode, active
FROM recurring_expenses;

DROP TABLE recurring_expenses;
ALTER TABLE recurring_expenses_new RENAME TO recurring_expenses;

CREATE INDEX idx_recurring_expenses_category ON recurring_expenses(category_id);

CREATE TABLE recurring_occurrences_new (
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
  account_id TEXT REFERENCES accounts(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  mode TEXT NOT NULL CHECK (mode IN ('auto', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'skipped')) DEFAULT 'pending',
  transaction_id TEXT REFERENCES transactions(id)
);

INSERT INTO recurring_occurrences_new (
  id, created_at, updated_at, deleted_at, revision, base_revision,
  recurring_id, period, due_date, amount_cents, account_id, category_id,
  mode, status, transaction_id
)
SELECT
  id, created_at, updated_at, deleted_at, revision, base_revision,
  recurring_id, period, due_date, amount_cents, account_id, category_id,
  mode, status, transaction_id
FROM recurring_occurrences;

DROP TABLE recurring_occurrences;
ALTER TABLE recurring_occurrences_new RENAME TO recurring_occurrences;

CREATE UNIQUE INDEX idx_recurring_occurrences_period ON recurring_occurrences(recurring_id, period) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_recurring_occurrences_transaction ON recurring_occurrences(transaction_id) WHERE deleted_at IS NULL AND transaction_id IS NOT NULL;
CREATE INDEX idx_recurring_occurrences_due_date ON recurring_occurrences(due_date);

CREATE TABLE account_readings (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revision TEXT NOT NULL,
  base_revision TEXT,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  date TEXT NOT NULL,
  balance_cents INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_account_readings_account_date ON account_readings(account_id, date) WHERE deleted_at IS NULL;
CREATE INDEX idx_account_readings_account ON account_readings(account_id);

CREATE TABLE total_anchors (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revision TEXT NOT NULL,
  base_revision TEXT,
  date TEXT NOT NULL,
  total_cents INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_total_anchors_date ON total_anchors(date) WHERE deleted_at IS NULL;

CREATE TABLE total_anchor_covered_transactions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revision TEXT NOT NULL,
  base_revision TEXT,
  anchor_id TEXT NOT NULL REFERENCES total_anchors(id),
  transaction_id TEXT NOT NULL REFERENCES transactions(id)
);
CREATE UNIQUE INDEX idx_anchor_covered_pair ON total_anchor_covered_transactions(anchor_id, transaction_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_anchor_covered_anchor ON total_anchor_covered_transactions(anchor_id);
