package ports

import "context"

type CronRepository interface {
	Run() error
	Stop() error
	ProcessScheduledEmails(ctx context.Context) error
}

type CronService interface {
	Run() error
	Stop() error
	ProcessScheduledEmails(ctx context.Context) error
}
