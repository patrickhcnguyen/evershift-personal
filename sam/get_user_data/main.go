package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

type User struct {
	ID        string `json:"id" gorm:"column:uuid;primaryKey"`
	FirstName string `json:"first_name" gorm:"column:first_name"`
	LastName  string `json:"last_name" gorm:"column:last_name"`
	Email     string `json:"email" gorm:"column:email"`
	Role      string `json:"role" gorm:"column:role"`
	BranchID  string `json:"branch_id" gorm:"column:branch_id"`
}

func (User) TableName() string {
	return "users"
}

func handler(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	corsHeaders := map[string]string{
		"Access-Control-Allow-Origin":  "*",
		"Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
		"Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
		"Content-Type":                 "application/json",
	}

	// Handle preflight OPTIONS request
	if request.HTTPMethod == "OPTIONS" {
		return events.APIGatewayProxyResponse{
			StatusCode: 200,
			Headers:    corsHeaders,
			Body:       "",
		}, nil
	}

	userID := request.QueryStringParameters["uuid"]
	userEmail := request.QueryStringParameters["email"]

	if userID == "" && userEmail == "" {
		return events.APIGatewayProxyResponse{
			StatusCode: 400,
			Headers:    corsHeaders,
			Body:       "Missing user ID or email",
		}, nil
	}

	dbHost := os.Getenv("DB_HOST")
	dbName := os.Getenv("DB_NAME")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=5432 sslmode=require",
		dbHost, dbUser, dbPassword, dbName)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Printf("Failed to connect to database: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    corsHeaders,
			Body:       fmt.Sprintf("Failed to connect to database: %v", err),
		}, nil
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Printf("Failed to get underlying sql.DB: %v", err)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    corsHeaders,
			Body:       fmt.Sprintf("Failed to get database connection: %v", err),
		}, nil
	}
	defer sqlDB.Close()
	var user User
	var result *gorm.DB

	if userID != "" {
		result = db.Where("uuid = ?", userID).First(&user)
	} else {
		result = db.Where("email = ?", userEmail).First(&user)
	}

	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			identifier := userID
			if identifier == "" {
				identifier = userEmail
			}
			return events.APIGatewayProxyResponse{
				StatusCode: 404,
				Headers:    corsHeaders,
				Body:       fmt.Sprintf("User with identifier %s not found", identifier),
			}, nil
		}
		log.Printf("Failed to query user: %v", result.Error)
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    corsHeaders,
			Body:       fmt.Sprintf("Failed to query user: %v", result.Error),
		}, nil
	}

	userJSON, err := json.Marshal(user)
	if err != nil {
		return events.APIGatewayProxyResponse{
			StatusCode: 500,
			Headers:    corsHeaders,
			Body:       fmt.Sprintf("Failed to marshal user to JSON: %v", err),
		}, nil
	}

	return events.APIGatewayProxyResponse{
		StatusCode: 200,
		Headers:    corsHeaders,
		Body:       string(userJSON),
	}, nil
}

func main() {
	lambda.Start(handler)
}
