package models

import (
	"time"

	"github.com/google/uuid"
)

type Email struct {
	RequestID uuid.UUID `gorm:"not null"`
	ID        uuid.UUID `gorm:"type:uuid;primary_key;"`
	Subject   string    `gorm:"not null"`
	CC        []string  `gorm:"type:text[]"`
	BCC       []string  `gorm:"type:text[]"`
	ReplyTo   string    `gorm:"not null"`
	CreatedAt time.Time `gorm:"not null"`
	UpdatedAt time.Time `gorm:"not null"`
}

type EmailHeaders struct {
	Subject string   `json:"subject,omitempty"`
	CC      []string `json:"cc,omitempty"`
	BCC     []string `json:"bcc,omitempty"`
	ReplyTo string   `json:"replyTo,omitempty"`
}
