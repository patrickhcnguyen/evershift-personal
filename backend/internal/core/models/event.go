package models

import (
	"time"

	"github.com/google/uuid"
)

type Event struct {
	UUID       uuid.UUID `gorm:"type:uuid;primaryKey"`
	RequestID  uuid.UUID
	StartDate  time.Time
	EndDate    time.Time
	StartHour  time.Time
	EndHour    time.Time
	Status     string
	Notes      string
	BranchID   uuid.UUID
	BranchName string
	CreatedAt  time.Time

	Request Request `gorm:"foreignKey:RequestID"`
	Branch  Branch  `gorm:"foreignKey:BranchID"`
	Shifts  []Shift `gorm:"foreignKey:EventID"`
}
