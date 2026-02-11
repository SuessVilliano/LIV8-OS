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

    // Create inbox_contacts table
    await sql`
      CREATE TABLE IF NOT EXISTS inbox_contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        location_id VARCHAR(100) NOT NULL,
        external_id VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        avatar_url TEXT,
        company VARCHAR(255),
        tags TEXT[] DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ inbox_contacts table ready');

    // Create inbox_conversations table
    await sql`
      CREATE TABLE IF NOT EXISTS inbox_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        location_id VARCHAR(100) NOT NULL,
        contact_id UUID NOT NULL REFERENCES inbox_contacts(id) ON DELETE CASCADE,
        channel VARCHAR(50) NOT NULL,
        channel_conversation_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active',
        unread_count INTEGER DEFAULT 0,
        last_message_at TIMESTAMPTZ DEFAULT NOW(),
        last_message_preview TEXT,
        assigned_to VARCHAR(100),
        priority VARCHAR(20) DEFAULT 'normal',
        labels TEXT[] DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ inbox_conversations table ready');

    // Create inbox_messages table
    await sql`
      CREATE TABLE IF NOT EXISTS inbox_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES inbox_conversations(id) ON DELETE CASCADE,
        location_id VARCHAR(100) NOT NULL,
        direction VARCHAR(20) NOT NULL,
        channel VARCHAR(50) NOT NULL,
        sender_id VARCHAR(255),
        sender_name VARCHAR(255),
        sender_type VARCHAR(20) DEFAULT 'contact',
        content TEXT NOT NULL,
        content_type VARCHAR(20) DEFAULT 'text',
        media_urls TEXT[] DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'sent',
        external_id VARCHAR(255),
        error_message TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('✅ inbox_messages table ready');

    // Create inbox indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_location ON inbox_contacts(location_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_contacts_phone ON inbox_contacts(phone)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_location ON inbox_conversations(location_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_channel ON inbox_conversations(channel)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON inbox_conversations(last_message_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON inbox_messages(conversation_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_messages_created ON inbox_messages(created_at DESC)`;
    console.log('✅ inbox indexes ready');

    // Create studio_assets table
    await sql`
      CREATE TABLE IF NOT EXISTS studio_assets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('image', 'video', 'website', 'email')),
        name TEXT NOT NULL,
        content TEXT NOT NULL,
        thumbnail TEXT,
        prompt TEXT,
        metadata JSONB DEFAULT '{}',
        status TEXT DEFAULT 'complete',
        published_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_studio_assets_client_type ON studio_assets(client_id, type)`;
    console.log('✅ studio_assets table ready');

    // Create studio_website_sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS studio_website_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        client_id TEXT NOT NULL,
        asset_id UUID REFERENCES studio_assets(id) ON DELETE SET NULL,
        conversation_history JSONB DEFAULT '[]',
        current_html TEXT,
        model TEXT DEFAULT 'gpt-4o',
        site_type TEXT DEFAULT 'landing',
        brand_context JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ studio_website_sessions table ready');

    // Create Late API credentials persistence table
    await sql`
      CREATE TABLE IF NOT EXISTS late_credentials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        location_id TEXT NOT NULL,
        encrypted_api_key TEXT NOT NULL,
        iv TEXT NOT NULL,
        profile_id TEXT,
        is_valid BOOLEAN DEFAULT TRUE,
        last_tested TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, location_id)
      )
    `;
    console.log('✅ late_credentials table ready');

    // Create SMS credentials persistence table
    await sql`
      CREATE TABLE IF NOT EXISTS sms_credentials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        location_id TEXT NOT NULL,
        default_provider VARCHAR(20) NOT NULL,
        credentials_data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, location_id)
      )
    `;
    console.log('✅ sms_credentials table ready');

    console.log('🎉 All database tables initialized successfully!');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}
