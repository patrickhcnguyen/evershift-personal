// this is connected up to the requess table
package ports

import (
	"backend/internal/core/models"

	"context"

	"github.com/google/uuid"
)

type StaffRequirementRepository interface {
	CreateStaffRequirement(ctx context.Context, staffRequirement *models.StaffRequirement) error                    // create a new staff requirement
	GetStaffRequirementById(ctx context.Context, id uuid.UUID) (models.StaffRequirement, error)                     // get a staff requirement by id
	GetAllStaffRequirementsByRequestID(ctx context.Context, requestID uuid.UUID) ([]models.StaffRequirement, error) // get all staff requirements by request id
	UpdateStaffRequirement(ctx context.Context, staffRequirement *models.StaffRequirement) error                    // update a staff requirement
	DeleteStaffRequirement(ctx context.Context, id uuid.UUID) error                                                 // delete a staff requirement
	GetRate(ctx context.Context, staffType string, location string) (float64, error)
}

type StaffRequirementService interface {
	CreateStaffRequirement(ctx context.Context, staffRequirement *models.StaffRequirement) error
	GetStaffRequirementById(ctx context.Context, id uuid.UUID) (models.StaffRequirement, error)
	GetAllStaffRequirementsByRequestID(ctx context.Context, requestID uuid.UUID) ([]models.StaffRequirement, error)
	UpdateStaffRequirement(ctx context.Context, staffRequirement *models.StaffRequirement) error
	DeleteStaffRequirement(ctx context.Context, id uuid.UUID) error
	GetRate(ctx context.Context, staffType string, location string) (float64, error)
}
