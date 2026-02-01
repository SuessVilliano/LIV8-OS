/**
 * Notification Service
 *
 * "Create it in the Mind, Watch it Come Alive"
 *
 * Handles all notification channels:
 * - In-app notifications
 * - Push notifications (Web Push)
 * - Email notifications
 * - Telegram notifications
 * - SMS notifications (via GHL/Twilio)
 */

import webpush from 'web-push';
import nodemailer from 'nodemailer';
import axios from 'axios';

// Configure web push
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@liv8.ai',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

// Email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Notification types
export type NotificationType =
  | 'content_approved'
  | 'content_rejected'
  | 'content_scheduled'
  | 'content_published'
  | 'new_lead'
  | 'new_conversation'
  | 'task_assigned'
  | 'task_completed'
  | 'payment_received'
  | 'payment_failed'
  | 'subscription_expiring'
  | 'ai_credits_low'
  | 'system_alert'
  | 'mention'
  | 'reminder';

export interface Notification {
  id: string;
  locationId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  channels: NotificationChannel[];
}

export type NotificationChannel = 'in_app' | 'push' | 'email' | 'telegram' | 'sms';

export interface NotificationPreferences {
  locationId: string;
  channels: {
    in_app: boolean;
    push: boolean;
    email: boolean;
    telegram: boolean;
    sms: boolean;
  };
  types: {
    [key in NotificationType]?: NotificationChannel[];
  };
  quietHours?: {
    enabled: boolean;
    start: string; // "22:00"
    end: string; // "08:00"
    timezone: string;
  };
  telegramChatId?: string;
  emailAddress?: string;
  phoneNumber?: string;
}

export interface PushSubscription {
  locationId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: Date;
}

// In-memory storage (use database in production)
const notifications: Map<string, Notification[]> = new Map();
const preferences: Map<string, NotificationPreferences> = new Map();
const pushSubscriptions: Map<string, PushSubscription[]> = new Map();

// Default notification routing
const DEFAULT_NOTIFICATION_ROUTING: { [key in NotificationType]: NotificationChannel[] } = {
  content_approved: ['in_app', 'push', 'telegram'],
  content_rejected: ['in_app', 'push', 'email', 'telegram'],
  content_scheduled: ['in_app'],
  content_published: ['in_app', 'push'],
  new_lead: ['in_app', 'push', 'telegram'],
  new_conversation: ['in_app', 'push'],
  task_assigned: ['in_app', 'push', 'email'],
  task_completed: ['in_app'],
  payment_received: ['in_app', 'email'],
  payment_failed: ['in_app', 'push', 'email', 'sms'],
  subscription_expiring: ['in_app', 'push', 'email'],
  ai_credits_low: ['in_app', 'push', 'email'],
  system_alert: ['in_app', 'push', 'email'],
  mention: ['in_app', 'push'],
  reminder: ['in_app', 'push']
};

export class NotificationService {
  /**
   * Send a notification
   */
  async send(
    locationId: string,
    type: NotificationType,
    title: string,
    message: string,
    options: {
      userId?: string;
      data?: Record<string, any>;
      actionUrl?: string;
      overrideChannels?: NotificationChannel[];
    } = {}
  ): Promise<Notification> {
    const prefs = preferences.get(locationId) || this.getDefaultPreferences(locationId);

    // Determine channels
    let channels = options.overrideChannels || prefs.types[type] || DEFAULT_NOTIFICATION_ROUTING[type] || ['in_app'];

    // Filter by enabled channels
    channels = channels.filter(ch => prefs.channels[ch]);

    // Check quiet hours
    if (prefs.quietHours?.enabled && this.isQuietHours(prefs.quietHours)) {
      // During quiet hours, only send in-app and email (no push/telegram/sms)
      channels = channels.filter(ch => ch === 'in_app' || ch === 'email');
    }

    // Create notification
    const notification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      locationId,
      userId: options.userId,
      type,
      title,
      message,
      data: options.data,
      read: false,
      createdAt: new Date(),
      actionUrl: options.actionUrl,
      channels
    };

    // Store notification
    const locationNotifs = notifications.get(locationId) || [];
    locationNotifs.unshift(notification);
    // Keep only last 100 notifications
    notifications.set(locationId, locationNotifs.slice(0, 100));

