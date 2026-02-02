/**
 * Report Generation Service
 * Generates PDF reports and sends daily emails
 */

import { DailyReport, TicketAnalysis } from './freshdeskService.js';
import { ticketAnalyzerService } from './ticketAnalyzerService.js';

interface EmailConfig {
    to: string[];
    subject: string;
    body: string;
    attachments?: { filename: string; content: string; contentType: string }[];
}

class ReportService {
    private sendgridApiKey: string;
    private fromEmail: string;
    private reportRecipients: string[];

    constructor() {
        this.sendgridApiKey = process.env.SENDGRID_API_KEY || '';
        this.fromEmail = process.env.REPORT_FROM_EMAIL || 'reports@liv8ai.com';
        this.reportRecipients = (process.env.REPORT_RECIPIENTS || '').split(',').filter(Boolean);
    }

    /**
     * Generate HTML content for PDF
     */
    private generateReportHTML(report: DailyReport): string {
        const urgencyColors = {
            critical: '#DC2626',
            high: '#F59E0B',
            medium: '#3B82F6',
            low: '#10B981'
        };

        const sentimentEmoji = {
            frustrated: '😤',
            neutral: '😐',
            positive: '😊'
        };

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; line-height: 1.5; padding: 40px; }
        .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #6366F1; padding-bottom: 20px; }
        .header h1 { color: #6366F1; font-size: 28px; margin-bottom: 8px; }
        .header .date { color: #6b7280; font-size: 16px; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
        .summary-card { background: #f9fafb; border-radius: 12px; padding: 20px; text-align: center; }
        .summary-card .number { font-size: 36px; font-weight: bold; color: #6366F1; }
        .summary-card .label { color: #6b7280; font-size: 14px; margin-top: 4px; }
        .summary-card.alert .number { color: #DC2626; }
        .section { margin-bottom: 40px; }
        .section-title { font-size: 20px; font-weight: 600; color: #374151; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; }
        .ticket-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
        .ticket-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .ticket-id { font-weight: 600; color: #6366F1; }
        .ticket-urgency { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; color: white; }
        .ticket-subject { font-weight: 500; margin-bottom: 8px; }
        .ticket-summary { color: #6b7280; font-size: 14px; margin-bottom: 12px; }
        .ticket-meta { display: flex; gap: 16px; font-size: 12px; color: #9ca3af; }
        .suggestion-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px; margin-top: 12px; }
        .suggestion-label { font-size: 12px; font-weight: 600; color: #166534; margin-bottom: 4px; }
        .suggestion-text { font-size: 13px; color: #166534; white-space: pre-wrap; }
        .chart-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .chart-box { background: #f9fafb; border-radius: 12px; padding: 20px; }
        .chart-title { font-weight: 600; margin-bottom: 12px; }
        .bar-chart { display: flex; flex-direction: column; gap: 8px; }
        .bar-item { display: flex; align-items: center; gap: 12px; }
        .bar-label { width: 100px; font-size: 13px; }
        .bar-track { flex: 1; height: 24px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
        .bar-fill { height: 100%; border-radius: 4px; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; font-size: 12px; font-weight: 600; color: white; }
        .escalation-alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
        .escalation-reason { color: #991b1b; font-size: 13px; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px; }
        @media print { body { padding: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 LIV8 Daily Support Report</h1>
        <div class="date">${new Date(report.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>

    <div class="summary-grid">
        <div class="summary-card ${report.summary.overdueTickets > 0 ? 'alert' : ''}">
            <div class="number">${report.summary.totalOpen}</div>
            <div class="label">Open Tickets</div>
        </div>
        <div class="summary-card">
            <div class="number">${report.summary.newToday}</div>
            <div class="label">New Today</div>
        </div>
        <div class="summary-card ${report.summary.overdueTickets > 0 ? 'alert' : ''}">
            <div class="number">${report.summary.overdueTickets}</div>
            <div class="label">Overdue</div>
        </div>
    </div>

    <div class="chart-container">
        <div class="chart-box">
            <div class="chart-title">Tickets by Priority</div>
            <div class="bar-chart">
                ${this.renderPriorityBars(report.ticketsByPriority)}
            </div>
        </div>
        <div class="chart-box">
            <div class="chart-title">Tickets by Type</div>
            <div class="bar-chart">
                ${this.renderTypeBars(report.ticketsByType)}
            </div>
        </div>
    </div>

    ${report.needsAttention.length > 0 ? `
    <div class="section">
        <div class="section-title">⚠️ Needs Immediate Attention (${report.needsAttention.length})</div>
        ${report.needsAttention.map(ticket => this.renderTicketCard(ticket, urgencyColors, sentimentEmoji)).join('')}
    </div>
    ` : ''}

    <div class="section">
        <div class="section-title">💡 AI-Suggested Responses</div>
        ${report.aiSuggestions.slice(0, 5).map(suggestion => `
            <div class="ticket-card">
                <div class="ticket-header">
                    <span class="ticket-id">#${suggestion.ticketId}</span>
                </div>
                <div class="ticket-subject">${this.escapeHtml(suggestion.subject)}</div>
                <div class="suggestion-box">
                    <div class="suggestion-label">Suggested Response:</div>
                    <div class="suggestion-text">${this.escapeHtml(suggestion.suggestedResponse.substring(0, 400))}${suggestion.suggestedResponse.length > 400 ? '...' : ''}</div>
                </div>
            </div>
        `).join('')}
    </div>

    <div class="footer">
        Generated by LIV8 AI Support System • ${new Date().toLocaleTimeString()}
    </div>
</body>
</html>`;
    }

    private renderPriorityBars(priorities: DailyReport['ticketsByPriority']): string {
        const total = Math.max(priorities.urgent + priorities.high + priorities.medium + priorities.low, 1);
        const colors = { urgent: '#DC2626', high: '#F59E0B', medium: '#3B82F6', low: '#10B981' };

        return Object.entries(priorities).map(([key, value]) => `
            <div class="bar-item">
                <div class="bar-label">${key.charAt(0).toUpperCase() + key.slice(1)}</div>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${Math.max((value / total) * 100, 5)}%; background: ${colors[key as keyof typeof colors]}">
                        ${value}
                    </div>
                </div>
            </div>
        `).join('');
    }

    private renderTypeBars(types: Record<string, number>): string {
        const entries = Object.entries(types).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const total = Math.max(entries.reduce((sum, [, v]) => sum + v, 0), 1);
        const colors = ['#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'];

        return entries.map(([type, count], i) => `
            <div class="bar-item">
                <div class="bar-label">${type.substring(0, 12)}</div>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${Math.max((count / total) * 100, 5)}%; background: ${colors[i]}">
                        ${count}
                    </div>
                </div>
            </div>
        `).join('');
    }

    private renderTicketCard(ticket: TicketAnalysis, urgencyColors: Record<string, string>, sentimentEmoji: Record<string, string>): string {
        return `
            <div class="ticket-card">
                <div class="ticket-header">
                    <span class="ticket-id">#${ticket.ticketId}</span>
                    <span class="ticket-urgency" style="background: ${urgencyColors[ticket.urgency]}">${ticket.urgency.toUpperCase()}</span>
                </div>
                <div class="ticket-subject">${this.escapeHtml(ticket.subject)}</div>
                <div class="ticket-summary">${this.escapeHtml(ticket.summary)}</div>
                ${ticket.requiresEscalation ? `
                    <div class="escalation-alert">
                        <strong>⚡ Escalation Required:</strong>
                        <span class="escalation-reason">${ticket.escalationReason}</span>
                    </div>
                ` : ''}
                <div class="ticket-meta">
                    <span>Category: ${ticket.category}</span>
                    <span>Sentiment: ${sentimentEmoji[ticket.sentiment]} ${ticket.sentiment}</span>
                    <span>Est. Resolution: ${ticket.estimatedResolutionTime}</span>
                </div>
                ${ticket.similarResolved.length > 0 ? `
                    <div class="suggestion-box">
                        <div class="suggestion-label">Similar Resolved Ticket (#${ticket.similarResolved[0].ticketId} - ${ticket.similarResolved[0].similarity}% match):</div>
                        <div class="suggestion-text">${this.escapeHtml(ticket.similarResolved[0].resolution.substring(0, 200))}...</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/\n/g, '<br>');
    }

    /**
     * Convert HTML to PDF-ready format (base64)
     * Note: In production, use a proper PDF library like puppeteer or pdfkit
     */
    async generatePDFReport(report: DailyReport): Promise<{ html: string; filename: string }> {
        const html = this.generateReportHTML(report);
        const filename = `LIV8-Support-Report-${report.date}.html`;

        return { html, filename };
    }

    /**
     * Send email with SendGrid
     */
    async sendEmail(config: EmailConfig): Promise<boolean> {
        if (!this.sendgridApiKey) {
            console.error('SendGrid API key not configured');
            return false;
        }

        try {
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.sendgridApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    personalizations: [{
                        to: config.to.map(email => ({ email }))
                    }],
                    from: { email: this.fromEmail, name: 'LIV8 Support Reports' },
                    subject: config.subject,
                    content: [
                        { type: 'text/html', value: config.body }
                    ],
                    attachments: config.attachments?.map(a => ({
                        content: Buffer.from(a.content).toString('base64'),
                        filename: a.filename,
                        type: a.contentType,
                        disposition: 'attachment'
                    }))
                })
            });

            return response.ok;
        } catch (error) {
            console.error('Email send failed:', error);
            return false;
        }
    }

    /**
     * Generate and send daily report
     */
    async sendDailyReport(customRecipients?: string[]): Promise<{
        success: boolean;
        report: DailyReport;
        sentTo: string[];
    }> {
        const recipients = customRecipients || this.reportRecipients;

        if (recipients.length === 0) {
            throw new Error('No report recipients configured');
        }

        // Generate the report
        const report = await ticketAnalyzerService.generateDailyReport();

        // Generate PDF/HTML
        const { html, filename } = await this.generatePDFReport(report);

        // Create email body with summary
        const emailBody = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6366F1; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .stats { display: flex; justify-content: space-around; background: #f9fafb; padding: 20px; }
        .stat { text-align: center; }
        .stat-number { font-size: 32px; font-weight: bold; color: #6366F1; }
        .stat-label { font-size: 12px; color: #666; }
        .alert { background: #fef2f2; border-left: 4px solid #dc2626; padding: 12px; margin: 16px 0; }
        .cta { background: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Daily Support Report</h1>
            <p>${new Date(report.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>

        <div class="stats">
            <div class="stat">
                <div class="stat-number">${report.summary.totalOpen}</div>
                <div class="stat-label">Open Tickets</div>
            </div>
            <div class="stat">
                <div class="stat-number">${report.summary.newToday}</div>
                <div class="stat-label">New Today</div>
            </div>
            <div class="stat">
                <div class="stat-number" style="color: ${report.summary.overdueTickets > 0 ? '#dc2626' : '#6366F1'}">${report.summary.overdueTickets}</div>
                <div class="stat-label">Overdue</div>
            </div>
        </div>

        ${report.needsAttention.length > 0 ? `
        <div class="alert">
            <strong>⚠️ ${report.needsAttention.length} ticket(s) need immediate attention</strong>
            <ul>
                ${report.needsAttention.slice(0, 3).map(t => `<li>#${t.ticketId}: ${t.subject}</li>`).join('')}
            </ul>
        </div>
        ` : '<p style="color: #10b981; margin: 16px 0;">✅ No urgent tickets requiring immediate attention!</p>'}

        <p>The full report with AI-suggested responses is attached.</p>

        <a href="#" class="cta">View in Dashboard</a>

        <p style="color: #666; font-size: 12px; margin-top: 24px;">
            This report was generated automatically by the LIV8 AI Support System.
        </p>
    </div>
</body>
</html>`;

        // Send email
        const success = await this.sendEmail({
            to: recipients,
            subject: `[LIV8] Daily Support Report - ${report.date} (${report.summary.totalOpen} open, ${report.summary.overdueTickets} overdue)`,
            body: emailBody,
            attachments: [{
                filename,
                content: html,
                contentType: 'text/html'
            }]
        });

        return {
            success,
            report,
            sentTo: recipients
        };
    }

    /**
     * Set report recipients
     */
    setRecipients(emails: string[]) {
        this.reportRecipients = emails;
    }

    /**
     * Get current recipients
     */
    getRecipients(): string[] {
        return this.reportRecipients;
    }
}

export const reportService = new ReportService();
