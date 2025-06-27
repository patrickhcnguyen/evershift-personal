package handler

import (
	"net/http"
	"strconv"

	"backend/internal/core/services"

	"github.com/gin-gonic/gin"
)

type CronHandler struct {
	cronService *services.CronJobService
}

func NewCronHandler(cronService *services.CronJobService) *CronHandler {
	return &CronHandler{
		cronService: cronService,
	}
}

func (h *CronHandler) TriggerFollowUpsByDelay(c *gin.Context) {
	delayDaysStr := c.Query("delay_days")
	if delayDaysStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "delay_days parameter is required"})
		return
	}

	delayDays, err := strconv.Atoi(delayDaysStr)
	if err != nil || delayDays < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "delay_days must be a non-negative integer"})
		return
	}

	processedCount, err := h.cronService.TriggerFollowUpsByDelay(c.Request.Context(), delayDays)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Follow-up emails triggered successfully",
		"processed": processedCount,
		"criteria":  map[string]int{"delay_days": delayDays},
	})
}
