package config

import (
	"errors"
	"fmt"
	"os"

	"github.com/joho/godotenv"
	"gopkg.in/yaml.v3"
)

type Config struct {
	Port               string
	DatabaseURL        string
	App                *App
	HTTP               *HTTP
	AWS                *AWS
	S3                 *S3
	Stripe             *Stripe
	TermsAndConditions string
}

type TOSConfig struct {
	Invoice struct {
		TermsAndConditions string `yaml:"terms_and_conditions"`
	} `yaml:"invoice"`
}

type App struct {
	Env string
}

type HTTP struct {
	Host      string
	Port      string
	JWTSecret string
}

type AWS struct {
	Region    string
	AccessKey string
	SecretKey string
}

type S3 struct {
	Bucket    string
	Region    string
	AccessKey string
	SecretKey string
}

type Stripe struct {
	APIKey        string
	WebhookSecret string
}

func New(app *App, http *HTTP, aws *AWS, s3 *S3) *Config {
	return &Config{
		App:  app,
		HTTP: http,
		AWS:  aws,
		S3:   s3,
	}
}

func LoadConfig() (*Config, error) {
	godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}

	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "development"
	}

	stripeAPIKey := os.Getenv("STRIPE_API_KEY")
	if stripeAPIKey == "" {
		return nil, errors.New("STRIPE_API_KEY is required")
	}

	stripeWebhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	if stripeWebhookSecret == "" {
		return nil, errors.New("STRIPE_WEBHOOK_SECRET is required")
	}

	termsAndConditions := func() string {

		data, err := os.ReadFile("internal/config/tos.yaml")
		if err != nil {
			fmt.Printf("Error reading YAML file: %v\n", err)
			return ""
		}

		var tosConfig TOSConfig
		err = yaml.Unmarshal(data, &tosConfig)
		if err != nil {
			fmt.Printf("Error unmarshaling YAML: %v\n", err)
			return ""
		}

		terms := tosConfig.Invoice.TermsAndConditions

		return terms
	}()

	return &Config{
		Port:        port,
		DatabaseURL: dbURL,
		App:         &App{Env: env},
		HTTP:        &HTTP{},
		AWS:         &AWS{},
		S3:          &S3{},
		Stripe: &Stripe{
			APIKey:        stripeAPIKey,
			WebhookSecret: stripeWebhookSecret,
		},
		TermsAndConditions: termsAndConditions,
	}, nil
}
