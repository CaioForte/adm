-- Execute uma única vez no D1. Adiciona o vínculo do comprovante aos recebimentos já cadastrados.
ALTER TABLE sponsorship_receipts ADD COLUMN proof_file_id TEXT;
ALTER TABLE sponsorship_receipts ADD COLUMN proof_file_name TEXT;
ALTER TABLE sponsorship_receipts ADD COLUMN proof_url TEXT;
