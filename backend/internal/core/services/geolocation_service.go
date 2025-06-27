package services

import (
	ports "backend/internal/core/ports"
	"context"
)

// GeolocationService implements port.GeolocationService interface with access to the geolocation repository
type GeolocationService struct {
	repo ports.GeolocationRepository
}

// NewGeolocationService creates a new GeolocationService
func NewGeolocationService(repo ports.GeolocationRepository) *GeolocationService {
	return &GeolocationService{repo: repo}
}

// GeoCodeAddress geocodes an address and returns the coordinates
func (s *GeolocationService) GeoCodeAddress(ctx context.Context, address string) (latitude float64, longitude float64, err error) {
	return s.repo.GeoCodeAddress(ctx, address)
}

// FindClosestBranch finds the closest branch to the user's request for an event
func (s *GeolocationService) FindClosestBranch(ctx context.Context, latitude float64, longitude float64) (string, string, error) {
	return s.repo.FindClosestBranch(ctx, latitude, longitude)
}
