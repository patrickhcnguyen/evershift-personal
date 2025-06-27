-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE custom_line_items (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES requests(uuid),
    description TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    rate NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) GENERATED ALWAYS AS (quantity * rate) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Rollback SQL goes here
-- +goose StatementEnd
