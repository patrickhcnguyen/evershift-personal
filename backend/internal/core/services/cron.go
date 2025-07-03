package services

import (
	"backend/internal/core/ports"
	"context"
)

type CronService struct {
	repo ports.CronRepository
}

func NewCronService(repo ports.CronRepository) ports.CronService {
	return &CronService{repo: repo}
}

func (s *CronService) Run() error {
	return s.repo.Run()
}

func (s *CronService) Stop() error {
	return s.repo.Stop()
}

func (s *CronService) ProcessScheduledEmails(ctx context.Context) error {
	return s.repo.ProcessScheduledEmails(ctx)
}
