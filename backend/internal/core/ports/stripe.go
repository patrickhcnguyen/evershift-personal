package ports

import (
	"backend/internal/core/models"
	"context"
)

type StripeService interface {
	CreatePaymentIntent(ctx context.Context, invoice *models.Invoice) (string, error)
	CreateCheckoutSession(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement) (string, error)
	RefundPayment(ctx context.Context, invoice *models.Invoice) (string, error)
	Webhook(ctx context.Context, payload []byte, signatureHeader string) error
	SendAdminConfirmationEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement) (string, error)
}

type StripeRepository interface {
	CreatePaymentIntent(ctx context.Context, invoice *models.Invoice) (string, error)
	CreateCheckoutSession(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement) (string, error)
	RefundPayment(ctx context.Context, invoice *models.Invoice) (string, error)
	Webhook(ctx context.Context, payload []byte, signatureHeader string) error
	SendAdminConfirmationEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement) (string, error)
}
