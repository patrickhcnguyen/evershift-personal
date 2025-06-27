// internal/adapters/store/postgres/migrate.go
package postgres

import (
	"database/sql"
	"fmt"
	"log"
	"path/filepath"
	"runtime"

	_ "github.com/lib/pq"
	"github.com/pressly/goose/v3"
)

// RunMigrations runs all the SQL migrations in the migrations directory
func RunMigrations(dbURL string) error {
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		return err
	}
	defer db.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}

	// Get the path to migrations relative to this file
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		return fmt.Errorf("unable to get the current file path")
	}

	migrationsDir := filepath.Join(filepath.Dir(filename), "migrations")

	log.Printf("Running migrations from: %s", migrationsDir)

	if err := goose.Up(db, migrationsDir); err != nil {
		return err
	}

	log.Println("Migrations completed successfully")
	return nil
}
