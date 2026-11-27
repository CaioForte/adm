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
