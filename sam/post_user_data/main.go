package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

type User struct {
	UUID      string    `json:"uuid" gorm:"column:uuid;primaryKey"`
	Email     string    `json:"email" gorm:"column:email"`
	FirstName string    `json:"first_name" gorm:"column:first_name"`
	LastName  string    `json:"last_name" gorm:"column:last_name"`
	Role      string    `json:"role" gorm:"column:role"`
	BranchID  string    `json:"branch_id" gorm:"column:branch_id"`
	CreatedAt time.Time `json:"created_at" gorm:"column:created_at"`
}

func (User) TableName() string {
	return "users"
}

type UserRequest struct {
	UUID     string `json:"uuid"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Role     string `json:"role,omitempty"`
	BranchID string `json:"branch_id,omitempty"`
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	corsHeaders := map[string]string{
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
		"Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
		"Content-Type":                 "application/json",
	}

	if request.HTTPMethod == "OPTIONS" {
		return events.APIGatewayProxyResponse{
			StatusCode: 200,
			Headers:    corsHeaders,
			Body:       "",
		}, nil
	}

	debugMode := os.Getenv("DEBUG_MODE") == "true"

	log.Println("=== POST USER DATA FUNCTION STARTED ===")
	if debugMode {
		log.Printf("Debug mode enabled")
		log.Printf("Request method: %s", request.HTTPMethod)
		log.Printf("Request headers: %v", request.Headers)
		log.Printf("Request path parameters: %v", request.PathParameters)
		log.Printf("Request query parameters: %v", request.QueryStringParameters)
	}

	var userReq UserRequest
	log.Printf("Raw request body: %s", request.Body)

	if request.Body == "" {
		log.Printf("ERROR: Request body is empty")
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers:    corsHeaders,
			Body:       `{"error": "Request body is empty"}`,
		}, nil
	}

	err := json.Unmarshal([]byte(request.Body), &userReq)
	if err != nil {
		log.Printf("ERROR: Failed to parse JSON request body: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers:    corsHeaders,
			Body:       fmt.Sprintf(`{"error": "Invalid JSON: %v"}`, err),
		}, nil
	}

	log.Printf("Parsed user request: %+v", userReq)

	// Validate required fields
	if userReq.UUID == "" {
		log.Printf("ERROR: UUID is required but missing")
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers:    corsHeaders,
			Body:       `{"error": "UUID is required"}`,
		}, nil
	}

	if userReq.Email == "" {
		log.Printf("ERROR: Email is required but missing")
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers:    corsHeaders,
			Body:       `{"error": "Email is required"}`,
		}, nil
	}

	if userReq.Name == "" {
		log.Printf("ERROR: Name is required but missing")
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers:    corsHeaders,
			Body:       `{"error": "Name is required"}`,
		}, nil
	}

	// Get environment variables
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbSSLMode := os.Getenv("DB_SSLMODE")

	if dbPort == "" {
		dbPort = "5432"
	}
	if dbSSLMode == "" {
		dbSSLMode = "require"
	}

	log.Printf("=== DATABASE CONNECTION INFO ===")
	log.Printf("DB_HOST: %s", dbHost)
	log.Printf("DB_PORT: %s", dbPort)
	log.Printf("DB_NAME: %s", dbName)
	log.Printf("DB_USER: %s", dbUser)
	log.Printf("DB_SSLMODE: %s", dbSSLMode)
	log.Printf("DB_PASSWORD: %s", strings.Repeat("*", len(dbPassword)))

	// Validate required environment variables
	if dbHost == "" || dbName == "" || dbUser == "" || dbPassword == "" {
		log.Printf("ERROR: Missing required database environment variables")
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    corsHeaders,
			Body:       `{"error": "Database configuration error"}`,
		}, nil
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		dbHost, dbPort, dbUser, dbPassword, dbName, dbSSLMode)

	log.Printf("Attempting database connection...")

	var gormConfig *gorm.Config
	if debugMode {
		gormConfig = &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		}
	} else {
		gormConfig = &gorm.Config{}
	}

	db, err := gorm.Open(postgres.Open(dsn), gormConfig)
	if err != nil {
		log.Printf("ERROR: Failed to connect to database: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    corsHeaders,
			Body:       fmt.Sprintf(`{"error": "Database connection failed: %v"}`, err),
		}, nil
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Printf("ERROR: Failed to get underlying sql.DB: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    corsHeaders,
			Body:       fmt.Sprintf(`{"error": "Database setup failed: %v"}`, err),
		}, nil
	}
	defer sqlDB.Close()

	sqlDB.SetMaxOpenConns(5)
	sqlDB.SetMaxIdleConns(5)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	dbCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	log.Printf("Pinging database...")
	err = sqlDB.PingContext(dbCtx)
	if err != nil {
		log.Printf("ERROR: Failed to ping database: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    corsHeaders,
			Body:       fmt.Sprintf(`{"error": "Database ping failed: %v"}`, err),
		}, nil
	}
	log.Printf("Database ping successful!")

	log.Printf("Checking if users table exists...")
	if !db.Migrator().HasTable(&User{}) {
		log.Printf("ERROR: Table 'users' does not exist")
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    corsHeaders,
			Body:       `{"error": "Table 'users' does not exist. Please run migrations first."}`,
		}, nil
	}
	log.Printf("Users table exists!")

	// Parse name into first and last name
	nameParts := strings.Split(strings.TrimSpace(userReq.Name), " ")
	firstName := nameParts[0]
	lastName := ""
	if len(nameParts) > 1 {
		lastName = strings.Join(nameParts[1:], " ")
	}

	user := User{
		UUID:      userReq.UUID,
		Email:     userReq.Email,
		FirstName: firstName,
		LastName:  lastName,
		Role:      userReq.Role,
		BranchID:  userReq.BranchID,
		CreatedAt: time.Now(),
	}

	log.Printf("=== ATTEMPTING TO INSERT USER ===")
	log.Printf("User data to insert: %+v", user)

	// Check if user already exists
	var existingUser User
	result := db.Where("uuid = ?", user.UUID).First(&existingUser)
	if result.Error == nil {
		log.Printf("WARNING: User with UUID %s already exists", user.UUID)
		return events.APIGatewayProxyResponse{
			StatusCode: 409,
			Headers:    corsHeaders,
			Body:       fmt.Sprintf(`{"error": "User with UUID %s already exists"}`, user.UUID),
		}, nil
	}

	// Insert the user
	result = db.Create(&user)
	if result.Error != nil {
		log.Printf("ERROR: Failed to insert user: %v", result.Error)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    corsHeaders,
			Body:       fmt.Sprintf(`{"error": "Failed to insert user: %v"}`, result.Error),
		}, nil
	}

	log.Printf("SUCCESS: User %s (UUID: %s) inserted successfully! Rows affected: %d",
		userReq.Name, userReq.UUID, result.RowsAffected)

	responseBody := map[string]interface{}{
		"message":       fmt.Sprintf("User %s added successfully", userReq.Name),
		"uuid":          userReq.UUID,
		"rows_affected": result.RowsAffected,
	}

	responseJSON, _ := json.Marshal(responseBody)

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers:    corsHeaders,
		Body:       string(responseJSON),
	}, nil
}

func main() {
	lambda.Start(handler)
}
