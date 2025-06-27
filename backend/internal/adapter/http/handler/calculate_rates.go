package handler

import (
	ports "backend/internal/core/ports"
	"net/http"

	"github.com/google/uuid"

	"backend/internal/core/models"

	"github.com/gin-gonic/gin"
)

type CalculateRatesHandler struct {
	svc        ports.CalculateRatesService
	requestSvc ports.RequestService
}

func NewCalculateRatesHandler(svc ports.CalculateRatesService, requestSvc ports.RequestService) *CalculateRatesHandler {
	return &CalculateRatesHandler{svc: svc, requestSvc: requestSvc}
}

func (h *CalculateRatesHandler) CalculateRates(c *gin.Context) {
	requestID := c.Param("request_id")
	request, err := h.requestSvc.GetRequestById(c.Request.Context(), uuid.MustParse(requestID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	amount, transactionFee, serviceFee, subtotal, err := h.svc.CalculateRates(c.Request.Context(), &request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"amount": amount, "transactionFee": transactionFee, "serviceFee": serviceFee, "subtotal": subtotal})
}

func (h *CalculateRatesHandler) GetRates(c *gin.Context) {
	requestID := c.Param("request_id")
	request, err := h.requestSvc.GetRequestById(c.Request.Context(), uuid.MustParse(requestID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	amount, transactionFee, serviceFee, subtotal, err := h.svc.GetRates(c.Request.Context(), &request)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"amount": amount, "transactionFee": transactionFee, "serviceFee": serviceFee, "subtotal": subtotal})
}

// UpdateRates updates the rates for a request with optional custom line items
// @Summary Update rates for a request
// @Description Update rates calculation for a request, optionally adding custom line items
// @Tags rates
// @Accept json
// @Produce json
// @Param request_id path string true "Request ID"
// @Param custom_line_items body []models.CustomLineItems false "Custom Line Items"
// @Success 200 {object} object
// @Router /api/v1/rates/{request_id} [put]
func (h *CalculateRatesHandler) UpdateRates(c *gin.Context) {
	requestID := c.Param("request_id")
	request, err := h.requestSvc.GetRequestById(c.Request.Context(), uuid.MustParse(requestID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Parse custom line items from request body
	var customLineItems []models.CustomLineItems
	if err := c.ShouldBindJSON(&customLineItems); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid custom line items format: " + err.Error()})
		return
	}

	amount, transactionFee, serviceFee, subtotal, err := h.svc.UpdateRates(c.Request.Context(), &request, customLineItems)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"amount":         amount,
		"transactionFee": transactionFee,
		"serviceFee":     serviceFee,
		"subtotal":       subtotal,
		"lineItems":      customLineItems,
	})
}
