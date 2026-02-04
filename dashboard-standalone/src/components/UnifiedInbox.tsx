/**
 * Unified Multi-Channel Inbox
 * Aggregates conversations from SMS, Social, Voice, Email, Chat
 */

import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Phone,
  Send,
  Search,
  Filter,
  Archive,
  MoreVertical,
  ChevronLeft,
  Check,
  CheckCheck,
  AlertCircle,
  Paperclip,
  Smile,
  RefreshCw,
  Inbox,
  Users,
  Bot,
  Zap
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

const API_BASE = getBackendUrl();

// Channel icons and colors
const CHANNEL_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  sms_twilio: { icon: '📱', color: '#F22F46', label: 'Twilio SMS' },
  sms_telnyx: { icon: '📱', color: '#00C389', label: 'Telnyx SMS' },
  sms_textlink: { icon: '📱', color: '#6366F1', label: 'TextLink SMS' },
  sms_ghl: { icon: '📱', color: '#1068EB', label: 'GHL SMS' },
  email: { icon: '✉️', color: '#EA4335', label: 'Email' },
  voice: { icon: '📞', color: '#34A853', label: 'Voice' },
  live_chat: { icon: '💬', color: '#8B5CF6', label: 'Live Chat' },
  whatsapp: { icon: '💬', color: '#25D366', label: 'WhatsApp' },
  facebook: { icon: '📘', color: '#1877F2', label: 'Facebook' },
  instagram: { icon: '📷', color: '#E4405F', label: 'Instagram' },
  twitter: { icon: '𝕏', color: '#000000', label: 'Twitter/X' },
  linkedin: { icon: '💼', color: '#0A66C2', label: 'LinkedIn' },
  telegram: { icon: '✈️', color: '#26A5E4', label: 'Telegram' },
  google_business: { icon: 'G', color: '#4285F4', label: 'Google Business' }
};

interface Contact {
  id: string;
  phone?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  company?: string;
}

interface Conversation {
  id: string;
  contact_id: string;
  channel: string;
  status: string;
  unread_count: number;
  last_message_at: string;
  last_message_preview: string;
  assigned_to?: string;
  priority: string;
  contact: Contact;
}

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  sender_name?: string;
  sender_type: string;
  content: string;
  content_type: string;
  media_urls: string[];
  status: string;
  created_at: string;
}

interface InboxStats {
  totalConversations: number;
  unreadCount: number;
  byChannel: Record<string, number>;
  todayMessages: number;
}

