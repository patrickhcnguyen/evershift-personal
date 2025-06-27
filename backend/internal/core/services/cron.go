package services

import (
	"backend/internal/core/models"
	"backend/internal/core/ports"
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/robfig/cron/v3"
)

type CronJobService struct {
	cron        *cron.Cron
	invoiceSvc  ports.InvoiceService
	emailSvc    ports.EmailService
	stripeSvc   ports.StripeService
	staffReqSvc ports.StaffRequirementService
}

func NewCronJobService(
	invoiceSvc ports.InvoiceService,
	emailSvc ports.EmailService,
	stripeSvc ports.StripeService,
	staffReqSvc ports.StaffRequirementService,
) *CronJobService {
	c := cron.New(cron.WithLogger(cron.VerbosePrintfLogger(log.New(log.Writer(), "CRON: ", log.LstdFlags))))

	return &CronJobService{
		cron:        c,
		invoiceSvc:  invoiceSvc,
		emailSvc:    emailSvc,
		stripeSvc:   stripeSvc,
		staffReqSvc: staffReqSvc,
	}
}

func (s *CronJobService) Start() error {
	// Run every minute to check for overdue invoices (for testing)
	_, err := s.cron.AddFunc("* * * * *", s.checkAndSendFollowUpEmails)
	if err != nil {
		return fmt.Errorf("failed to schedule overdue invoice check job: %w", err)
	}

	// Run every minute for immediate follow-ups (for testing)
	_, err = s.cron.AddFunc("* * * * *", s.checkScheduledFollowUps)
	if err != nil {
		return fmt.Errorf("failed to schedule follow-up check job: %w", err)
	}

	s.cron.Start()
	log.Println("Cron jobs started successfully (testing mode - using minutes)")
	return nil
}

func (s *CronJobService) Stop() {
	s.cron.Stop()
	log.Println("Cron jobs stopped")
}

// Daily job to check for overdue invoices and send follow-ups based on delay settings
func (s *CronJobService) checkAndSendFollowUpEmails() {
	ctx := context.Background()
	log.Println("Starting daily overdue invoice check...")

	// Get all overdue invoices
	overdueInvoices, err := s.invoiceSvc.CheckForOverdueInvoices(ctx)
	if err != nil {
		log.Printf("Error getting overdue invoices: %v", err)
		return
	}

	if len(overdueInvoices) == 0 {
		log.Println("No overdue invoices found")
		return
	}

	processedCount := 0
	errorCount := 0

	for _, invoice := range overdueInvoices {
		if s.shouldSendFollowUp(&invoice) {
			err := s.sendFollowUpForInvoice(ctx, &invoice)
			if err != nil {
				log.Printf("Error sending follow-up for invoice %s: %v", invoice.UUID, err)
				errorCount++
			} else {
				processedCount++
			}
		}
	}

	log.Printf("Daily follow-up check completed. Processed: %d, Errors: %d", processedCount, errorCount)
}

// Hourly job to check for any scheduled follow-ups that should be sent
func (s *CronJobService) checkScheduledFollowUps() {
	ctx := context.Background()

	// Get all overdue invoices
	overdueInvoices, err := s.invoiceSvc.CheckForOverdueInvoices(ctx)
	if err != nil {
		log.Printf("Error getting overdue invoices for hourly check: %v", err)
		return
	}

	processedCount := 0
	for _, invoice := range overdueInvoices {
		if s.shouldSendImmediateFollowUp(&invoice) {
			err := s.sendFollowUpForInvoice(ctx, &invoice)
			if err != nil {
				log.Printf("Error sending scheduled follow-up for invoice %s: %v", invoice.UUID, err)
			} else {
				processedCount++
			}
		}
	}

	if processedCount > 0 {
		log.Printf("Hourly follow-up check completed. Processed: %d invoices", processedCount)
	}
}

// Determine if a follow-up should be sent based on delay settings (using minutes for testing)
func (s *CronJobService) shouldSendFollowUp(invoice *models.Invoice) bool {
	now := time.Now().UTC()

	// Calculate minutes since due date
	minutesPastDue := int(now.Sub(invoice.DueDate.UTC()).Minutes())

	// If no custom delay is set, use default behavior (send after 1 minute overdue)
	delayMinutes := invoice.FollowUpDelayDays
	if delayMinutes == 0 {
		delayMinutes = 1 // Default to 1 minute for testing
	}

	// Don't send if not past the delay period
	if minutesPastDue < delayMinutes {
		return false
	}

	// If never sent, send now
	if invoice.LastSent.IsZero() {
		return true
	}

	// Calculate minutes since last follow-up
	minutesSinceLastSent := int(now.Sub(invoice.LastSent.UTC()).Minutes())

	// Send follow-up every 5 minutes after the first one for testing
	return minutesSinceLastSent >= 5
}

