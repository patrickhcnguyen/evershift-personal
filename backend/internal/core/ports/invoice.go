package ports

import (
	"backend/internal/core/models"
	"context"

	"github.com/google/uuid"
)

type InvoiceRepository interface {
	CreateInvoice(ctx context.Context, invoice *models.Invoice, request *models.Request) error // needs request for certain fields like request id
	GetInvoiceByID(ctx context.Context, id uuid.UUID) (*models.Invoice, error)
	GetInvoiceByRequestID(ctx context.Context, requestID uuid.UUID) (*models.Invoice, error)
	GetInvoiceByBranchID(ctx context.Context, branchID uuid.UUID) ([]models.InvoiceResponse, error)
	UpdateInvoice(ctx context.Context, invoice *models.Invoice) error
	DeleteInvoice(ctx context.Context, id uuid.UUID) error
	CheckForOverdueInvoices(ctx context.Context) ([]models.Invoice, error)
}

type InvoiceService interface {
	CreateInvoice(ctx context.Context, invoice *models.Invoice, request *models.Request) error
	GetInvoiceByID(ctx context.Context, id uuid.UUID) (*models.Invoice, error)
	GetInvoiceByRequestID(ctx context.Context, requestID uuid.UUID) (*models.Invoice, error)
	GetInvoiceByBranchID(ctx context.Context, branchID uuid.UUID) ([]models.InvoiceResponse, error)
	UpdateInvoice(ctx context.Context, invoice *models.Invoice) error
	DeleteInvoice(ctx context.Context, id uuid.UUID) error
	CheckForOverdueInvoices(ctx context.Context) ([]models.Invoice, error)
	RecalculateInvoiceAfterPaymentWithNewItems(ctx context.Context, invoiceID uuid.UUID, newCustomLineItems []models.CustomLineItems) (*models.Invoice, error)
}
