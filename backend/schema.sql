-- Database Schema for Digital Gram Panchayat (Multi-Tenant SaaS)
-- Note: This project uses MongoDB. This file is a reference schema only.

-- Gram Panchayat Master Table (Tenants)
-- Each Gram Panchayat is an isolated tenant
CREATE TABLE IF NOT EXISTS gram_panchayats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    village VARCHAR(100) NOT NULL,
    taluka VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users Table (Multi-Tenant)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gram_panchayat_id UUID REFERENCES gram_panchayats(id) ON DELETE SET NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'citizen', -- super_admin, gramsevak, auditor, talathi, data_entry, citizen
    village VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Properties Table (Namuna 9) - Multi-Tenant
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gram_panchayat_id UUID NOT NULL REFERENCES gram_panchayats(id) ON DELETE CASCADE,
    property_id VARCHAR(50) UNIQUE NOT NULL,
    house_no VARCHAR(20) NOT NULL,
    ward_no VARCHAR(10) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    owner_name_mr VARCHAR(255),
    father_name VARCHAR(255),
    father_name_mr VARCHAR(255),
    survey_no VARCHAR(100),
    gat_no VARCHAR(100),
    plot_area_sqm DECIMAL(15, 2) DEFAULT 0,
    built_up_area_sqm DECIMAL(15, 2) DEFAULT 0,
    floor_count INTEGER DEFAULT 1,
    construction_type VARCHAR(50),
    usage_type VARCHAR(50),
    water_connection BOOLEAN DEFAULT FALSE,
    electricity_connection BOOLEAN DEFAULT FALSE,
    assessment_year VARCHAR(20),
    village VARCHAR(100),
    taluka VARCHAR(100),
    district VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Demand Register Table (Namuna 8) - Multi-Tenant
CREATE TABLE IF NOT EXISTS demand_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gram_panchayat_id UUID NOT NULL REFERENCES gram_panchayats(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    financial_year VARCHAR(20) NOT NULL,
    house_tax DECIMAL(15, 2) DEFAULT 0,
    water_tax DECIMAL(15, 2) DEFAULT 0,
    total_tax DECIMAL(15, 2) DEFAULT 0,
    arrears DECIMAL(15, 2) DEFAULT 0,
    net_demand DECIMAL(15, 2) DEFAULT 0,
    paid_amount DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'unpaid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(gram_panchayat_id, property_id, financial_year)
);

-- Payments Table - Multi-Tenant
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gram_panchayat_id UUID NOT NULL REFERENCES gram_panchayats(id) ON DELETE CASCADE,
    demand_id UUID REFERENCES demand_register(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2),
    payment_mode VARCHAR(50),
    receipt_no VARCHAR(100),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tax Rates Table - Multi-Tenant
CREATE TABLE IF NOT EXISTS tax_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gram_panchayat_id UUID NOT NULL REFERENCES gram_panchayats(id) ON DELETE CASCADE,
    financial_year VARCHAR(20),
    usage_type VARCHAR(50),
    rate_per_sqm DECIMAL(15, 2) DEFAULT 0,
    water_tax_rate DECIMAL(15, 2) DEFAULT 0,
    light_tax_rate DECIMAL(15, 2) DEFAULT 0,
    cleaning_tax_rate DECIMAL(15, 2) DEFAULT 0,
    rebate_percent DECIMAL(5, 2) DEFAULT 5,
    penalty_percent DECIMAL(5, 2) DEFAULT 12,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs for tracking - Multi-Tenant
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    gram_panchayat_id UUID REFERENCES gram_panchayats(id) ON DELETE SET NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    action VARCHAR(50),
    performed_by VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for tenant isolation performance
CREATE INDEX idx_properties_gp ON properties(gram_panchayat_id);
CREATE INDEX idx_demand_gp ON demand_register(gram_panchayat_id);
CREATE INDEX idx_payments_gp ON payments(gram_panchayat_id);
CREATE INDEX idx_users_gp ON users(gram_panchayat_id);
CREATE INDEX idx_tax_rates_gp ON tax_rates(gram_panchayat_id);
CREATE INDEX idx_audit_logs_gp ON audit_logs(gram_panchayat_id);
