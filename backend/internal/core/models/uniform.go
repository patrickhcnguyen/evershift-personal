package models

import (
	"github.com/google/uuid"
)

type Uniform struct {
	UUID        uuid.UUID `gorm:"type:uuid;primaryKey"`
	Name        string
	Description string
	S3URL       string

	Assignments []ShiftAssignment `gorm:"foreignKey:RequiredUniformID"`
}
