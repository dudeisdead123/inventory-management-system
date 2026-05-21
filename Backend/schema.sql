-- PostgreSQL Schema for Inventory Management System (IMS)

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'customer',
    location VARCHAR(100) DEFAULT 'All',
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    "locationId" VARCHAR(100) UNIQUE NOT NULL,
    "locationName" VARCHAR(255) NOT NULL,
    "locationType" VARCHAR(100) DEFAULT 'store',
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    "zipCode" VARCHAR(20),
    country VARCHAR(100),
    phone VARCHAR(50),
    email VARCHAR(255),
    manager VARCHAR(255),
    "isActive" BOOLEAN DEFAULT TRUE,
    "currentUtilization" NUMERIC DEFAULT 0,
    "createdBy" INTEGER REFERENCES users(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    "ProductName" VARCHAR(255) NOT NULL,
    "ProductPrice" NUMERIC(12, 2) NOT NULL,
    "ProductBarcode" NUMERIC UNIQUE NOT NULL,
    "ProductDescription" TEXT DEFAULT '',
    "ProductCategory" VARCHAR(100) DEFAULT 'General',
    "ProductBrand" VARCHAR(100) DEFAULT '',
    "totalStock" INTEGER DEFAULT 0,
    "globalMinStock" INTEGER DEFAULT 10,
    "globalMaxStock" INTEGER DEFAULT 1000,
    "isActive" BOOLEAN DEFAULT TRUE,
    "isLowStock" BOOLEAN DEFAULT FALSE,
    "lastStockUpdate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "createdBy" INTEGER REFERENCES users(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create location_stock table
CREATE TABLE IF NOT EXISTS location_stock (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location VARCHAR(100) NOT NULL,
    quantity INTEGER DEFAULT 0,
    "reservedQuantity" INTEGER DEFAULT 0,
    "damagedQuantity" INTEGER DEFAULT 0,
    "minStockLevel" INTEGER DEFAULT 1,
    "maxStockLevel" INTEGER DEFAULT 1000,
    CONSTRAINT product_location_unique UNIQUE (product_id, location)
);

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    location VARCHAR(100) NOT NULL,
    reason TEXT,
    reference VARCHAR(255),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "performedBy" INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Create stock_alerts table
CREATE TABLE IF NOT EXISTS stock_alerts (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    "alertType" VARCHAR(100) NOT NULL,
    location VARCHAR(100) NOT NULL,
    "currentQuantity" INTEGER NOT NULL,
    threshold INTEGER NOT NULL,
    severity VARCHAR(50) DEFAULT 'medium',
    message TEXT NOT NULL,
    "isRead" BOOLEAN DEFAULT FALSE,
    "isResolved" BOOLEAN DEFAULT FALSE,
    "resolvedBy" INTEGER REFERENCES users(id) ON DELETE SET NULL,
    "resolvedAt" TIMESTAMP,
    "resolvedNote" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
