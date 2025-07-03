package services

import (
	"backend/internal/core/models"
	ports "backend/internal/core/ports"
	"context"
	"time"
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

func (s *EmailService) SendCustomEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, emailContent string, headers models.EmailHeaders, attachmentData []byte, filename string, paymentURL string) error {
	return s.repo.SendCustomEmail(ctx, invoice, staffRequirements, emailContent, headers, attachmentData, filename, paymentURL)
}

func (s *EmailService) ScheduleEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, sendAt time.Time, customContent string, headers models.EmailHeaders, paymentURL string) error {
	return s.repo.ScheduleEmail(ctx, invoice, staffRequirements, sendAt, customContent, headers, paymentURL)
}
