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

	err = h.svc.SendCustomEmail(c.Request.Context(), invoice, staffRequirements, emailContent, emailHeaders, pdfData, filename)
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

	c.JSON(http.StatusOK, gin.H{"message": message})
}

func (h *EmailHandler) SendFollowUpEmails(c *gin.Context) {
	branchId := c.Param("branch_id")
	branchUuid, err := uuid.Parse(branchId)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid branch UUID format"})
		return
	}

	// Get all invoices for the branch
	invoiceResponses, err := h.invoiceSvc.GetInvoiceByBranchID(c.Request.Context(), branchUuid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get invoices for branch"})
		return
	}

	var overdueInvoicesForBranch []models.Invoice
	for _, invoiceResp := range invoiceResponses {
		// Check if invoice is overdue and unpaid/pending
		if (invoiceResp.Status == "unpaid" || invoiceResp.Status == "pending") &&
			invoiceResp.DueDate.UTC().Before(time.Now().UTC()) {

			// Get full invoice details
			fullInvoice, err := h.invoiceSvc.GetInvoiceByID(c.Request.Context(), invoiceResp.UUID)
			if err != nil {
				log.Printf("Warning: Could not get full invoice %s: %v", invoiceResp.UUID, err)
				continue
			}
			overdueInvoicesForBranch = append(overdueInvoicesForBranch, *fullInvoice)
		}
	}

	if len(overdueInvoicesForBranch) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"message": "No overdue invoices found for this branch",
			"count":   0,
		})
		return
	}

	paymentURLs := make(map[string]string)
	for _, invoice := range overdueInvoicesForBranch {
		staffRequirements, _ := h.staffRequirementSvc.GetAllStaffRequirementsByRequestID(c.Request.Context(), invoice.RequestID)

		paymentURL, err := h.stripeService.CreateCheckoutSession(c.Request.Context(), &invoice, staffRequirements)
		if err != nil {
			log.Printf("Warning: Could not create payment URL for invoice %s: %v", invoice.UUID, err)
			paymentURLs[invoice.UUID.String()] = ""
		} else {
			paymentURLs[invoice.UUID.String()] = paymentURL
		}
	}

	err = h.svc.SendFollowUpEmails(c.Request.Context(), overdueInvoicesForBranch, paymentURLs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send follow-up emails"})
		return
	}

	successCount := 0
	for _, invoice := range overdueInvoicesForBranch {
		now := time.Now().UTC()
		invoice.LastSent = now
		invoice.FollowUpCount += 1

		err = h.invoiceSvc.UpdateInvoice(c.Request.Context(), &invoice)
		if err == nil {
			successCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":         "Follow-up emails sent successfully",
		"emails_sent":     successCount,
		"total_processed": len(overdueInvoicesForBranch),
	})
}
