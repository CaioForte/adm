-- Execute uma única vez no banco D1 do projeto. Cada recebimento fica vinculado ao evento.
CREATE TABLE IF NOT EXISTS sponsorship_receipts (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  received_date TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sponsorship_receipts_event_date
ON sponsorship_receipts(event_id, received_date);
