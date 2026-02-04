/**
 * Unified Conversations Database
 * Multi-channel conversation storage for SMS, Social, Voice, Email, Chat
 */

import { query, getClient } from './index.js';

// Channel types for unified inbox
export type ChannelType =
  | 'sms_twilio'
  | 'sms_telnyx'
  | 'sms_textlink'
  | 'sms_ghl'
  | 'email'
  | 'voice'
  | 'live_chat'
  | 'whatsapp'
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'tiktok'
  | 'telegram'
  | 'google_business';

export type MessageDirection = 'inbound' | 'outbound';
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
export type ConversationStatus = 'active' | 'archived' | 'spam' | 'blocked';

export interface Contact {
  id: string;
  location_id: string;
  external_id?: string; // GHL contact ID or other CRM ID
  phone?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  company?: string;
  tags: string[];
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Conversation {
  id: string;
  location_id: string;
  contact_id: string;
  channel: ChannelType;
  channel_conversation_id?: string; // External conversation ID (GHL, Twilio, etc.)
  status: ConversationStatus;
  unread_count: number;
  last_message_at: Date;
  last_message_preview: string;
  assigned_to?: string; // User ID or AI Staff role
  priority: 'low' | 'normal' | 'high' | 'urgent';
  labels: string[];
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: string;
  conversation_id: string;
  location_id: string;
  direction: MessageDirection;
  channel: ChannelType;
  sender_id?: string; // Contact ID for inbound, User/AI ID for outbound
  sender_name?: string;
  sender_type: 'contact' | 'user' | 'ai_staff' | 'system';
  content: string;
  content_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'template';
  media_urls: string[];
  status: MessageStatus;
  external_id?: string; // Provider message ID
  error_message?: string;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// Initialize tables
export async function initConversationTables(): Promise<void> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Contacts table
    await client.query(`
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
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(location_id, phone),
        UNIQUE(location_id, email)
      )
    `);

    // Conversations table
    await client.query(`
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
    `);

    // Messages table
    await client.query(`
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
    `);

    // Indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contacts_location ON inbox_contacts(location_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contacts_phone ON inbox_contacts(phone)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contacts_email ON inbox_contacts(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_location ON inbox_conversations(location_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_contact ON inbox_conversations(contact_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_channel ON inbox_conversations(channel)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_status ON inbox_conversations(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON inbox_conversations(last_message_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON inbox_messages(conversation_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_created ON inbox_messages(created_at DESC)`);

    await client.query('COMMIT');
    console.log('[Conversations] Database tables initialized');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Conversations] Failed to initialize tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Contact operations
export const contacts = {
  async findOrCreate(locationId: string, data: Partial<Contact>): Promise<Contact> {
    // Try to find by phone or email
    let contact: Contact | null = null;

    if (data.phone) {
      const result = await query(
        'SELECT * FROM inbox_contacts WHERE location_id = $1 AND phone = $2',
        [locationId, data.phone]
      );
      if (result.rows[0]) contact = result.rows[0];
    }

    if (!contact && data.email) {
      const result = await query(
        'SELECT * FROM inbox_contacts WHERE location_id = $1 AND email = $2',
        [locationId, data.email]
      );
      if (result.rows[0]) contact = result.rows[0];
    }

    if (contact) {
      // Update existing contact
      const updated = await query(
        `UPDATE inbox_contacts SET
          first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          avatar_url = COALESCE($3, avatar_url),
          company = COALESCE($4, company),
          external_id = COALESCE($5, external_id),
          metadata = metadata || $6::jsonb,
          updated_at = NOW()
        WHERE id = $7
        RETURNING *`,
        [
          data.first_name,
          data.last_name,
          data.avatar_url,
          data.company,
          data.external_id,
          JSON.stringify(data.metadata || {}),
          contact.id
        ]
      );
      return updated.rows[0];
    }

    // Create new contact
    const result = await query(
      `INSERT INTO inbox_contacts
        (location_id, external_id, phone, email, first_name, last_name, avatar_url, company, tags, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        locationId,
        data.external_id,
        data.phone,
        data.email,
        data.first_name,
        data.last_name,
        data.avatar_url,
        data.company,
        data.tags || [],
        JSON.stringify(data.metadata || {})
      ]
    );
    return result.rows[0];
  },

  async getById(id: string): Promise<Contact | null> {
    const result = await query('SELECT * FROM inbox_contacts WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async search(locationId: string, searchTerm: string, limit = 20): Promise<Contact[]> {
    const result = await query(
      `SELECT * FROM inbox_contacts
       WHERE location_id = $1
       AND (
         first_name ILIKE $2 OR
         last_name ILIKE $2 OR
         email ILIKE $2 OR
         phone ILIKE $2 OR
         company ILIKE $2
       )
       ORDER BY updated_at DESC
       LIMIT $3`,
      [locationId, `%${searchTerm}%`, limit]
    );
    return result.rows;
  }
};

// Conversation operations
export const conversations = {
  async findOrCreate(
    locationId: string,
    contactId: string,
    channel: ChannelType,
    channelConversationId?: string
  ): Promise<Conversation> {
    // Try to find existing conversation
    const existing = await query(
      `SELECT * FROM inbox_conversations
       WHERE location_id = $1 AND contact_id = $2 AND channel = $3 AND status = 'active'`,
      [locationId, contactId, channel]
    );

    if (existing.rows[0]) {
      return existing.rows[0];
    }

    // Create new conversation
    const result = await query(
      `INSERT INTO inbox_conversations
        (location_id, contact_id, channel, channel_conversation_id, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [locationId, contactId, channel, channelConversationId]
    );
    return result.rows[0];
  },

  async getById(id: string): Promise<Conversation | null> {
    const result = await query('SELECT * FROM inbox_conversations WHERE id = $1', [id]);
    return result.rows[0] || null;
  },

  async list(
    locationId: string,
    options: {
      channel?: ChannelType;
      status?: ConversationStatus;
      assignedTo?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ conversations: (Conversation & { contact: Contact })[], total: number }> {
    const { channel, status = 'active', assignedTo, limit = 50, offset = 0 } = options;

    let whereClause = 'c.location_id = $1 AND c.status = $2';
    const params: any[] = [locationId, status];
    let paramIndex = 3;

    if (channel) {
      whereClause += ` AND c.channel = $${paramIndex}`;
      params.push(channel);
      paramIndex++;
    }

    if (assignedTo) {
      whereClause += ` AND c.assigned_to = $${paramIndex}`;
      params.push(assignedTo);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM inbox_conversations c WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get conversations with contact info
    const result = await query(
      `SELECT
        c.*,
        json_build_object(
          'id', ct.id,
          'phone', ct.phone,
          'email', ct.email,
          'first_name', ct.first_name,
          'last_name', ct.last_name,
          'avatar_url', ct.avatar_url,
          'company', ct.company
        ) as contact
       FROM inbox_conversations c
       JOIN inbox_contacts ct ON c.contact_id = ct.id
       WHERE ${whereClause}
       ORDER BY c.last_message_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return { conversations: result.rows, total };
  },

  async markAsRead(conversationId: string): Promise<void> {
    await query(
      `UPDATE inbox_conversations SET unread_count = 0, updated_at = NOW() WHERE id = $1`,
      [conversationId]
    );
    await query(
      `UPDATE inbox_messages SET status = 'read', updated_at = NOW()
       WHERE conversation_id = $1 AND direction = 'inbound' AND status != 'read'`,
      [conversationId]
    );
  },

  async updateLastMessage(conversationId: string, preview: string): Promise<void> {
    await query(
      `UPDATE inbox_conversations
       SET last_message_at = NOW(), last_message_preview = $1, updated_at = NOW()
       WHERE id = $2`,
      [preview.substring(0, 200), conversationId]
    );
  },

  async incrementUnread(conversationId: string): Promise<void> {
    await query(
      `UPDATE inbox_conversations SET unread_count = unread_count + 1, updated_at = NOW() WHERE id = $1`,
      [conversationId]
    );
  },

  async assign(conversationId: string, assignedTo: string): Promise<void> {
    await query(
      `UPDATE inbox_conversations SET assigned_to = $1, updated_at = NOW() WHERE id = $2`,
      [assignedTo, conversationId]
    );
  },

  async archive(conversationId: string): Promise<void> {
    await query(
      `UPDATE inbox_conversations SET status = 'archived', updated_at = NOW() WHERE id = $1`,
      [conversationId]
    );
  }
};

// Message operations
export const messages = {
  async create(data: {
    conversationId: string;
    locationId: string;
    direction: MessageDirection;
    channel: ChannelType;
    senderId?: string;
    senderName?: string;
    senderType: 'contact' | 'user' | 'ai_staff' | 'system';
    content: string;
    contentType?: string;
    mediaUrls?: string[];
    status?: MessageStatus;
    externalId?: string;
    metadata?: Record<string, any>;
  }): Promise<Message> {
    const result = await query(
      `INSERT INTO inbox_messages
        (conversation_id, location_id, direction, channel, sender_id, sender_name, sender_type,
         content, content_type, media_urls, status, external_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        data.conversationId,
        data.locationId,
        data.direction,
        data.channel,
        data.senderId,
        data.senderName,
        data.senderType,
        data.content,
        data.contentType || 'text',
        data.mediaUrls || [],
        data.status || 'sent',
        data.externalId,
        JSON.stringify(data.metadata || {})
      ]
    );

    // Update conversation
    await conversations.updateLastMessage(data.conversationId, data.content);

    if (data.direction === 'inbound') {
      await conversations.incrementUnread(data.conversationId);
    }

    return result.rows[0];
  },

  async listByConversation(
    conversationId: string,
    options: { limit?: number; offset?: number; before?: Date } = {}
  ): Promise<{ messages: Message[], hasMore: boolean }> {
    const { limit = 50, offset = 0, before } = options;

    let whereClause = 'conversation_id = $1';
    const params: any[] = [conversationId];
    let paramIndex = 2;

    if (before) {
      whereClause += ` AND created_at < $${paramIndex}`;
      params.push(before);
      paramIndex++;
    }

    const result = await query(
      `SELECT * FROM inbox_messages
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit + 1, offset]
    );

    const hasMore = result.rows.length > limit;
    const messagesList = hasMore ? result.rows.slice(0, -1) : result.rows;

    return { messages: messagesList.reverse(), hasMore };
  },

  async updateStatus(messageId: string, status: MessageStatus, errorMessage?: string): Promise<void> {
    await query(
      `UPDATE inbox_messages SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3`,
      [status, errorMessage, messageId]
    );
  }
};

// Analytics
export const inboxAnalytics = {
  async getStats(locationId: string): Promise<{
    totalConversations: number;
    unreadCount: number;
    byChannel: Record<ChannelType, number>;
    todayMessages: number;
  }> {
    const [totalResult, unreadResult, byChannelResult, todayResult] = await Promise.all([
      query(
        `SELECT COUNT(*) FROM inbox_conversations WHERE location_id = $1 AND status = 'active'`,
        [locationId]
      ),
      query(
        `SELECT SUM(unread_count) as total FROM inbox_conversations WHERE location_id = $1 AND status = 'active'`,
        [locationId]
      ),
      query(
        `SELECT channel, COUNT(*) as count FROM inbox_conversations
         WHERE location_id = $1 AND status = 'active'
         GROUP BY channel`,
        [locationId]
      ),
      query(
        `SELECT COUNT(*) FROM inbox_messages
         WHERE location_id = $1 AND created_at > NOW() - INTERVAL '24 hours'`,
        [locationId]
      )
    ]);

    const byChannel: Record<string, number> = {};
    byChannelResult.rows.forEach(row => {
      byChannel[row.channel] = parseInt(row.count, 10);
    });

    return {
      totalConversations: parseInt(totalResult.rows[0].count, 10),
      unreadCount: parseInt(unreadResult.rows[0].total || '0', 10),
      byChannel: byChannel as Record<ChannelType, number>,
      todayMessages: parseInt(todayResult.rows[0].count, 10)
    };
  }
};

export default {
  initConversationTables,
  contacts,
  conversations,
  messages,
  inboxAnalytics
};
