package services

import (
	"backend/internal/core/models"
	ports "backend/internal/core/ports"
	"context"
)

type StripeService struct {
	repo ports.StripeRepository
}

func NewStripeService(repo ports.StripeRepository) *StripeService {
	return &StripeService{repo: repo}
}

func (s *StripeService) CreatePaymentIntent(ctx context.Context, invoice *models.Invoice) (string, error) {
	return s.repo.CreatePaymentIntent(ctx, invoice)
}

func (s *StripeService) CreateCheckoutSession(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement) (string, error) {
	return s.repo.CreateCheckoutSession(ctx, invoice, staffRequirements)
}

func (s *StripeService) RefundPayment(ctx context.Context, invoice *models.Invoice) (string, error) {
	return s.repo.RefundPayment(ctx, invoice)
}

func (s *StripeService) Webhook(ctx context.Context, payload []byte, signatureHeader string) error {
	return s.repo.Webhook(ctx, payload, signatureHeader)
}

func (s *StripeService) SendAdminConfirmationEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement) (string, error) {
	return s.repo.SendAdminConfirmationEmail(ctx, invoice, staffRequirements)
}
