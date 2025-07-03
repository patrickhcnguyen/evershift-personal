# Multi-stage build for smaller final image
FROM golang:1.24

WORKDIR /app

RUN go install github.com/air-verse/air@latest
RUN apt-get update && apt-get install -y postgresql-client
RUN go install github.com/pressly/goose/v3/cmd/goose@latest

COPY go.mod go.sum ./
RUN go mod download

COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["/entrypoint.sh"]
CMD ["air", "-c", ".air.toml"]
