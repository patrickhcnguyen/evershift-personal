package models

import (
	"time"

	"github.com/google/uuid"
)

type CustomLineItems struct {
	UUID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"uuid"`
	RequestID   uuid.UUID `gorm:"type:uuid;not null" json:"request_id"`
	Description string    `gorm:"not null" json:"description"`
	Quantity    int       `gorm:"not null;default:1;check:quantity > 0" json:"quantity"`
	Rate        float64   `gorm:"not null;default:0;check:rate >= 0" json:"rate"`
	Total       float64   `gorm:"->;check:total >= 0" json:"total"`
	CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
	Request     Request   `gorm:"foreignKey:RequestID" json:"-"`
}
