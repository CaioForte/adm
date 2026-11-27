-- Numeração sequencial de placas por evento.
-- Executar UMA ÚNICA VEZ no D1 existente. Não apaga nem recria registros.

ALTER TABLE events ADD COLUMN plate_start_number INTEGER NOT NULL DEFAULT 1;
ALTER TABLE events ADD COLUMN last_plate_number INTEGER NOT NULL DEFAULT 0;

ALTER TABLE registrations ADD COLUMN plate_number INTEGER;

-- Eventos existentes começam a nova sequência em 1.
-- O primeiro cadastro após a migração receberá a placa 1.
