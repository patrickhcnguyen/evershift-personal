// used to calculate staff rates for a request and other fees
package ports

import (
	"backend/internal/core/models"
	"context"
)

type CalculateRatesService interface {
	CalculateRates(ctx context.Context, request *models.Request) (float64, float64, float64, float64, error)
	GetRates(ctx context.Context, request *models.Request) (float64, float64, float64, float64, error)
	// return updated requirements, as well as custom line items if they exist
	UpdateRates(ctx context.Context, request *models.Request, customLineItems []models.CustomLineItems) (float64, float64, float64, float64, error)
}

type CalculateRatesRepository interface {
	CalculateRates(ctx context.Context, request *models.Request) (float64, float64, float64, float64, error)
	GetRates(ctx context.Context, request *models.Request) (float64, float64, float64, float64, error)
	UpdateRates(ctx context.Context, request *models.Request, customLineItems []models.CustomLineItems) (float64, float64, float64, float64, error)
}