    // Send to each channel
    await Promise.all(channels.map(channel => this.sendToChannel(channel, notification, prefs)));

    return notification;
  }

  /**
   * Send to a specific channel
   */
  private async sendToChannel(
    channel: NotificationChannel,
    notification: Notification,
    prefs: NotificationPreferences
  ): Promise<void> {
    try {
      switch (channel) {
        case 'in_app':
          // Already stored, just emit event if using websockets
          this.emitInAppNotification(notification);
          break;

        case 'push':
          await this.sendPushNotification(notification);
          break;

        case 'email':
          if (prefs.emailAddress) {
            await this.sendEmailNotification(notification, prefs.emailAddress);
          }
          break;

        case 'telegram':
          if (prefs.telegramChatId) {
            await this.sendTelegramNotification(notification, prefs.telegramChatId);
          }
          break;

        case 'sms':
          if (prefs.phoneNumber) {
            await this.sendSmsNotification(notification, prefs.phoneNumber);
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to send notification via ${channel}:`, error);
    }
  }

  /**
   * Emit in-app notification (for real-time updates)
   */
  private emitInAppNotification(notification: Notification): void {
    // In production, this would emit via WebSocket/SSE
    console.log('In-app notification:', notification.id, notification.title);
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(notification: Notification): Promise<void> {
    const subscriptions = pushSubscriptions.get(notification.locationId) || [];

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        notificationId: notification.id,
        type: notification.type,
        url: notification.actionUrl || '/',
        ...notification.data
      },
      actions: this.getNotificationActions(notification.type)
    });

    await Promise.all(
      subscriptions.map(async sub => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: sub.keys
            },
            payload
          );
        } catch (error: any) {
          // Remove invalid subscriptions
          if (error.statusCode === 410 || error.statusCode === 404) {
            this.removePushSubscription(notification.locationId, sub.endpoint);
          }
        }
      })
    );
  }

  /**
   * Get notification actions based on type
   */
  private getNotificationActions(type: NotificationType): Array<{ action: string; title: string }> {
    switch (type) {
      case 'content_approved':
      case 'content_rejected':
        return [
          { action: 'view', title: 'View Content' }
        ];
      case 'new_lead':
        return [
          { action: 'view', title: 'View Lead' },
          { action: 'call', title: 'Call Now' }
        ];
      case 'task_assigned':
        return [
          { action: 'view', title: 'View Task' },
          { action: 'complete', title: 'Mark Complete' }
        ];
      default:
        return [
          { action: 'view', title: 'View' }
        ];
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: Notification, email: string): Promise<void> {
    const html = this.generateEmailTemplate(notification);

    await emailTransporter.sendMail({
      from: `"LIV8 OS" <${process.env.SMTP_FROM || 'notifications@liv8.ai'}>`,
      to: email,
      subject: notification.title,
      html
    });
  }

  /**
   * Generate email template
   */
  private generateEmailTemplate(notification: Notification): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${notification.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" width="100%" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 20px;">
        <!-- Logo -->
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #a855f7); color: white; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 18px;">
            LIV8 OS
          </div>
        </div>

        <!-- Content Card -->
        <div style="background: #111118; border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 16px; padding: 32px;">
          <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 16px 0;">
            ${notification.title}
          </h1>
          <p style="color: #9ca3af; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            ${notification.message}
          </p>

          ${notification.actionUrl ? `
          <a href="${notification.actionUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6, #a855f7); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">
            View Details
          </a>
          ` : ''}
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 32px; color: #6b7280; font-size: 12px;">
          <p style="margin: 0 0 8px 0;">
            Create it in the Mind, Watch it Come Alive
          </p>
          <p style="margin: 0;">
            <a href="${process.env.APP_URL || 'https://app.liv8.ai'}/settings/notifications" style="color: #8b5cf6; text-decoration: none;">
              Manage Notification Preferences
            </a>
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Send Telegram notification
   */
  private async sendTelegramNotification(notification: Notification, chatId: string): Promise<void> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return;

    const typeEmojis: Record<NotificationType, string> = {
      content_approved: '✅',
      content_rejected: '❌',
      content_scheduled: '📅',
      content_published: '🚀',
      new_lead: '🎯',
      new_conversation: '💬',
      task_assigned: '📋',
      task_completed: '✔️',
      payment_received: '💰',
      payment_failed: '⚠️',
      subscription_expiring: '⏰',
      ai_credits_low: '🔋',
      system_alert: '🔔',
      mention: '@',
      reminder: '⏰'
    };

    const emoji = typeEmojis[notification.type] || '📢';
    let text = `${emoji} *${notification.title}*\n\n${notification.message}`;

    if (notification.actionUrl) {
      text += `\n\n[View Details](${notification.actionUrl})`;
    }

    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  }

  /**
   * Send SMS notification
   */
  private async sendSmsNotification(notification: Notification, phoneNumber: string): Promise<void> {
    // Use Twilio or GHL for SMS
    // This is a placeholder - implement based on your SMS provider
    console.log('SMS notification to', phoneNumber, ':', notification.title);
  }

  /**
   * Check if currently in quiet hours
   */
  private isQuietHours(quietHours: { enabled: boolean; start: string; end: string; timezone: string }): boolean {
    if (!quietHours.enabled) return false;

    const now = new Date();
    const [startHour, startMin] = quietHours.start.split(':').map(Number);
    const [endHour, endMin] = quietHours.end.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes <= endMinutes) {
      // Same day (e.g., 09:00 - 17:00)
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    } else {
      // Overnight (e.g., 22:00 - 08:00)
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
  }

  /**
   * Get notifications for a location
   */
  getNotifications(locationId: string, options: { unreadOnly?: boolean; limit?: number } = {}): Notification[] {
    let notifs = notifications.get(locationId) || [];

    if (options.unreadOnly) {
      notifs = notifs.filter(n => !n.read);
    }

    if (options.limit) {
      notifs = notifs.slice(0, options.limit);
    }

    return notifs;
  }

  /**
   * Mark notification as read
   */
  markAsRead(locationId: string, notificationId: string): boolean {
    const notifs = notifications.get(locationId);
    if (!notifs) return false;

    const notif = notifs.find(n => n.id === notificationId);
    if (notif) {
      notif.read = true;
      return true;
    }

    return false;
  }

  /**
   * Mark all as read
   */
  markAllAsRead(locationId: string): number {
    const notifs = notifications.get(locationId);
    if (!notifs) return 0;

    let count = 0;
    notifs.forEach(n => {
      if (!n.read) {
        n.read = true;
        count++;
      }
    });

    return count;
  }

  /**
   * Get unread count
   */
  getUnreadCount(locationId: string): number {
    const notifs = notifications.get(locationId) || [];
    return notifs.filter(n => !n.read).length;
  }

  /**
   * Save push subscription
   */
  savePushSubscription(locationId: string, subscription: Omit<PushSubscription, 'locationId' | 'createdAt'>): void {
    const subs = pushSubscriptions.get(locationId) || [];

    // Remove existing subscription with same endpoint
    const filtered = subs.filter(s => s.endpoint !== subscription.endpoint);

    filtered.push({
      ...subscription,
      locationId,
      createdAt: new Date()
    });

    pushSubscriptions.set(locationId, filtered);
  }

  /**
   * Remove push subscription
   */
  removePushSubscription(locationId: string, endpoint: string): void {
    const subs = pushSubscriptions.get(locationId) || [];
    pushSubscriptions.set(locationId, subs.filter(s => s.endpoint !== endpoint));
  }

  /**
   * Get preferences
   */
  getPreferences(locationId: string): NotificationPreferences {
    return preferences.get(locationId) || this.getDefaultPreferences(locationId);
  }

  /**
   * Update preferences
   */
  updatePreferences(locationId: string, updates: Partial<NotificationPreferences>): NotificationPreferences {
    const current = this.getPreferences(locationId);
    const updated = { ...current, ...updates };
    preferences.set(locationId, updated);
    return updated;
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(locationId: string): NotificationPreferences {
    return {
      locationId,
      channels: {
        in_app: true,
        push: true,
        email: true,
        telegram: false,
        sms: false
      },
      types: DEFAULT_NOTIFICATION_ROUTING
    };
  }

  /**
   * Get VAPID public key for push subscriptions
   */
  getVapidPublicKey(): string {
    return VAPID_PUBLIC_KEY;
  }
}

export const notificationService = new NotificationService();
export default notificationService;
