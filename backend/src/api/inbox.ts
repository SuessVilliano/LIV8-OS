/**
 * Unified Inbox API Routes
 * Multi-channel conversation management for SMS, Social, Voice, Email, Chat
 */

import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import {
  conversations,
  contacts,
  messages,
  inboxAnalytics,
  initConversationTables,
  ChannelType,
  MessageDirection
} from '../db/conversations.js';
import { createTwilioSMS, createTelnyxSMS } from '../services/sms-providers.js';
import { getTextLinkService } from '../services/textlink.js';
import { GHLApiClient } from '../services/ghl-api-client.js';
import { vapiService } from '../integrations/vapi.js';

const router = Router();

// Email transporter for sending emails
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Initialize database tables on startup
initConversationTables().catch(err => {
  console.error('[Inbox] Failed to initialize tables:', err);
});

// Helper to extract location ID
function getLocationId(req: Request): string {
  return (req.headers['x-location-id'] as string) || 'default';
}

// =====================
// CONVERSATIONS
// =====================

/**
 * GET /api/inbox/conversations
 * List conversations with filtering and pagination
 */
router.get('/conversations', async (req: Request, res: Response) => {
  try {
    const locationId = getLocationId(req);
    const {
      channel,
      status = 'active',
      assignedTo,
      limit = '50',
      offset = '0'
    } = req.query;

    const result = await conversations.list(locationId, {
      channel: channel as ChannelType | undefined,
      status: status as any,
      assignedTo: assignedTo as string | undefined,
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10)
    });

    res.json({
      success: true,
      conversations: result.conversations,
      total: result.total,
      hasMore: result.total > parseInt(offset as string, 10) + result.conversations.length
    });
  } catch (error: any) {
    console.error('[Inbox] Failed to list conversations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/inbox/conversations/:id
 * Get single conversation with messages
 */
router.get('/conversations/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { messageLimit = '50' } = req.query;

    const conversation = await conversations.getById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const contact = await contacts.getById(conversation.contact_id);
    const { messages: messageList, hasMore } = await messages.listByConversation(id, {
      limit: parseInt(messageLimit as string, 10)
    });

    res.json({
      success: true,
      conversation: {
        ...conversation,
        contact
      },
      messages: messageList,
      hasMore
    });
  } catch (error: any) {
    console.error('[Inbox] Failed to get conversation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/inbox/conversations/:id/messages
 * Get messages for a conversation with pagination
 */
router.get('/conversations/:id/messages', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { limit = '50', offset = '0', before } = req.query;

    const result = await messages.listByConversation(id, {
      limit: parseInt(limit as string, 10),
      offset: parseInt(offset as string, 10),
      before: before ? new Date(before as string) : undefined
    });

    res.json({
      success: true,
      messages: result.messages,
      hasMore: result.hasMore
    });
  } catch (error: any) {
    console.error('[Inbox] Failed to get messages:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/inbox/conversations/:id/read
 * Mark conversation as read
 */
router.post('/conversations/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await conversations.markAsRead(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Inbox] Failed to mark as read:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/inbox/conversations/:id/assign
 * Assign conversation to user or AI staff
 */
router.post('/conversations/:id/assign', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!assignedTo) {
      return res.status(400).json({ success: false, error: 'assignedTo is required' });
    }

    await conversations.assign(id, assignedTo);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Inbox] Failed to assign conversation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/inbox/conversations/:id/archive
 * Archive a conversation
 */
router.post('/conversations/:id/archive', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await conversations.archive(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Inbox] Failed to archive conversation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================
// SEND MESSAGES
// =====================

/**
 * POST /api/inbox/send
 * Send a message through any channel
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const locationId = getLocationId(req);
    const {
      conversationId,
      contactId,
      channel,
      content,
      contentType = 'text',
      mediaUrls = [],
      senderName,
      senderId,
      subject // For email messages
    } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, error: 'content is required' });
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await conversations.getById(conversationId);
      if (!conversation) {
        return res.status(404).json({ success: false, error: 'Conversation not found' });
      }
    } else if (contactId && channel) {
      conversation = await conversations.findOrCreate(locationId, contactId, channel);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Either conversationId or (contactId + channel) is required'
      });
    }

    // Get contact for sending
    const contact = await contacts.getById(conversation.contact_id);
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    // Send through appropriate channel
    let externalId: string | undefined;
    let status: 'sent' | 'failed' = 'sent';
    let errorMessage: string | undefined;

    try {
      switch (conversation.channel) {
        case 'sms_twilio': {
          if (!contact.phone) throw new Error('Contact has no phone number');
          const twilio = createTwilioSMS({
            accountSid: process.env.TWILIO_ACCOUNT_SID || '',
            authToken: process.env.TWILIO_AUTH_TOKEN || '',
            fromNumber: process.env.TWILIO_FROM_NUMBER || ''
          });
          const result = await twilio.sendSMS(contact.phone, content);
          externalId = result.messageId;
          break;
        }
        case 'sms_telnyx': {
          if (!contact.phone) throw new Error('Contact has no phone number');
          const telnyx = createTelnyxSMS({
            apiKey: process.env.TELNYX_API_KEY || '',
            fromNumber: process.env.TELNYX_FROM_NUMBER || ''
          });
          const result = await telnyx.sendSMS(contact.phone, content);
          externalId = result.messageId;
          break;
        }
        case 'sms_textlink': {
          if (!contact.phone) throw new Error('Contact has no phone number');
          const textlink = getTextLinkService();
          if (textlink) {
            const result = await textlink.sendSMS(contact.phone, content);
            externalId = result.bulk_id;
          } else {
            throw new Error('TextLink not configured');
          }
          break;
        }
        case 'sms_ghl': {
          // Route through GHL SMS API
          if (!contact.phone) throw new Error('Contact has no phone number');
          const ghlToken = req.headers['x-ghl-token'] as string;
          if (!ghlToken) throw new Error('GHL token required for GHL SMS');

          const ghlClient = new GHLApiClient(ghlToken, locationId);
          if (contact.external_id) {
            const result = await ghlClient.sendMessage({
              type: 'SMS',
              contactId: contact.external_id,
              message: content
            });
            externalId = result?.messageId;
            console.log('[Inbox] SMS sent via GHL');
          } else {
            throw new Error('Contact not linked to GHL');
          }
          break;
        }
        case 'email': {
          if (!contact.email) throw new Error('Contact has no email address');
          const emailSubject = subject || 'Message from LIV8 OS';
          const htmlContent = content.replace(/\n/g, '<br>');

          // Try GHL first if available, fall back to SMTP
          const ghlToken = req.headers['x-ghl-token'] as string;
          if (ghlToken && contact.external_id) {
            try {
              const ghlClient = new GHLApiClient(ghlToken, locationId);
              await ghlClient.sendEmail(contact.external_id, emailSubject, htmlContent);
              console.log('[Inbox] Email sent via GHL');
            } catch (ghlError) {
              console.log('[Inbox] GHL email failed, using SMTP:', ghlError);
              const info = await emailTransporter.sendMail({
                from: `"LIV8 OS" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@liv8.ai'}>`,
                to: contact.email,
                subject: emailSubject,
                text: content,
                html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">${htmlContent}</div>`
              });
              externalId = info.messageId;
            }
          } else {
            const info = await emailTransporter.sendMail({
              from: `"LIV8 OS" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@liv8.ai'}>`,
              to: contact.email,
              subject: emailSubject,
              text: content,
              html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">${htmlContent}</div>`
            });
            externalId = info.messageId;
          }
          console.log('[Inbox] Email sent');
          break;
        }
        case 'whatsapp': {
          // WhatsApp via GHL
          if (!contact.phone) throw new Error('Contact has no phone number');
          const ghlToken = req.headers['x-ghl-token'] as string;
          if (!ghlToken) throw new Error('GHL token required for WhatsApp');

          const ghlClient = new GHLApiClient(ghlToken, locationId);
          if (contact.external_id) {
            const result = await ghlClient.sendMessage({
              type: 'WhatsApp',
              contactId: contact.external_id,
              message: content
            });
            externalId = result?.messageId;
          } else {
            throw new Error('Contact not linked to GHL');
          }
          console.log('[Inbox] WhatsApp sent via GHL');
          break;
        }
        case 'live_chat': {
          // Live Chat via GHL
          const ghlToken = req.headers['x-ghl-token'] as string;
          if (!ghlToken) throw new Error('GHL token required for Live Chat');

          const ghlClient = new GHLApiClient(ghlToken, locationId);
          if (contact.external_id && conversation.channel_conversation_id) {
            await ghlClient.sendMessage({
              type: 'SMS', // GHL uses SMS type for live chat messages
              contactId: contact.external_id,
              message: content
            });
          } else {
            throw new Error('Contact or conversation not linked to GHL');
          }
          console.log('[Inbox] Live chat message sent via GHL');
          break;
        }
        case 'voice': {
          // Voice - initiate outbound call via VAPI
          if (!contact.phone) throw new Error('Contact has no phone number');

          const assistantId = req.body.assistantId;
          if (!assistantId) throw new Error('assistantId required for voice calls');

          // For voice, we initiate a call rather than send a text message
          if (vapiService) {
            const call = await vapiService.makeCall({
              assistantId,
              phoneNumber: contact.phone,
              metadata: { contactId: contact.id, script: content }
            });
            externalId = call?.id;
            // Store call metadata
            await messages.create({
              conversationId: conversation.id,
              locationId,
              direction: 'outbound',
              channel: 'voice',
              senderId: senderId || 'system',
              senderName: 'Voice Agent',
              senderType: 'ai_staff',
              content: `📞 Outbound call initiated to ${contact.phone}`,
              contentType: 'text',
              status: 'sent',
              externalId: call?.id,
              metadata: { callId: call?.id, script: content }
            });
            return res.json({ success: true, callId: call?.id, message: 'Call initiated' });
          } else {
            throw new Error('VAPI voice service not configured');
          }
        }
        case 'facebook':
        case 'instagram': {
          // Social DMs via GHL
          const ghlToken = req.headers['x-ghl-token'] as string;
          if (!ghlToken) throw new Error('GHL token required for social messaging');

          const ghlClient = new GHLApiClient(ghlToken, locationId);
          if (contact.external_id) {
            await ghlClient.sendMessage({
              type: 'SMS', // GHL handles routing based on conversation type
              contactId: contact.external_id,
              message: content
            });
          } else {
            throw new Error('Contact not linked to GHL');
          }
          console.log(`[Inbox] ${conversation.channel} message sent via GHL`);
          break;
        }
        // Add more channel implementations as needed
        default:
          console.log(`[Inbox] Channel ${conversation.channel} sending not implemented`);
      }
    } catch (sendError: any) {
      console.error('[Inbox] Failed to send message:', sendError);
      status = 'failed';
      errorMessage = sendError.message;
    }

    // Store message in database
    const message = await messages.create({
      conversationId: conversation.id,
      locationId,
      direction: 'outbound',
      channel: conversation.channel,
      senderId: senderId || 'system',
      senderName: senderName || 'System',
      senderType: 'user',
      content,
      contentType,
      mediaUrls,
      status,
      externalId,
      metadata: errorMessage ? { error: errorMessage } : {}
    });

    res.json({
      success: status === 'sent',
      message,
      error: errorMessage
    });
  } catch (error: any) {
    console.error('[Inbox] Failed to send message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================
// CONTACTS
// =====================

/**
 * GET /api/inbox/contacts
 * Search contacts
 */
router.get('/contacts', async (req: Request, res: Response) => {
  try {
    const locationId = getLocationId(req);
    const { search = '', limit = '20' } = req.query;

    const contactList = await contacts.search(
      locationId,
      search as string,
      parseInt(limit as string, 10)
    );

    res.json({
      success: true,
      contacts: contactList
    });
  } catch (error: any) {
    console.error('[Inbox] Failed to search contacts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/inbox/contacts
 * Create or update a contact
 */
router.post('/contacts', async (req: Request, res: Response) => {
  try {
    const locationId = getLocationId(req);
    const { phone, email, firstName, lastName, company, externalId, metadata } = req.body;

    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        error: 'Either phone or email is required'
      });
    }

    const contact = await contacts.findOrCreate(locationId, {
      phone,
      email,
      first_name: firstName,
      last_name: lastName,
      company,
      external_id: externalId,
      metadata
    });

    res.json({ success: true, contact });
  } catch (error: any) {
    console.error('[Inbox] Failed to create contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/inbox/contacts/:id
 * Get contact with conversations
 */
router.get('/contacts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const locationId = getLocationId(req);

    const contact = await contacts.getById(id);
    if (!contact) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    // Get all conversations for this contact
    const { conversations: contactConversations } = await conversations.list(locationId, {
      limit: 100
    });

    const filtered = contactConversations.filter(c => c.contact_id === id);

    res.json({
      success: true,
      contact,
      conversations: filtered
    });
  } catch (error: any) {
    console.error('[Inbox] Failed to get contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================
// WEBHOOKS (Incoming Messages)
// =====================

/**
 * POST /api/inbox/webhook/sms
 * Generic SMS webhook handler
 */
router.post('/webhook/sms', async (req: Request, res: Response) => {
  try {
    const {
      from,
      to,
      body,
      provider = 'unknown',
      externalId,
      mediaUrls = []
    } = req.body;

    console.log(`[Inbox] Incoming SMS from ${from} via ${provider}`);

    // Determine channel based on provider
    const channelMap: Record<string, ChannelType> = {
      twilio: 'sms_twilio',
      telnyx: 'sms_telnyx',
      textlink: 'sms_textlink',
      ghl: 'sms_ghl'
    };
    const channel = channelMap[provider.toLowerCase()] || 'sms_twilio';

    // Find or create contact
    const locationId = (req.headers['x-location-id'] as string) || 'default';
    const contact = await contacts.findOrCreate(locationId, {
      phone: from
    });

    // Find or create conversation
    const conversation = await conversations.findOrCreate(locationId, contact.id, channel);

    // Store the message
    const message = await messages.create({
      conversationId: conversation.id,
      locationId,
      direction: 'inbound',
      channel,
      senderId: contact.id,
      senderName: contact.first_name || contact.phone || 'Unknown',
      senderType: 'contact',
      content: body,
      contentType: mediaUrls.length > 0 ? 'image' : 'text',
      mediaUrls,
      status: 'delivered',
      externalId
    });

    // TODO: Trigger notifications, automations, AI responses

    res.json({ success: true, messageId: message.id });
  } catch (error: any) {
    console.error('[Inbox] Webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/inbox/webhook/twilio
 * Twilio-specific webhook
 */
router.post('/webhook/twilio', async (req: Request, res: Response) => {
  try {
    const { From, To, Body, MessageSid, NumMedia } = req.body;

    // Extract media URLs if present
    const mediaUrls: string[] = [];
    const numMedia = parseInt(NumMedia || '0', 10);
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = req.body[`MediaUrl${i}`];
      if (mediaUrl) mediaUrls.push(mediaUrl);
    }

    // Forward to generic handler
    req.body = {
      from: From,
      to: To,
      body: Body,
      provider: 'twilio',
      externalId: MessageSid,
      mediaUrls
    };

    // Reuse generic handler
    return router.handle(req, res, () => {});
  } catch (error: any) {
    console.error('[Inbox] Twilio webhook error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================
// ANALYTICS
// =====================

/**
 * GET /api/inbox/stats
 * Get inbox statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const locationId = getLocationId(req);
    const stats = await inboxAnalytics.getStats(locationId);

    res.json({
      success: true,
      stats
    });
  } catch (error: any) {
    console.error('[Inbox] Failed to get stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/inbox/info
 * API info endpoint
 */
router.get('/info', (req: Request, res: Response) => {
  res.json({
    service: 'LIV8 OS Unified Inbox',
    version: '1.0.0',
    channels: [
      'sms_twilio',
      'sms_telnyx',
      'sms_textlink',
      'sms_ghl',
      'email',
      'voice',
      'live_chat',
      'whatsapp',
      'facebook',
      'instagram',
      'twitter',
      'linkedin',
      'telegram',
      'google_business'
    ],
    endpoints: {
      conversations: 'GET /api/inbox/conversations',
      messages: 'GET /api/inbox/conversations/:id/messages',
      send: 'POST /api/inbox/send',
      contacts: 'GET/POST /api/inbox/contacts',
      stats: 'GET /api/inbox/stats',
      webhooks: 'POST /api/inbox/webhook/sms'
    }
  });
});

export default router;
