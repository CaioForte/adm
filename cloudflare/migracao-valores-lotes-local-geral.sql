-- Itaitinga MTB Race - valores geral e local por lote
-- Executar UMA ÚNICA VEZ no D1 de produção.
-- Preserva o preço atual como valor geral e local para que nenhum lote existente
-- perca seu preço durante a transição. O campo amount_cents continua como
-- espelho do valor geral para compatibilidade com o fluxo atual de inscrições.

ALTER TABLE batches ADD COLUMN general_amount_cents INTEGER;
ALTER TABLE batches ADD COLUMN local_amount_cents INTEGER;

UPDATE batches
SET general_amount_cents = COALESCE(amount_cents, 0),
    local_amount_cents = COALESCE(amount_cents, 0);
