FROM golang:1.24

WORKDIR /app

RUN go install github.com/air-verse/air@latest

RUN apt-get update && apt-get install -y postgresql-client
RUN go install github.com/pressly/goose/v3/cmd/goose@latest

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# RUN go build -o main ./cmd/api

EXPOSE 3001

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]

CMD ["air", "-c", ".air.toml"]
