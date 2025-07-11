package repository

// where the email sending logic as well as the HTML template is stored

import (
	"backend/internal/core/models"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/google/uuid"
	"github.com/mailgun/mailgun-go/v4"
)

type EmailRepository struct {
	mg     *mailgun.MailgunImpl
	domain string
	from   string
	redis  *redis.Client
}

func NewEmailRepository(domain, from, apiKey string, redis *redis.Client) *EmailRepository {

	mg := mailgun.NewMailgun(domain, apiKey)
	return &EmailRepository{
		mg:     mg,
		domain: domain,
		from:   from,
		redis:  redis,
	}
}

type RedisEmailScheduler struct {
	rdb *redis.Client
}

func (r *EmailRepository) SendEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement) error {
	if r.domain == "" || r.from == "" {
		return fmt.Errorf("mailgun configuration missing")
	}

	clientName := invoice.Request.FirstName + " " + invoice.Request.LastName
	clientEmail := invoice.Request.Email

	requestID := invoice.RequestID.String()

	if clientEmail == "" {
		return fmt.Errorf("client email is empty - cannot send email")
	}

	staffRequirementsWithRates := staffRequirements
	quantityOfEachStaffType := make(map[string]int)
	for _, req := range staffRequirementsWithRates {
		quantityOfEachStaffType[req.Position] += req.Count
	}

	stripeURL := "" // This will be passed as a parameter or generated

	staffRowsHTML := r.generateStaffRows(staffRequirementsWithRates)
	htmlBody := r.generateEmailHTML(invoice, clientName, staffRowsHTML, stripeURL, requestID)

	subject := fmt.Sprintf("Request #%s from Evershift", requestID)

	message := r.mg.NewMessage(r.from, subject, "", clientEmail)
	message.SetHtml(htmlBody)
	message.SetReplyTo("Evershift Support <support@evershift.co>")

	_, _, err := r.mg.Send(ctx, message)
	if err != nil {
		return fmt.Errorf("mailgun send error: %w", err)
	}
	return nil
}

func (r *EmailRepository) SendEmailWithPaymentURL(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, paymentURL string) error {
	if r.domain == "" || r.from == "" {
		return fmt.Errorf("mailgun configuration missing")
	}

	clientName := invoice.Request.FirstName + " " + invoice.Request.LastName
	clientEmail := invoice.Request.Email

	requestID := invoice.RequestID.String()

	if clientEmail == "" {
		return fmt.Errorf("client email is empty - cannot send email")
	}

	staffRowsHTML := r.generateStaffRows(staffRequirements)
	htmlBody := r.generateEmailHTML(invoice, clientName, staffRowsHTML, paymentURL, requestID)

	subject := fmt.Sprintf("Request #%s from Evershift", requestID)

	message := r.mg.NewMessage(r.from, subject, "", clientEmail)
	message.SetHTML(htmlBody)
	message.SetReplyTo("Evershift Support <support@evershift.co>")

	_, _, err := r.mg.Send(ctx, message)
	if err != nil {
		return fmt.Errorf("mailgun send error: %w", err)
	}
	return nil
}

