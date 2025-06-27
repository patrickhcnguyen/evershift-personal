package handler

import (
	"backend/internal/config"
	"backend/internal/core/models"
	"backend/internal/core/ports"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type StaffRequirementHandler struct {
	cfg                     *config.Config
	staffRequirementService ports.StaffRequirementService
}

func NewStaffRequirementHandler(cfg *config.Config, staffRequirementService ports.StaffRequirementService) *StaffRequirementHandler {
	return &StaffRequirementHandler{
		cfg:                     cfg,
		staffRequirementService: staffRequirementService,
	}
}

func (h *StaffRequirementHandler) CreateStaffRequirement(c *gin.Context) {
	var staffRequirement models.StaffRequirement
	if err := c.ShouldBindJSON(&staffRequirement); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.staffRequirementService.CreateStaffRequirement(c.Request.Context(), &staffRequirement); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, staffRequirement)
}

func (h *StaffRequirementHandler) GetStaffRequirementById(c *gin.Context) {
	id := c.Param("id")
	uuid, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	staffRequirement, err := h.staffRequirementService.GetStaffRequirementById(c.Request.Context(), uuid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, staffRequirement)
}

func (h *StaffRequirementHandler) GetAllStaffRequirements(c *gin.Context) { // take in request id as query param
	requestID := c.Query("request_id")
	uuid, err := uuid.Parse(requestID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	staffRequirements, err := h.staffRequirementService.GetAllStaffRequirementsByRequestID(c.Request.Context(), uuid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, staffRequirements)
}

func (h *StaffRequirementHandler) UpdateStaffRequirement(c *gin.Context) {
	id := c.Param("id")
	uuid, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	var staffRequirement models.StaffRequirement
	if err := c.ShouldBindJSON(&staffRequirement); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	staffRequirement.UUID = uuid

	if err := h.staffRequirementService.UpdateStaffRequirement(c.Request.Context(), &staffRequirement); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, staffRequirement)
}

func (h *StaffRequirementHandler) DeleteStaffRequirement(c *gin.Context) {
	id := c.Param("id")
	uuid, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	if err := h.staffRequirementService.DeleteStaffRequirement(c.Request.Context(), uuid); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

func (h *StaffRequirementHandler) GetStaffRequirementsByRequestID(c *gin.Context) {
	id := c.Param("id")
	uuid, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	staffRequirements, err := h.staffRequirementService.GetAllStaffRequirementsByRequestID(c.Request.Context(), uuid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, staffRequirements)
}
