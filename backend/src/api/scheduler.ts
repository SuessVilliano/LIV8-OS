/**
 * Content Scheduler API
 * Manage templates, scheduled content, and approval workflows
 */

import { Router, Request, Response } from 'express';
import { contentScheduler, ScheduledContent, ContentTemplate, PublishPlatform, ScheduleFrequency } from '../services/content-scheduler.js';

const router = Router();

// ============ TEMPLATES ============

/**
 * GET /api/scheduler/templates
 * Get all templates (system + user's)
 */
router.get('/templates', (req: Request, res: Response) => {
  const { locationId } = req.query;

  if (!locationId) {
    return res.status(400).json({ success: false, error: 'Missing locationId' });
  }

  const templates = contentScheduler.getTemplates(locationId as string);

  res.json({
    success: true,
    templates,
    systemTemplates: templates.filter(t => t.isSystemTemplate).length,
    customTemplates: templates.filter(t => !t.isSystemTemplate).length
  });
});

/**
 * GET /api/scheduler/templates/:templateId
 * Get single template
 */
router.get('/templates/:templateId', (req: Request, res: Response) => {
  const { templateId } = req.params;

  const template = contentScheduler.getTemplate(templateId);

  if (!template) {
    return res.status(404).json({ success: false, error: 'Template not found' });
  }

  res.json({
    success: true,
    template
  });
});

/**
 * POST /api/scheduler/templates
 * Create custom template
 */
router.post('/templates', (req: Request, res: Response) => {
  const { locationId, name, description, type, platform, structure, defaultValues } = req.body;

  if (!locationId || !name || !type || !platform || !structure) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: locationId, name, type, platform, structure'
    });
  }

  const template = contentScheduler.createTemplate(locationId, {
    name,
    description: description || '',
    type,
    platform,
    structure,
    defaultValues
  });

  res.json({
    success: true,
    template
  });
});

/**
 * PUT /api/scheduler/templates/:templateId
 * Update template
 */
router.put('/templates/:templateId', (req: Request, res: Response) => {
  const { templateId } = req.params;
  const updates = req.body;

  const template = contentScheduler.updateTemplate(templateId, updates);

  if (!template) {
    return res.status(404).json({
      success: false,
      error: 'Template not found or is a system template (cannot be edited)'
    });
  }

  res.json({
    success: true,
    template
  });
});

/**
 * DELETE /api/scheduler/templates/:templateId
 * Delete template
 */
router.delete('/templates/:templateId', (req: Request, res: Response) => {
  const { templateId } = req.params;

  const deleted = contentScheduler.deleteTemplate(templateId);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: 'Template not found or is a system template (cannot be deleted)'
    });
  }

  res.json({
    success: true,
    message: 'Template deleted'
  });
});

// ============ SCHEDULED CONTENT ============

/**
 * GET /api/scheduler/content
 * Get scheduled content for location
 */
router.get('/content', (req: Request, res: Response) => {
  const { locationId, status, platforms, startDate, endDate } = req.query;

  if (!locationId) {
    return res.status(400).json({ success: false, error: 'Missing locationId' });
  }

  const content = contentScheduler.getScheduledContent(locationId as string, {
    status: status ? (status as string).split(',') as any : undefined,
    platforms: platforms ? (platforms as string).split(',') as PublishPlatform[] : undefined,
    startDate: startDate as string,
    endDate: endDate as string
  });

  res.json({
    success: true,
    content,
    total: content.length
  });
});

/**
 * GET /api/scheduler/content/:contentId
 * Get single content item
 */
router.get('/content/:contentId', (req: Request, res: Response) => {
  const { contentId } = req.params;

  const content = contentScheduler.getContent(contentId);

  if (!content) {
    return res.status(404).json({ success: false, error: 'Content not found' });
  }

  res.json({
    success: true,
    content
  });
});

/**
 * POST /api/scheduler/content
 * Create scheduled content
 */
