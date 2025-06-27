-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
ALTER TABLE invoices ADD COLUMN follow_up_delay_days INTEGER DEFAULT 0;

-- Your SQL code here

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Rollback SQL goes here
-- +goose StatementEnd
