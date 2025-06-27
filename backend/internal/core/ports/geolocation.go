// geolocation finds the closest branch to the user's request for an event, all the coordinates and branches are
// stored in the branches table in the database

package ports

import (
	"context"
)

type GeolocationService interface {
	GeoCodeAddress(ctx context.Context, address string) (float64, float64, error)
	FindClosestBranch(ctx context.Context, latitude float64, longitude float64) (string, string, error)
}

type GeolocationRepository interface {
	// GetAllBranches(ctx context.Context) ([]models.Branch, error)
	GeoCodeAddress(ctx context.Context, address string) (float64, float64, error)
	FindClosestBranch(ctx context.Context, latitude float64, longitude float64) (string, string, error)
}
