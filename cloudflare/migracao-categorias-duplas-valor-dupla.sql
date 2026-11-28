-- Itaitinga MTB Race - categorias individuais/duplas e preço de duplas por lote
-- Executar UMA ÚNICA VEZ no D1 antes de publicar o Worker atualizado.
ALTER TABLE categories ADD COLUMN participation_type TEXT NOT NULL DEFAULT 'INDIVIDUAL';
ALTER TABLE categories ADD COLUMN composition TEXT NOT NULL DEFAULT 'LIVRE';
ALTER TABLE batches ADD COLUMN double_amount_cents INTEGER;

-- Migra as categorias já existentes para preservar o comportamento atual.
UPDATE categories
SET participation_type = CASE
  WHEN lower(name) LIKE 'dupla %' THEN 'DUPLA'
  ELSE 'INDIVIDUAL'
END,
composition = CASE
  WHEN lower(name) LIKE 'dupla masculina%' THEN 'MASCULINA'
  WHEN lower(name) LIKE 'dupla feminina%' THEN 'FEMININA'
  WHEN lower(name) LIKE 'dupla mista%' THEN 'MISTA'
  WHEN lower(name) LIKE '%masculin%' THEN 'MASCULINA'
  WHEN lower(name) LIKE '%feminin%' THEN 'FEMININA'
  ELSE 'LIVRE'
END;

-- Mantém o preço geral atual como valor inicial para duplas.
UPDATE batches
SET double_amount_cents = COALESCE(general_amount_cents, amount_cents, 0);
