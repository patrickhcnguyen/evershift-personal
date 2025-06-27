package handler

import (
	"backend/internal/config"
	"backend/internal/core/models"
	"backend/internal/core/ports"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type InvoiceHandler struct {
	invoiceService ports.InvoiceService
	requestService ports.RequestService
	cfg            *config.Config
}

func NewInvoiceHandler(cfg *config.Config, invoiceService ports.InvoiceService, requestService ports.RequestService) *InvoiceHandler {
	return &InvoiceHandler{cfg: cfg, invoiceService: invoiceService, requestService: requestService}
}

func (h *InvoiceHandler) CreateInvoice(c *gin.Context) {
	var invoice models.Invoice
	if err := c.ShouldBindJSON(&invoice); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	request, err := h.requestService.GetRequestById(c.Request.Context(), invoice.RequestID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := h.invoiceService.CreateInvoice(c.Request.Context(), &invoice, &request); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, invoice)
}

func (h *InvoiceHandler) GetInvoiceByID(c *gin.Context) {
	id := c.Param("id")
	uuid, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	invoice, err := h.invoiceService.GetInvoiceByID(c.Request.Context(), uuid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, invoice)
}

func (h *InvoiceHandler) GetInvoiceByRequestID(c *gin.Context) {
	id := c.Param("id")
	uuid, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	invoice, err := h.invoiceService.GetInvoiceByRequestID(c.Request.Context(), uuid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, invoice)
}

func (h *InvoiceHandler) GetInvoiceByBranchID(c *gin.Context) {
	id := c.Param("branch_id")
	uuid, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	invoices, err := h.invoiceService.GetInvoiceByBranchID(c.Request.Context(), uuid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, invoices)
}

func (h *InvoiceHandler) UpdateInvoice(c *gin.Context) {
	id := c.Param("id")
	uuid, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	existingInvoice, err := h.invoiceService.GetInvoiceByID(c.Request.Context(), uuid)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invoice not found"})
		return
	}

	if err := c.ShouldBindJSON(&existingInvoice); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	existingInvoice.UUID = uuid

	if err := h.invoiceService.UpdateInvoice(c.Request.Context(), existingInvoice); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, existingInvoice)
}

func (h *InvoiceHandler) DeleteInvoice(c *gin.Context) {
	id := c.Param("id")
	uuid, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	if err := h.invoiceService.DeleteInvoice(c.Request.Context(), uuid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Invoice deleted successfully"})
}

func (h *InvoiceHandler) CheckForOverdueInvoices(c *gin.Context) {
	branchId := c.Param("branch_id")
	uuid, err := uuid.Parse(branchId)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	invoiceResponses, err := h.invoiceService.GetInvoiceByBranchID(c.Request.Context(), uuid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var overdueInvoices []models.Invoice
	for _, invoiceResp := range invoiceResponses {
		if (invoiceResp.Status == "unpaid" || invoiceResp.Status == "pending") && invoiceResp.DueDate.UTC().Before(time.Now().UTC()) {
			fullInvoice, err := h.invoiceService.GetInvoiceByID(c.Request.Context(), invoiceResp.UUID)
			if err != nil {
				continue
			}
			overdueInvoices = append(overdueInvoices, *fullInvoice)
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"overdue_invoices": overdueInvoices,
	})
}
