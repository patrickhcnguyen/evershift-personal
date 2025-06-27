package handler

import (
	ports "backend/internal/core/ports"
	"io"
	"net/http"

	"github.com/google/uuid"

	"log"

	"github.com/gin-gonic/gin"
)

type StripeHandler struct {
	stripeService           ports.StripeService
	invoiceService          ports.InvoiceService
	staffRequirementService ports.StaffRequirementService
	apiKey                  string
}

func NewStripeHandler(stripeService ports.StripeService, invoiceService ports.InvoiceService, staffRequirementService ports.StaffRequirementService, apiKey string) *StripeHandler {
	return &StripeHandler{
		stripeService:           stripeService,
		invoiceService:          invoiceService,
		staffRequirementService: staffRequirementService,
		apiKey:                  apiKey,
	}
}

func (h *StripeHandler) CreatePaymentIntent(c *gin.Context) {
	invoiceID := c.Param("invoiceID")
	parsedID, err := uuid.Parse(invoiceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
	}

	invoice, err := h.invoiceService.GetInvoiceByID(c.Request.Context(), parsedID)
	if err != nil {
		log.Printf("Failed to get invoice: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get invoice"})
		return
	}
	paymentIntent, err := h.stripeService.CreatePaymentIntent(c.Request.Context(), invoice)
	if err != nil {
		log.Printf("Failed to create payment intent: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create payment intent"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"paymentIntent": paymentIntent})
}

func (h *StripeHandler) CreateCheckoutSession(c *gin.Context) {
	invoiceID := c.Param("invoiceID")
	parsedID, err := uuid.Parse(invoiceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
	}

	invoice, err := h.invoiceService.GetInvoiceByID(c.Request.Context(), parsedID)
	if err != nil {
		log.Printf("Failed to get invoice: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get invoice"})
		return
	}

	staffRequirements, err := h.staffRequirementService.GetAllStaffRequirementsByRequestID(c.Request.Context(), invoice.RequestID)
	if err != nil {
		log.Printf("Failed to get staff requirements: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get staff requirements"})
		return
	}

	checkoutSession, err := h.stripeService.CreateCheckoutSession(c.Request.Context(), invoice, staffRequirements)
	if err != nil {
		log.Printf("Failed to create checkout session: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create checkout session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"checkoutSession": checkoutSession})
}

func (h *StripeHandler) RefundPayment(c *gin.Context) {
	invoiceID := c.Param("invoiceID")
	parsedID, err := uuid.Parse(invoiceID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid invoice ID"})
		return
	}

	invoice, err := h.invoiceService.GetInvoiceByID(c.Request.Context(), parsedID)
	if err != nil {
		log.Printf("Failed to get invoice: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get invoice"})
		return
	}

	refund, err := h.stripeService.RefundPayment(c.Request.Context(), invoice)
	if err != nil {
		log.Printf("Failed to refund payment: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refund payment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"refund": refund})
}

// Webhook handles incoming events from Stripe.
func (h *StripeHandler) Webhook(c *gin.Context) {
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	signatureHeader := c.GetHeader("Stripe-Signature")
	if signatureHeader == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing Stripe-Signature header"})
		return
	}

	err = h.stripeService.Webhook(c.Request.Context(), payload, signatureHeader)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