// Check for immediate follow-ups (using minutes for testing)
func (s *CronJobService) shouldSendImmediateFollowUp(invoice *models.Invoice) bool {
	now := time.Now().UTC()

	// Calculate minutes since due date
	minutesPastDue := int(now.Sub(invoice.DueDate.UTC()).Minutes())

	delayMinutes := invoice.FollowUpDelayDays
	if delayMinutes == 0 {
		return false // Only process invoices with explicit delay settings
	}

	// Check if we just hit the delay threshold (within the last minute)
	if minutesPastDue == delayMinutes && invoice.LastSent.IsZero() {
		// Check if the due date + delay was within the last minute
		targetTime := invoice.DueDate.UTC().Add(time.Duration(delayMinutes) * time.Minute)
		minuteAgo := now.Add(-1 * time.Minute)

		return targetTime.After(minuteAgo) && targetTime.Before(now)
	}

	return false
}

// Send follow-up email for a specific invoice
func (s *CronJobService) sendFollowUpForInvoice(ctx context.Context, invoice *models.Invoice) error {
	// Get staff requirements for the invoice
	staffRequirements, err := s.staffReqSvc.GetAllStaffRequirementsByRequestID(ctx, invoice.RequestID)
	if err != nil {
		return fmt.Errorf("failed to get staff requirements: %w", err)
	}

	// Create payment URL
	paymentURL, err := s.stripeSvc.CreateCheckoutSession(ctx, invoice, staffRequirements)
	if err != nil {
		log.Printf("Warning: Could not create payment URL for invoice %s: %v", invoice.UUID, err)
		paymentURL = "" // Continue without payment URL
	}

	// Use default follow-up email
	paymentURLs := map[string]string{
		invoice.UUID.String(): paymentURL,
	}
	err = s.emailSvc.SendFollowUpEmails(ctx, []models.Invoice{*invoice}, paymentURLs)

	if err != nil {
		return fmt.Errorf("failed to send follow-up email: %w", err)
	}

	// Update invoice tracking
	now := time.Now().UTC()
	invoice.LastSent = now
	invoice.FollowUpCount += 1

	err = s.invoiceSvc.UpdateInvoice(ctx, invoice)
	if err != nil {
		return fmt.Errorf("failed to update invoice tracking: %w", err)
	}

	log.Printf("Follow-up email sent successfully for invoice %s (follow-up #%d)", invoice.UUID, invoice.FollowUpCount)
	return nil
}

// Admin function to manually trigger follow-ups for specific criteria (using minutes)
func (s *CronJobService) TriggerFollowUpsByDelay(ctx context.Context, delayMinutes int) (int, error) {
	log.Printf("Manually triggering follow-ups for invoices with %d minute delay...", delayMinutes)

	overdueInvoices, err := s.invoiceSvc.CheckForOverdueInvoices(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to get overdue invoices: %w", err)
	}

	log.Printf("Found %d total overdue invoices", len(overdueInvoices))

	processedCount := 0
	for _, invoice := range overdueInvoices {
		log.Printf("Invoice %s: DelayDays=%d, DueDate=%v, Status=%s",
			invoice.UUID, invoice.FollowUpDelayDays, invoice.DueDate, invoice.Status)

		if invoice.FollowUpDelayDays == delayMinutes {
			log.Printf("Processing invoice %s with matching delay", invoice.UUID)
			err := s.sendFollowUpForInvoice(ctx, &invoice)
			if err != nil {
				log.Printf("Error sending manual follow-up for invoice %s: %v", invoice.UUID, err)
			} else {
				processedCount++
			}
		}
	}

	log.Printf("Manual follow-up trigger completed. Processed: %d invoices", processedCount)
	return processedCount, nil
}

func (s *CronJobService) SendFollowUpWithCustomTemplate(ctx context.Context, invoiceID uuid.UUID, emailContent string, headers models.EmailHeaders) error {
	invoice, err := s.invoiceSvc.GetInvoiceByID(ctx, invoiceID)
	if err != nil {
		return fmt.Errorf("failed to get invoice: %w", err)
	}

	staffRequirements, err := s.staffReqSvc.GetAllStaffRequirementsByRequestID(ctx, invoice.RequestID)
	if err != nil {
		return fmt.Errorf("failed to get staff requirements: %w", err)
	}

	// Use your existing SendCustomEmail function
	err = s.emailSvc.SendCustomEmail(ctx, invoice, staffRequirements, emailContent, headers, nil, "")
	if err != nil {
		return fmt.Errorf("failed to send custom follow-up email: %w", err)
	}

	// Update tracking
	now := time.Now().UTC()
	invoice.LastSent = now
	invoice.FollowUpCount += 1

	return s.invoiceSvc.UpdateInvoice(ctx, invoice)
}
