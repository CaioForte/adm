-- Migração incremental: gerenciamento de usuários no Worker.
-- Execute uma única vez no banco D1 existente. Não remove nem recria dados.

ALTER TABLE admins ADD COLUMN is_superadmin INTEGER NOT NULL DEFAULT 0;

-- O banco atualmente possui apenas o administrador original.
-- Promove o primeiro usuário existente para administrador principal.
UPDATE admins
SET is_superadmin = 1
WHERE id = (SELECT id FROM admins ORDER BY created_at, id LIMIT 1);

CREATE TABLE IF NOT EXISTS admin_event_access (
  admin_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (admin_id, event_id),
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_event_access_event
ON admin_event_access(event_id);
