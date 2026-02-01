/**
 * Content Scheduler & Publishing Workflow
 *
 * Features:
 * - Schedule content: daily, weekly, monthly
 * - Two flows: Auto-post OR Confirm-first (approval required)
 * - Templates for easy content creation
 * - Multi-platform publishing
 * - Telegram/Dashboard approval notifications
 */

import { telegramService } from '../integrations/telegram.js';

// Content status
export type ContentStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'rejected';

// Schedule frequency
export type ScheduleFrequency = 'once' | 'daily' | 'weekly' | 'monthly';

// Platform for publishing
export type PublishPlatform =
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'twitter'
  | 'tiktok'
  | 'youtube'
  | 'email'
  | 'sms'
  | 'blog';

// Content template
export interface ContentTemplate {
  id: string;
  locationId: string;
  name: string;
  description: string;
  type: 'social_post' | 'email' | 'sms' | 'blog' | 'video_script' | 'ad_copy';
  platform: PublishPlatform[];
  structure: {
    sections: TemplateSection[];
    variables: TemplateVariable[];
  };
  defaultValues?: Record<string, string>;
  isSystemTemplate: boolean;  // true = LIV8 pre-built, false = user created
  createdAt: string;
  updatedAt: string;
}

export interface TemplateSection {
  id: string;
  name: string;
  type: 'text' | 'image' | 'video' | 'cta' | 'hashtags' | 'emoji';
  placeholder: string;
  required: boolean;
  maxLength?: number;
  aiGenerate?: boolean;  // Can AI generate this section?
}

export interface TemplateVariable {
  key: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];  // for select type
  defaultValue?: string;
}

