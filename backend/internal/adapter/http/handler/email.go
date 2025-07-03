package handler

import (
	ports "backend/internal/core/ports"
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"

	"log"

	"backend/internal/core/models"

	"github.com/gin-gonic/gin"
)

type EmailHandler struct {
	svc                 ports.EmailService
	invoiceSvc          ports.InvoiceService
	staffRequirementSvc ports.StaffRequirementService
	stripeService       ports.StripeService
}

func NewEmailHandler(svc ports.EmailService, invoiceSvc ports.InvoiceService, staffRequirementSvc ports.StaffRequirementService, stripeService ports.StripeService) *EmailHandler {
	return &EmailHandler{
		svc:                 svc,
		invoiceSvc:          invoiceSvc,
		staffRequirementSvc: staffRequirementSvc,
		stripeService:       stripeService,
	}
}

func (h *EmailHandler) SendEmail(c *gin.Context) {
	requestId := c.Param("request_id")

	parsedID, err := uuid.Parse(requestId)
	if err != nil {
		log.Printf("DEBUG HANDLER: Failed to parse request_id: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	invoice, err := h.invoiceSvc.GetInvoiceByRequestID(c.Request.Context(), parsedID)
	if err != nil {
		log.Printf("Failed to get invoice: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get invoice"})
		return
	}

	staffRequirements, err := h.staffRequirementSvc.GetAllStaffRequirementsByRequestID(c.Request.Context(), invoice.RequestID)
	if err != nil {
		log.Printf("Failed to get staff requirements: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get staff requirements"})
		return
	}

	// Generate Stripe checkout URL
	checkoutURL, err := h.stripeService.CreateCheckoutSession(c.Request.Context(), invoice, staffRequirements)
	if err != nil {
		log.Printf("Failed to create payment URL: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment URL"})
		return
	}

	// Send email with payment URL
	err = h.svc.SendEmailWithPaymentURL(c.Request.Context(), invoice, staffRequirements, checkoutURL)
	if err != nil {
		log.Printf("Failed to send email: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send email"})
		return
	}

	now := time.Now().UTC()
	invoice.LastSent = now

	err = h.invoiceSvc.UpdateInvoice(c.Request.Context(), invoice)
	if err != nil {
		log.Printf("Warning: Failed to update email tracking for invoice %s: %v", invoice.UUID, err)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Email sent successfully"})
}

func (h *EmailHandler) SendCustomEmail(c *gin.Context) {
	requestId := c.Param("request_id")

	// Parse multipart form (10 MB limit)
	err := c.Request.ParseMultipartForm(10 << 20)
	if err != nil {
		log.Printf("Failed to parse multipart form: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form data"})
		return
	}

	emailContent := c.PostForm("emailContent")
	if emailContent == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email content is required"})
		return
	}

	var emailHeaders models.EmailHeaders
	headersStr := c.PostForm("headers")
	if headersStr != "" {
		if err := json.Unmarshal([]byte(headersStr), &emailHeaders); err != nil {
			log.Printf("Failed to parse headers: %v", err)
		}
	}

	// Get payment URL from form data (optional)
	paymentUrl := c.PostForm("paymentUrl")

	// Handle PDF attachment (optional)
	var pdfData []byte
	var filename string
	var hasAttachment bool

	file, header, err := c.Request.FormFile("invoicePDF")
	if err == nil && file != nil {
		defer file.Close()

		// Read file data
		pdfData, err = io.ReadAll(file)
		if err != nil {
			log.Printf("Failed to read PDF file: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read PDF attachment"})
			return
		}

		filename = header.Filename
		hasAttachment = true
		log.Printf("PDF attachment received: %s, size: %d bytes", filename, len(pdfData))
	} else if err != http.ErrMissingFile {
		log.Printf("Error handling file upload: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Error processing file upload"})
		return
	}

	parsedID, err := uuid.Parse(requestId)
	if err != nil {
		log.Printf("DEBUG HANDLER: Failed to parse request_id: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	invoice, err := h.invoiceSvc.GetInvoiceByRequestID(c.Request.Context(), parsedID)
	if err != nil {
		log.Printf("Failed to get invoice: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get invoice"})
		return
	}

	staffRequirements, err := h.staffRequirementSvc.GetAllStaffRequirementsByRequestID(c.Request.Context(), invoice.RequestID)
	if err != nil {
		log.Printf("Failed to get staff requirements: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get staff requirements"})
		return
	}

	err = h.svc.SendCustomEmail(c.Request.Context(), invoice, staffRequirements, emailContent, emailHeaders, pdfData, filename, paymentUrl)
	if err != nil {
		log.Printf("Failed to send custom email: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send custom email"})
		return
	}

	now := time.Now().UTC()
	invoice.LastSent = now

	err = h.invoiceSvc.UpdateInvoice(c.Request.Context(), invoice)
	if err != nil {
		log.Printf("Warning: Failed to update email tracking for invoice %s: %v", invoice.UUID, err)
	}

	message := "Custom email sent successfully"
	if hasAttachment {
		message += " with PDF attachment"
	}
	if paymentUrl != "" {
		message += " with payment button"
	}

	c.JSON(http.StatusOK, gin.H{"message": message})
}

func (h *EmailHandler) ScheduleEmail(c *gin.Context) {
	requestId := c.Param("request_id")

	parsedID, err := uuid.Parse(requestId)

	if err != nil {
		log.Printf("DEBUG HANDLER: Failed to parse request_id: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request ID"})
		return
	}

	invoice, err := h.invoiceSvc.GetInvoiceByRequestID(c.Request.Context(), parsedID)
	if err != nil {
		log.Printf("Failed to get invoice: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get invoice"})
		return
	}

	var scheduleRequest struct {
		SendAt       string              `json:"send_at" binding:"required"`
		EmailContent string              `json:"email_content,omitempty"`
		EmailSubject string              `json:"email_subject,omitempty"`
		EmailHeaders models.EmailHeaders `json:"email_headers,omitempty"`
		PaymentURL   string              `json:"payment_url,omitempty"`
	}

	if err := c.ShouldBindJSON(&scheduleRequest); err != nil {
		log.Printf("DEBUG HANDLER: Failed to bind JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	sendAt, err := time.Parse(time.RFC3339, scheduleRequest.SendAt)
	if err != nil {
		log.Printf("DEBUG HANDLER: Failed to parse send_at: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid send_at format"})
		return
	}

	if sendAt.Before(time.Now().UTC()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Send_at cannot be in the past"})
		return
	}

	staffRequirements, err := h.staffRequirementSvc.GetAllStaffRequirementsByRequestID(c.Request.Context(), parsedID)
	if err != nil {
		log.Printf("Failed to get staff requirements: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get staff requirements"})
		return
	}

	err = h.svc.ScheduleEmail(c.Request.Context(), invoice, staffRequirements, sendAt, scheduleRequest.EmailContent, scheduleRequest.EmailHeaders, scheduleRequest.PaymentURL)

	if err != nil {
		log.Printf("Failed to schedule email: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to schedule email"})
		return
	}

	emailType := "default template"
	if scheduleRequest.EmailContent != "" {
		emailType = "custom content"
	}

	message := "Email scheduled successfully"
	if scheduleRequest.PaymentURL != "" {
		message += " with payment button"
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    message,
		"send_at":    sendAt.Format(time.RFC3339),
		"invoice_id": invoice.UUID,
		"email_type": emailType,
	})
}
