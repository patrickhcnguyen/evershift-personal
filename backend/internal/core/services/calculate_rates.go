package services

import (
	"backend/internal/core/models"
	ports "backend/internal/core/ports"
	"context"
)

type CalculateRatesService struct {
	repo ports.CalculateRatesRepository
}

func NewCalculateRatesService(repo ports.CalculateRatesRepository) *CalculateRatesService {
	return &CalculateRatesService{repo: repo}
}

func (s *CalculateRatesService) CalculateRates(ctx context.Context, request *models.Request) (float64, float64, float64, float64, error) {
	return s.repo.CalculateRates(ctx, request)
}

func (s *CalculateRatesService) GetRates(ctx context.Context, request *models.Request) (float64, float64, float64, float64, error) {
	return s.repo.GetRates(ctx, request)
}

func (s *CalculateRatesService) UpdateRates(ctx context.Context, request *models.Request, customLineItems []models.CustomLineItems) (float64, float64, float64, float64, error) {
	return s.repo.UpdateRates(ctx, request, customLineItems)
}
