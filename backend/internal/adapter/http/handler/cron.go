package handler

import (
	"backend/internal/core/ports"
	"net/http"

	"github.com/gin-gonic/gin"
)

type CronHandler struct {
	svc ports.CronService
}

func NewCronHandler(svc ports.CronService) *CronHandler {
	return &CronHandler{svc: svc}
}

func (h *CronHandler) Run(c *gin.Context) {
	err := h.svc.Run()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Cron job started"})
}

func (h *CronHandler) Stop(c *gin.Context) {
	err := h.svc.Stop()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Cron job stopped"})
}