func (r *EmailRepository) SendCustomEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, emailContent string, headers models.EmailHeaders, attachmentData []byte, filename string, paymentURL string) error {
	if r.domain == "" || r.from == "" {
		return fmt.Errorf("mailgun configuration missing")
	}

	clientEmail := invoice.Request.Email
	requestID := invoice.RequestID.String()

	if clientEmail == "" {
		return fmt.Errorf("client email is empty - cannot send email")
	}

	subject := headers.Subject
	if subject == "" {
		subject = fmt.Sprintf("Request #%s from Evershift", requestID)
	}

	cleanContent := strings.TrimSpace(emailContent)
	cleanContent = strings.ReplaceAll(cleanContent, "\n\n\n\n", "\n\n")
	cleanContent = strings.ReplaceAll(cleanContent, "\n\n\n", "\n\n")

	paragraphs := strings.Split(cleanContent, "\n\n")
	var htmlParagraphs []string

	for _, paragraph := range paragraphs {
		if strings.TrimSpace(paragraph) != "" {
			htmlParagraph := strings.ReplaceAll(strings.TrimSpace(paragraph), "\n", "<br>")
			htmlParagraphs = append(htmlParagraphs, fmt.Sprintf("<p>%s</p>", htmlParagraph))
		}
	}

	htmlEmailContent := strings.Join(htmlParagraphs, "")
	finalEmailContent := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
	<style>
		body { 
			font-family: Arial, sans-serif; 
			line-height: 1.6; 
			color: #333; 
			max-width: 600px; 
			margin: 0 auto; 
			padding: 20px;
		}
		p {
			margin: 0 0 16px 0;
		}
		.content {
			margin-bottom: 20px;
		}
	</style>
</head>
<body>
	<div class="content">%s</div>
	%%s
</body>
</html>`, htmlEmailContent)

	// If a payment URL is provided, append a payment button to the email content
	if paymentURL != "" {
		paymentButtonHTML := fmt.Sprintf(`
<div style="margin: 20px 0; text-align: center;">
	<a href="%s" 
	   style="display: inline-block; 
	          background-color: #22c55e; 
	          color: white; 
	          padding: 12px 24px; 
	          text-decoration: none; 
	          border-radius: 6px; 
	          font-weight: bold; 
	          border: none;">
		Pay Invoice - %s
	</a>
</div>
<p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 10px;">
	Click the button above to pay your invoice securely online
</p>`, paymentURL, r.formatCurrency(invoice.Balance))

		finalEmailContent = fmt.Sprintf(finalEmailContent, paymentButtonHTML)
	} else {
		finalEmailContent = fmt.Sprintf(finalEmailContent, "")
	}

	message := r.mg.NewMessage(r.from, subject, "", clientEmail)
	message.SetHtml(finalEmailContent)

	if headers.ReplyTo != "" {
		message.SetReplyTo(headers.ReplyTo)
	} else {
		message.SetReplyTo("Evershift Support <support@evershift.co>")
	}

	for _, cc := range headers.CC {
		if cc != "" {
			message.AddCC(cc)
		}
	}

	for _, bcc := range headers.BCC {
		if bcc != "" {
			message.AddBCC(bcc)
		}
	}

	if len(attachmentData) > 0 && filename != "" {
		message.AddBufferAttachment(filename, attachmentData)
	}

	_, _, err := r.mg.Send(ctx, message)
	if err != nil {
		return fmt.Errorf("mailgun send error: %w", err)
	}
	return nil
}

func (r *EmailRepository) formatCurrency(amount float64) string {
	return fmt.Sprintf("$%.2f", amount)
}

func (r *EmailRepository) formatDate(date time.Time) string {
	return date.Format("January 2, 2006")
}

func (r *EmailRepository) generateStaffRows(staffRequirements []models.StaffRequirement) string {
	var rows strings.Builder
	for _, req := range staffRequirements {
		rows.WriteString(fmt.Sprintf(`
		<tr>
			<td>
				<strong>%s</strong><br>
				<small>%s (%s - %s)</small>
			</td>
			<td class="amount">%d</td>
			<td class="amount">$%.2f / hr</td>
			<td class="amount">%s</td>
		</tr>`,
			req.Position,
			req.Date.Format("January 2, 2006"),
			req.StartTime,
			req.EndTime,
			req.Count,
			req.Rate,
			r.formatCurrency(float64(req.Count)*req.Rate),
		))
	}
	return rows.String()
}

func (r *EmailRepository) generateEmailHTML(invoice *models.Invoice, clientName, staffRowsHTML, paymentURL, requestID string) string {
	notesHTML := ""
	if invoice.Notes != "" {
		notesHTML = fmt.Sprintf(`<div class="notes"><h3>Notes</h3><p>%s</p></div>`, invoice.Notes)
	}

	paymentButtonHTML := ""
	if paymentURL != "" {
		paymentButtonHTML = fmt.Sprintf(`
		<div class="payment-section" style="text-align: center; margin: 30px 0;">
			<a href="%s" class="payment-button" style="display: inline-block; background-color: #635BFF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
				Pay Invoice Online
			</a>
			<p style="margin-top: 10px; font-size: 14px; color: #666;">
				Click the button above to pay securely with Stripe
			</p>
		</div>`, paymentURL)
	}

	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee; }
    .invoice-details { margin: 20px 0; }
    .invoice-table { width: 100%%; border-collapse: collapse; margin: 20px 0; }
    .invoice-table th, .invoice-table td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
    .invoice-table th { background-color: #f8f8f8; }
    .amount { text-align: right; }
    .total { font-weight: bold; }
    .payment-button:hover { background-color: #5A52E5 !important; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Invoice from Evershift</h1>
      <p>Request #%s</p>
      <p>Branch: %s</p>
    </div>
    
    <div class="invoice-details">
      <p><strong>To:</strong> %s</p>
      <p><strong>Email:</strong> %s</p>
      <p><strong>Due Date:</strong> %s</p>
      <p><strong>Payment Terms:</strong> %s</p>
    </div>
    
    <table class="invoice-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="amount">Quantity</th>
          <th class="amount">Rate</th>
          <th class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        %s
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" class="amount">Subtotal:</td>
          <td class="amount">%s</td>
        </tr>
        <tr>
          <td colspan="3" class="amount">Service Fee:</td>
          <td class="amount">%s</td>
        </tr>
        <tr>
          <td colspan="3" class="amount">Transaction Fee (3.5%%):</td>
          <td class="amount">%s</td>
        </tr>
        <tr class="total">
          <td colspan="3" class="amount">Total Amount:</td>
          <td class="amount">%s</td>
        </tr>
        <tr class="total">
          <td colspan="3" class="amount">Balance Due:</td>
          <td class="amount">%s</td>
        </tr>
      </tfoot>
    </table>
    
    %s
    
    %s
    
    <div class="footer">
      <p>If you have any questions about this invoice, please contact us at support@evershift.co</p>
      <p>Thank you for your business!</p>
    </div>
  </div>
</body>
</html>`,
		requestID,
		invoice.Request.ClosestBranchName,
		clientName,
		invoice.Request.Email,
		r.formatDate(invoice.DueDate),
		invoice.PaymentTerms,
		staffRowsHTML,
		r.formatCurrency(invoice.Subtotal),
		r.formatCurrency(invoice.ServiceFee),
		r.formatCurrency(invoice.TransactionFee),
		r.formatCurrency(invoice.Amount),
		r.formatCurrency(invoice.Balance),
		notesHTML,
		paymentButtonHTML,
	)
}

