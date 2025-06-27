package repository

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"backend/internal/core/models"
	ports "backend/internal/core/ports"
)

type CustomLineItemsRepository struct {
	db *gorm.DB
}

func NewCustomLineItemsRepository(db *gorm.DB) ports.CustomLineItemsRepository {
	return &CustomLineItemsRepository{db: db}
}

func (r *CustomLineItemsRepository) CreateCustomLineItem(ctx context.Context, customLineItem *models.CustomLineItems) error {
	if customLineItem.UUID == uuid.Nil {
		customLineItem.UUID = uuid.New()
	}

	if err := r.db.WithContext(ctx).Create(customLineItem).Error; err != nil {
		return err
	}

	return nil
}

func (r *CustomLineItemsRepository) DeleteCustomLineItem(ctx context.Context, id uuid.UUID) error {
	if err := r.db.WithContext(ctx).Delete(&models.CustomLineItems{}, id).Error; err != nil {
		return err
	}

	return nil
}

func (r *CustomLineItemsRepository) GetCustomLineItemByID(ctx context.Context, id uuid.UUID) (models.CustomLineItems, error) {
	var customLineItem models.CustomLineItems
	if err := r.db.WithContext(ctx).First(&customLineItem, id).Error; err != nil {
		return models.CustomLineItems{}, err
	}

	return customLineItem, nil
}

func (r *CustomLineItemsRepository) GetCustomLineItemsByRequestID(ctx context.Context, requestID uuid.UUID) ([]models.CustomLineItems, error) {
	var customLineItems []models.CustomLineItems
	if err := r.db.WithContext(ctx).Where("request_id = ?", requestID).Find(&customLineItems).Error; err != nil {
		return nil, err
	}

	return customLineItems, nil
}

func (r *CustomLineItemsRepository) UpdateCustomLineItem(ctx context.Context, customLineItem *models.CustomLineItems) error {
	if err := r.db.WithContext(ctx).Save(customLineItem).Error; err != nil {
		return err
	}

	return nil
}
