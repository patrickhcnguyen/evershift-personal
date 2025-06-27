package models

import (
	"time"

	"github.com/google/uuid"
)

type StaffRequirement struct {
	UUID      uuid.UUID `gorm:"type:uuid;primaryKey" json:"uuid"`
	RequestID uuid.UUID `json:"request_id"`
	Date      time.Time `json:"date"`
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
	Position  string    `json:"position"`
	Rate      float64   `json:"rate"`
	Count     int       `json:"count"`
	Amount    float64   `json:"amount"`

	Request Request `gorm:"foreignKey:RequestID" json:"-"`
}
