-- Execute uma única vez no D1 do projeto. Mantém o histórico de cada parcela e os metadados dos arquivos no Google Drive.
CREATE TABLE IF NOT EXISTS expense_payments (
  id TEXT PRIMARY KEY,
  expense_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  payment_date TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  observation TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_expense_payments_expense ON expense_payments(expense_id);
CREATE TABLE IF NOT EXISTS expense_payment_attachments (
  id TEXT PRIMARY KEY,
  payment_id TEXT NOT NULL,
  drive_file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  description TEXT NOT NULL,
  drive_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES expense_payments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_expense_payment_attachments_payment ON expense_payment_attachments(payment_id);
