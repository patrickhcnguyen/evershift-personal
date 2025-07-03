package http

import (
	gin_adapter "github.com/39george/scs_gin_adapter"
	"github.com/gin-gonic/gin"

	"backend/internal/adapter/http/handler"
	"backend/internal/adapter/http/middleware"
	"backend/internal/config"
)

// Router is a wrapper for HTTP router
type Router struct {
	*gin.Engine
}

func NewRouter(
	cfg *config.Config,
	sessionAdapter *gin_adapter.GinAdapter,
	// presignedUrlHandler *handler.PresignedUrlHandler,
	// branchesHandler *handler.BranchHandler,
	// userHandler *handler.UserHandler,
	requestHandler *handler.RequestHandler,
	geolocationHandler *handler.GeolocationHandler,
	invoiceHandler *handler.InvoiceHandler,
	// eventHandler *handler.EventHandler,
	// shiftHandler *handler.ShiftHandler,
	// shiftAssignmentHandler *handler.ShiftAssignmentHandler,
	staffRequirementHandler *handler.StaffRequirementHandler,
	// uniformHandler *handler.UniformHandler,
	// authHandler *handler.AuthHandler,
	middleware *middleware.MiddlewareService,
	emailHandler *handler.EmailHandler,
	stripeHandler *handler.StripeHandler,
	customLineItemsHandler *handler.CustomLineItemsHandler,
	calculateRatesHandler *handler.CalculateRatesHandler,
	cronHandler *handler.CronHandler,
) *Router {
	if cfg.App.Env != "development" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.Default()

	router.Use(sessionAdapter.LoadAndSave)

	router.Use(middleware.CORS())

	router.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "message": "Evershift API is running"})
	})

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})

	apiGroup := router.Group("api")
	{
		// authGroup := apiGroup.Group("/auth")
		// {
		// 	authGroup.GET(":provider", authHandler.SignInWithProvider)
		// 	authGroup.GET("provider/callback", authHandler.CallbackHandler)
		// 	authGroup.POST("logout", authHandler.LogOut)
		// }
		// presignedURLGroup := apiGroup.Group("/presigned-url")
		// {
		// 	presignedURLGroup.GET("", presignedUrlHandler.GetPresignedURL)
		// }
		// branchGroup := apiGroup.Group("/branches")
		// {
		// 	branchGroup.GET("", branchesHandler.GetAllBranches)
		// 	branchGroup.GET(":id", branchesHandler.GetBranchById)
		// 	branchGroup.POST("", branchesHandler.CreateBranch)
		// 	branchGroup.PUT(":id", branchesHandler.UpdateBranch)
		// 	branchGroup.DELETE(":id", branchesHandler.DeleteBranch)
		// }
		// userGroup := apiGroup.Group("/users")
		// {
		// 	userGroup.GET("", userHandler.GetAllUsers)
		// 	userGroup.GET(":id", userHandler.GetUserById)
		// 	userGroup.POST("", userHandler.CreateUser)
		// 	userGroup.PUT(":id", userHandler.UpdateUser)
		// 	userGroup.DELETE(":id", userHandler.DeleteUser)
		// }
		requestGroup := apiGroup.Group("/requests")
		{
			requestGroup.POST("", requestHandler.CreateRequest)
			requestGroup.GET("", requestHandler.GetAllRequests)
			requestGroup.GET(":id", requestHandler.GetRequestById)
			requestGroup.GET(":id/events", requestHandler.GetRequestsByEventId)
			requestGroup.GET("/branch/:branch_id", requestHandler.GetRequestsByBranchID)
			requestGroup.PUT(":id", requestHandler.UpdateRequest)
			requestGroup.DELETE(":id", requestHandler.DeleteRequest)
		}
		geolocationGroup := apiGroup.Group("/geolocation")
		{
			geolocationGroup.GET("/geocode", geolocationHandler.GeoCodeAddress)
			geolocationGroup.GET("/nearest-branch", geolocationHandler.FindClosestBranch)
		}
		invoicesGroup := apiGroup.Group("/invoices")
		{
			invoicesGroup.GET("", invoiceHandler.GetInvoiceByRequestID)
			invoicesGroup.GET("/request/:id", invoiceHandler.GetInvoiceByRequestID)
			invoicesGroup.GET(":id", invoiceHandler.GetInvoiceByID)
			invoicesGroup.GET("/branch/:branch_id", invoiceHandler.GetInvoiceByBranchID)
			invoicesGroup.GET("/overdue/:branch_id", invoiceHandler.CheckForOverdueInvoices)
			invoicesGroup.POST("", invoiceHandler.CreateInvoice)
			invoicesGroup.PUT(":id", invoiceHandler.UpdateInvoice)
			invoicesGroup.DELETE(":id", invoiceHandler.DeleteInvoice)
			invoicesGroup.POST(":id/recalculate", invoiceHandler.RecalculateInvoiceWithNewItems)
		}
		// eventGroup := apiGroup.Group("/events")
		// {
		// 	eventGroup.GET("", eventHandler.GetAllEvents)
		// 	eventGroup.GET(":id", eventHandler.GetEventById)
		// 	eventGroup.POST("", eventHandler.CreateEvent)
		// 	eventGroup.PUT(":id", eventHandler.UpdateEvent)
		// 	eventGroup.DELETE(":id", eventHandler.DeleteEvent)
		// }
		// shiftGroup := apiGroup.Group("/shifts")
		// {
		// 	shiftGroup.GET("", shiftHandler.GetAllShifts)
		// 	shiftGroup.GET(":id", shiftHandler.GetShiftById)
		// 	shiftGroup.POST("", shiftHandler.CreateShift)
		// 	shiftGroup.PUT(":id", shiftHandler.UpdateShift)
		// 	shiftGroup.DELETE(":id", shiftHandler.DeleteShift)
		// }
		// shiftAssignmentGroup := apiGroup.Group("/shift-assignments")
		// {
		// 	shiftAssignmentGroup.GET("", shiftAssignmentHandler.GetAllShiftAssignments)
		// 	shiftAssignmentGroup.GET(":id", shiftAssignmentHandler.GetShiftAssignmentById)
		// 	shiftAssignmentGroup.POST("", shiftAssignmentHandler.CreateShiftAssignment)
		// 	shiftAssignmentGroup.PUT(":id", shiftAssignmentHandler.UpdateShiftAssignment)
		// 	shiftAssignmentGroup.DELETE(":id", shiftAssignmentHandler.DeleteShiftAssignment)
		// }
		staffRequirementGroup := apiGroup.Group("/staff-requirements")
		{
			staffRequirementGroup.GET("", staffRequirementHandler.GetAllStaffRequirements)
			staffRequirementGroup.GET(":id", staffRequirementHandler.GetStaffRequirementById)
			staffRequirementGroup.GET("/request/:id", staffRequirementHandler.GetStaffRequirementsByRequestID)
			staffRequirementGroup.POST("", staffRequirementHandler.CreateStaffRequirement)
			staffRequirementGroup.PUT(":id", staffRequirementHandler.UpdateStaffRequirement)
			staffRequirementGroup.DELETE(":id", staffRequirementHandler.DeleteStaffRequirement)
		}
		// uniformGroup := apiGroup.Group("/uniforms")
		// {
		// 	uniformGroup.GET("", uniformHandler.GetAllUniforms)
		// 	uniformGroup.GET(":id", uniformHandler.GetUniformById)
		// 	uniformGroup.POST("", uniformHandler.CreateUniform)
		// 	uniformGroup.PUT(":id", uniformHandler.UpdateUniform)
		// 	uniformGroup.DELETE(":id", uniformHandler.DeleteUniform)
		// }
		emailGroup := apiGroup.Group("/emails")
		{
			emailGroup.POST("/send/:request_id", emailHandler.SendEmail)
			emailGroup.POST("/send-custom/:request_id", emailHandler.SendCustomEmail)
			emailGroup.POST("/schedule/:request_id", emailHandler.ScheduleEmail)
		}
		stripeGroup := apiGroup.Group("/stripe")
		{
			stripeGroup.POST("/create-checkout-session/:invoiceID", stripeHandler.CreateCheckoutSession)
			stripeGroup.POST("/create-payment-intent/:invoiceID", stripeHandler.CreatePaymentIntent)
			stripeGroup.POST("/refund-payment/:invoiceID", stripeHandler.RefundPayment)
			stripeGroup.POST("/webhook", stripeHandler.Webhook)
		}
		customLineItemsGroup := apiGroup.Group("/custom-line-items")
		{
			customLineItemsGroup.POST("", customLineItemsHandler.CreateCustomLineItem)
			customLineItemsGroup.GET(":id", customLineItemsHandler.GetCustomLineItemByID)
			customLineItemsGroup.GET("/request/:id", customLineItemsHandler.GetCustomLineItemsByRequestID)
			customLineItemsGroup.PUT(":id", customLineItemsHandler.UpdateCustomLineItem)
			customLineItemsGroup.DELETE(":uuid", customLineItemsHandler.DeleteCustomLineItem)
		}
		ratesGroup := apiGroup.Group("/rates")
		{
			ratesGroup.GET("/calculate/:request_id", calculateRatesHandler.CalculateRates)
			ratesGroup.GET("/:request_id", calculateRatesHandler.GetRates)
			ratesGroup.PUT("/:request_id", calculateRatesHandler.UpdateRates)
		}
		adminRoutes := apiGroup.Group("/admin")
		{
			adminRoutes.POST("/cron/run", cronHandler.Run)
			adminRoutes.POST("/cron/stop", cronHandler.Stop)
		}
	}

	return &Router{router}
}

func (r *Router) Serve(listenAddr string) error {
	return r.Run(listenAddr)
}
