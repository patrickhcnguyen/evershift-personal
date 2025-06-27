package handler

import (
	ports "backend/internal/core/ports"
	"net/http"
	"os"
	"strconv"

	"github.com/gin-gonic/gin"
)

var MAPBOX_TOKEN = os.Getenv("MAPBOX_TOKEN")

type GeolocationHandler struct {
	svc ports.GeolocationService
}

func NewGeolocationHandler(svc ports.GeolocationService) *GeolocationHandler {
	return &GeolocationHandler{svc: svc}
}

func (h *GeolocationHandler) GeoCodeAddress(c *gin.Context) {
	address := c.Query("address")
	if address == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Address required"})
		return
	}

	latitude, longitude, err := h.svc.GeoCodeAddress(c.Request.Context(), address)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"coordinates": []float64{latitude, longitude}})
}

func (h *GeolocationHandler) FindClosestBranch(c *gin.Context) {
	latitude := c.Query("latitude")
	longitude := c.Query("longitude")
	if latitude == "" || longitude == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Latitude and longitude required"})
		return
	}

	latitudeFloat, err := strconv.ParseFloat(latitude, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid latitude"})
		return
	}
	longitudeFloat, err := strconv.ParseFloat(longitude, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid longitude"})
		return
	}

	branchID, branchName, err := h.svc.FindClosestBranch(c.Request.Context(), latitudeFloat, longitudeFloat)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"branchID": branchID, "branchName": branchName})
}
