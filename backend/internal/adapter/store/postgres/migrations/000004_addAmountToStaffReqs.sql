-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE staff_requirements ADD COLUMN amount DECIMAL(10, 2) NOT NULL DEFAULT 0;


-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Rollback SQL goes here
-- +goose StatementEnd
