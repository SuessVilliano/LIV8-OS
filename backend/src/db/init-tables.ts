/**
 * Database Table Initialization
 * Run this to create all required tables
 */

import { sql } from '@vercel/postgres';

export async function initializeTables() {
  console.log('🔧 Initializing database tables...');

  try {
    // Create agencies table
    await sql`
      CREATE TABLE IF NOT EXISTS agencies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        stripe_customer_id VARCHAR(255),
        subscription_status VARCHAR(50) DEFAULT 'trial',
        subscription_plan VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ agencies table ready');

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        agency_id UUID REFERENCES agencies(id),
        role VARCHAR(50) DEFAULT 'operator',
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ users table ready');

    // Create GHL locations table
    await sql`
      CREATE TABLE IF NOT EXISTS ghl_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agency_id UUID REFERENCES agencies(id),
        ghl_location_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        encrypted_access_token TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ ghl_locations table ready');

    // Create audit_log table
    await sql`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        agency_id UUID,
        location_id VARCHAR(255),
        action_type VARCHAR(100),
        tool_name VARCHAR(100),
        input JSONB,
        output JSONB,
        status VARCHAR(20),
        error_message TEXT,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ audit_log table ready');

    // Create brand_brains table
    await sql`
      CREATE TABLE IF NOT EXISTS brand_brains (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        location_id VARCHAR(255) UNIQUE NOT NULL,
        brain_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ brand_brains table ready');

    // Create subscriptions table for Stripe
    await sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agency_id UUID REFERENCES agencies(id),
        stripe_subscription_id VARCHAR(255) UNIQUE,
        stripe_customer_id VARCHAR(255),
        plan_id VARCHAR(100),
        status VARCHAR(50),
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        coupon_code VARCHAR(100),
        discount_percent INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ subscriptions table ready');

    // Create coupons table
    await sql`
      CREATE TABLE IF NOT EXISTS coupons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        stripe_coupon_id VARCHAR(255),
        percent_off INTEGER,
        amount_off INTEGER,
        currency VARCHAR(10) DEFAULT 'usd',
        duration VARCHAR(20) DEFAULT 'once',
        duration_in_months INTEGER,
        max_redemptions INTEGER,
        times_redeemed INTEGER DEFAULT 0,
        valid BOOLEAN DEFAULT TRUE,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ coupons table ready');

    console.log('🎉 All database tables initialized successfully!');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}
