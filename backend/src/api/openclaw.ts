/**
 * OpenClaw API - External AI Manager Integration
 * Provides read access to LIV8 OS data for context-aware AI responses
 *
 * OpenClaw (openclaw.ai) is a 24/7 AI assistant that lives in user's
 * Telegram/Slack/Discord/WhatsApp and needs to read LIV8 OS data
 * to provide informed, context-aware assistance.
 *
 * Docs: https://docs.openclaw.ai
 */

import { Router, Request, Response } from 'express';
import { contacts, conversations, messages, inboxAnalytics } from '../db/conversations.js';
import { businessTwin } from '../db/business-twin.js';

const router = Router();

// Simple API key authentication for OpenClaw
// In production, use proper token validation
const validateApiKey = (req: Request): boolean => {
  const apiKey = req.headers['x-openclaw-key'] as string;
  const locationId = req.headers['x-location-id'] as string;

  // TODO: Validate against stored OpenClaw API keys per location
  // For now, require both headers to be present
  return !!apiKey && !!locationId;
};

/**
 * Get business context for OpenClaw
 * GET /api/openclaw/context
 *
 * Returns comprehensive business context for AI to understand the business
 */
router.get('/context', async (req: Request, res: Response) => {
  try {
    if (!validateApiKey(req)) {
      return res.status(401).json({ error: 'Invalid or missing API key' });
    }

    const locationId = req.headers['x-location-id'] as string;

    // Get business twin data
    let businessContext = null;
    try {
      businessContext = await businessTwin.getByLocationId(locationId);
    } catch (e) {
      // Business twin may not exist
    }

    // Get inbox stats
    let inboxStats = null;
    try {
      inboxStats = await inboxAnalytics.getStats(locationId);
    } catch (e) {
      // Inbox may not be initialized
    }

    res.json({
      success: true,
      context: {
        business: businessContext ? {
          name: businessContext.business_name,
          industry: businessContext.industry,
          description: businessContext.description,
          services: businessContext.services,
          targetAudience: businessContext.target_audience,
          brandVoice: businessContext.brand_voice,
          keyMessages: businessContext.key_messages,
          faq: businessContext.faq,
          competitors: businessContext.competitors
        } : null,
        inbox: inboxStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('[OpenClaw] Context error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get recent conversations for OpenClaw
 * GET /api/openclaw/conversations
 *
 * Returns recent conversations with messages for AI context
 */
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    if (!validateApiKey(req)) {
      return res.status(401).json({ error: 'Invalid or missing API key' });
    }

    const locationId = req.headers['x-location-id'] as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const channel = req.query.channel as string;

    const result = await conversations.list(locationId, {
      channel: channel as any,
      limit,
      status: 'active'
    });

    res.json({
      success: true,
      conversations: result.conversations.map(conv => ({
        id: conv.id,
        channel: conv.channel,
        contact: {
          name: `${conv.contact.first_name || ''} ${conv.contact.last_name || ''}`.trim() || 'Unknown',
          email: conv.contact.email,
          phone: conv.contact.phone
        },
        lastMessage: conv.last_message_preview,
        lastMessageAt: conv.last_message_at,
        unreadCount: conv.unread_count,
        priority: conv.priority,
        assignedTo: conv.assigned_to
      })),
      total: result.total
    });
  } catch (error: any) {
    console.error('[OpenClaw] Conversations error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get conversation messages for OpenClaw
 * GET /api/openclaw/conversations/:id/messages
 *
 * Returns message history for a specific conversation
 */
router.get('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    if (!validateApiKey(req)) {
      return res.status(401).json({ error: 'Invalid or missing API key' });
    }

    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const result = await messages.listByConversation(id, { limit });

    res.json({
      success: true,
      messages: result.messages.map(msg => ({
        id: msg.id,
        direction: msg.direction,
        senderType: msg.sender_type,
        senderName: msg.sender_name,
        content: msg.content,
        timestamp: msg.created_at,
        status: msg.status
      })),
      hasMore: result.hasMore
    });
  } catch (error: any) {
    console.error('[OpenClaw] Messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get contact details for OpenClaw
 * GET /api/openclaw/contacts/:id
 */
router.get('/contacts/:id', async (req: Request, res: Response) => {
  try {
    if (!validateApiKey(req)) {
      return res.status(401).json({ error: 'Invalid or missing API key' });
    }

    const { id } = req.params;
    const contact = await contacts.getById(id);

    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({
      success: true,
      contact: {
        id: contact.id,
        name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown',
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        tags: contact.tags,
        createdAt: contact.created_at,
        metadata: contact.metadata
      }
    });
  } catch (error: any) {
    console.error('[OpenClaw] Contact error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Search contacts for OpenClaw
 * GET /api/openclaw/contacts/search
 */
router.get('/contacts/search', async (req: Request, res: Response) => {
  try {
    if (!validateApiKey(req)) {
      return res.status(401).json({ error: 'Invalid or missing API key' });
    }

    const locationId = req.headers['x-location-id'] as string;
    const query = req.query.q as string;

    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const results = await contacts.search(locationId, query, 20);

    res.json({
      success: true,
      contacts: results.map(c => ({
        id: c.id,
        name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
        email: c.email,
        phone: c.phone,
        company: c.company
      }))
    });
  } catch (error: any) {
    console.error('[OpenClaw] Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get inbox summary for OpenClaw
 * GET /api/openclaw/inbox/summary
 *
 * Quick summary of inbox state for AI briefing
 */
router.get('/inbox/summary', async (req: Request, res: Response) => {
  try {
    if (!validateApiKey(req)) {
      return res.status(401).json({ error: 'Invalid or missing API key' });
    }

    const locationId = req.headers['x-location-id'] as string;

    const stats = await inboxAnalytics.getStats(locationId);

    // Get urgent/high priority conversations
    const urgent = await conversations.list(locationId, {
      status: 'active',
      limit: 5
    });

    const urgentConvos = urgent.conversations.filter(c =>
      c.priority === 'urgent' || c.priority === 'high' || c.unread_count > 3
    );

    res.json({
      success: true,
      summary: {
        totalActive: stats.totalConversations,
        unreadMessages: stats.unreadCount,
        todayMessages: stats.todayMessages,
        byChannel: stats.byChannel,
        needsAttention: urgentConvos.map(c => ({
          id: c.id,
          channel: c.channel,
          contact: `${c.contact.first_name || ''} ${c.contact.last_name || ''}`.trim() || 'Unknown',
          preview: c.last_message_preview,
          unread: c.unread_count,
          priority: c.priority
        }))
      }
    });
  } catch (error: any) {
    console.error('[OpenClaw] Summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * AI Staff status for OpenClaw
 * GET /api/openclaw/staff/status
 *
 * Returns status of AI staff members for coordination
 */
router.get('/staff/status', async (req: Request, res: Response) => {
  try {
    if (!validateApiKey(req)) {
      return res.status(401).json({ error: 'Invalid or missing API key' });
    }

    // TODO: Integrate with actual AI Staff service
    // For now, return placeholder data
    res.json({
      success: true,
      staff: [
        {
          role: 'receptionist',
          name: 'AI Receptionist',
          status: 'active',
          handledToday: 0,
          currentLoad: 0
        },
        {
          role: 'sales',
          name: 'AI Sales Rep',
          status: 'active',
          handledToday: 0,
          currentLoad: 0
        },
        {
          role: 'support',
          name: 'AI Support Agent',
          status: 'active',
          handledToday: 0,
          currentLoad: 0
        }
      ]
    });
  } catch (error: any) {
    console.error('[OpenClaw] Staff status error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Log OpenClaw action for audit trail
 * POST /api/openclaw/actions/log
 */
router.post('/actions/log', async (req: Request, res: Response) => {
  try {
    if (!validateApiKey(req)) {
      return res.status(401).json({ error: 'Invalid or missing API key' });
    }

    const locationId = req.headers['x-location-id'] as string;
    const { action, details, conversationId, contactId } = req.body;

    console.log(`[OpenClaw] Action logged for ${locationId}:`, {
      action,
      conversationId,
      contactId,
      details
    });

    // TODO: Store in audit log table

    res.json({
      success: true,
      logged: true,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[OpenClaw] Action log error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate response suggestion for OpenClaw
 * POST /api/openclaw/suggest
 *
 * Uses business context to suggest a response
 */
router.post('/suggest', async (req: Request, res: Response) => {
  try {
    if (!validateApiKey(req)) {
      return res.status(401).json({ error: 'Invalid or missing API key' });
    }

    const locationId = req.headers['x-location-id'] as string;
    const { customerMessage, conversationId, channel } = req.body;

    // Get business context
    let businessContext = null;
    try {
      businessContext = await businessTwin.getByLocationId(locationId);
    } catch (e) {
      // May not exist
    }

    // Get conversation history if provided
    let history: any[] = [];
    if (conversationId) {
      try {
        const result = await messages.listByConversation(conversationId, { limit: 10 });
        history = result.messages;
      } catch (e) {
        // May not exist
      }
    }

    // Build context for response
    const context = {
      business: businessContext ? {
        name: businessContext.business_name,
        industry: businessContext.industry,
        brandVoice: businessContext.brand_voice,
        services: businessContext.services
      } : null,
      conversationHistory: history.map(m => ({
        role: m.direction === 'inbound' ? 'customer' : 'assistant',
        content: m.content
      })),
      channel,
      customerMessage
    };

    // Return context for OpenClaw to use in its response
    // OpenClaw will use its own AI to generate the actual response
    res.json({
      success: true,
      context,
      guidelines: businessContext ? {
        tone: businessContext.brand_voice?.tone || 'professional',
        style: businessContext.brand_voice?.style || 'helpful',
        doNotMention: businessContext.brand_voice?.avoid || []
      } : {
        tone: 'professional',
        style: 'helpful',
        doNotMention: []
      }
    });
  } catch (error: any) {
    console.error('[OpenClaw] Suggest error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
