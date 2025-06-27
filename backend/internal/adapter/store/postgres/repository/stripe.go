package repository

import (
	"backend/internal/core/models"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	ports "backend/internal/core/ports"

	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/checkout/session"
	"github.com/stripe/stripe-go/v82/paymentintent"
	"github.com/stripe/stripe-go/v82/refund"
	"github.com/stripe/stripe-go/v82/webhook"
	"gorm.io/gorm"
)

type StripeRepository struct {
	db *gorm.DB
}

func NewStripeRepository(db *gorm.DB) ports.StripeRepository {
	return &StripeRepository{
		db: db,
	}
}

func (r *StripeRepository) CreatePaymentIntent(ctx context.Context, invoice *models.Invoice) (string, error) {
	params := &stripe.PaymentIntentParams{
		Amount:   stripe.Int64(int64(invoice.Amount * 100)),
		Currency: stripe.String(string(stripe.CurrencyUSD)),
		AutomaticPaymentMethods: &stripe.PaymentIntentAutomaticPaymentMethodsParams{
			Enabled: stripe.Bool(true),
		},
		Metadata: map[string]string{
			"invoice_id": invoice.UUID.String(),
		},
	}

	paymentIntent, err := paymentintent.New(params)
	if err != nil {
		return "", err
	}

	// update the invoice in the database with the payment intent ID
	// TODO: not working right now
	err = r.db.WithContext(ctx).Model(invoice).Update("payment_intent", paymentIntent.ID).Error
	if err != nil {
		return "", err
	}

	return paymentIntent.ID, nil
}

func (r *StripeRepository) CreateCheckoutSession(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement) (string, error) {
	var lineItems []*stripe.CheckoutSessionLineItemParams

	// Single line item for all staff services using invoice subtotal
	// TODO: fix staff requirement rate calculation and use that later
	if invoice.Subtotal > 0 {
		staffServicesItem := &stripe.CheckoutSessionLineItemParams{
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency: stripe.String(string(stripe.CurrencyUSD)),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name:        stripe.String("Event Staff Services"),
					Description: stripe.String("Staff services for your event"),
				},
				UnitAmount: stripe.Int64(int64(invoice.Subtotal * 100)),
			},
			Quantity: stripe.Int64(1),
		}
		lineItems = append(lineItems, staffServicesItem)
	}

	// Add service fee
	if invoice.ServiceFee > 0 {
		serviceFeeItem := &stripe.CheckoutSessionLineItemParams{
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency: stripe.String(string(stripe.CurrencyUSD)),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name:        stripe.String("Service Fee"),
					Description: stripe.String("Administrative service fee"),
				},
				UnitAmount: stripe.Int64(int64(invoice.ServiceFee * 100)),
			},
			Quantity: stripe.Int64(1),
		}
		lineItems = append(lineItems, serviceFeeItem)
	}

	// Add transaction fee
	if invoice.TransactionFee > 0 {
		transactionFeeItem := &stripe.CheckoutSessionLineItemParams{
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency: stripe.String(string(stripe.CurrencyUSD)),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name:        stripe.String("Transaction Fee"),
					Description: stripe.String("Payment processing fee (3.5%)"),
				},
				UnitAmount: stripe.Int64(int64(invoice.TransactionFee * 100)),
			},
			Quantity: stripe.Int64(1),
		}
		lineItems = append(lineItems, transactionFeeItem)
	}

	params := &stripe.CheckoutSessionParams{
		SuccessURL: stripe.String("http://localhost:8080/"),
		// CancelURL:  stripe.String("http://localhost:8080/cancel"),
		Mode:          stripe.String(string(stripe.CheckoutSessionModePayment)),
		LineItems:     lineItems,
		CustomerEmail: stripe.String(invoice.Request.Email),
		Metadata: map[string]string{
			"invoice_id": invoice.UUID.String(),
			"request_id": invoice.RequestID.String(),
		},
	}

	session, err := session.New(params)
	if err != nil {
		return "", err
	}

	// Optionally update invoice with checkout session ID
	// err = r.db.WithContext(ctx).Model(invoice).Update("checkout_session_id", session.ID).Error
	// if err != nil {
	// 	return "", err
	// }

	return session.URL, nil
}

func (r *StripeRepository) RefundPayment(ctx context.Context, invoice *models.Invoice) (string, error) {
	params := &stripe.RefundParams{
		PaymentIntent: stripe.String(invoice.PaymentIntent),
	}

	result, err := refund.New(params)
	if err != nil {
		return "", err
	}

	return result.ID, nil
}

// Webhook handles incoming Stripe webhooks
func (r *StripeRepository) Webhook(ctx context.Context, payload []byte, signatureHeader string) error {
	webhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	if webhookSecret == "" {
		return fmt.Errorf("STRIPE_WEBHOOK_SECRET environment variable not set")
	}

	event, err := webhook.ConstructEvent(payload, signatureHeader, webhookSecret)
	if err != nil {
		return fmt.Errorf("error verifying webhook signature: %w", err)
	}

	// Handle the event
	switch event.Type {
	case stripe.EventTypeCheckoutSessionCompleted:
		var checkoutSession stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &checkoutSession); err != nil {
			return fmt.Errorf("error parsing webhook JSON: %w", err)
		}

		// Retrieve invoice_id from metadata
		invoiceID, ok := checkoutSession.Metadata["invoice_id"]
		if !ok {
			log.Printf("invoice_id not found in webhook metadata for session %s", checkoutSession.ID)
			return nil // Or return an error if it's unexpected
		}

		// Check if the payment was successful
		if checkoutSession.PaymentStatus == stripe.CheckoutSessionPaymentStatusPaid {
			err := r.db.WithContext(ctx).Model(&models.Invoice{}).Where("uuid = ?", invoiceID).Updates(map[string]interface{}{
				"status":         "paid",
				"payment_intent": checkoutSession.PaymentIntent.ID,
			}).Error

			if err != nil {
				return fmt.Errorf("failed to update invoice for %s: %w", invoiceID, err)
			}
			log.Printf("Invoice %s marked as paid.", invoiceID)

			// TODO: send admin confirmation email
			// r.SendAdminConfirmationEmail(...)
		}

	case stripe.EventTypeChargeRefunded:
		var charge stripe.Charge
		if err := json.Unmarshal(event.Data.Raw, &charge); err != nil {
			return fmt.Errorf("error parsing webhook JSON for charge.refunded: %w", err)
		}

		// Find the invoice using the PaymentIntent ID from the charge
		var invoice models.Invoice
		if err := r.db.WithContext(ctx).Where("payment_intent = ?", charge.PaymentIntent.ID).First(&invoice).Error; err != nil {
			log.Printf("Could not find invoice for payment intent %s to mark as refunded.", charge.PaymentIntent.ID)
			return nil
		}

		if err := r.db.WithContext(ctx).Model(&invoice).Update("status", "refunded").Error; err != nil {
			return fmt.Errorf("failed to update invoice %s to refunded: %w", invoice.UUID, err)
		}
		log.Printf("Invoice %s marked as refunded.", invoice.UUID)

	default:
		log.Printf("Unhandled event type: %s\n", event.Type)
	}

	return nil
}

func (r *StripeRepository) SendAdminConfirmationEmail(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement) (string, error) {
	// TODO: implement send admin confirmation email
	return "", nil
}
