package models

import (
	"github.com/google/uuid"
)

type Branch struct {
	UUID      uuid.UUID `gorm:"type:uuid;primaryKey"`
	Name      string
	Latitude  float64
	Longitude float64

	Users    []User    `gorm:"foreignKey:BranchID"`
	Requests []Request `gorm:"foreignKey:ClosestBranchID"`
	Events   []Event   `gorm:"foreignKey:BranchID"`
}
