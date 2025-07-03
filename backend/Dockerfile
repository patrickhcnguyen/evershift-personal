# Multi-stage build for smaller final image
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Install goose for migrations
RUN go install github.com/pressly/goose/v3/cmd/goose@latest

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/api

# Final stage
FROM alpine:latest

# Install ca-certificates for HTTPS requests and postgresql-client for migrations
RUN apk --no-cache add ca-certificates postgresql-client tzdata

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/main .
COPY --from=builder /go/bin/goose .

# Copy necessary files
COPY --from=builder /app/internal ./internal

# Expose port
EXPOSE 3001

# Run the binary
CMD ["./main"]
