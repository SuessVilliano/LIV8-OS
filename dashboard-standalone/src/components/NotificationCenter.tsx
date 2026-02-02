/**
 * Notification Center Component
 *
 * "Create it in the Mind, Watch it Come Alive"
 *
 * In-app notification bell and dropdown with notification management
 */

import { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Settings,
  ExternalLink,
  Target,
  MessageSquare,
  FileText,
  CreditCard,
  AlertTriangle,
  Clock,
  Zap,
  User,
  Volume2,
  VolumeX
} from 'lucide-react';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
  data?: Record<string, any>;
}

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const locationId = localStorage.getItem('os_loc_id') || 'demo';

  useEffect(() => {
    fetchNotifications();
    setupPushNotifications();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/notifications?limit=20`, {
        headers: { 'x-location-id': locationId }
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Demo notifications
      setNotifications([
        {
          id: '1',
          type: 'new_lead',
          title: 'New Lead!',
          message: 'John Smith just became a lead from your website.',
          read: false,
          createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
          actionUrl: '/contacts/123'
        },
        {
          id: '2',
          type: 'content_approved',
          title: 'Content Approved',
          message: 'Your Instagram post "5 Tips for Success" was approved.',
          read: false,
          createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
          actionUrl: '/content/456'
        },
        {
          id: '3',
          type: 'task_completed',
          title: 'Task Completed',
          message: 'Marketing Manager completed "Send follow-up emails".',
          read: true,
          createdAt: new Date(Date.now() - 2 * 3600000).toISOString()
        },
        {
          id: '4',
          type: 'payment_received',
          title: 'Payment Received',
          message: 'Your monthly subscription payment of $197 was successful.',
          read: true,
          createdAt: new Date(Date.now() - 24 * 3600000).toISOString()
        }
      ]);
      setUnreadCount(2);
    }
    setLoading(false);
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/notifications/unread-count`, {
        headers: { 'x-location-id': locationId }
      });
      const data = await response.json();
      if (data.success && data.count > unreadCount) {
        // New notifications - play sound
        if (soundEnabled) {
          playNotificationSound();
        }
        setUnreadCount(data.count);
      }
    } catch (error) {
      // Silently fail
    }
  };

  const setupPushNotifications = async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.ready;

      // Get VAPID key
      const response = await fetch(`${API_BASE}/api/notifications/push/vapid-key`);
      const { publicKey } = await response.json();

      if (!publicKey) return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource
      });

      // Save subscription
      await fetch(`${API_BASE}/api/notifications/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-location-id': locationId
        },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
            auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
          },
          userAgent: navigator.userAgent
        })
      });
    } catch (error) {
      console.error('Push notification setup failed:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`${API_BASE}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'x-location-id': locationId }
      });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { 'x-location-id': locationId }
      });

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const playNotificationSound = () => {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, any> = {
      new_lead: Target,
      new_conversation: MessageSquare,
      content_approved: Check,
      content_rejected: X,
      content_published: Zap,
      task_assigned: FileText,
      task_completed: CheckCheck,
      payment_received: CreditCard,
      payment_failed: AlertTriangle,
      ai_credits_low: AlertTriangle,
      system_alert: Bell,
      mention: User,
      reminder: Clock
    };
    return icons[type] || Bell;
  };

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      new_lead: 'text-green-400',
      new_conversation: 'text-blue-400',
      content_approved: 'text-green-400',
      content_rejected: 'text-red-400',
      content_published: 'text-violet-400',
      task_assigned: 'text-amber-400',
      task_completed: 'text-green-400',
      payment_received: 'text-green-400',
      payment_failed: 'text-red-400',
      ai_credits_low: 'text-amber-400',
      system_alert: 'text-violet-400',
      mention: 'text-blue-400',
      reminder: 'text-amber-400'
    };
    return colors[type] || 'text-gray-400';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl hover:bg-gray-800/50 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-96 max-h-[500px] bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h3 className="font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4 text-gray-400" />
                ) : (
                  <VolumeX className="w-4 h-4 text-gray-500" />
                )}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  Mark all read
                </button>
              )}
              <a
                href="/settings/notifications"
                className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-400" />
              </a>
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map(notification => {
                const Icon = getNotificationIcon(notification.type);
                const iconColor = getNotificationColor(notification.type);

                return (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-violet-500/5' : ''
                    }`}
                    onClick={() => {
                      if (!notification.read) markAsRead(notification.id);
                      if (notification.actionUrl) {
                        window.location.href = notification.actionUrl;
                        setIsOpen(false);
                      }
                    }}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-0.5 ${iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm font-medium ${
                            notification.read ? 'text-gray-400' : 'text-white'
                          }`}>
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-violet-500 rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-600">
                            {formatTime(notification.createdAt)}
                          </span>
                          {notification.actionUrl && (
                            <span className="text-xs text-violet-400 flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              View
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-800 text-center">
              <a
                href="/notifications"
                className="text-sm text-violet-400 hover:text-violet-300"
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function for VAPID key conversion
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