const UnifiedInbox = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<InboxStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const params = new URLSearchParams();
      if (channelFilter !== 'all') params.append('channel', channelFilter);

      const response = await fetch(`${API_BASE}/api/inbox/conversations?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
          'x-location-id': localStorage.getItem('location_id') || 'default'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/inbox/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
          'x-location-id': localStorage.getItem('location_id') || 'default'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Fetch messages for conversation
  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/inbox/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
          'x-location-id': localStorage.getItem('location_id') || 'default'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);

        // Mark as read
        await fetch(`${API_BASE}/api/inbox/conversations/${conversationId}/read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
            'x-location-id': localStorage.getItem('location_id') || 'default'
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const response = await fetch(`${API_BASE}/api/inbox/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`,
          'x-location-id': localStorage.getItem('location_id') || 'default'
        },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: messageInput,
          senderName: 'You'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        setMessageInput('');
        scrollToBottom();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Effects
  useEffect(() => {
    fetchConversations();
    fetchStats();
  }, [channelFilter]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Filter conversations by search
  const filteredConversations = conversations.filter(conv => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const contact = conv.contact;
    return (
      contact?.first_name?.toLowerCase().includes(searchLower) ||
      contact?.last_name?.toLowerCase().includes(searchLower) ||
      contact?.phone?.includes(searchTerm) ||
      contact?.email?.toLowerCase().includes(searchLower) ||
      conv.last_message_preview?.toLowerCase().includes(searchLower)
    );
  });

  // Get contact display name
  const getContactName = (contact: Contact) => {
    if (contact.first_name || contact.last_name) {
      return `${contact.first_name || ''} ${contact.last_name || ''}`.trim();
    }
    return contact.phone || contact.email || 'Unknown';
  };

  // Format timestamp
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Get message status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered': return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read': return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed': return <AlertCircle className="h-3 w-3 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="h-full flex bg-[var(--os-bg)]">
      {/* Sidebar - Conversation List */}
      <div className={`w-96 border-r border-[var(--os-border)] flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b border-[var(--os-border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-neuro" />
              <h2 className="text-lg font-black uppercase">Inbox</h2>
              {stats && stats.unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                  {stats.unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={() => { fetchConversations(); fetchStats(); }}
              className="p-2 hover:bg-[var(--os-surface)] rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4 text-[var(--os-text-muted)]" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--os-text-muted)]" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl pl-10 pr-4 py-2.5 text-sm focus:border-neuro outline-none"
            />
          </div>

          {/* Channel Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--os-surface)] rounded-lg text-xs font-semibold"
            >
              <Filter className="h-3 w-3" />
              {channelFilter === 'all' ? 'All Channels' : CHANNEL_CONFIG[channelFilter]?.label}
            </button>
          </div>

          {/* Filter Dropdown */}
          {showFilters && (
            <div className="mt-2 p-2 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl space-y-1">
              <button
                onClick={() => { setChannelFilter('all'); setShowFilters(false); }}
                className={`w-full px-3 py-2 text-left text-xs font-semibold rounded-lg ${channelFilter === 'all' ? 'bg-neuro/20 text-neuro' : 'hover:bg-[var(--os-bg)]'}`}
              >
                All Channels
              </button>
              {Object.entries(CHANNEL_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => { setChannelFilter(key); setShowFilters(false); }}
                  className={`w-full px-3 py-2 text-left text-xs font-semibold rounded-lg flex items-center gap-2 ${channelFilter === key ? 'bg-neuro/20 text-neuro' : 'hover:bg-[var(--os-bg)]'}`}
                >
                  <span>{config.icon}</span>
                  {config.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats Bar */}
        {stats && (
          <div className="px-4 py-2 border-b border-[var(--os-border)] flex items-center gap-4 text-xs text-[var(--os-text-muted)]">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {stats.totalConversations} convos
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {stats.todayMessages} today
            </span>
          </div>
        )}

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 text-neuro animate-spin" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-12 text-[var(--os-text-muted)]">
              <Inbox className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`p-4 border-b border-[var(--os-border)] cursor-pointer hover:bg-[var(--os-surface)] transition-colors ${selectedConversation?.id === conv.id ? 'bg-[var(--os-surface)]' : ''}`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-neuro to-purple-600 flex items-center justify-center text-white font-bold">
                      {conv.contact?.avatar_url ? (
                        <img src={conv.contact.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        (conv.contact?.first_name?.[0] || conv.contact?.phone?.[0] || '?').toUpperCase()
                      )}
                    </div>
                    {/* Channel indicator */}
                    <div
                      className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-[10px] border-2 border-[var(--os-bg)]"
                      style={{ backgroundColor: CHANNEL_CONFIG[conv.channel]?.color || '#666' }}
                    >
                      {CHANNEL_CONFIG[conv.channel]?.icon || '💬'}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm truncate">
                        {getContactName(conv.contact)}
                      </span>
                      <span className="text-[10px] text-[var(--os-text-muted)]">
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--os-text-muted)] truncate">
                      {conv.last_message_preview || 'No messages yet'}
                    </p>
                  </div>

                  {/* Unread badge */}
                  {conv.unread_count > 0 && (
                    <div className="h-5 min-w-5 px-1.5 bg-neuro text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {conv.unread_count}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-[var(--os-border)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedConversation(null)}
                className="md:hidden p-2 hover:bg-[var(--os-surface)] rounded-lg"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-neuro to-purple-600 flex items-center justify-center text-white font-bold">
                {(selectedConversation.contact?.first_name?.[0] || '?').toUpperCase()}
              </div>

              <div>
                <h3 className="font-bold">{getContactName(selectedConversation.contact)}</h3>
                <div className="flex items-center gap-2 text-xs text-[var(--os-text-muted)]">
                  <span
                    className="px-1.5 py-0.5 rounded text-white text-[10px] font-bold"
                    style={{ backgroundColor: CHANNEL_CONFIG[selectedConversation.channel]?.color }}
                  >
                    {CHANNEL_CONFIG[selectedConversation.channel]?.label}
                  </span>
                  {selectedConversation.contact?.phone && (
                    <span>{selectedConversation.contact.phone}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-[var(--os-surface)] rounded-lg">
                <Phone className="h-4 w-4 text-[var(--os-text-muted)]" />
              </button>
              <button className="p-2 hover:bg-[var(--os-surface)] rounded-lg">
                <Archive className="h-4 w-4 text-[var(--os-text-muted)]" />
              </button>
              <button className="p-2 hover:bg-[var(--os-surface)] rounded-lg">
                <MoreVertical className="h-4 w-4 text-[var(--os-text-muted)]" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                    msg.direction === 'outbound'
                      ? 'bg-neuro text-white rounded-br-md'
                      : 'bg-[var(--os-surface)] rounded-bl-md'
                  }`}
                >
                  {/* Sender name for inbound */}
                  {msg.direction === 'inbound' && msg.sender_name && (
                    <p className="text-[10px] font-bold text-[var(--os-text-muted)] mb-1">
                      {msg.sender_name}
                    </p>
                  )}

                  {/* Content */}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                  {/* Media */}
                  {msg.media_urls && msg.media_urls.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {msg.media_urls.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="max-w-full rounded-lg"
                        />
                      ))}
                    </div>
                  )}

                  {/* Time & Status */}
                  <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'outbound' ? 'justify-end' : ''}`}>
                    <span className={`text-[10px] ${msg.direction === 'outbound' ? 'text-white/70' : 'text-[var(--os-text-muted)]'}`}>
                      {formatTime(msg.created_at)}
                    </span>
                    {msg.direction === 'outbound' && getStatusIcon(msg.status)}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-[var(--os-border)]">
            <div className="flex items-end gap-3">
              <button className="p-2.5 hover:bg-[var(--os-surface)] rounded-xl">
                <Paperclip className="h-5 w-5 text-[var(--os-text-muted)]" />
              </button>

              <div className="flex-1 relative">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="w-full bg-[var(--os-surface)] border border-[var(--os-border)] rounded-2xl px-4 py-3 pr-12 text-sm focus:border-neuro outline-none resize-none"
                />
                <button className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Smile className="h-5 w-5 text-[var(--os-text-muted)]" />
                </button>
              </div>

              <button
                onClick={sendMessage}
                disabled={!messageInput.trim() || sending}
                className="p-3 bg-neuro text-white rounded-xl hover:bg-neuro-dark transition-colors disabled:opacity-50"
              >
                {sending ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 mt-3">
              <button className="px-3 py-1.5 bg-[var(--os-surface)] rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-[var(--os-border)]">
                <Bot className="h-3 w-3" /> AI Reply
              </button>
              <button className="px-3 py-1.5 bg-[var(--os-surface)] rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-[var(--os-border)]">
                <Zap className="h-3 w-3" /> Quick Reply
              </button>
              <button className="px-3 py-1.5 bg-[var(--os-surface)] rounded-lg text-[10px] font-bold flex items-center gap-1 hover:bg-[var(--os-border)]">
                <Users className="h-3 w-3" /> Assign
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="flex-1 hidden md:flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-[var(--os-text-muted)] opacity-50" />
            <h3 className="text-lg font-bold mb-2">Select a Conversation</h3>
            <p className="text-sm text-[var(--os-text-muted)]">
              Choose a conversation from the list to view messages
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedInbox;
