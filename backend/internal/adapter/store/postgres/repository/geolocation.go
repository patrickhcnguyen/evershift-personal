package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"

	"gorm.io/gorm"
)

type GeolocationRepository struct {
	mapboxToken string
	db          *gorm.DB
}

func NewGeolocationRepository(mapboxToken string, db *gorm.DB) *GeolocationRepository {
	return &GeolocationRepository{
		mapboxToken: mapboxToken,
		db:          db,
	}
}

func (r *GeolocationRepository) GeoCodeAddress(ctx context.Context, address string) (float64, float64, error) {
	coords, err := r.geocodeAddress(ctx, address)
	if err != nil {
		return 0, 0, err
	}

	return coords[1], coords[0], nil
}

func (r *GeolocationRepository) FindClosestBranch(ctx context.Context, latitude float64, longitude float64) (string, string, error) {
	var result struct {
		UUID     string  `gorm:"column:uuid"`
		Name     string  `gorm:"column:name"`
		Distance float64 `gorm:"column:distance"`
	}

	err := r.db.Raw(`
        SELECT uuid, name, 
               (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
               cos(radians(longitude) - radians(?)) + sin(radians(?)) * 
               sin(radians(latitude)))) AS distance 
        FROM branches 
        ORDER BY distance ASC 
        LIMIT 1
    `, latitude, longitude, latitude).Scan(&result).Error

	if err != nil {
		return "", "", fmt.Errorf("failed to find closest branch: %w", err)
	}

	return result.UUID, result.Name, nil
}

func (r *GeolocationRepository) geocodeAddress(ctx context.Context, address string) ([]float64, error) {
	url := fmt.Sprintf("https://api.mapbox.com/geocoding/v5/mapbox.places/%s.json?access_token=%s",
		url.QueryEscape(address), r.mapboxToken)

	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var response struct {
		Features []struct {
			Center []float64 `json:"center"`
		} `json:"features"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, err
	}

	if len(response.Features) == 0 {
		return nil, errors.New("no location found")
	}

	return response.Features[0].Center, nil
}
