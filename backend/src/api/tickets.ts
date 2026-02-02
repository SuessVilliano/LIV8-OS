/**
 * Ticket Management API Routes
 * Freshdesk integration with AI analysis and reporting
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { freshdeskService } from '../services/freshdeskService.js';
import { ticketAnalyzerService } from '../services/ticketAnalyzerService.js';
import { reportService } from '../services/reportService.js';

const router = Router();

// Store scheduled jobs (in production, use a proper job scheduler like node-cron or Bull)
let dailyReportScheduled = false;
let dailyReportTime = '08:00'; // Default 8 AM
let lastReportSent: Date | null = null;

/**
 * GET /api/tickets
 * Get all open tickets with optional filters
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
    try {
        const { status = 'open' } = req.query;

        let tickets;
        if (status === 'open') {
            tickets = await freshdeskService.getOpenTickets();
        } else {
            tickets = await freshdeskService.getTicketsByStatus(status as any);
        }

        res.json({ tickets, total: tickets.length });
    } catch (error: any) {
        console.error('Get tickets error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/tickets/stats
 * Get ticket statistics
 */
router.get('/stats', authenticate, async (req: Request, res: Response) => {
    try {
        const stats = await freshdeskService.getTicketStats();
        res.json(stats);
    } catch (error: any) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/tickets/analyze
 * Get AI analysis of all open tickets
 */
router.get('/analyze', authenticate, async (req: Request, res: Response) => {
    try {
        const analyses = await ticketAnalyzerService.analyzeOpenTickets();

        res.json({
            analyses,
            total: analyses.length,
            byUrgency: {
                critical: analyses.filter(a => a.urgency === 'critical').length,
                high: analyses.filter(a => a.urgency === 'high').length,
                medium: analyses.filter(a => a.urgency === 'medium').length,
                low: analyses.filter(a => a.urgency === 'low').length
            },
            needsEscalation: analyses.filter(a => a.requiresEscalation).length
        });
    } catch (error: any) {
        console.error('Analyze tickets error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/tickets/:id
 * Get single ticket with conversations
 */
router.get('/:id', authenticate, async (req: Request, res: Response) => {
    try {
        const ticketId = parseInt(req.params.id);
        const ticket = await freshdeskService.getTicketWithConversations(ticketId);
        res.json(ticket);
    } catch (error: any) {
        console.error('Get ticket error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/tickets/:id/analyze
 * Get AI analysis for a single ticket
 */
router.get('/:id/analyze', authenticate, async (req: Request, res: Response) => {
    try {
        const ticketId = parseInt(req.params.id);
        const ticket = await freshdeskService.getTicketWithConversations(ticketId);
        const analysis = await ticketAnalyzerService.analyzeTicket(ticket);

        res.json(analysis);
    } catch (error: any) {
        console.error('Analyze ticket error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/tickets/:id/reply
 * Send AI-generated or custom reply to ticket
 */
router.post('/:id/reply', authenticate, async (req: Request, res: Response) => {
    try {
        const ticketId = parseInt(req.params.id);
        const { body, useAiSuggestion, isPrivate = false } = req.body;

        let responseBody = body;

        if (useAiSuggestion) {
            // Get AI-generated response
            const ticket = await freshdeskService.getTicketWithConversations(ticketId);
            const analysis = await ticketAnalyzerService.analyzeTicket(ticket);
            responseBody = analysis.suggestedResponse;
        }

        if (!responseBody) {
            return res.status(400).json({ error: 'Response body required' });
        }

        const result = await freshdeskService.replyToTicket(ticketId, responseBody, isPrivate);

        res.json({
            success: true,
            message: 'Reply sent successfully',
            result
        });
    } catch (error: any) {
        console.error('Reply to ticket error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * PUT /api/tickets/:id/status
 * Update ticket status
 */
router.put('/:id/status', authenticate, async (req: Request, res: Response) => {
    try {
        const ticketId = parseInt(req.params.id);
        const { status } = req.body;

        const statusMap: Record<string, number> = {
            open: 2,
            pending: 3,
            resolved: 4,
            closed: 5
        };

        if (!statusMap[status]) {
            return res.status(400).json({ error: 'Invalid status. Use: open, pending, resolved, closed' });
        }

        const updated = await freshdeskService.updateTicketStatus(ticketId, statusMap[status]);

        res.json({ success: true, ticket: updated });
    } catch (error: any) {
        console.error('Update ticket status error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/tickets/search
 * Search tickets
 */
router.get('/search/:query', authenticate, async (req: Request, res: Response) => {
    try {
        const { query } = req.params;
        const tickets = await freshdeskService.searchTickets(query);
        res.json({ tickets, total: tickets.length });
    } catch (error: any) {
        console.error('Search tickets error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ REPORTS ============

/**
 * GET /api/tickets/report/daily
 * Get or generate daily report
 */
router.get('/report/daily', authenticate, async (req: Request, res: Response) => {
    try {
        const report = await ticketAnalyzerService.generateDailyReport();
        res.json(report);
    } catch (error: any) {
        console.error('Generate daily report error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/tickets/report/pdf
 * Get daily report as HTML/PDF
 */
router.get('/report/pdf', authenticate, async (req: Request, res: Response) => {
    try {
        const report = await ticketAnalyzerService.generateDailyReport();
        const { html, filename } = await reportService.generatePDFReport(report);

        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(html);
    } catch (error: any) {
        console.error('Generate PDF report error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/tickets/report/send
 * Manually trigger sending daily report
 */
router.post('/report/send', authenticate, async (req: Request, res: Response) => {
    try {
        const { recipients } = req.body;

        const result = await reportService.sendDailyReport(recipients);
        lastReportSent = new Date();

        res.json({
            success: result.success,
            sentTo: result.sentTo,
            summary: result.report.summary,
            lastSent: lastReportSent
        });
    } catch (error: any) {
        console.error('Send report error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/tickets/report/schedule
 * Get report schedule settings
 */
router.get('/report/schedule', authenticate, async (req: Request, res: Response) => {
    res.json({
        scheduled: dailyReportScheduled,
        time: dailyReportTime,
        recipients: reportService.getRecipients(),
        lastSent: lastReportSent
    });
});

/**
 * POST /api/tickets/report/schedule
 * Configure daily report schedule
 */
router.post('/report/schedule', authenticate, async (req: Request, res: Response) => {
    try {
        const { enabled, time, recipients } = req.body;

        if (typeof enabled === 'boolean') {
            dailyReportScheduled = enabled;
        }

        if (time && /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
            dailyReportTime = time;
        }

        if (Array.isArray(recipients)) {
            reportService.setRecipients(recipients);
        }

        res.json({
            success: true,
            scheduled: dailyReportScheduled,
            time: dailyReportTime,
            recipients: reportService.getRecipients()
        });
    } catch (error: any) {
        console.error('Update schedule error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============ BULK OPERATIONS ============

/**
 * POST /api/tickets/bulk/analyze
 * Analyze multiple tickets and get suggested responses
 */
router.post('/bulk/analyze', authenticate, async (req: Request, res: Response) => {
    try {
        const { ticketIds } = req.body;

        if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
            return res.status(400).json({ error: 'ticketIds array required' });
        }

        const analyses = await Promise.all(
            ticketIds.slice(0, 20).map(async (id: number) => {
                try {
                    const ticket = await freshdeskService.getTicketWithConversations(id);
                    return await ticketAnalyzerService.analyzeTicket(ticket);
                } catch (error) {
                    return { ticketId: id, error: 'Failed to analyze' };
                }
            })
        );

        res.json({ analyses });
    } catch (error: any) {
        console.error('Bulk analyze error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/tickets/bulk/reply
 * Send replies to multiple tickets
 */
router.post('/bulk/reply', authenticate, async (req: Request, res: Response) => {
    try {
        const { tickets } = req.body; // [{ ticketId, body, useAiSuggestion }]

        if (!Array.isArray(tickets) || tickets.length === 0) {
            return res.status(400).json({ error: 'tickets array required' });
        }

        const results = await Promise.all(
            tickets.slice(0, 10).map(async ({ ticketId, body, useAiSuggestion }) => {
                try {
                    let responseBody = body;

                    if (useAiSuggestion) {
                        const ticket = await freshdeskService.getTicketWithConversations(ticketId);
                        const analysis = await ticketAnalyzerService.analyzeTicket(ticket);
                        responseBody = analysis.suggestedResponse;
                    }

                    await freshdeskService.replyToTicket(ticketId, responseBody);
                    return { ticketId, success: true };
                } catch (error: any) {
                    return { ticketId, success: false, error: error.message };
                }
            })
        );

        const successful = results.filter(r => r.success).length;

        res.json({
            success: successful === results.length,
            total: results.length,
            successful,
            failed: results.length - successful,
            results
        });
    } catch (error: any) {
        console.error('Bulk reply error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
