
PRAGMA foreign_keys = ON;

-- EVENTOS
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- USUÁRIOS ADMINISTRATIVOS
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);

-- CATEGORIAS
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  max_age INTEGER,
  required_documents TEXT,
  is_local INTEGER NOT NULL DEFAULT 0,
  participation_type TEXT NOT NULL DEFAULT 'INDIVIDUAL',
  composition TEXT NOT NULL DEFAULT 'LIVRE',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

-- LOTES
CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  general_amount_cents INTEGER,
  local_amount_cents INTEGER,
  double_amount_cents INTEGER,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

-- INSCRIÇÕES
CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  registration_number TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL,
  category_id TEXT,
  batch_id TEXT,
  name TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  phone TEXT,
  category_name TEXT,
  payment_status TEXT NOT NULL DEFAULT 'PENDENTE',
  registration_status TEXT NOT NULL DEFAULT 'PENDENTE',
  amount_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  order_nsu TEXT,
  payment_method TEXT,
  transaction_nsu TEXT,
  payment_proof_key TEXT,
  payment_date TEXT,
  checkout_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

-- CONFIGURAÇÕES
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT,
  setting_key TEXT NOT NULL,
  setting_value TEXT,
  UNIQUE(event_id, setting_key),
  FOREIGN KEY (event_id) REFERENCES events(id)
);

-- DOCUMENTOS E ARQUIVOS NO R2
CREATE TABLE IF NOT EXISTS registration_documents (
  id TEXT PRIMARY KEY,
  registration_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  object_key TEXT NOT NULL,
  content_type TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (registration_id) REFERENCES registrations(id)
);

-- ÍNDICES PARA CONSULTAS
CREATE INDEX IF NOT EXISTS idx_registrations_event
ON registrations(event_id);

CREATE INDEX IF NOT EXISTS idx_registrations_cpf
ON registrations(cpf);

CREATE INDEX IF NOT EXISTS idx_registrations_payment
ON registrations(payment_status);

CREATE INDEX IF NOT EXISTS idx_categories_event
ON categories(event_id);

CREATE INDEX IF NOT EXISTS idx_batches_event
ON batches(event_id);

-- EVENTOS INICIAIS
INSERT OR IGNORE INTO events (id, name, type, active)
VALUES
  ('MTB2026', 'Itaitinga MTB Race', 'MTB', 1),
  ('TRAIL2026', 'Itaitinga Trail Run', 'TRAIL', 1);




CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,

    FOREIGN KEY (admin_id)
        REFERENCES admins(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_admin
ON sessions(admin_id);

CREATE INDEX IF NOT EXISTS idx_sessions_expiration
ON sessions(expires_at);


ALTER TABLE admins
ADD COLUMN password_salt TEXT;

CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES admins(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_admin
ON sessions(admin_id);

CREATE INDEX IF NOT EXISTS idx_sessions_expiration
ON sessions(expires_at);

-- DESPESAS
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    expense_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    supplier_company TEXT,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDENTE',
    due_date TEXT,
    payment_date TEXT,
    payment_method TEXT,
    payment_observation TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT,

    FOREIGN KEY (event_id)
        REFERENCES events(id),

    UNIQUE (event_id, expense_number)
);

CREATE INDEX IF NOT EXISTS idx_expenses_event
ON expenses(event_id);

CREATE INDEX IF NOT EXISTS idx_expenses_status
ON expenses(status);


-- ANEXOS DAS DESPESAS
CREATE TABLE IF NOT EXISTS expense_documents (
    id TEXT PRIMARY KEY,
    expense_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    object_key TEXT NOT NULL,
    content_type TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (expense_id)
        REFERENCES expenses(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_expense_documents_expense
ON expense_documents(expense_id);



ALTER TABLE registrations ADD COLUMN birth_date TEXT;
ALTER TABLE registrations ADD COLUMN state TEXT;
ALTER TABLE registrations ADD COLUMN city TEXT;
ALTER TABLE registrations ADD COLUMN pcd TEXT;
ALTER TABLE registrations ADD COLUMN team TEXT;
ALTER TABLE registrations ADD COLUMN created_by TEXT;
ALTER TABLE registrations ADD COLUMN payment_email_sent_at TEXT;
ALTER TABLE registrations ADD COLUMN cpf_normalized TEXT;


CREATE UNIQUE INDEX IF NOT EXISTS
idx_registrations_event_cpf
ON registrations(event_id, cpf_normalized)
WHERE cpf_normalized IS NOT NULL
AND cpf_normalized <> '';


ALTER TABLE expenses
ADD COLUMN responsible TEXT;

ALTER TABLE expenses
ADD COLUMN supplier_contact TEXT;

ALTER TABLE registration_documents
ADD COLUMN document_type TEXT;

-- RECEBIMENTOS DE PATROCÍNIOS
CREATE TABLE IF NOT EXISTS sponsorship_receipts (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  sponsor_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  received_date TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  proof_file_id TEXT,
  proof_file_name TEXT,
  proof_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sponsorship_receipts_event_date
ON sponsorship_receipts(event_id, received_date);


-- CHECKLISTS VINCULADOS A EVENTOS
-- Cadastro de checklists por evento (executar uma única vez no D1)
CREATE TABLE IF NOT EXISTS checklists (
  checklist_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  archived_at TEXT,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

CREATE INDEX IF NOT EXISTS idx_checklists_event_status
  ON checklists(event_id, status, checklist_id);

CREATE TABLE IF NOT EXISTS checklist_items (
  checklist_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  checklist_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  execution_status TEXT NOT NULL DEFAULT 'pending' CHECK (execution_status IN ('pending','in_progress','resolved')),
  resolved_by TEXT,
  resolved_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  inactivated_by TEXT,
  inactivated_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  FOREIGN KEY (checklist_id) REFERENCES checklists(checklist_id)
);

CREATE INDEX IF NOT EXISTS idx_checklist_items_parent
  ON checklist_items(checklist_id, checklist_item_id);


-- Execução colaborativa e auditoria dos checklists
CREATE TABLE IF NOT EXISTS checklist_history (
  history_id INTEGER PRIMARY KEY AUTOINCREMENT,
  checklist_id INTEGER NOT NULL,
  checklist_item_id INTEGER NOT NULL,
  event_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_email TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  previous_status TEXT,
  new_status TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (checklist_id) REFERENCES checklists(checklist_id),
  FOREIGN KEY (checklist_item_id) REFERENCES checklist_items(checklist_item_id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);
CREATE INDEX IF NOT EXISTS idx_checklist_history_item ON checklist_history(checklist_item_id, history_id DESC);
CREATE INDEX IF NOT EXISTS idx_checklist_history_event ON checklist_history(event_id, created_at DESC);

CREATE TABLE IF NOT EXISTS checklist_audit (
  audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  checklist_id INTEGER NOT NULL,
  event_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_email TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (checklist_id) REFERENCES checklists(checklist_id),
  FOREIGN KEY (event_id) REFERENCES events(id)
);
CREATE INDEX IF NOT EXISTS idx_checklist_audit_parent ON checklist_audit(checklist_id, audit_id DESC);

CREATE TABLE IF NOT EXISTS checklist_attachments (
  attachment_id TEXT PRIMARY KEY,
  checklist_id INTEGER NOT NULL,
  checklist_item_id INTEGER NOT NULL,
  event_id TEXT NOT NULL,
  r2_key TEXT NOT NULL UNIQUE, -- Referência de armazenamento: drive:<fileId> para Google Drive; chaves antigas do R2 continuam suportadas.
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by TEXT NOT NULL,
  uploaded_by_name TEXT NOT NULL,
  history_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (checklist_id) REFERENCES checklists(checklist_id),
  FOREIGN KEY (checklist_item_id) REFERENCES checklist_items(checklist_item_id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (history_id) REFERENCES checklist_history(history_id)
);
CREATE INDEX IF NOT EXISTS idx_checklist_attachments_item ON checklist_attachments(checklist_item_id, created_at DESC);
