// where all the calculations actually happen
// subtotal = base rate * number of staff
// transaction fee = 3% of subtotal
// service fee = (subtotal + transaction fee) * 1.5
// amount = subtotal + transaction fee + service fee

// rates will be calculated differently for each staff type and event location
package repository

import (
	"backend/internal/core/models"
	ports "backend/internal/core/ports"
	"context"
	"errors"

	"github.com/google/uuid"
)

type RateCalculatorRepository struct {
	rateStore RateStore
}

// Getting the rate for a given staff type and location
type RateStore interface {
	GetRate(ctx context.Context, staffType string, location string) (float64, error)
	GetAllStaffRequirementsByRequestID(ctx context.Context, id uuid.UUID) ([]models.StaffRequirement, error)
	GetCustomLineItemsByRequestID(ctx context.Context, id uuid.UUID) ([]models.CustomLineItems, error)
	UpdateCustomLineItem(ctx context.Context, customLineItem *models.CustomLineItems) error
	CreateCustomLineItem(ctx context.Context, customLineItem *models.CustomLineItems) error
}

// RateStoreAdapter adapts StaffRequirementRepository to RateStore interface
type RateStoreAdapter struct {
	staffRepo           ports.StaffRequirementRepository
	customLineItemsRepo ports.CustomLineItemsRepository
}

func (r *RateStoreAdapter) GetRate(ctx context.Context, staffType string, location string) (float64, error) {
	staffRepo := r.staffRepo.(*StaffRequirementRepository)
	return staffRepo.GetRate(ctx, staffType, location)
}

func (r *RateStoreAdapter) GetAllStaffRequirementsByRequestID(ctx context.Context, id uuid.UUID) ([]models.StaffRequirement, error) {
	return r.staffRepo.GetAllStaffRequirementsByRequestID(ctx, id)
}

func (r *RateStoreAdapter) GetCustomLineItemsByRequestID(ctx context.Context, id uuid.UUID) ([]models.CustomLineItems, error) {
	return r.customLineItemsRepo.GetCustomLineItemsByRequestID(ctx, id)
}

func (r *RateStoreAdapter) UpdateCustomLineItem(ctx context.Context, customLineItem *models.CustomLineItems) error {
	return r.customLineItemsRepo.UpdateCustomLineItem(ctx, customLineItem)
}

func (r *RateStoreAdapter) CreateCustomLineItem(ctx context.Context, customLineItem *models.CustomLineItems) error {
	return r.customLineItemsRepo.CreateCustomLineItem(ctx, customLineItem)
}

func NewRateCalculatorRepository(staffRepo ports.StaffRequirementRepository, customLineItemsRepo ports.CustomLineItemsRepository) *RateCalculatorRepository {
	adapter := &RateStoreAdapter{
		staffRepo:           staffRepo,
		customLineItemsRepo: customLineItemsRepo,
	}
	return &RateCalculatorRepository{rateStore: adapter}
}

func (r *RateCalculatorRepository) CalculateRates(ctx context.Context, request *models.Request) (float64, float64, float64, float64, error) {
	if request == nil {
		return 0, 0, 0, 0, errors.New("request is nil")
	}

	// grab uuid of request, get all staff requirements by id by using GetAllStaffRequirementsByRequestID
	requestUUID := request.UUID
	listOfStaff, err := r.rateStore.GetAllStaffRequirementsByRequestID(ctx, requestUUID)
	if err != nil {
		return 0, 0, 0, 0, err
	}

	// Sum the pre-calculated amount from each staff requirement for the subtotal
	subtotal := 0.00

	for _, staff := range listOfStaff {
		subtotal += staff.Amount
	}

	transactionFee := subtotal * 0.035              // 3.5% of subtotal
	serviceFee := (subtotal + transactionFee) * 0.3 // 30% of (subtotal + transaction fee)

	totalAmount := subtotal + transactionFee + serviceFee

	return totalAmount, transactionFee, serviceFee, subtotal, nil
}

func (r *RateCalculatorRepository) GetRates(ctx context.Context, request *models.Request) (float64, float64, float64, float64, error) {
	return r.CalculateRates(ctx, request)
}

func (r *RateCalculatorRepository) UpdateRates(ctx context.Context, request *models.Request, customLineItems []models.CustomLineItems) (float64, float64, float64, float64, error) {
	if request == nil {
		return 0, 0, 0, 0, errors.New("request is nil")
	}

	// Get request UUID
	requestUUID := request.UUID

	// Get all staff requirements for this request
	listOfStaff, err := r.rateStore.GetAllStaffRequirementsByRequestID(ctx, requestUUID)
	if err != nil {
		return 0, 0, 0, 0, err
	}

	// Calculate staff-based subtotal
	staffSubtotal := 0.00
	for _, staff := range listOfStaff {
		staffSubtotal += staff.Amount
	}

	// Handle custom line items
	// First save/update them in the database if they're provided
	customLineItemsSubtotal := 0.00

	if customLineItems != nil && len(customLineItems) > 0 {
		// For each custom line item, set the request ID and calculate total
		for i := range customLineItems {
			// Set the request ID
			customLineItems[i].RequestID = requestUUID

			// If UUID is not set, this is a new item
			if customLineItems[i].UUID == uuid.Nil {
				customLineItems[i].UUID = uuid.New()
			}

			// Calculate total (quantity * rate)
			customLineItems[i].Total = float64(customLineItems[i].Quantity) * customLineItems[i].Rate

			// Add to subtotal
			customLineItemsSubtotal += customLineItems[i].Total

			// Save the custom line item
			if err := r.rateStore.UpdateCustomLineItem(ctx, &customLineItems[i]); err != nil {
				// If it fails to update, try creating it
				if err := r.rateStore.CreateCustomLineItem(ctx, &customLineItems[i]); err != nil {
					return 0, 0, 0, 0, err
				}
			}
		}
	}

	// Calculate final subtotal (staff + custom line items)
	subtotal := staffSubtotal + customLineItemsSubtotal

	// Calculate fees
	transactionFee := subtotal * 0.035              // 3.5% of subtotal
	serviceFee := (subtotal + transactionFee) * 0.3 // 30% of (subtotal + transaction fee)

	// Calculate total amount
	totalAmount := subtotal + transactionFee + serviceFee

	return totalAmount, transactionFee, serviceFee, subtotal, nil
}
