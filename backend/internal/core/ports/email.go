package ports

import (
	"backend/internal/core/models"
	"context"
)

type EmailService interface {
	SendEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement) error
	SendEmailWithPaymentURL(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, paymentURL string) error
	SendCustomEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, emailContent string, headers models.EmailHeaders, attachmentData []byte, filename string) error
	SendFollowUpEmails(ctx context.Context, invoices []models.Invoice, paymentURLs map[string]string) error
}

type EmailRepository interface {
	SendEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement) error
	SendEmailWithPaymentURL(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, paymentURL string) error
	SendCustomEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, emailContent string, headers models.EmailHeaders, attachmentData []byte, filename string) error
	SendFollowUpEmails(ctx context.Context, invoices []models.Invoice, paymentURLs map[string]string) error
}
