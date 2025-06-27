package ports

import (
	"context"

	"backend/internal/core/models"

	"github.com/google/uuid"
)

type CustomLineItemsRepository interface {
	CreateCustomLineItem(ctx context.Context, customLineItem *models.CustomLineItems) error
	DeleteCustomLineItem(ctx context.Context, id uuid.UUID) error
	GetCustomLineItemByID(ctx context.Context, id uuid.UUID) (models.CustomLineItems, error)
	GetCustomLineItemsByRequestID(ctx context.Context, requestID uuid.UUID) ([]models.CustomLineItems, error)
	UpdateCustomLineItem(ctx context.Context, customLineItem *models.CustomLineItems) error
}

type CustomLineItemsService interface {
	CreateCustomLineItem(ctx context.Context, customLineItem *models.CustomLineItems) error
	DeleteCustomLineItem(ctx context.Context, id uuid.UUID) error
	GetCustomLineItemByID(ctx context.Context, id uuid.UUID) (models.CustomLineItems, error)
	GetCustomLineItemsByRequestID(ctx context.Context, requestID uuid.UUID) ([]models.CustomLineItems, error)
	UpdateCustomLineItem(ctx context.Context, customLineItem *models.CustomLineItems) error
}
