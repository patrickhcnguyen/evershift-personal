package models

import "github.com/google/uuid"

// TokenPayload represents the payload of a JWT token
type TokenPayload struct {
	UserId uuid.UUID
	Email  string
}
