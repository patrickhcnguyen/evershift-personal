package repository

import (
	"context"
	"fmt"
	"log"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"backend/internal/core/models"
	ports "backend/internal/core/ports"
)

type StaffRequirementRepository struct {
	db *gorm.DB
}

func NewStaffRequirementRepository(db *gorm.DB) ports.StaffRequirementRepository {
	return &StaffRequirementRepository{db: db}
}

func (r *StaffRequirementRepository) CreateStaffRequirement(ctx context.Context, staffRequirement *models.StaffRequirement) error {
	if staffRequirement.UUID == uuid.Nil {
		staffRequirement.UUID = uuid.New()
	}

	log.Printf("Creating staff requirement: %+v", staffRequirement)

	err := r.db.WithContext(ctx).Create(staffRequirement).Error
	if err != nil {
		log.Printf("Error creating staff requirement: %v", err)
		return err
	}

	log.Printf("Successfully created staff requirement with UUID: %s", staffRequirement.UUID)
	return nil
}

func (r *StaffRequirementRepository) GetStaffRequirementById(ctx context.Context, id uuid.UUID) (models.StaffRequirement, error) {
	var staffRequirement models.StaffRequirement
	err := r.db.WithContext(ctx).Where("uuid = ?", id).First(&staffRequirement).Error
	return staffRequirement, err
}

func (r *StaffRequirementRepository) GetAllStaffRequirementsByRequestID(ctx context.Context, requestID uuid.UUID) ([]models.StaffRequirement, error) {
	var staffRequirements []models.StaffRequirement
	err := r.db.WithContext(ctx).Where("request_id = ?", requestID).Find(&staffRequirements).Error
	return staffRequirements, err
}

func (r *StaffRequirementRepository) UpdateStaffRequirement(ctx context.Context, staffRequirement *models.StaffRequirement) error {
	return r.db.WithContext(ctx).Save(staffRequirement).Error // update using GORM Save method
}

func (r *StaffRequirementRepository) DeleteStaffRequirement(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.StaffRequirement{}, id).Error // delete using GORM Delete method
}

func (r *StaffRequirementRepository) GetRate(ctx context.Context, staffType string, location string) (float64, error) {
	var rate models.Rate
	err := r.db.WithContext(ctx).
		Where("staff_type = ? AND branch_id = ?", staffType, location).
		First(&rate).Error

	if err != nil {
		// If no specific rate found for this branch/staff type, try to find a default rate
		// from any branch for this staff type as fallback
		err = r.db.WithContext(ctx).
			Where("staff_type = ?", staffType).
			First(&rate).Error

		if err != nil {
			return 0, fmt.Errorf("no rate found for staff type %s in branch %s", staffType, location)
		}
	}

	return rate.HourlyRate, nil
}

func (r *StaffRequirementRepository) GetStaffRequirementByRequestID(ctx context.Context, id uuid.UUID) (models.StaffRequirement, error) {
	var staffRequirement models.StaffRequirement
	err := r.db.WithContext(ctx).Where("request_id = ?", id).First(&staffRequirement).Error
	return staffRequirement, err
}
