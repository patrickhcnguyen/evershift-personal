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
	paymentAmount := invoice.Balance
	if paymentAmount <= 0 {
		paymentAmount = invoice.Amount
	}

	params := &stripe.PaymentIntentParams{
		Amount:   stripe.Int64(int64(paymentAmount * 100)),
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

	err = r.db.WithContext(ctx).Model(invoice).Update("payment_intent", paymentIntent.ID).Error
	if err != nil {
		return "", err
	}

	return paymentIntent.ID, nil
}

func (r *StripeRepository) CreateCheckoutSession(ctx context.Context, invoice *models.Invoice, staffRequirements []models.StaffRequirement) (string, error) {
	var lineItems []*stripe.CheckoutSessionLineItemParams

	checkoutAmount := invoice.Balance
	if checkoutAmount <= 0 {
		checkoutAmount = invoice.Amount
	}

	if invoice.Balance > 0 && invoice.AmountPaid > 0 {
		balanceItem := &stripe.CheckoutSessionLineItemParams{
			PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
				Currency: stripe.String(string(stripe.CurrencyUSD)),
				ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
					Name:        stripe.String("Remaining Balance"),
					Description: stripe.String(fmt.Sprintf("Additional charges for Invoice #%s", invoice.RequestID.String())),
				},
				UnitAmount: stripe.Int64(int64(checkoutAmount * 100)),
			},
			Quantity: stripe.Int64(1),
		}
		lineItems = append(lineItems, balanceItem)
	} else {

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

		if len(lineItems) == 0 && checkoutAmount > 0 {
			fallbackItem := &stripe.CheckoutSessionLineItemParams{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String(string(stripe.CurrencyUSD)),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name:        stripe.String("Invoice Payment"),
						Description: stripe.String(fmt.Sprintf("Payment for Invoice #%s", invoice.RequestID.String())),
					},
					UnitAmount: stripe.Int64(int64(checkoutAmount * 100)),
				},
				Quantity: stripe.Int64(1),
			}
			lineItems = append(lineItems, fallbackItem)
		}
	}

	if len(lineItems) == 0 {
		return "", fmt.Errorf("no line items available for checkout session - invoice amount: %.2f, balance: %.2f", invoice.Amount, invoice.Balance)
	}

	params := &stripe.CheckoutSessionParams{
		SuccessURL:    stripe.String("http://localhost:8080/"),
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

	switch event.Type {
	case stripe.EventTypeCheckoutSessionCompleted:
		var checkoutSession stripe.CheckoutSession
		var invoice models.Invoice
		if err := json.Unmarshal(event.Data.Raw, &checkoutSession); err != nil {
			return fmt.Errorf("error parsing webhook JSON: %w", err)
		}

		invoiceID, ok := checkoutSession.Metadata["invoice_id"]
		if !ok {
			log.Printf("invoice_id not found in webhook metadata for session %s", checkoutSession.ID)
			return nil
		}

		if checkoutSession.PaymentStatus == stripe.CheckoutSessionPaymentStatusPaid {
			if err := r.db.WithContext(ctx).Where("uuid = ?", invoiceID).First(&invoice).Error; err != nil {
				return fmt.Errorf("failed to get invoice: %w", err)
			}

			amountPaid := float64(checkoutSession.AmountTotal) / 100
			totalAmountPaid := invoice.AmountPaid + amountPaid
			newBalance := invoice.Amount - totalAmountPaid

			status := "paid"
			if newBalance > 0.01 {
				status = "partially_paid"
			}

			err := r.db.WithContext(ctx).Model(&models.Invoice{}).Where("uuid = ?", invoiceID).Updates(map[string]interface{}{
				"status":         status,
				"payment_intent": checkoutSession.PaymentIntent.ID,
				"amount_paid":    totalAmountPaid,
				"balance":        newBalance,
			}).Error

			if err != nil {
				return fmt.Errorf("failed to update invoice for %s: %w", invoiceID, err)
			}
		}

	case stripe.EventTypeChargeRefunded:
		var charge stripe.Charge
		if err := json.Unmarshal(event.Data.Raw, &charge); err != nil {
			return fmt.Errorf("error parsing webhook JSON for charge.refunded: %w", err)
		}

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
