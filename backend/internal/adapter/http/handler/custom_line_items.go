package handler

import (
	"backend/internal/config"
	"backend/internal/core/models"
	"backend/internal/core/ports"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CustomLineItemsHandler struct {
	svc ports.CustomLineItemsService
}

func NewCustomLineItemsHandler(cfg *config.Config, customLineItemsService ports.CustomLineItemsService) *CustomLineItemsHandler {
	return &CustomLineItemsHandler{svc: customLineItemsService}
}

func (h *CustomLineItemsHandler) CreateCustomLineItem(c *gin.Context) {
	var customLineItem models.CustomLineItems
	if err := c.ShouldBindJSON(&customLineItem); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.CreateCustomLineItem(c.Request.Context(), &customLineItem); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, customLineItem)
}

func (h *CustomLineItemsHandler) GetCustomLineItemByID(c *gin.Context) {
	id := c.Param("id")
	uuid, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	customLineItem, err := h.svc.GetCustomLineItemByID(c.Request.Context(), uuid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, customLineItem)
}

func (h *CustomLineItemsHandler) GetCustomLineItemsByRequestID(c *gin.Context) {
	requestID := c.Param("id")
	requestUUID, err := uuid.Parse(requestID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	customLineItems, err := h.svc.GetCustomLineItemsByRequestID(c.Request.Context(), requestUUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, customLineItems)
}

func (h *CustomLineItemsHandler) UpdateCustomLineItem(c *gin.Context) {
	id := c.Param("id")
	uuid, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	var customLineItem models.CustomLineItems
	if err := c.ShouldBindJSON(&customLineItem); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	customLineItem.UUID = uuid

	if err := h.svc.UpdateCustomLineItem(c.Request.Context(), &customLineItem); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, customLineItem)
}

func (h *CustomLineItemsHandler) DeleteCustomLineItem(c *gin.Context) {
	lineItemUUIDStr := c.Param("uuid")
	parsedUUID, err := uuid.Parse(lineItemUUIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	if err := h.svc.DeleteCustomLineItem(c.Request.Context(), parsedUUID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Custom line item deleted successfully"})
}
