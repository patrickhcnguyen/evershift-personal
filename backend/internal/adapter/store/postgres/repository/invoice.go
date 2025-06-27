package repository

import (
	"backend/internal/core/models"
	ports "backend/internal/core/ports"
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type InvoiceRepository struct {
	db             *gorm.DB
	rateCalculator ports.CalculateRatesRepository
}

func NewInvoiceRepository(db *gorm.DB, rateCalculator ports.CalculateRatesRepository) ports.InvoiceRepository {
	return &InvoiceRepository{
		db:             db,
		rateCalculator: rateCalculator,
	}
}

func (r *InvoiceRepository) CreateInvoice(ctx context.Context, invoice *models.Invoice, request *models.Request) error {
	if invoice.UUID == uuid.Nil {
		invoice.UUID = uuid.New()
	}

	amount, transactionFee, serviceFee, subtotal, err := r.rateCalculator.CalculateRates(ctx, request)
	if err != nil {
		return fmt.Errorf("failed to calculate rates: %w", err)
	}

	invoice.RequestID = request.UUID
	invoice.DueDate = request.StartDate
	invoice.Subtotal = subtotal
	invoice.DiscountType = "none"
	invoice.DiscountValue = 0
	invoice.TransactionFee = transactionFee
	invoice.ServiceFee = serviceFee
	invoice.Amount = amount
	invoice.Balance = amount
	invoice.Status = "pending"
	invoice.PaymentTerms = "Due on receipt"
	invoice.Notes = ""
	invoice.ShipTo = request.EventLocation
	invoice.POEditCounter = 0
	invoice.PONumber = fmt.Sprintf("PO-%s", request.UUID.String()[:8])

	return r.db.WithContext(ctx).Create(invoice).Error
}

func (r *InvoiceRepository) GetInvoiceByID(ctx context.Context, id uuid.UUID) (*models.Invoice, error) {
	var invoice models.Invoice
	err := r.db.WithContext(ctx).Preload("Request").Where("uuid = ?", id).First(&invoice).Error
	if err != nil {
		return nil, err
	}
	return &invoice, nil
}

func (r *InvoiceRepository) GetInvoiceByRequestID(ctx context.Context, requestID uuid.UUID) (*models.Invoice, error) {
	var invoice models.Invoice
	if err := r.db.WithContext(ctx).Preload("Request").Where("request_id = ?", requestID).First(&invoice).Error; err != nil {
		return nil, err
	}
	return &invoice, nil
}

func (r *InvoiceRepository) GetInvoiceByBranchID(ctx context.Context, branchID uuid.UUID) ([]models.InvoiceResponse, error) {
	var tempResults []struct {
		models.Invoice
		RequestFirstName         string
		RequestLastName          string
		RequestIsCompany         bool
		RequestCompanyName       string
		RequestClosestBranchName string
	}

	err := r.db.WithContext(ctx).Table("invoices").
		Select("invoices.*, requests.first_name as request_first_name, requests.last_name as request_last_name, requests.is_company as request_is_company, requests.company_name as request_company_name, requests.closest_branch_name as request_closest_branch_name").
		Joins("JOIN requests ON requests.uuid = invoices.request_id").
		Where("requests.closest_branch_id = ?", branchID).
		Scan(&tempResults).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query invoices by branch id: %w", err)
	}

	var finalResponse []models.InvoiceResponse
	for _, res := range tempResults {
		clientName := ""
		if res.RequestIsCompany && strings.TrimSpace(res.RequestCompanyName) != "" {
			clientName = strings.TrimSpace(res.RequestCompanyName)
		} else {
			clientName = strings.TrimSpace(fmt.Sprintf("%s %s", res.RequestFirstName, res.RequestLastName))
		}

		finalResponse = append(finalResponse, models.InvoiceResponse{
			UUID:       res.Invoice.UUID,
			RequestID:  res.Invoice.RequestID,
			DueDate:    res.Invoice.DueDate,
			Amount:     res.Invoice.Amount,
			Balance:    res.Invoice.Balance,
			Status:     res.Invoice.Status,
			PONumber:   res.Invoice.PONumber,
			ClientName: clientName,
			BranchName: res.RequestClosestBranchName,
		})
	}
	return finalResponse, nil
}

func (r *InvoiceRepository) UpdateInvoice(ctx context.Context, invoice *models.Invoice) error {
	// Get existing invoice to check PO edit counter
	var existing models.Invoice
	if err := r.db.WithContext(ctx).Where("uuid = ?", invoice.UUID).First(&existing).Error; err != nil {
		return err
	}

	// Only check PO edit limit if they're actually updating the PO number
	if invoice.PONumber != existing.PONumber {
		if existing.POEditCounter >= 1 {
			return fmt.Errorf("PO number has already been edited")
		}
		invoice.POEditCounter = 1
	}

	return r.db.WithContext(ctx).Save(invoice).Error
}

func (r *InvoiceRepository) DeleteInvoice(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&models.Invoice{}, id).Error
}

func (r *InvoiceRepository) CheckForOverdueInvoices(ctx context.Context) ([]models.Invoice, error) {
	var overdueInvoices []models.Invoice
	err := r.db.WithContext(ctx).Table("invoices").
		Where("status = ? AND due_date < ?", "unpaid", time.Now().UTC()).
		Scan(&overdueInvoices).Error

	if err != nil {
		return nil, fmt.Errorf("failed to query overdue invoices: %w", err)
	}

	return overdueInvoices, nil
}
