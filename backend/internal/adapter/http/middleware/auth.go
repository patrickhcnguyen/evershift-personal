package middleware

import (
	"context"
	"net/http"

	"backend/internal/core/models"

	"github.com/gin-gonic/gin"
)

func (m *MiddlewareService) AuthMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		// get user from session
		user, ok := m.sm.Get(ctx, "user").(models.User)
		if !ok {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		// check if user is in database and check their role
		foundUser, err := m.userRepo.GetUserByID(context.Background(), user.UUID)
		if err != nil {
			ctx.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		user = *foundUser
		// set user information in context for use in protected routes
		ctx.Set("user", user)
		ctx.Next()

	}
}

// LaxAuthMiddleware verifies the JWT token from the cookie and checks user status in database. Does not abort if user is not authenticated
func (m *MiddlewareService) LaxAuthMiddleware() gin.HandlerFunc {
	return func(ctx *gin.Context) {
		user, ok := m.sm.Get(ctx, "user").(models.User)
		if !ok {
			ctx.Next()
			return
		}
		// check if user is in db
		foundUser, err := m.userRepo.GetUserByID(context.Background(), user.UUID)
		if err != nil {
			ctx.Next()
			return
		}
		user = *foundUser

		// set user information in context for use in protected routes
		ctx.Set("user", user)
		ctx.Next()
	}
}

// AdminAccess restricts routes so only users with admin/superadmin/account executive role can access
func (m *MiddlewareService) AdminAccess() gin.HandlerFunc {
	return func(c *gin.Context) {
		if m.cfg.App.Env == "production" {
			if isAuthorized, exists := c.Get("authorized"); !exists || !isAuthorized.(bool) {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
				return
			}
			role, _ := c.Get("role")
			if role != "admin" && role != "superadmin" && role != "account-executive" {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
				return
			}
		}
		c.Next()
	}
}
