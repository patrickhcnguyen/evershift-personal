package repository

import (
	"backend/internal/core/models"
	"backend/internal/core/ports"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/mailgun/mailgun-go/v4"
	"github.com/redis/go-redis/v9"
	"github.com/robfig/cron"
	"gorm.io/gorm"
)

type CronRepository struct {
	db        *gorm.DB
	redis     *redis.Client
	emailRepo *EmailRepository
	scheduler *cron.Cron
}

func NewCronRepository(db *gorm.DB, redis *redis.Client, emailRepo *EmailRepository) ports.CronRepository {
	return &CronRepository{
		db:        db,
		redis:     redis,
		emailRepo: emailRepo,
		scheduler: cron.New(),
	}
}

func (r *CronRepository) Run() error {
	log.Println("[CRON] Starting scheduled email processor...")

	err := r.scheduler.AddFunc("@every 1m", func() {
		ctx := context.Background()
		if err := r.ProcessScheduledEmails(ctx); err != nil {
			log.Printf("[CRON] Error processing scheduled emails: %v", err)
		}
	})

	if err != nil {
		return fmt.Errorf("failed to add cron job: %w", err)
	}

	r.scheduler.Start()
	log.Println("[CRON] Scheduler started successfully")

	return nil
}

func (r *CronRepository) Stop() error {
	if r.scheduler != nil {
		log.Println("[CRON] Stopping scheduler...")
		r.scheduler.Stop()
		log.Println("[CRON] Scheduler stopped")
	}
	return nil
}

func (r *CronRepository) ProcessScheduledEmails(ctx context.Context) error {
	now := time.Now().UTC()

	emailIDs, err := r.redis.ZRangeByScore(ctx, "scheduled_emails", &redis.ZRangeBy{
		Min: "0",
		Max: fmt.Sprintf("%d", now.Unix()),
	}).Result()

	if err != nil {
		return fmt.Errorf("failed to query scheduled emails: %w", err)
	}

	if len(emailIDs) == 0 {
		return nil
	}

	log.Printf("[CRON] Found %d scheduled emails to send", len(emailIDs))

	successCount := 0
	errorCount := 0

	for _, emailID := range emailIDs {
		if err := r.processIndividualEmail(ctx, emailID); err != nil {
			log.Printf("[CRON] Failed to send email %s: %v", emailID, err)
			errorCount++
		} else {
			log.Printf("[CRON] Successfully sent email %s", emailID)
			successCount++
		}
	}

	log.Printf("[CRON] Processed %d/%d emails successfully, %d failed",
		successCount, len(emailIDs), errorCount)

	return nil
}

func (r *CronRepository) processIndividualEmail(ctx context.Context, emailID string) error {
	key := "scheduled_email:" + emailID
	emailData, err := r.redis.Get(ctx, key).Result()
	if err != nil {
		return fmt.Errorf("failed to get email data: %w", err)
	}

	var email models.Email
	if err := json.Unmarshal([]byte(emailData), &email); err != nil {
		return fmt.Errorf("failed to unmarshal email data: %w", err)
	}

	if email.SendAt.After(time.Now().UTC()) {
		return fmt.Errorf("email not yet due: scheduled for %s", email.SendAt.Format(time.RFC3339))
	}

	if err := r.sendEmailViaMailgun(ctx, &email); err != nil {
		return fmt.Errorf("failed to send via mailgun: %w", err)
	}

	if err := r.cleanupEmailFromRedis(ctx, emailID); err != nil {
		log.Printf("[CRON] Warning: Failed to cleanup email %s from Redis: %v", emailID, err)
	}

	return nil
}

func (r *CronRepository) sendEmailViaMailgun(ctx context.Context, email *models.Email) error {
	if r.emailRepo.mg == nil || r.emailRepo.domain == "" || r.emailRepo.from == "" {
		return fmt.Errorf("mailgun configuration missing")
	}

	var invoice models.Invoice
	err := r.db.WithContext(ctx).
		Preload("Request").
		Where("request_id = ?", email.RequestID).
		First(&invoice).Error

	if err != nil {
		return fmt.Errorf("failed to get invoice for request %s: %w", email.RequestID, err)
	}

	clientEmail := invoice.Request.Email
	if clientEmail == "" {
		return fmt.Errorf("client email is empty for request %s", email.RequestID)
	}

	message := mailgun.NewMessage(r.emailRepo.from, email.Subject, "", clientEmail)
	message.SetHTML(email.Content)

	if email.ReplyTo != "" {
		message.SetReplyTo(email.ReplyTo)
	}

	for _, cc := range email.CC {
		if cc != "" {
			message.AddCC(cc)
		}
	}

	for _, bcc := range email.BCC {
		if bcc != "" {
			message.AddBCC(bcc)
		}
	}

	_, _, err = r.emailRepo.mg.Send(ctx, message)
	if err != nil {
		return fmt.Errorf("mailgun send error: %w", err)
	}

	return nil
}

func (r *CronRepository) cleanupEmailFromRedis(ctx context.Context, emailID string) error {
	if err := r.redis.ZRem(ctx, "scheduled_emails", emailID).Err(); err != nil {
		return fmt.Errorf("failed to remove from scheduled_emails: %w", err)
	}

	key := "scheduled_email:" + emailID
	if err := r.redis.Del(ctx, key).Err(); err != nil {
		return fmt.Errorf("failed to delete email data: %w", err)
	}

	return nil
}
