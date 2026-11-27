-- Cadastro de eventos: executar uma única vez no D1 existente.
-- Não remove nem recria tabelas ou registros.
ALTER TABLE events ADD COLUMN start_date TEXT;
ALTER TABLE events ADD COLUMN maps_url TEXT;
