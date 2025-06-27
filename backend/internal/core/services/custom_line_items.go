package services

import (
	"backend/internal/core/models"
	"backend/internal/core/ports"
	"context"

	"github.com/google/uuid"
)

type CustomLineItemsService struct {
	repo ports.CustomLineItemsRepository
}

func NewCustomLineItemsService(repo ports.CustomLineItemsRepository) *CustomLineItemsService {
	return &CustomLineItemsService{repo: repo}
}

func (s *CustomLineItemsService) CreateCustomLineItem(ctx context.Context, customLineItem *models.CustomLineItems) error {
	return s.repo.CreateCustomLineItem(ctx, customLineItem)
}

func (s *CustomLineItemsService) DeleteCustomLineItem(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteCustomLineItem(ctx, id)
}

func (s *CustomLineItemsService) GetCustomLineItemByID(ctx context.Context, id uuid.UUID) (models.CustomLineItems, error) {
	return s.repo.GetCustomLineItemByID(ctx, id)
}

func (s *CustomLineItemsService) GetCustomLineItemsByRequestID(ctx context.Context, requestID uuid.UUID) ([]models.CustomLineItems, error) {
	return s.repo.GetCustomLineItemsByRequestID(ctx, requestID)
}

func (s *CustomLineItemsService) UpdateCustomLineItem(ctx context.Context, customLineItem *models.CustomLineItems) error {
	return s.repo.UpdateCustomLineItem(ctx, customLineItem)
}