func (r *EmailRepository) SendFollowUpEmails(ctx context.Context, invoices []models.Invoice, paymentURLs map[string]string) error {
	if r.domain == "" || r.from == "" {
		return fmt.Errorf("mailgun configuration missing")
	}

	var errors []string
	successCount := 0

	for _, invoice := range invoices {
		clientName := invoice.Request.FirstName + " " + invoice.Request.LastName
		clientEmail := invoice.Request.Email
		requestID := invoice.RequestID.String()

		if clientEmail == "" {
			errors = append(errors, fmt.Sprintf("Invoice %s: no client email", invoice.UUID))
			continue
		}

		paymentURL := paymentURLs[invoice.UUID.String()]

		subject := fmt.Sprintf("Follow-up: Outstanding Invoice #%s from Evershift", requestID)
		htmlBody := r.generateFollowUpEmailHTML(&invoice, clientName, requestID, paymentURL)

		message := r.mg.NewMessage(r.from, subject, "", clientEmail)
		message.SetHTML(htmlBody)
		message.SetReplyTo("Evershift Support <support@evershift.co>")

		_, _, err := r.mg.Send(ctx, message)
		if err != nil {
			errors = append(errors, fmt.Sprintf("Invoice %s: %v", invoice.UUID, err))
		} else {
			successCount++
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("sent %d/%d follow-up emails. Errors: %v", successCount, len(invoices), strings.Join(errors, "; "))
	}

	return nil
}

func (r *EmailRepository) generateFollowUpEmailHTML(invoice *models.Invoice, clientName, requestID, paymentURL string) string {
	daysPastDue := int(time.Now().UTC().Sub(invoice.DueDate.UTC()).Hours() / 24)

	paymentButtonHTML := ""
	if paymentURL != "" {
		paymentButtonHTML = fmt.Sprintf(`
		<div class="payment-section" style="text-align: center; margin: 30px 0;">
			<a href="%s" class="payment-button" style="display: inline-block; background-color: #0070f3; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
				Pay Invoice - %s
			</a>
			<p style="margin-top: 10px; font-size: 14px; color: #666;">
				Secure payment powered by Stripe
			</p>
		</div>`, paymentURL, r.formatCurrency(invoice.Balance))
	}

	return fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eee; }
    .reminder { background-color: #f8f9fa; border: 1px solid #e9ecef; padding: 20px; border-radius: 5px; margin: 20px 0; }
    .amount-due { font-size: 20px; color: #0070f3; font-weight: bold; text-align: center; margin: 20px 0; }
    .payment-button:hover { background-color: #0056b3 !important; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Friendly Payment Reminder</h1>
      <p>Invoice #%s</p>
    </div>
    
    <div class="reminder">
      <h2>Hi %s!</h2>
      <p>We hope you're doing well! We wanted to reach out regarding your invoice which became due %d days ago.</p>
      <p>We understand that things can get busy, so we wanted to send a friendly reminder about your outstanding payment.</p>
    </div>
    
    <div class="amount-due">
      Outstanding Balance: %s
    </div>
    
    %s
    
    <div style="margin: 20px 0;">
      <h3>Invoice Summary:</h3>
      <p><strong>Invoice Number:</strong> #%s</p>
      <p><strong>Due Date:</strong> %s</p>
      <p><strong>Days Past Due:</strong> %d</p>
      <p><strong>Amount:</strong> %s</p>
    </div>
    
    <div style="margin: 20px 0; padding: 15px; background-color: #e8f4fd; border-radius: 5px;">
      <p><strong>Need help or have questions?</strong></p>
      <p>If you're experiencing any issues with payment or have questions about this invoice, please don't hesitate to reach out to us at <a href="mailto:support@evershift.co">support@evershift.co</a>. We're here to help!</p>
    </div>
    
    <div style="margin: 20px 0;">
      <p>Thank you for choosing Evershift for your staffing needs. We truly appreciate your business and look forward to continuing to serve you.</p>
      <p>Have a wonderful day!</p>
      <p><strong>The Evershift Team</strong></p>
    </div>
    
    <div class="footer">
      <p>This is a friendly reminder for your outstanding invoice.</p>
      <p>Evershift | <a href="mailto:support@evershift.co">support@evershift.co</a></p>
    </div>
  </div>
</body>
</html>`,
		requestID,
		clientName,
		daysPastDue,
		r.formatCurrency(invoice.Balance),
		paymentButtonHTML,
		requestID,
		r.formatDate(invoice.DueDate),
		daysPastDue,
		r.formatCurrency(invoice.Balance),
	)
}

func (r *EmailRepository) ScheduleEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement, sendAt time.Time, customContent string, headers models.EmailHeaders, paymentURL string) error {
	if r.domain == "" || r.from == "" {
		return fmt.Errorf("mailgun configuration missing")
	}

	// Check if Redis is available for scheduling
	if r.redis == nil {
		log.Printf("Warning: Redis not available, cannot schedule email for request %s", invoice.RequestID.String())
		return fmt.Errorf("email scheduling unavailable (Redis not connected)")
	}

	var subject, htmlBody, replyTo string
	var cc, bcc []string

	if customContent != "" {
		subject = headers.Subject
		if subject == "" {
			subject = fmt.Sprintf("Request #%s from Evershift", invoice.RequestID.String())
		}

		htmlBody = customContent
		if paymentURL != "" {
			paymentButtonHTML := fmt.Sprintf(`
<div style="margin: 20px 0; text-align: center;">
	<a href="%s" 
	   style="display: inline-block; 
	          background-color: #22c55e; 
	          color: white; 
	          padding: 12px 24px; 
	          text-decoration: none; 
	          border-radius: 6px; 
	          font-weight: bold; 
	          border: none;">
		Pay Invoice - %s
	</a>
</div>
<p style="color: #6b7280; font-size: 12px; text-align: center; margin-top: 10px;">
	Click the button above to pay your invoice securely online
</p>`, paymentURL, r.formatCurrency(invoice.Balance))

			htmlBody = customContent + paymentButtonHTML
		}

		replyTo = headers.ReplyTo
		if replyTo == "" {
			replyTo = "Evershift Support <support@evershift.co>"
		}
		cc = headers.CC
		bcc = headers.BCC
	} else {
		clientName := invoice.Request.FirstName + " " + invoice.Request.LastName
		requestID := invoice.RequestID.String()
		staffRowsHTML := r.generateStaffRows(staffRequirements)
		htmlBody = r.generateEmailHTML(invoice, clientName, staffRowsHTML, paymentURL, requestID)
		subject = fmt.Sprintf("Request #%s from Evershift", requestID)
		replyTo = "Evershift Support <support@evershift.co>"
	}

	email := models.Email{
		RequestID: invoice.RequestID,
		ID:        uuid.New(),
		Subject:   subject,
		Content:   htmlBody,
		ReplyTo:   replyTo,
		CC:        cc,
		BCC:       bcc,
		SendAt:    sendAt,
		CreatedAt: time.Now().UTC(),
		UpdatedAt: time.Now().UTC(),
	}

	key := "scheduled_email:" + email.ID.String()
	jsonData, err := json.Marshal(email)
	if err != nil {
		return fmt.Errorf("failed to marshal email data: %w", err)
	}

	log.Printf("DEBUG: About to store email with key: %s", key)
	log.Printf("DEBUG: Email ID: %s", email.ID.String())
	log.Printf("DEBUG: Send timestamp: %d", sendAt.Unix())
	log.Printf("DEBUG: Using custom content: %v", customContent != "")

	expiration := time.Until(sendAt) + (48 * time.Hour)
	err = r.redis.Set(ctx, key, jsonData, expiration).Err()
	if err != nil {
		return fmt.Errorf("failed to store email data in Redis: %w", err)
	}

	log.Printf("DEBUG: Stored email data in Redis, expires in: %v", expiration)

	err = r.redis.ZAdd(ctx, "scheduled_emails", redis.Z{
		Score:  float64(sendAt.Unix()),
		Member: email.ID.String(),
	}).Err()

	if err != nil {
		return fmt.Errorf("failed to add email to scheduled queue: %w", err)
	}

	log.Printf("DEBUG: Added to sorted set with score: %f", float64(sendAt.Unix()))

	return nil
}
