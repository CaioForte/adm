-- Execute uma única vez no D1 de produção.
-- Categorias existentes permanecem como gerais (is_local = 0).
ALTER TABLE categories ADD COLUMN is_local INTEGER NOT NULL DEFAULT 0;
