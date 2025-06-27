// creating a new db connection and automigrating models

package repositories

import (
	"backend/internal/core/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func NewDatabase(dsn string) (*gorm.DB, error) {
	config := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	}

	db, err := gorm.Open(postgres.Open(dsn), config)
	if err != nil {
		return nil, err
	}

	// Auto-migrate models
	err = db.AutoMigrate(
		&models.User{},
		&models.Uniform{},
		&models.ShiftAssignment{},
		&models.Shift{},
		&models.Event{},
		&models.StaffRequirement{},
		&models.Invoice{},
		&models.Request{},
		&models.Branch{},
	)
	if err != nil {
		return nil, err
	}

	return db, nil
}
