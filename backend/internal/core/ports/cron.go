package ports

import (
	"context"
	// "backend/internal/core/models"
)

type CronRepository interface {
	RunFollowUpEmails(ctx context.Context) error
	CheckOverdueInvoices(ctx context.Context) error
}

type CronService interface {
	Start() error
	Stop()
	TriggerFollowUpsByDelay(ctx context.Context, delayDays int) (int, error)
}