// Scheduled content item
export interface ScheduledContent {
  id: string;
  locationId: string;
  templateId?: string;
  content: {
    text?: string;
    mediaUrls?: string[];
    hashtags?: string[];
    callToAction?: string;
    subject?: string;  // for email
    previewText?: string;  // for email
  };
  platforms: PublishPlatform[];
  schedule: {
    type: ScheduleFrequency;
    startDate: string;  // ISO date
    time: string;       // HH:mm
    timezone: string;
    daysOfWeek?: number[];  // 0-6 for weekly
    dayOfMonth?: number;    // 1-31 for monthly
    endDate?: string;       // optional end date for recurring
  };
  workflow: {
    requiresApproval: boolean;
    approvers: string[];  // user IDs or 'owner', 'manager'
    notifyViaTelegram: boolean;
    telegramChatId?: string;
  };
  status: ContentStatus;
  approvalHistory: ApprovalAction[];
  publishHistory: PublishResult[];
  aiGenerated: boolean;
  aiProvider?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalAction {
  action: 'submitted' | 'approved' | 'rejected' | 'revision_requested';
  by: string;
  at: string;
  comment?: string;
}

export interface PublishResult {
  platform: PublishPlatform;
  status: 'success' | 'failed';
  publishedAt?: string;
  postId?: string;
  error?: string;
}

// Publishing queue item
interface QueueItem {
  contentId: string;
  scheduledTime: Date;
  platforms: PublishPlatform[];
}

// System templates
export const SYSTEM_TEMPLATES: Omit<ContentTemplate, 'id' | 'locationId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Engaging Social Post',
    description: 'Scroll-stopping social media post with hook, value, and CTA',
    type: 'social_post',
    platform: ['instagram', 'facebook', 'linkedin', 'twitter'],
    structure: {
      sections: [
        { id: 'hook', name: 'Hook', type: 'text', placeholder: 'Attention-grabbing opening line', required: true, maxLength: 100, aiGenerate: true },
        { id: 'value', name: 'Value Content', type: 'text', placeholder: 'Main message with value', required: true, maxLength: 500, aiGenerate: true },
        { id: 'cta', name: 'Call to Action', type: 'cta', placeholder: 'What should they do next?', required: true, maxLength: 100, aiGenerate: true },
        { id: 'hashtags', name: 'Hashtags', type: 'hashtags', placeholder: '#relevant #hashtags', required: false, maxLength: 200, aiGenerate: true }
      ],
      variables: [
        { key: 'topic', name: 'Topic', type: 'text' },
        { key: 'tone', name: 'Tone', type: 'select', options: ['professional', 'casual', 'enthusiastic', 'authoritative'] }
      ]
    },
    isSystemTemplate: true
  },
  {
    name: 'Product Announcement',
    description: 'Announce a new product or feature',
    type: 'social_post',
    platform: ['instagram', 'facebook', 'linkedin', 'twitter'],
    structure: {
      sections: [
        { id: 'teaser', name: 'Teaser', type: 'text', placeholder: 'Build anticipation', required: true, maxLength: 80, aiGenerate: true },
        { id: 'announcement', name: 'Announcement', type: 'text', placeholder: 'The big reveal', required: true, maxLength: 300, aiGenerate: true },
        { id: 'benefits', name: 'Key Benefits', type: 'text', placeholder: '3 key benefits', required: true, maxLength: 200, aiGenerate: true },
        { id: 'cta', name: 'Call to Action', type: 'cta', placeholder: 'Drive action', required: true, maxLength: 100, aiGenerate: true },
        { id: 'image', name: 'Product Image', type: 'image', placeholder: 'Upload product image', required: false }
      ],
      variables: [
        { key: 'product_name', name: 'Product Name', type: 'text' },
        { key: 'launch_date', name: 'Launch Date', type: 'date' }
      ]
    },
    isSystemTemplate: true
  },
  {
    name: 'Email Newsletter',
    description: 'Weekly or monthly newsletter template',
    type: 'email',
    platform: ['email'],
    structure: {
      sections: [
        { id: 'subject', name: 'Subject Line', type: 'text', placeholder: 'Compelling subject', required: true, maxLength: 60, aiGenerate: true },
        { id: 'preview', name: 'Preview Text', type: 'text', placeholder: 'Email preview snippet', required: true, maxLength: 100, aiGenerate: true },
        { id: 'greeting', name: 'Personal Greeting', type: 'text', placeholder: 'Hi {{first_name}},', required: true, maxLength: 50 },
        { id: 'intro', name: 'Introduction', type: 'text', placeholder: 'Set the scene', required: true, maxLength: 200, aiGenerate: true },
        { id: 'main_content', name: 'Main Content', type: 'text', placeholder: 'Key message or updates', required: true, maxLength: 1000, aiGenerate: true },
        { id: 'cta', name: 'Call to Action', type: 'cta', placeholder: 'Primary CTA button', required: true, maxLength: 50, aiGenerate: true },
        { id: 'signature', name: 'Signature', type: 'text', placeholder: 'Your signature', required: true, maxLength: 100 }
      ],
      variables: [
        { key: 'newsletter_topic', name: 'Newsletter Topic', type: 'text' },
        { key: 'cta_url', name: 'CTA Link URL', type: 'text' }
      ]
    },
    isSystemTemplate: true
  },
  {
    name: 'SMS Promotion',
    description: 'Short promotional SMS message',
    type: 'sms',
    platform: ['sms'],
    structure: {
      sections: [
        { id: 'message', name: 'Message', type: 'text', placeholder: 'Short, punchy message', required: true, maxLength: 160, aiGenerate: true },
        { id: 'link', name: 'Short Link', type: 'text', placeholder: 'https://...', required: false, maxLength: 30 }
      ],
      variables: [
        { key: 'offer', name: 'Offer Details', type: 'text' },
        { key: 'expiry', name: 'Offer Expiry', type: 'date' }
      ]
    },
    isSystemTemplate: true
  },
  {
    name: 'Video Script - Short Form',
    description: 'Script for TikTok, Reels, or Shorts',
    type: 'video_script',
    platform: ['tiktok', 'instagram', 'youtube'],
    structure: {
      sections: [
        { id: 'hook', name: 'Hook (0-3 sec)', type: 'text', placeholder: 'Grab attention immediately', required: true, maxLength: 50, aiGenerate: true },
        { id: 'problem', name: 'Problem (3-7 sec)', type: 'text', placeholder: 'State the problem', required: true, maxLength: 100, aiGenerate: true },
        { id: 'solution', name: 'Solution (7-20 sec)', type: 'text', placeholder: 'Present the solution', required: true, maxLength: 200, aiGenerate: true },
        { id: 'proof', name: 'Proof/Demo (20-40 sec)', type: 'text', placeholder: 'Show it works', required: false, maxLength: 200, aiGenerate: true },
        { id: 'cta', name: 'CTA (40-60 sec)', type: 'cta', placeholder: 'Tell them what to do', required: true, maxLength: 100, aiGenerate: true }
      ],
      variables: [
        { key: 'topic', name: 'Video Topic', type: 'text' },
        { key: 'target_length', name: 'Target Length', type: 'select', options: ['15 sec', '30 sec', '60 sec'] }
      ]
    },
    isSystemTemplate: true
  },
  {
    name: 'Testimonial Post',
    description: 'Share customer success story',
    type: 'social_post',
    platform: ['instagram', 'facebook', 'linkedin'],
    structure: {
      sections: [
        { id: 'intro', name: 'Introduction', type: 'text', placeholder: 'Set up the story', required: true, maxLength: 100, aiGenerate: true },
        { id: 'quote', name: 'Customer Quote', type: 'text', placeholder: '"Direct quote from customer"', required: true, maxLength: 300 },
        { id: 'result', name: 'Results', type: 'text', placeholder: 'Specific results achieved', required: true, maxLength: 150, aiGenerate: true },
        { id: 'cta', name: 'Call to Action', type: 'cta', placeholder: 'Get similar results', required: true, maxLength: 100, aiGenerate: true }
      ],
      variables: [
        { key: 'customer_name', name: 'Customer Name', type: 'text' },
        { key: 'customer_business', name: 'Customer Business', type: 'text' }
      ]
    },
    isSystemTemplate: true
  }
];

