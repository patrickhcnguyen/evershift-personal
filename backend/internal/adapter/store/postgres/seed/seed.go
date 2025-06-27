package repositories

import (
	"backend/internal/core/models"

	"gorm.io/gorm"
)

func SeedDatabase(db *gorm.DB) error {
	// Only seed if tables are empty
	var count int64
	db.Model(&models.Branch{}).Count(&count)
	if count > 0 {
		return nil // Database already has data
	}

	// Create branches
	branches := []models.Branch{
		{Name: "Downtown Branch", Latitude: 40.7128, Longitude: -74.0060},
		{Name: "Uptown Branch", Latitude: 40.8075, Longitude: -73.9626},
	}

	if err := db.Create(&branches).Error; err != nil {
		return err
	}

	return nil
}
