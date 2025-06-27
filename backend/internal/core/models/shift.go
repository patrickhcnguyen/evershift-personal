package models

import (
	"time"

	"github.com/google/uuid"
)

type Shift struct {
	UUID      uuid.UUID `gorm:"type:uuid;primaryKey"`
	EventID   uuid.UUID
	Date      time.Time
	StartTime time.Time
	EndTime   time.Time

	Event            Event             `gorm:"foreignKey:EventID"`
	ShiftAssignments []ShiftAssignment `gorm:"foreignKey:ShiftID"`
}
