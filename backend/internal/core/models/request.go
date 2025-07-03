package models

import (
	"time"

	"github.com/google/uuid"
)

type Request struct {
	UUID                   uuid.UUID `gorm:"type:uuid;primaryKey"`
	FirstName              string
	LastName               string
	Email                  string
	IsCompany              bool
	CompanyName            string
	TypeOfEvent            string
	PhoneNumber            string
	StartDate              time.Time
	EndDate                time.Time
	ClosestBranchID        uuid.UUID
	ClosestBranchName      string
	EventLocation          string
	DateRequested          time.Time
	CustomRequirementsText string

	Invoices          []Invoice          `gorm:"foreignKey:RequestID"`
	StaffRequirements []StaffRequirement `gorm:"foreignKey:RequestID"`
	Events            []Event            `gorm:"foreignKey:RequestID"`
}
