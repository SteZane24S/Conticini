-- Debiti e crediti (fase 6)
CREATE TABLE debt_credit_positions (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  revision TEXT NOT NULL,
  base_revision TEXT,
  description TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('debito', 'credito')),
  initial_amount_cents INTEGER NOT NULL,
  opened_on TEXT NOT NULL
);

ALTER TABLE transactions ADD COLUMN linked_position_id TEXT REFERENCES debt_credit_positions(id);
CREATE INDEX idx_transactions_linked_position ON transactions(linked_position_id);

-- Settore e categorie tecniche riservate al sistema (id deterministico, UUIDv5 su NAMESPACE_CONTICINI di packages/dominio)
INSERT INTO sectors (id, created_at, updated_at, deleted_at, revision, base_revision, name)
VALUES (
  'd69f8576-297f-5e81-9b8f-3e08ff260840',
  '2026-09-21T00:00:00.000Z',
  '2026-09-21T00:00:00.000Z',
  NULL,
  '3c39f64e-4988-5165-98a2-08181dfbd072',
  NULL,
  'Debiti e crediti (tecnico)'
);

INSERT INTO categories (id, created_at, updated_at, deleted_at, revision, base_revision, sector_id, name, kind)
VALUES (
  '5977fe44-56c3-5051-ab56-e2dfe1de792b',
  '2026-09-21T00:00:00.000Z',
  '2026-09-21T00:00:00.000Z',
  NULL,
  'aa9658a8-c4d6-5497-afaf-3252a1b45be8',
  NULL,
  'd69f8576-297f-5e81-9b8f-3e08ff260840',
  'Pagamento debiti',
  'uscita'
);

INSERT INTO categories (id, created_at, updated_at, deleted_at, revision, base_revision, sector_id, name, kind)
VALUES (
  '0241aadc-5e40-504f-a15a-56cc766936b1',
  '2026-09-21T00:00:00.000Z',
  '2026-09-21T00:00:00.000Z',
  NULL,
  '5ec2d503-ef5a-5112-943a-b70bd083c07f',
  NULL,
  'd69f8576-297f-5e81-9b8f-3e08ff260840',
  'Incasso crediti',
  'entrata'
);
