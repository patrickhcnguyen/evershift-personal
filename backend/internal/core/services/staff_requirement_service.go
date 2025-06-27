// called by handler, call outbound port
package services

import (
	"backend/internal/core/models"
	"backend/internal/core/ports"
	"context"

	"github.com/google/uuid"
)

type StaffRequirementService struct {
	staffRequirementRepository ports.StaffRequirementRepository
}

func NewStaffRequirementService(staffRequirementRepository ports.StaffRequirementRepository) *StaffRequirementService {
	return &StaffRequirementService{
		staffRequirementRepository: staffRequirementRepository,
	}
}

func (s *StaffRequirementService) CreateStaffRequirement(ctx context.Context, staffRequirement *models.StaffRequirement) error {
	return s.staffRequirementRepository.CreateStaffRequirement(ctx, staffRequirement)
}

func (s *StaffRequirementService) GetStaffRequirementById(ctx context.Context, id uuid.UUID) (models.StaffRequirement, error) {
	return s.staffRequirementRepository.GetStaffRequirementById(ctx, id)
}

func (s *StaffRequirementService) GetAllStaffRequirementsByRequestID(ctx context.Context, requestID uuid.UUID) ([]models.StaffRequirement, error) {
	return s.staffRequirementRepository.GetAllStaffRequirementsByRequestID(ctx, requestID)
}

func (s *StaffRequirementService) UpdateStaffRequirement(ctx context.Context, staffRequirement *models.StaffRequirement) error {
	return s.staffRequirementRepository.UpdateStaffRequirement(ctx, staffRequirement)
}

func (s *StaffRequirementService) DeleteStaffRequirement(ctx context.Context, id uuid.UUID) error {
	return s.staffRequirementRepository.DeleteStaffRequirement(ctx, id)
}

func (s *StaffRequirementService) GetRate(ctx context.Context, staffType string, location string) (float64, error) {
	return s.staffRequirementRepository.GetRate(ctx, staffType, location)
}
