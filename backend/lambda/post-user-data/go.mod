module post-user-data

go 1.23.2

replace backend => ../../

require (
	backend v0.0.0-00010101000000-000000000000
	github.com/aws/aws-lambda-go v1.48.0
	github.com/google/uuid v1.6.0
	gorm.io/driver/postgres v1.5.11
	gorm.io/gorm v1.26.1
)

require (
	github.com/jackc/pgpassfile v1.0.0 // indirect
	github.com/jackc/pgservicefile v0.0.0-20240606120523-5a60cdf6a761 // indirect
	github.com/jackc/pgx/v5 v5.7.4 // indirect
	github.com/jackc/puddle/v2 v2.2.2 // indirect
	github.com/jinzhu/inflection v1.0.0 // indirect
	github.com/jinzhu/now v1.1.5 // indirect
	github.com/stretchr/testify v1.10.0 // indirect
	golang.org/x/crypto v0.38.0 // indirect
	golang.org/x/sync v0.14.0 // indirect
	golang.org/x/text v0.25.0 // indirect
)
