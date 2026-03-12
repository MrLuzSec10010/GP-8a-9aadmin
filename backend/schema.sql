-- Database Schema for Digital Gram Panchayat (PostgreSQL)

-- Properties Table (Namuna 9)
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    construction_type VARCHAR(50), -- rcc, load_bearing, pucca, semi_pucca, kaccha
    usage_type VARCHAR(50), -- residential, commercial, mixed
    water_connection BOOLEAN DEFAULT FALSE,
    electricity_connection BOOLEAN DEFAULT FALSE,
    assessment_year VARCHAR(20),
    village VARCHAR(100),
    taluka VARCHAR(100),
    district VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Demand Register Table (Namuna 8)
CREATE TABLE IF NOT EXISTS demand_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    financial_year VARCHAR(20) NOT NULL,
    house_tax DECIMAL(15, 2) DEFAULT 0,
    water_tax DECIMAL(15, 2) DEFAULT 0,
    total_tax DECIMAL(15, 2) DEFAULT 0,
    arrears DECIMAL(15, 2) DEFAULT 0,
    net_demand DECIMAL(15, 2) DEFAULT 0,
    paid_amount DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'unpaid', -- paid, unpaid, partial
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(property_id, financial_year)
);

-- Audit Logs for tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    action VARCHAR(50),
    performed_by VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial User (Mock/System)
-- Note: OTP system typically doesn't need a heavy table if using JWT + Phone logic
