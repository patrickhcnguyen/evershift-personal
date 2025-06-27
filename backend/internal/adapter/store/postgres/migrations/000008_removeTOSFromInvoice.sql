-- +goose Up
-- +goose StatementBegin
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- ALTER TABLE invoices DROP COLUMN terms_of_service;

-- Your SQL code here

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Rollback SQL goes here
-- +goose StatementEnd
