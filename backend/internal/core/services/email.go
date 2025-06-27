package services

import (
	"backend/internal/core/models"
	ports "backend/internal/core/ports"
	"context"
)

type EmailService struct {
	repo ports.EmailRepository
}

func NewEmailService(repo ports.EmailRepository) *EmailService {
	return &EmailService{repo: repo}
}

func (s *EmailService) SendEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement) error {
	return s.repo.SendEmail(ctx, invoice, staffRequirements)
}

func (s *EmailService) SendEmailWithPaymentURL(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, paymentURL string) error {
	return s.repo.SendEmailWithPaymentURL(ctx, invoice, staffRequirements, paymentURL)
}

func (s *EmailService) SendCustomEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, emailContent string, headers models.EmailHeaders, attachmentData []byte, filename string) error {
	return s.repo.SendCustomEmail(ctx, invoice, staffRequirements, emailContent, headers, attachmentData, filename)
}

func (s *EmailService) SendFollowUpEmails(ctx context.Context, invoices []models.Invoice, paymentURLs map[string]string) error {
	return s.repo.SendFollowUpEmails(ctx, invoices, paymentURLs)
}
