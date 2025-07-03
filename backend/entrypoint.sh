#!/bin/bash
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set."
  exit 1
fi

# Extract components from DATABASE_URL
# Format: scheme://user:password@host:port/database?params
PG_HOST=$(echo "$DATABASE_URL" | sed -n 's#^postgres://[^@]*@\([^:/]*\).*#\1#p')
PG_PORT_RAW=$(echo "$DATABASE_URL" | sed -n 's#^postgres://[^@]*@[^:/]*:\([0-9]*\).*#\1#p')
PG_USER_RAW=$(echo "$DATABASE_URL" | sed -n 's#^postgres://\([^:]*\):[^@]*@.*#\1#p')
PG_DBNAME_RAW=$(echo "$DATABASE_URL" | sed -n 's#^postgres://[^@]*@[^/]*/\([^?]*\).*#\1#p')

# Use defaults if parsing failed or components are not in the URL (though they should be)
TARGET_HOST=${PG_HOST}
TARGET_PORT=${PG_PORT_RAW:-5432}
TARGET_USER=${PG_USER_RAW:-postgres}
TARGET_DBNAME=${PG_DBNAME_RAW:-evershift}

if [ -z "$TARGET_HOST" ]; then
  echo "Error: Could not parse host from DATABASE_URL: $DATABASE_URL"
  exit 1
fi

echo "Waiting for database at $TARGET_HOST:$TARGET_PORT (User: $TARGET_USER, DB: $TARGET_DBNAME)..."
for i in {1..30}; do
  if pg_isready -h "$TARGET_HOST" -p "$TARGET_PORT" -U "$TARGET_USER" -d "$TARGET_DBNAME" -q; then
    echo "Database is ready!"
    break
  fi
  echo "Waiting for database... ($i/30)"
  sleep 1
done

if [ $i -eq 30 ]; then
  echo "Database at $TARGET_HOST:$TARGET_PORT was not ready after 30 retries. Exiting."
  exit 1
fi

# Run migrations
echo "Running migrations..."
goose -dir ./internal/adapter/store/postgres/migrations postgres \
  "$DATABASE_URL" up

echo "Starting application..."
exec "$@"