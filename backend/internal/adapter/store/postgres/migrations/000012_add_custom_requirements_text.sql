-- +goose Up
-- +goose StatementBegin
ALTER TABLE requests ADD COLUMN IF NOT EXISTS custom_requirements_text TEXT DEFAULT '';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE requests DROP COLUMN IF EXISTS custom_requirements_text;
-- +goose StatementEnd