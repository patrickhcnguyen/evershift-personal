package middleware

import (
	"backend/internal/config"
	"backend/internal/core/ports"

	gin_adapter "github.com/39george/scs_gin_adapter"
	"github.com/gin-gonic/gin"
)

type Middleware interface {
	AuthMiddleware() gin.HandlerFunc
	LaxAuthMiddleware() gin.HandlerFunc
	AdminAccess() gin.HandlerFunc
	CORS() gin.HandlerFunc
}

type MiddlewareService struct {
	cfg      *config.Config
	sm       *gin_adapter.GinAdapter
	userRepo ports.UserRepository
	tokenSvc ports.TokenService
	authSvc  ports.AuthService
}

func NewMiddlewareService(cfg *config.Config, sm *gin_adapter.GinAdapter, userRepo ports.UserRepository, tokenSvc ports.TokenService, authSvc ports.AuthService) Middleware {
	return &MiddlewareService{
		cfg:      cfg,
		sm:       sm,
		userRepo: userRepo,
		tokenSvc: tokenSvc,
		authSvc:  authSvc,
	}
}
