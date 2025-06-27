package ports

import (
	"net/http"

	"backend/internal/core/models"

	"github.com/google/uuid"
)

type TokenService interface {
	GenerateToken(userId uuid.UUID, email string) (string, error)
	VerifyToken(tokenString string) (*models.TokenPayload, error)
}

type AuthService interface {
	SignInWithProvider(writer http.ResponseWriter, request *http.Request)
	CallbackHandler(writer http.ResponseWriter, request *http.Request) (*models.User, error)
}