class ContentScheduler {
  private scheduledContent: Map<string, ScheduledContent> = new Map();
  private templates: Map<string, ContentTemplate> = new Map();
  private publishQueue: QueueItem[] = [];
  private isProcessing = false;

  constructor() {
    // Initialize system templates
    this.initSystemTemplates();
    // Start queue processor
    this.startQueueProcessor();
  }

  private initSystemTemplates(): void {
    SYSTEM_TEMPLATES.forEach((template, index) => {
      const fullTemplate: ContentTemplate = {
        ...template,
        id: `sys_template_${index}`,
        locationId: 'system',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.templates.set(fullTemplate.id, fullTemplate);
    });
  }

  // ============ TEMPLATES ============

  /**
   * Get all templates (system + user's)
   */
  getTemplates(locationId: string): ContentTemplate[] {
    const templates: ContentTemplate[] = [];

    this.templates.forEach(template => {
      if (template.locationId === 'system' || template.locationId === locationId) {
        templates.push(template);
      }
    });

    return templates;
  }

  /**
   * Get single template
   */
  getTemplate(templateId: string): ContentTemplate | null {
    return this.templates.get(templateId) || null;
  }

  /**
   * Create custom template
   */
  createTemplate(locationId: string, template: Omit<ContentTemplate, 'id' | 'locationId' | 'isSystemTemplate' | 'createdAt' | 'updatedAt'>): ContentTemplate {
    const newTemplate: ContentTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      locationId,
      isSystemTemplate: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  /**
   * Update template
   */
  updateTemplate(templateId: string, updates: Partial<ContentTemplate>): ContentTemplate | null {
    const template = this.templates.get(templateId);
    if (!template || template.isSystemTemplate) return null;

    const updated = {
      ...template,
      ...updates,
      id: template.id,
      locationId: template.locationId,
      isSystemTemplate: template.isSystemTemplate,
      updatedAt: new Date().toISOString()
    };

    this.templates.set(templateId, updated);
    return updated;
  }

  /**
   * Delete template
   */
  deleteTemplate(templateId: string): boolean {
    const template = this.templates.get(templateId);
    if (!template || template.isSystemTemplate) return false;
    return this.templates.delete(templateId);
  }

  // ============ SCHEDULED CONTENT ============

  /**
   * Create scheduled content
   */
  createScheduledContent(content: Omit<ScheduledContent, 'id' | 'status' | 'approvalHistory' | 'publishHistory' | 'createdAt' | 'updatedAt'>): ScheduledContent {
    const newContent: ScheduledContent = {
      ...content,
      id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: content.workflow.requiresApproval ? 'pending_approval' : 'scheduled',
      approvalHistory: content.workflow.requiresApproval ? [{
        action: 'submitted',
        by: content.createdBy,
        at: new Date().toISOString()
      }] : [],
      publishHistory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.scheduledContent.set(newContent.id, newContent);

    // If requires approval, send notification
    if (newContent.workflow.requiresApproval && newContent.workflow.notifyViaTelegram) {
      this.sendApprovalNotification(newContent);
    }

    // If auto-post, add to queue
    if (!newContent.workflow.requiresApproval) {
      this.addToQueue(newContent);
    }

    return newContent;
  }

  /**
   * Get scheduled content for location
   */
  getScheduledContent(locationId: string, filters?: {
    status?: ContentStatus[];
    platforms?: PublishPlatform[];
    startDate?: string;
    endDate?: string;
  }): ScheduledContent[] {
    const content: ScheduledContent[] = [];

    this.scheduledContent.forEach(item => {
      if (item.locationId !== locationId) return;

      if (filters?.status && !filters.status.includes(item.status)) return;
      if (filters?.platforms && !item.platforms.some(p => filters.platforms?.includes(p))) return;
      if (filters?.startDate && item.schedule.startDate < filters.startDate) return;
      if (filters?.endDate && item.schedule.startDate > filters.endDate) return;

      content.push(item);
    });

    return content.sort((a, b) =>
      new Date(a.schedule.startDate).getTime() - new Date(b.schedule.startDate).getTime()
    );
  }

  /**
   * Get single content item
   */
  getContent(contentId: string): ScheduledContent | null {
    return this.scheduledContent.get(contentId) || null;
  }

  /**
   * Update content
   */
  updateContent(contentId: string, updates: Partial<ScheduledContent>): ScheduledContent | null {
    const content = this.scheduledContent.get(contentId);
    if (!content) return null;

    // Don't allow updating published content
    if (content.status === 'published') return null;

    const updated = {
      ...content,
      ...updates,
      id: content.id,
      locationId: content.locationId,
      updatedAt: new Date().toISOString()
    };

    this.scheduledContent.set(contentId, updated);
    return updated;
  }

  /**
   * Delete content
   */
  deleteContent(contentId: string): boolean {
    const content = this.scheduledContent.get(contentId);
    if (!content || content.status === 'published') return false;

    // Remove from queue
    this.publishQueue = this.publishQueue.filter(item => item.contentId !== contentId);

    return this.scheduledContent.delete(contentId);
  }

  // ============ APPROVAL WORKFLOW ============

  /**
   * Approve content
   */
  approveContent(contentId: string, approvedBy: string, comment?: string): ScheduledContent | null {
    const content = this.scheduledContent.get(contentId);
    if (!content || content.status !== 'pending_approval') return null;

    content.status = 'scheduled';
    content.approvalHistory.push({
      action: 'approved',
      by: approvedBy,
      at: new Date().toISOString(),
      comment
    });
    content.updatedAt = new Date().toISOString();

    this.scheduledContent.set(contentId, content);

    // Add to publishing queue
    this.addToQueue(content);

    return content;
  }

  /**
   * Reject content
   */
  rejectContent(contentId: string, rejectedBy: string, reason: string): ScheduledContent | null {
    const content = this.scheduledContent.get(contentId);
    if (!content || content.status !== 'pending_approval') return null;

    content.status = 'rejected';
    content.approvalHistory.push({
      action: 'rejected',
      by: rejectedBy,
      at: new Date().toISOString(),
      comment: reason
    });
    content.updatedAt = new Date().toISOString();

    this.scheduledContent.set(contentId, content);

    // Notify creator
    if (content.workflow.notifyViaTelegram) {
      this.sendRejectionNotification(content, reason);
    }

    return content;
  }

  /**
   * Request revision
   */
  requestRevision(contentId: string, requestedBy: string, feedback: string): ScheduledContent | null {
    const content = this.scheduledContent.get(contentId);
    if (!content || content.status !== 'pending_approval') return null;

    content.status = 'draft';
    content.approvalHistory.push({
      action: 'revision_requested',
      by: requestedBy,
      at: new Date().toISOString(),
      comment: feedback
    });
    content.updatedAt = new Date().toISOString();

    this.scheduledContent.set(contentId, content);

    return content;
  }

  /**
   * Resubmit for approval
   */
  resubmitForApproval(contentId: string, submittedBy: string): ScheduledContent | null {
    const content = this.scheduledContent.get(contentId);
    if (!content || !['draft', 'rejected'].includes(content.status)) return null;

    content.status = 'pending_approval';
    content.approvalHistory.push({
      action: 'submitted',
      by: submittedBy,
      at: new Date().toISOString()
    });
    content.updatedAt = new Date().toISOString();

    this.scheduledContent.set(contentId, content);

    // Send approval notification
    if (content.workflow.notifyViaTelegram) {
      this.sendApprovalNotification(content);
    }

    return content;
  }

  // ============ NOTIFICATIONS ============

  /**
   * Send approval request notification via Telegram
   */
  private async sendApprovalNotification(content: ScheduledContent): Promise<void> {
    if (!content.workflow.telegramChatId) return;

    const message = `📝 *Content Awaiting Approval*

*Platforms:* ${content.platforms.join(', ')}
*Scheduled:* ${content.schedule.startDate} at ${content.schedule.time}

*Content Preview:*
${content.content.text?.substring(0, 200)}${(content.content.text?.length || 0) > 200 ? '...' : ''}

Reply with:
• /approve ${content.id} - Approve and schedule
• /reject ${content.id} [reason] - Reject with feedback
• /revision ${content.id} [feedback] - Request changes`;

    // This would use the telegram service to send
    console.log('Would send Telegram notification:', message);
  }

  /**
   * Send rejection notification
   */
  private async sendRejectionNotification(content: ScheduledContent, reason: string): Promise<void> {
    if (!content.workflow.telegramChatId) return;

    const message = `❌ *Content Rejected*

*Reason:* ${reason}

Content ID: ${content.id}

Please review and resubmit.`;

    console.log('Would send rejection notification:', message);
  }

  // ============ PUBLISHING QUEUE ============

  /**
   * Add content to publishing queue
   */
  private addToQueue(content: ScheduledContent): void {
    const scheduledTime = this.getNextPublishTime(content);

    this.publishQueue.push({
      contentId: content.id,
      scheduledTime,
      platforms: content.platforms
    });

    // Sort queue by time
    this.publishQueue.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
  }

  /**
   * Calculate next publish time based on schedule
   */
  private getNextPublishTime(content: ScheduledContent): Date {
    const [hours, minutes] = content.schedule.time.split(':').map(Number);
    const startDate = new Date(content.schedule.startDate);
    startDate.setHours(hours, minutes, 0, 0);

    const now = new Date();

    // If schedule is in the future, use it
    if (startDate > now) return startDate;

    // For recurring schedules, calculate next occurrence
    switch (content.schedule.type) {
      case 'daily': {
        const next = new Date(now);
        next.setHours(hours, minutes, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
        return next;
      }
      case 'weekly': {
        const daysOfWeek = content.schedule.daysOfWeek || [1]; // default Monday
        const next = new Date(now);
        next.setHours(hours, minutes, 0, 0);

        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(next);
          checkDate.setDate(checkDate.getDate() + i);
          if (daysOfWeek.includes(checkDate.getDay()) && checkDate > now) {
            return checkDate;
          }
        }
        return next;
      }
      case 'monthly': {
        const dayOfMonth = content.schedule.dayOfMonth || 1;
        const next = new Date(now);
        next.setDate(dayOfMonth);
        next.setHours(hours, minutes, 0, 0);
        if (next <= now) next.setMonth(next.getMonth() + 1);
        return next;
      }
      default:
        return startDate;
    }
  }

  /**
   * Start the queue processor (runs every minute)
   */
  private startQueueProcessor(): void {
    setInterval(() => this.processQueue(), 60000);
  }

  /**
   * Process the publishing queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const now = new Date();
    const toPublish = this.publishQueue.filter(item => item.scheduledTime <= now);

    for (const item of toPublish) {
      try {
        await this.publishContent(item.contentId);
      } catch (error) {
        console.error(`Failed to publish ${item.contentId}:`, error);
      }
    }

    // Remove published items from queue
    this.publishQueue = this.publishQueue.filter(item => item.scheduledTime > now);

    this.isProcessing = false;
  }

  /**
   * Publish content to platforms
   */
  async publishContent(contentId: string): Promise<ScheduledContent | null> {
    const content = this.scheduledContent.get(contentId);
    if (!content || content.status !== 'scheduled') return null;

    content.status = 'publishing';
    this.scheduledContent.set(contentId, content);

    const results: PublishResult[] = [];

    for (const platform of content.platforms) {
      try {
        const result = await this.publishToPlatform(platform, content);
        results.push(result);
      } catch (error: any) {
        results.push({
          platform,
          status: 'failed',
          error: error.message
        });
      }
    }

    content.publishHistory.push(...results);
    content.status = results.every(r => r.status === 'success') ? 'published' : 'failed';
    content.updatedAt = new Date().toISOString();

    this.scheduledContent.set(contentId, content);

    // If recurring, schedule next occurrence
    if (content.schedule.type !== 'once' && content.status === 'published') {
      const endDate = content.schedule.endDate ? new Date(content.schedule.endDate) : null;
      const nextTime = this.getNextPublishTime(content);

      if (!endDate || nextTime <= endDate) {
        content.status = 'scheduled';
        this.addToQueue(content);
      }
    }

    return content;
  }

  /**
   * Publish to specific platform (placeholder - integrate with actual APIs)
   */
  private async publishToPlatform(platform: PublishPlatform, content: ScheduledContent): Promise<PublishResult> {
    // This would integrate with actual platform APIs
    // For now, simulate publishing

    console.log(`Publishing to ${platform}:`, content.content.text?.substring(0, 100));

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      platform,
      status: 'success',
      publishedAt: new Date().toISOString(),
      postId: `${platform}_${Date.now()}`
    };
  }

  // ============ CALENDAR VIEW ============

  /**
   * Get calendar view of scheduled content
   */
  getCalendarView(locationId: string, month: number, year: number): {
    date: string;
    content: ScheduledContent[];
  }[] {
    const calendar: Map<string, ScheduledContent[]> = new Map();

    // Get all days in the month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      calendar.set(dateStr, []);
    }

    // Fill with scheduled content
    this.scheduledContent.forEach(content => {
      if (content.locationId !== locationId) return;

      const contentDate = content.schedule.startDate.split('T')[0];
      const [contentYear, contentMonth] = contentDate.split('-').map(Number);

      if (contentYear === year && contentMonth === month + 1) {
        const existing = calendar.get(contentDate) || [];
        existing.push(content);
        calendar.set(contentDate, existing);
      }
    });

    return Array.from(calendar.entries()).map(([date, content]) => ({
      date,
      content
    }));
  }

  /**
   * Get content pending approval
   */
  getPendingApprovals(locationId: string): ScheduledContent[] {
    const pending: ScheduledContent[] = [];

    this.scheduledContent.forEach(content => {
      if (content.locationId === locationId && content.status === 'pending_approval') {
        pending.push(content);
      }
    });

    return pending;
  }
}

export const contentScheduler = new ContentScheduler();
export default contentScheduler;
