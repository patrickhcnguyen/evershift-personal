package models

import (
	"time"

	"github.com/google/uuid"
)

type Rate struct {
	UUID       uuid.UUID `gorm:"type:uuid;primaryKey"`
	BranchID   uuid.UUID `gorm:"type:uuid"`
	StaffType  string    `gorm:"type:varchar(255)"`
	HourlyRate float64   `gorm:"type:decimal(10,2)"`
	CreatedAt  time.Time `gorm:"autoCreateTime"`
	// updatedAt  time.Time `gorm:"autoUpdateTime"`
}
