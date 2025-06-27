package repository

import (
	"context"

	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"backend/internal/core/models"
	ports "backend/internal/core/ports"
)

type RequestRepository struct {
	db *gorm.DB
}

func NewRequestRepository(db *gorm.DB) ports.RequestRepository {
	return &RequestRepository{db: db}
}

func (r *RequestRepository) CreateRequest(ctx context.Context, request *models.Request, staff []models.StaffRequirement, invoices []models.Invoice) error {
	if request.UUID == uuid.Nil {
		request.UUID = uuid.New()
	}

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Create the request
		if err := tx.Create(request).Error; err != nil {
			return err
		}

		// Create staff requirements
		for _, staffReq := range staff {
			staffReq.RequestID = request.UUID
			staffReq.UUID = uuid.New()

			if err := tx.Create(&staffReq).Error; err != nil {
				return err
			}
		}

		// Create all invoices if provided
		for _, invoice := range invoices {
			invoice.RequestID = request.UUID
			invoice.UUID = uuid.New()
			if err := tx.Create(&invoice).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

func (r *RequestRepository) GetRequestById(ctx context.Context, id uuid.UUID) (models.Request, error) {
	var request models.Request
	err := r.db.WithContext(ctx).Where("uuid = ?", id).First(&request).Error
	return request, err
}

func (r *RequestRepository) GetAllRequests(ctx context.Context) ([]models.Request, error) {
	var requests []models.Request
	err := r.db.WithContext(ctx).Find(&requests).Error
	return requests, err
}

func (r *RequestRepository) GetRequestsByEventId(ctx context.Context, eventId uuid.UUID) ([]models.Request, error) {
	var requests []models.Request
	err := r.db.WithContext(ctx).
		Joins("JOIN events ON events.request_id = requests.uuid").
		Where("events.uuid = ?", eventId).
		Find(&requests).Error
	return requests, err
}

func (r *RequestRepository) GetRequestsByBranchID(ctx context.Context, branchID uuid.UUID) ([]models.Request, error) {
	var requests []models.Request
	err := r.db.WithContext(ctx).Model(&models.Request{}).
		Joins("JOIN branches ON branches.uuid = requests.closest_branch_id").
		Where("branches.uuid = ?", branchID).
		Distinct().
		Find(&requests).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query requests by branch id: %w", err)
	}

	return requests, nil
}

func (r *RequestRepository) UpdateRequest(ctx context.Context, request *models.Request) error {
	return r.db.WithContext(ctx).Save(request).Error
}

func (r *RequestRepository) DeleteRequest(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Where("uuid = ?", id).Delete(&models.Request{}).Error
}
