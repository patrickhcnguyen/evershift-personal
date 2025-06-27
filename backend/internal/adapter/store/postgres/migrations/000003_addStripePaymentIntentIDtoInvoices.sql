-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE invoices ADD COLUMN payment_intent VARCHAR(255);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Rollback SQL goes here
-- +goose StatementEnd
