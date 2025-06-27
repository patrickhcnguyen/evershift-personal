package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type User struct {
	UUID        uuid.UUID `gorm:"type:uuid;primary_key;default:uuid_generate_v4()"`
	Email       string    `gorm:"type:varchar"`
	FirstName   string    `gorm:"column:first_name"`
	LastName    string    `gorm:"column:last_name"`
	PhoneNumber string    `gorm:"column:phone_number"`
	BranchID    uuid.UUID `gorm:"column:branch_id;type:uuid"`
	Role        string    `gorm:"type:text"`
	CreatedAt   time.Time `gorm:"column:created_at"`
}

func (User) TableName() string {
	return "users"
}

var db *gorm.DB

func init() {
	var err error
	dsn := os.Getenv("DB_URL")
	if dsn == "" {
		dsn = "host=" + os.Getenv("DB_HOST") +
			" user=" + os.Getenv("DB_USER") +
			" password=" + os.Getenv("DB_PASSWORD") +
			" dbname=" + os.Getenv("DB_NAME") +
			" port=" + os.Getenv("DB_PORT") +
			" sslmode=require"
	}

	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Database connection established")
}

func handler(ctx context.Context, event events.CognitoEventUserPoolsPostConfirmation) (events.CognitoEventUserPoolsPostConfirmation, error) {
	log.Printf("=== LAMBDA TRIGGERED ===")
	log.Printf("Event: %+v", event)
	log.Printf("UserName: %s", event.UserName)
	log.Printf("User Attributes: %+v", event.Request.UserAttributes)

	userAttributes := event.Request.UserAttributes

	// Check if branch_id exists
	branchIDStr, exists := userAttributes["custom:branch_id"]
	log.Printf("Branch ID exists: %t, value: %s", exists, branchIDStr)

	var branchID uuid.UUID
	if branchIDStr != "" {
		if parsedBranchID, err := uuid.Parse(branchIDStr); err == nil {
			branchID = parsedBranchID
		} else {
			log.Printf("Invalid branch ID format: %s", branchIDStr)
			return event, fmt.Errorf("invalid branch ID format")
		}
	} else {
		log.Printf("No branch ID provided for user: %s", event.UserName)
		return event, fmt.Errorf("branch ID is required")
	}

	user := User{
		UUID:        uuid.New(),
		Email:       userAttributes["email"],
		FirstName:   userAttributes["given_name"],
		LastName:    userAttributes["family_name"],
		PhoneNumber: userAttributes["phone_number"],
		BranchID:    branchID,
		Role:        "user",
		CreatedAt:   time.Now(),
	}

	log.Printf("About to insert user: %+v", user)

	if err := db.Create(&user).Error; err != nil {
		log.Printf("DATABASE ERROR: %v", err)
		return event, err
	}

	log.Printf("=== USER CREATED SUCCESSFULLY ===")
	return event, nil
}

func main() {
	lambda.Start(handler)
}
