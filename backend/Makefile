.PHONY: dev up down migrate build-prod migrate-env migrate-local

# Dev mode: Dockerize backend + local DB
dev:
	docker-compose --env-file .env up --build

up:
	docker-compose --env-file .env up -d

down:
	docker-compose down

migrate:
	docker-compose exec app goose -dir ./internal/adapter/store/postgres/migrations postgres \
	"postgres://postgres:postgres@db:5432/evershift" up

migrate-rds:
	goose -dir ./internal/adapter/store/postgres/migrations postgres \
		"postgres://postgres:postgres@evershift-dev-db.c7qysuy0ecf8.us-east-2.rds.amazonaws.com:5432/evershift?sslmode=require" up

# Alternative migration command using environment variables
migrate-env:
	docker-compose exec app goose -dir ./internal/adapters/store/postgres/migrations postgres \
	"host=$${DB_HOST} user=$${DB_USER} password=$${DB_PASSWORD} dbname=$${DB_NAME} sslmode=disable" up

# Production build (used in CI/CD)
build-prod:
	docker build -t evershift-backend:prod .

# Local migration without Docker (for development)
migrate-local:
	goose -dir ./internal/adapters/store/postgres/migrations postgres \
	"postgres://postgres:postgres@localhost:5432/evershift" up
