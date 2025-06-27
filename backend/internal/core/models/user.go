package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in our system
type User struct {
	UUID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	Email             string
	FirstName         string
	LastName          string
	PhoneNumber       string
	ProfilePictureURL string // S3 URL
	BranchID          uuid.UUID
	Role              string
	CreatedAt         time.Time

	Branch Branch `gorm:"foreignKey:BranchID"`
}
