package main

import (
	"log"
	"os"

	"backend/internal/adapter/http"
	"backend/internal/adapter/http/handler"
	"backend/internal/adapter/http/middleware"
	"backend/internal/adapter/repositories"
	"backend/internal/adapter/store/postgres/repository"
	"backend/internal/config"
	"backend/internal/core/services"

	"time"

	gin_adapter "github.com/39george/scs_gin_adapter"
	"github.com/alexedwards/scs/v2"
	"github.com/stripe/stripe-go/v82"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize Stripe API key
	stripe.Key = os.Getenv("STRIPE_API_KEY")

	// Set up session manager
	sessionManager := scs.New()
	sessionManager.Lifetime = 24 * time.Hour
	sessionManager.Cookie.Secure = false // Set to true in production
	sessionAdapter := gin_adapter.New(sessionManager)

	// Set up database connection
	db, err := repositories.NewDatabase(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Set up repositories
	requestRepo := repository.NewRequestRepository(db)
	staffRequirementRepo := repository.NewStaffRequirementRepository(db)
	customLineItemsRepo := repository.NewCustomLineItemsRepository(db)
	rateCalculatorRepo := repository.NewRateCalculatorRepository(staffRequirementRepo, customLineItemsRepo)
	invoiceRepo := repository.NewInvoiceRepository(db, rateCalculatorRepo)
	emailRepo := repository.NewEmailRepository(os.Getenv("MAILGUN_DOMAIN"), os.Getenv("MAILGUN_FROM"), os.Getenv("MAILGUN_API_KEY"))
	stripeRepo := repository.NewStripeRepository(db)
	// stripeStore := repository.NewStripeStoreAdapter(stripeRepo, db)
	// Set up services
	geolocationRepo := repository.NewGeolocationRepository(os.Getenv("MAPBOX_TOKEN"), db)
	geolocationService := services.NewGeolocationService(geolocationRepo)
	staffRequirementService := services.NewStaffRequirementService(staffRequirementRepo)
	invoiceService := services.NewInvoiceService(invoiceRepo, requestRepo, cfg)
	requestService := services.NewRequestService(requestRepo, geolocationService, staffRequirementService, invoiceService)
	emailService := services.NewEmailService(emailRepo)
	stripeService := services.NewStripeService(stripeRepo)
	customLineItemsService := services.NewCustomLineItemsService(customLineItemsRepo)
	calculateRatesService := services.NewCalculateRatesService(rateCalculatorRepo)

	// Add cron job service
	cronJobService := services.NewCronJobService(invoiceService, emailService, stripeService, staffRequirementService)

	// Set up middleware
	middlewareService := middleware.NewMiddlewareService(cfg, sessionAdapter, nil, nil, nil)
	middlewareImpl := middlewareService.(*middleware.MiddlewareService)

	// Set up handlers
	requestHandler := handler.NewRequestHandler(cfg, requestService, geolocationService)
	geolocationHandler := handler.NewGeolocationHandler(geolocationService)
	staffRequirementHandler := handler.NewStaffRequirementHandler(cfg, staffRequirementService)
	invoiceHandler := handler.NewInvoiceHandler(cfg, invoiceService, requestService)
	emailHandler := handler.NewEmailHandler(emailService, invoiceService, staffRequirementService, stripeService)
	stripeHandler := handler.NewStripeHandler(stripeService, invoiceService, staffRequirementService, os.Getenv("STRIPE_API_KEY"))
	customLineItemsHandler := handler.NewCustomLineItemsHandler(cfg, customLineItemsService)
	calculateRatesHandler := handler.NewCalculateRatesHandler(calculateRatesService, requestService)

	// Add cron handler
	cronHandler := handler.NewCronHandler(cronJobService)

	// Set up router
	router := http.NewRouter(
		cfg,
		sessionAdapter,
		requestHandler,
		geolocationHandler,
		invoiceHandler,
		staffRequirementHandler,
		middlewareImpl,
		emailHandler,
		stripeHandler,
		customLineItemsHandler,
		calculateRatesHandler,
		cronHandler,
	)

	// Start cron jobs
	if err := cronJobService.Start(); err != nil {
		log.Fatalf("Failed to start cron jobs: %v", err)
	}
	defer cronJobService.Stop()

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	log.Printf("Starting server on port %s", port)
	if err := router.Serve(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
