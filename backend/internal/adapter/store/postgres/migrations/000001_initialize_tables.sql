-- +goose Up
-- SQL to initialize tables for GORM-compatible models

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE branches (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION
);

CREATE TABLE users (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR,
    first_name TEXT,
    last_name TEXT,
    phone_number VARCHAR,
    profile_picture_url TEXT,
    branch_id UUID REFERENCES branches(uuid),
    role TEXT,
    created_at TIMESTAMP
);

CREATE TABLE requests (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name TEXT,
    last_name TEXT,
    email VARCHAR,
    phone_number VARCHAR,
    is_company BOOLEAN,
    company_name TEXT,
    type_of_event TEXT,
    event_location TEXT,
    start_date DATE,
    end_date DATE,
    closest_branch_id UUID REFERENCES branches(uuid),
    closest_branch_name TEXT
);

CREATE TABLE invoices (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES requests(uuid),
    due_date DATE,
    subtotal NUMERIC,
    discount_type TEXT,
    discount_value NUMERIC,
    transaction_fee NUMERIC,
    service_fee NUMERIC,
    amount NUMERIC,
    balance NUMERIC,
    status TEXT,
    payment_terms TEXT,
    notes TEXT,
    ship_to TEXT,
    po_edit_counter NUMERIC,
    po_number TEXT
);

CREATE TABLE staff_requirements (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES requests(uuid),
    date DATE,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    position TEXT,
    rate NUMERIC,
    count INTEGER
);

CREATE TABLE events (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES requests(uuid),
    start_date DATE,
    end_date DATE,
    start_hour TIMESTAMPTZ,
    end_hour TIMESTAMPTZ,
    status TEXT,
    notes TEXT,
    branch_id UUID REFERENCES branches(uuid),
    branch_name TEXT,
    created_at TIMESTAMPTZ
);

CREATE TABLE shifts (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES events(uuid),
    date DATE,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ
);

CREATE TABLE uniforms (
    uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    description TEXT,
    s3_url TEXT
);

CREATE TABLE shift_assignments (
    shift_id UUID REFERENCES shifts(uuid),
    employee_id UUID REFERENCES users(uuid),
    is_shift_lead BOOLEAN,
    status TEXT,
    required_uniform_id UUID REFERENCES uniforms(uuid),
    PRIMARY KEY (shift_id, employee_id)
);

-- +goose Down
DROP TABLE IF EXISTS shift_assignments;
DROP TABLE IF EXISTS uniforms;
DROP TABLE IF EXISTS shifts;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS staff_requirements;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS requests;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS branches;
