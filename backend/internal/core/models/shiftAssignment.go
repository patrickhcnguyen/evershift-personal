package models

import (
	"github.com/google/uuid"
)

type ShiftAssignment struct {
	ShiftID           uuid.UUID `gorm:"primaryKey"`
	EmployeeID        uuid.UUID `gorm:"primaryKey"`
	IsShiftLead       bool
	Status            string
	RequiredUniformID uuid.UUID

	Shift    Shift   `gorm:"foreignKey:ShiftID"`
	Employee User    `gorm:"foreignKey:EmployeeID"`
	Uniform  Uniform `gorm:"foreignKey:RequiredUniformID"`
}