router.post('/content', (req: Request, res: Response) => {
  const {
    locationId,
    templateId,
    content,
    platforms,
    schedule,
    workflow,
    aiGenerated = false,
    aiProvider,
    createdBy
  } = req.body;

  if (!locationId || !content || !platforms || !schedule) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: locationId, content, platforms, schedule'
    });
  }

  // Validate schedule
  if (!schedule.type || !schedule.startDate || !schedule.time) {
    return res.status(400).json({
      success: false,
      error: 'Schedule must include: type, startDate, time'
    });
  }

  const scheduledContent = contentScheduler.createScheduledContent({
    locationId,
    templateId,
    content,
    platforms,
    schedule: {
      type: schedule.type as ScheduleFrequency,
      startDate: schedule.startDate,
      time: schedule.time,
      timezone: schedule.timezone || 'UTC',
      daysOfWeek: schedule.daysOfWeek,
      dayOfMonth: schedule.dayOfMonth,
      endDate: schedule.endDate
    },
    workflow: {
      requiresApproval: workflow?.requiresApproval ?? false,
      approvers: workflow?.approvers || ['owner'],
      notifyViaTelegram: workflow?.notifyViaTelegram ?? false,
      telegramChatId: workflow?.telegramChatId
    },
    aiGenerated,
    aiProvider,
    createdBy: createdBy || 'user'
  });

  res.json({
    success: true,
    content: scheduledContent,
    message: scheduledContent.workflow.requiresApproval
      ? 'Content created and pending approval'
      : 'Content scheduled successfully'
  });
});

/**
 * PUT /api/scheduler/content/:contentId
 * Update scheduled content
 */
router.put('/content/:contentId', (req: Request, res: Response) => {
  const { contentId } = req.params;
  const updates = req.body;

  const content = contentScheduler.updateContent(contentId, updates);

  if (!content) {
    return res.status(404).json({
      success: false,
      error: 'Content not found or already published'
    });
  }

  res.json({
    success: true,
    content
  });
});

/**
 * DELETE /api/scheduler/content/:contentId
 * Delete scheduled content
 */
router.delete('/content/:contentId', (req: Request, res: Response) => {
  const { contentId } = req.params;

  const deleted = contentScheduler.deleteContent(contentId);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: 'Content not found or already published'
    });
  }

  res.json({
    success: true,
    message: 'Content deleted'
  });
});

// ============ APPROVAL WORKFLOW ============

/**
 * GET /api/scheduler/pending
 * Get content pending approval
 */
router.get('/pending', (req: Request, res: Response) => {
  const { locationId } = req.query;

  if (!locationId) {
    return res.status(400).json({ success: false, error: 'Missing locationId' });
  }

  const pending = contentScheduler.getPendingApprovals(locationId as string);

  res.json({
    success: true,
    pending,
    count: pending.length
  });
});

/**
 * POST /api/scheduler/content/:contentId/approve
 * Approve content
 */
router.post('/content/:contentId/approve', (req: Request, res: Response) => {
  const { contentId } = req.params;
  const { approvedBy, comment } = req.body;

  if (!approvedBy) {
    return res.status(400).json({ success: false, error: 'Missing approvedBy' });
  }

  const content = contentScheduler.approveContent(contentId, approvedBy, comment);

  if (!content) {
    return res.status(404).json({
      success: false,
      error: 'Content not found or not pending approval'
    });
  }

  res.json({
    success: true,
    content,
    message: 'Content approved and scheduled'
  });
});

/**
 * POST /api/scheduler/content/:contentId/reject
 * Reject content
 */
router.post('/content/:contentId/reject', (req: Request, res: Response) => {
  const { contentId } = req.params;
  const { rejectedBy, reason } = req.body;

  if (!rejectedBy || !reason) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: rejectedBy, reason'
    });
  }

  const content = contentScheduler.rejectContent(contentId, rejectedBy, reason);

  if (!content) {
    return res.status(404).json({
      success: false,
      error: 'Content not found or not pending approval'
    });
  }

  res.json({
    success: true,
    content,
    message: 'Content rejected'
  });
});

