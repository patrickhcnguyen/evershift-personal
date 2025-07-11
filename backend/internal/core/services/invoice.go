package services

import (
	"backend/internal/config"
	"backend/internal/core/models"
	"backend/internal/core/ports"
	"context"
	"fmt"

	// "fmt"
	// "time"

	"github.com/google/uuid"
)

type InvoiceService struct {
	invoiceRepo        ports.InvoiceRepository
	requestRepo        ports.RequestRepository
	rateCalculatorRepo ports.CalculateRatesRepository
	cfg                *config.Config
}

func NewInvoiceService(invoiceRepo ports.InvoiceRepository, requestRepo ports.RequestRepository, rateCalculatorRepo ports.CalculateRatesRepository, cfg *config.Config) ports.InvoiceService {
	return &InvoiceService{
		invoiceRepo:        invoiceRepo,
		requestRepo:        requestRepo,
		rateCalculatorRepo: rateCalculatorRepo,
		cfg:                cfg,
	}
}

// CreateInvoiceFromRequest creates a new invoice based on a request and its staff requirements
// func (s *InvoiceService) CreateInvoiceFromRequest(ctx context.Context, request *models.Request, staffRequirements []models.StaffRequirement) error {
// 	// Calculate total from staff requirements
// 	var subtotal float64
// 	for _, staffReq := range staffRequirements {
// 		// Calculate hours between start and end time
// 		startTime, _ := time.Parse(time.RFC3339, staffReq.StartTime.Format(time.RFC3339))
// 		endTime, _ := time.Parse(time.RFC3339, staffReq.EndTime.Format(time.RFC3339))
// 		hours := endTime.Sub(startTime).Hours()

// 		// Add to subtotal: rate * hours * count
// 		subtotal += staffReq.Rate * hours * float64(staffReq.Count)
// 	}

// 	// Calculate fees
// 	transactionFee := subtotal * 0.035              // 3.5% transaction fee
// 	serviceFee := (subtotal + transactionFee) * 0.5 // 50% service fee
// 	amount := subtotal + transactionFee + serviceFee

// 	// Create a new invoice with temporary pre-filled fields
// 	invoice := &models.Invoice{
// 		UUID:           uuid.New(),
// 		RequestID:      request.UUID,
// 		DueDate:        time.Now().AddDate(0, 0, 14),
// 		Subtotal:       uuid.MustParse("1000"),
// 		TransactionFee: uuid.MustParse("35"),
// 		ServiceFee:     uuid.MustParse("170"),
// 		Amount:         uuid.MustParse("1205"),
// 		Balance:        uuid.MustParse("1205"), // Initial balance is same as amount
// 		Status:         "pending",
// 		PaymentTerms:   "Due on receipt",
// 		ShipTo:         request.EventLocation,
// 		PONumber:       fmt.Sprintf("PO-%s", request.UUID.String()[:8]), // Generate a PO number based on request UUID
// 	}

// 	return s.invoiceRepo.CreateInvoice(ctx, invoice)
// }

func (s *InvoiceService) CreateInvoice(ctx context.Context, invoice *models.Invoice, request *models.Request) error {
	invoice.TermsAndConditions = s.cfg.TermsAndConditions
	return s.invoiceRepo.CreateInvoice(ctx, invoice, request)
}

func (s *InvoiceService) GetInvoiceByID(ctx context.Context, id uuid.UUID) (*models.Invoice, error) {
	invoice, err := s.invoiceRepo.GetInvoiceByID(ctx, id)
	if err != nil {
		return nil, err
	}
	invoice.TermsAndConditions = s.cfg.TermsAndConditions
	return invoice, nil
}

func (s *InvoiceService) GetInvoiceByRequestID(ctx context.Context, requestID uuid.UUID) (*models.Invoice, error) {
	invoice, err := s.invoiceRepo.GetInvoiceByRequestID(ctx, requestID)
	if err != nil {
		return nil, err
	}
	invoice.TermsAndConditions = s.cfg.TermsAndConditions
	return invoice, nil
}

func (s *InvoiceService) GetInvoiceByBranchID(ctx context.Context, branchID uuid.UUID) ([]models.InvoiceResponse, error) {
	return s.invoiceRepo.GetInvoiceByBranchID(ctx, branchID)
}

func (s *InvoiceService) UpdateInvoice(ctx context.Context, invoice *models.Invoice) error {
	invoice.TermsAndConditions = s.cfg.TermsAndConditions
	return s.invoiceRepo.UpdateInvoice(ctx, invoice)
}

func (s *InvoiceService) DeleteInvoice(ctx context.Context, id uuid.UUID) error {
	return s.invoiceRepo.DeleteInvoice(ctx, id)
}

func (s *InvoiceService) CheckForOverdueInvoices(ctx context.Context) ([]models.Invoice, error) {
	return s.invoiceRepo.CheckForOverdueInvoices(ctx)
}

// RecalculateInvoiceAfterPaymentWithNewItems recalculates invoice totals when new custom line items
// are added to an already paid or partially paid invoice
func (s *InvoiceService) RecalculateInvoiceAfterPaymentWithNewItems(ctx context.Context, invoiceID uuid.UUID, newCustomLineItems []models.CustomLineItems) (*models.Invoice, error) {
	// Get the existing invoice
	invoice, err := s.GetInvoiceByID(ctx, invoiceID)
	if err != nil {
		return nil, fmt.Errorf("failed to get invoice: %w", err)
	}

	// Get the request associated with this invoice
	request, err := s.requestRepo.GetRequestById(ctx, invoice.RequestID)
	if err != nil {
		return nil, fmt.Errorf("failed to get request: %w", err)
	}

	// Use existing UpdateRates functionality to recalculate totals including custom line items
	newAmount, newTransactionFee, newServiceFee, newSubtotal, err := s.rateCalculatorRepo.UpdateRates(ctx, &request, newCustomLineItems)
	if err != nil {
		return nil, fmt.Errorf("failed to recalculate rates with custom line items: %w", err)
	}

	// Calculate new balance (new total amount minus what's already been paid)
	newBalance := newAmount - invoice.AmountPaid

	// Update the invoice with new totals
	invoice.Subtotal = newSubtotal
	invoice.TransactionFee = newTransactionFee
	invoice.ServiceFee = newServiceFee
	invoice.Amount = newAmount
	invoice.Balance = newBalance

	// Set status based on remaining balance
	if newBalance <= 0.01 {
		invoice.Status = "paid"
		invoice.Balance = 0
	} else {
		invoice.Status = "partially_paid"
	}

	// Save the updated invoice
	err = s.UpdateInvoice(ctx, invoice)
	if err != nil {
		return nil, fmt.Errorf("failed to update invoice: %w", err)
	}

	return invoice, nil
}
