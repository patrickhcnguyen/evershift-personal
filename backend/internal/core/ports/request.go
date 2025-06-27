package ports

import (
	"backend/internal/core/models"
	"context"

	"github.com/google/uuid"
)

type RequestRepository interface {
	CreateRequest(ctx context.Context, request *models.Request, staff []models.StaffRequirement, invoice []models.Invoice) error
	GetRequestById(ctx context.Context, od uuid.UUID) (models.Request, error)
	GetAllRequests(ctx context.Context) ([]models.Request, error)
	GetRequestsByEventId(ctx context.Context, eventId uuid.UUID) ([]models.Request, error)
	GetRequestsByBranchID(ctx context.Context, branchID uuid.UUID) ([]models.Request, error)
	UpdateRequest(ctx context.Context, request *models.Request) error
	DeleteRequest(ctx context.Context, od uuid.UUID) error
}

type RequestService interface {
	CreateRequest(ctx context.Context, request *models.Request, staff []models.StaffRequirement) error
	GetRequestById(ctx context.Context, od uuid.UUID) (models.Request, error)
	GetAllRequests(ctx context.Context) ([]models.Request, error)
	GetRequestsByEventId(ctx context.Context, eventId uuid.UUID) ([]models.Request, error)
	GetRequestsByBranchID(ctx context.Context, eventID uuid.UUID) ([]models.Request, error)
	UpdateRequest(ctx context.Context, request *models.Request) error
	DeleteRequest(ctx context.Context, od uuid.UUID) error
}
