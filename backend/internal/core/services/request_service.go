package services

import (
	"backend/internal/core/models"
	ports "backend/internal/core/ports"
	"context"
	"fmt"

	"github.com/google/uuid"
)

// RequestService implements port.RequestService interface with access to the request repository
type RequestService struct {
	requestRepo             ports.RequestRepository
	geolocationService      ports.GeolocationService
	staffRequirementService ports.StaffRequirementService
	invoiceService          ports.InvoiceService
}

// NewRequestService creates a new instance of RequestService
func NewRequestService(repo ports.RequestRepository, geolocationService ports.GeolocationService, staffRequirementService ports.StaffRequirementService, invoiceService ports.InvoiceService) *RequestService {
	return &RequestService{
		requestRepo:             repo,
		geolocationService:      geolocationService,
		staffRequirementService: staffRequirementService,
		invoiceService:          invoiceService,
	}
}

// CreateRequest creates a new request in the repository
func (s *RequestService) CreateRequest(ctx context.Context, request *models.Request, staff []models.StaffRequirement) error {
	// Generate UUID
	request.UUID = uuid.New()

	// Use the geolocation service to find coordinates and closest branch
	if request.EventLocation != "" {
		latitude, longitude, err := s.geolocationService.GeoCodeAddress(ctx, request.EventLocation)
		if err == nil {
			branchID, branchName, err := s.geolocationService.FindClosestBranch(ctx, latitude, longitude)
			if err == nil {
				request.ClosestBranchID = uuid.MustParse(branchID)
				request.ClosestBranchName = branchName
			}
		}
	}

	// For each staff requirement, get the rate and assign it
	for i := range staff {
		rate, err := s.staffRequirementService.GetRate(ctx, staff[i].Position, request.EventLocation)
		if err != nil {
			fmt.Printf("could not get rate for position %s: %v\n", staff[i].Position, err)
		}
		staff[i].Rate = rate

		// Calculate hours worked and the total amount for the requirement
		hoursWorked := staff[i].EndTime.Sub(staff[i].StartTime).Hours()
		staff[i].Amount = staff[i].Rate * hoursWorked * float64(staff[i].Count)
	}

	// Create the request first
	err := s.requestRepo.CreateRequest(ctx, request, staff, nil)
	if err != nil {
		return err
	}

	if err := s.invoiceService.CreateInvoice(ctx, &models.Invoice{}, request); err != nil {
		return fmt.Errorf("failed to create invoice: %w", err)
	}

	return nil
}

// GetRequestById retrieves a request by its ID
func (s *RequestService) GetRequestById(ctx context.Context, id uuid.UUID) (models.Request, error) {
	return s.requestRepo.GetRequestById(ctx, id)
}

// GetRequestsByEventId retrieves all requests for a specific event
func (s *RequestService) GetRequestsByEventId(ctx context.Context, eventId uuid.UUID) ([]models.Request, error) {
	return s.requestRepo.GetRequestsByEventId(ctx, eventId)
}

// GetRequestsByBranchID retrieves all requests for a specific branch
func (s *RequestService) GetRequestsByBranchID(ctx context.Context, branchID uuid.UUID) ([]models.Request, error) {
	return s.requestRepo.GetRequestsByBranchID(ctx, branchID)
}

// UpdateRequest updates an existing request in the repository
func (s *RequestService) UpdateRequest(ctx context.Context, request *models.Request) error {
	return s.requestRepo.UpdateRequest(ctx, request)
}

// DeleteRequest deletes a request from the repository
func (s *RequestService) DeleteRequest(ctx context.Context, id uuid.UUID) error {
	return s.requestRepo.DeleteRequest(ctx, id)
}

// GetAllRequests retrieves all requests from the repository
func (s *RequestService) GetAllRequests(ctx context.Context) ([]models.Request, error) {
	return s.requestRepo.GetAllRequests(ctx)
}
