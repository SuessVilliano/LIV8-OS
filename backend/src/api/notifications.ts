/**
 * Notifications API Routes
 *
 * Endpoints for managing notifications and preferences
 */

import { Router, Request, Response } from 'express';
import { notificationService, NotificationType, NotificationChannel } from '../services/notifications.js';

const router = Router();

/**
 * Get notifications
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const locationId = req.headers['x-location-id'] as string;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID required' });
    }

    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = parseInt(req.query.limit as string) || 50;

    const notifications = notificationService.getNotifications(locationId, { unreadOnly, limit });
    const unreadCount = notificationService.getUnreadCount(locationId);

    res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get unread count
 */
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const locationId = req.headers['x-location-id'] as string;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID required' });
    }

    const count = notificationService.getUnreadCount(locationId);

    res.json({
      success: true,
      count
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mark notification as read
 */
router.put('/:notificationId/read', async (req: Request, res: Response) => {
  try {
    const locationId = req.headers['x-location-id'] as string;
    const { notificationId } = req.params;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID required' });
    }

    const success = notificationService.markAsRead(locationId, notificationId);

    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Mark all as read
 */
router.put('/read-all', async (req: Request, res: Response) => {
  try {
    const locationId = req.headers['x-location-id'] as string;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID required' });
    }

    const count = notificationService.markAllAsRead(locationId);

    res.json({
      success: true,
      markedCount: count
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Send a test notification
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const locationId = req.headers['x-location-id'] as string;
    const { channel } = req.body;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID required' });
    }

    const notification = await notificationService.send(
      locationId,
      'system_alert',
      'Test Notification',
      'This is a test notification from LIV8 OS. If you received this, notifications are working correctly!',
      {
        actionUrl: '/settings/notifications',
        overrideChannels: channel ? [channel] : undefined
      }
    );

    res.json({
      success: true,
      notification
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get notification preferences
 */
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const locationId = req.headers['x-location-id'] as string;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID required' });
    }

    const preferences = notificationService.getPreferences(locationId);

    res.json({
      success: true,
      preferences
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update notification preferences
 */
router.put('/preferences', async (req: Request, res: Response) => {
  try {
    const locationId = req.headers['x-location-id'] as string;
    const updates = req.body;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID required' });
    }

    const preferences = notificationService.updatePreferences(locationId, updates);

    res.json({
      success: true,
      preferences
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get VAPID public key for push subscriptions
 */
router.get('/push/vapid-key', (req: Request, res: Response) => {
  try {
    const publicKey = notificationService.getVapidPublicKey();

    res.json({
      success: true,
      publicKey
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Save push subscription
 */
router.post('/push/subscribe', async (req: Request, res: Response) => {
  try {
    const locationId = req.headers['x-location-id'] as string;
    const { endpoint, keys, userAgent } = req.body;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID required' });
    }

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid push subscription' });
    }

    notificationService.savePushSubscription(locationId, {
      endpoint,
      keys,
      userAgent
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Remove push subscription
 */
router.post('/push/unsubscribe', async (req: Request, res: Response) => {
  try {
    const locationId = req.headers['x-location-id'] as string;
    const { endpoint } = req.body;

    if (!locationId) {
      return res.status(400).json({ error: 'Location ID required' });
    }

    notificationService.removePushSubscription(locationId, endpoint);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Webhook for receiving external notifications
 * (e.g., from GHL, payment providers, etc.)
 */
router.post('/webhook/:source', async (req: Request, res: Response) => {
  try {
    const { source } = req.params;
    const payload = req.body;

    console.log(`Notification webhook from ${source}:`, payload);

    // Handle different webhook sources
    switch (source) {
      case 'ghl':
        // GoHighLevel webhook
        if (payload.type === 'contact.created') {
          const locationId = payload.locationId;
          await notificationService.send(
            locationId,
            'new_lead',
            'New Lead!',
            `${payload.contact.firstName} ${payload.contact.lastName} just became a lead.`,
            {
              data: { contactId: payload.contact.id },
              actionUrl: `/contacts/${payload.contact.id}`
            }
          );
        }
        break;

      case 'stripe':
        // Stripe webhook
        if (payload.type === 'invoice.payment_succeeded') {
          const locationId = payload.data.object.metadata?.locationId;
          if (locationId) {
            await notificationService.send(
              locationId,
              'payment_received',
              'Payment Received',
              `Payment of $${payload.data.object.amount_paid / 100} was successful.`,
              {
                data: { invoiceId: payload.data.object.id }
              }
            );
          }
        }
        break;

      default:
        console.log('Unknown webhook source:', source);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
