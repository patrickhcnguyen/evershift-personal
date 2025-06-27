package models

import (
	"time"

	"github.com/google/uuid"
)

type Invoice struct {
	UUID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	RequestID         uuid.UUID
	DueDate           time.Time
	Subtotal          float64
	DiscountType      string
	DiscountValue     float64
	TransactionFee    float64
	ServiceFee        float64
	Amount            float64
	Balance           float64
	Status            string
	PaymentTerms      string
	Notes             string
	ShipTo            string
	POEditCounter     float64 `json:"po_edit_counter"`
	PONumber          string  `json:"po_number"`
	PaymentIntent     string
	LastSent          time.Time `json:"last_sent"`
	FollowUpCount     int       `json:"follow_up_count"`
	FollowUpDelayDays int       `json:"follow_up_delay_days"`

	TermsAndConditions string  `json:"terms_and_conditions"`
	Request            Request `gorm:"foreignKey:RequestID"`
}

type InvoiceResponse struct {
	UUID      uuid.UUID `json:"id"` // Invoice UUID
	RequestID uuid.UUID `json:"request_id"`
	DueDate   time.Time `json:"due_date"`
	Amount    float64   `json:"amount"`
	Balance   float64   `json:"balance"`
	Status    string    `json:"status"`
	PONumber  string    `json:"po_number"`

	// Client-specific info, pre-processed by backend
	ClientName string `json:"client_name"`

	// Branch info from the request, if needed for display (e.g., for superadmin view)
	BranchName string `json:"branch_name,omitempty"`
}
