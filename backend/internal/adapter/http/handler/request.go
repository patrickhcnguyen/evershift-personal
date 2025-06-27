package handler

import (
	"log"
	"net/http"

	"backend/internal/config"
	"backend/internal/core/models"
	"backend/internal/core/ports"

	"bytes"
	"io"

	// "log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// RequestHandler handles HTTP requests related to anything to do with requests (creation, updating, deleting, etc.)
type RequestHandler struct {
	cfg                *config.Config
	requestService     ports.RequestService
	geolocationService ports.GeolocationService
}

// NewRequestHandler creates a new RequestHandler
func NewRequestHandler(cfg *config.Config, requestService ports.RequestService, geolocationService ports.GeolocationService) *RequestHandler {
	return &RequestHandler{
		cfg:                cfg,
		requestService:     requestService,
		geolocationService: geolocationService,
	}
}

// CreateRequest creates a new request
func (h *RequestHandler) CreateRequest(c *gin.Context) {
	body, _ := io.ReadAll(c.Request.Body)
	c.Request.Body = io.NopCloser(bytes.NewBuffer(body))
	log.Printf("Received request body: %s", string(body))

	c.Request.Body = io.NopCloser(bytes.NewBuffer(body))

	var requestData struct {
		FirstName         string `json:"first_name"`
		LastName          string `json:"last_name"`
		Email             string `json:"email"`
		PhoneNumber       string `json:"phone_number"`
		TypeOfEvent       string `json:"type_of_event"`
		EventLocation     string `json:"event_location"`
		StartDate         string `json:"start_date"`
		EndDate           string `json:"end_date"`
		IsCompany         bool   `json:"is_company"`
		CompanyName       string `json:"company_name"`
		PoEditCounter     int    `json:"po_edit_counter"`
		PoNumber          string `json:"po_number"`
		StaffRequirements []struct {
			UUID      string  `json:"uuid"`
			Date      string  `json:"date"`
			Position  string  `json:"position"`
			Count     int     `json:"count"`
			StartTime string  `json:"start_time"`
			EndTime   string  `json:"end_time"`
			Rate      float64 `json:"rate"`
		} `json:"staff_requirements"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		log.Printf("Error binding JSON: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	startDate, _ := time.Parse("2006-01-02", requestData.StartDate)
	endDate, _ := time.Parse("2006-01-02", requestData.EndDate)

	request := models.Request{
		FirstName:     requestData.FirstName,
		LastName:      requestData.LastName,
		Email:         requestData.Email,
		PhoneNumber:   requestData.PhoneNumber,
		TypeOfEvent:   requestData.TypeOfEvent,
		EventLocation: requestData.EventLocation,
		StartDate:     startDate,
		EndDate:       endDate,
		IsCompany:     requestData.IsCompany,
		CompanyName:   requestData.CompanyName,
	}

	var staffRequirements []models.StaffRequirement
	for _, sr := range requestData.StaffRequirements {
		staffDate, err := time.Parse(time.RFC3339, sr.Date)
		if err != nil {
			log.Printf("Error parsing staff requirement date: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format"})
			return
		}

		startTime, err := time.Parse(time.RFC3339, sr.StartTime)
		if err != nil {
			log.Printf("Error parsing staff requirement start time: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start time format"})
			return
		}

		endTime, err := time.Parse(time.RFC3339, sr.EndTime)
		if err != nil {
			log.Printf("Error parsing staff requirement end time: %v", err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end time format"})
			return
		}

		staffRequirement := models.StaffRequirement{
			Date:      staffDate,
			Position:  sr.Position,
			Count:     sr.Count,
			StartTime: startTime,
			EndTime:   endTime,
			Rate:      sr.Rate,
		}

		staffRequirements = append(staffRequirements, staffRequirement)
	}

	err := h.requestService.CreateRequest(c.Request.Context(), &request, staffRequirements)
	if err != nil {
		log.Printf("Error creating request: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"request_id": request.UUID.String(),
		"request":    request,
	})
}

// GetRequestById gets a request by ID
func (h *RequestHandler) GetRequestById(c *gin.Context) {
	requestId := c.Param("id")
	request, err := h.requestService.GetRequestById(c.Request.Context(), uuid.MustParse(requestId))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, request)
}

// GetAllRequests gets all requests
func (h *RequestHandler) GetAllRequests(c *gin.Context) {
	requests, err := h.requestService.GetAllRequests(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, requests)
}

// GetRequestsByEventId gets all requests by event ID
func (h *RequestHandler) GetRequestsByEventId(c *gin.Context) {
	eventId := c.Param("id")
	requests, err := h.requestService.GetRequestsByEventId(c.Request.Context(), uuid.MustParse(eventId))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, requests)
}

// GetRequestsByBranchID gets all requests by branch ID
func (h *RequestHandler) GetRequestsByBranchID(c *gin.Context) {
	id := c.Param("branch_id")
	uuid, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	requests, err := h.requestService.GetRequestsByBranchID(c.Request.Context(), uuid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, requests)
}

// UpdateRequest updates a request
func (h *RequestHandler) UpdateRequest(c *gin.Context) {
	id := c.Param("id")
	requestUUID, err := uuid.Parse(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid UUID format"})
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON binding error: " + err.Error()})
		return
	}

	existingRequest, err := h.requestService.GetRequestById(c.Request.Context(), requestUUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Request not found"})
		return
	}

	// Manually apply updates from the map to the existing request model
	if val, ok := updates["first_name"].(string); ok {
		existingRequest.FirstName = val
	}
	if val, ok := updates["last_name"].(string); ok {
		existingRequest.LastName = val
	}
	if val, ok := updates["email"].(string); ok {
		existingRequest.Email = val
	}
	if val, ok := updates["company_name"].(string); ok {
		existingRequest.CompanyName = val
	}
	if val, ok := updates["event_location"].(string); ok {
		existingRequest.EventLocation = val
	}

	existingRequest.UUID = requestUUID

	err = h.requestService.UpdateRequest(c.Request.Context(), &existingRequest)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, existingRequest)
}

// DeleteRequest deletes a request
func (h *RequestHandler) DeleteRequest(c *gin.Context) {
	requestId := c.Param("id")
	err := h.requestService.DeleteRequest(c.Request.Context(), uuid.MustParse(requestId))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Request deleted successfully"})
}