/**
 * POST /api/scheduler/content/:contentId/revision
 * Request revision
 */
router.post('/content/:contentId/revision', (req: Request, res: Response) => {
  const { contentId } = req.params;
  const { requestedBy, feedback } = req.body;

  if (!requestedBy || !feedback) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: requestedBy, feedback'
    });
  }

  const content = contentScheduler.requestRevision(contentId, requestedBy, feedback);

  if (!content) {
    return res.status(404).json({
      success: false,
      error: 'Content not found or not pending approval'
    });
  }

  res.json({
    success: true,
    content,
    message: 'Revision requested'
  });
});

/**
 * POST /api/scheduler/content/:contentId/resubmit
 * Resubmit content for approval
 */
router.post('/content/:contentId/resubmit', (req: Request, res: Response) => {
  const { contentId } = req.params;
  const { submittedBy } = req.body;

  if (!submittedBy) {
    return res.status(400).json({ success: false, error: 'Missing submittedBy' });
  }

  const content = contentScheduler.resubmitForApproval(contentId, submittedBy);

  if (!content) {
    return res.status(404).json({
      success: false,
      error: 'Content not found or not in draft/rejected status'
    });
  }

  res.json({
    success: true,
    content,
    message: 'Content resubmitted for approval'
  });
});

/**
 * POST /api/scheduler/content/:contentId/publish
 * Manually publish content now
 */
router.post('/content/:contentId/publish', async (req: Request, res: Response) => {
  const { contentId } = req.params;

  try {
    const content = await contentScheduler.publishContent(contentId);

    if (!content) {
      return res.status(404).json({
        success: false,
        error: 'Content not found or not in scheduled status'
      });
    }

    res.json({
      success: true,
      content,
      message: content.status === 'published' ? 'Content published successfully' : 'Publishing failed'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Publishing failed'
    });
  }
});

// ============ CALENDAR VIEW ============

/**
 * GET /api/scheduler/calendar
 * Get calendar view of scheduled content
 */
router.get('/calendar', (req: Request, res: Response) => {
  const { locationId, month, year } = req.query;

  if (!locationId) {
    return res.status(400).json({ success: false, error: 'Missing locationId' });
  }

  const now = new Date();
  const targetMonth = month ? parseInt(month as string) - 1 : now.getMonth();
  const targetYear = year ? parseInt(year as string) : now.getFullYear();

  const calendar = contentScheduler.getCalendarView(
    locationId as string,
    targetMonth,
    targetYear
  );

  res.json({
    success: true,
    month: targetMonth + 1,
    year: targetYear,
    calendar
  });
});

// ============ QUICK SCHEDULE ============

/**
 * POST /api/scheduler/quick
 * Quick schedule content with minimal options
 */
router.post('/quick', (req: Request, res: Response) => {
  const {
    locationId,
    text,
    platforms,
    scheduleDate,
    scheduleTime,
    autoPost = true,
    createdBy
  } = req.body;

  if (!locationId || !text || !platforms || !scheduleDate || !scheduleTime) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: locationId, text, platforms, scheduleDate, scheduleTime'
    });
  }

  const content = contentScheduler.createScheduledContent({
    locationId,
    content: { text },
    platforms,
    schedule: {
      type: 'once',
      startDate: scheduleDate,
      time: scheduleTime,
      timezone: 'UTC'
    },
    workflow: {
      requiresApproval: !autoPost,
      approvers: ['owner'],
      notifyViaTelegram: !autoPost
    },
    aiGenerated: false,
    createdBy: createdBy || 'user'
  });

  res.json({
    success: true,
    content,
    message: autoPost ? 'Content scheduled' : 'Content pending approval'
  });
});

export default router;
