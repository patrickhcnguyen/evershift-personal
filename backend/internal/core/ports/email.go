package ports

import (
	"backend/internal/core/models"
	"context"
	"time"
)

type EmailService interface {
	SendEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement) error
	SendEmailWithPaymentURL(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, paymentURL string) error
	SendCustomEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, emailContent string, headers models.EmailHeaders, attachmentData []byte, filename string, paymentURL string) error
	ScheduleEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, sendAt time.Time, customContent string, headers models.EmailHeaders, paymentURL string) error
}

type EmailRepository interface {
	SendEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement) error
	SendEmailWithPaymentURL(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, paymentURL string) error
	SendCustomEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, emailContent string, headers models.EmailHeaders, attachmentData []byte, filename string, paymentURL string) error
	ScheduleEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, sendAt time.Time, customContent string, headers models.EmailHeaders, paymentURL string) error
}
