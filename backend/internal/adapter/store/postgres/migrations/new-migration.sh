#!/bin/bash

# Navigate to the migrations directory using relative paths
SCRIPT_DIR="$(dirname "$(realpath "$0")")"
cd "$SCRIPT_DIR"

# Check if a migration name was provided
if [ -z "$1" ]; then
  echo "Usage: ./new-migration.sh <migration_name>"
  exit 1
fi

# Get the next migration number
LAST_MIGRATION=$(ls -1 [0-9]*.sql 2>/dev/null | sort -V | tail -n 1 | sed 's/_.*//')
if [ -z "$LAST_MIGRATION" ]; then
  NEXT_NUM="000001"
else
  NEXT_NUM=$(printf "%06d" $((10#${LAST_MIGRATION} + 1)))
fi

# Create the filename
FILENAME="${NEXT_NUM}_${1}.sql"

# Create the migration file manually
cat > "$FILENAME" << EOF
-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Your SQL code here

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Rollback SQL goes here
-- +goose StatementEnd
EOF

echo "Created migration: $FILENAME"