-- Execução colaborativa dos checklists e trilha de auditoria.
-- Execute UMA ÚNICA VEZ no D1 usado pelo Worker.

ALTER TABLE checklist_items ADD COLUMN execution_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (execution_status IN ('pending','in_progress','resolved'));
ALTER TABLE checklist_items ADD COLUMN resolved_by TEXT;
ALTER TABLE checklist_items ADD COLUMN resolved_at TEXT;

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
  r2_key TEXT NOT NULL UNIQUE,
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


-- Backfill: registra a criação/inativação dos itens existentes antes desta etapa.
INSERT INTO checklist_history (checklist_id,checklist_item_id,event_id,actor_id,actor_name,actor_email,action,details,created_at)
SELECT c.checklist_id,i.checklist_item_id,c.event_id,
       COALESCE(CAST(i.created_by AS TEXT),'system'),
       COALESCE(a.name,'Registro anterior'),COALESCE(a.email,''),
       'item_created','Item já existente quando a auditoria de execução foi habilitada.',
       COALESCE(i.created_at,CURRENT_TIMESTAMP)
FROM checklist_items i
INNER JOIN checklists c ON c.checklist_id=i.checklist_id
LEFT JOIN admins a ON CAST(a.id AS TEXT)=CAST(i.created_by AS TEXT)
WHERE NOT EXISTS (
  SELECT 1 FROM checklist_history h
  WHERE h.checklist_item_id=i.checklist_item_id AND h.action='item_created'
);

INSERT INTO checklist_history (checklist_id,checklist_item_id,event_id,actor_id,actor_name,actor_email,action,details,created_at)
SELECT c.checklist_id,i.checklist_item_id,c.event_id,
       COALESCE(CAST(i.inactivated_by AS TEXT),'system'),
       COALESCE(a.name,'Registro anterior'),COALESCE(a.email,''),
       'item_inactivated','Item já estava inativo quando a auditoria de execução foi habilitada.',
       COALESCE(i.inactivated_at,CURRENT_TIMESTAMP)
FROM checklist_items i
INNER JOIN checklists c ON c.checklist_id=i.checklist_id
LEFT JOIN admins a ON CAST(a.id AS TEXT)=CAST(i.inactivated_by AS TEXT)
WHERE i.active=0 AND i.inactivated_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM checklist_history h
    WHERE h.checklist_item_id=i.checklist_item_id AND h.action='item_inactivated'
  );
