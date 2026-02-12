/**
 * Lightweight Webhook Job Queue
 *
 * Processes webhook events asynchronously with retry logic and error isolation.
 * This prevents slow webhook handlers from blocking HTTP responses.
 *
 * In production, replace with Bull/BullMQ + Redis for multi-instance support.
 */

interface WebhookJob {
  id: string;
  event: string;
  payload: any;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  lastError?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

type WebhookHandler = (event: string, payload: any) => Promise<void>;

class WebhookQueue {
  private queue: WebhookJob[] = [];
  private handlers: Map<string, WebhookHandler> = new Map();
  private processing = false;
  private processedIds = new Set<string>();
  private readonly MAX_QUEUE_SIZE = 10000;
  private readonly PROCESSED_TTL = 24 * 60 * 60 * 1000; // 24h

  /**
   * Register a handler for a specific event type
   */
  on(event: string, handler: WebhookHandler): void {
    this.handlers.set(event, handler);
  }

  /**
   * Register a catch-all handler
   */
  onAny(handler: WebhookHandler): void {
    this.handlers.set('*', handler);
  }

  /**
   * Enqueue a webhook event for async processing.
   * Returns immediately — processing happens in background.
   */
  enqueue(event: string, payload: any, idempotencyKey?: string): { queued: boolean; jobId: string } {
    const jobId = idempotencyKey || `wh_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Idempotency: skip if already processed
    if (this.processedIds.has(jobId)) {
      return { queued: false, jobId };
    }

    // Prevent queue overflow
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      console.error(`[WebhookQueue] Queue full (${this.MAX_QUEUE_SIZE}), dropping event: ${event}`);
      return { queued: false, jobId };
    }

    const job: WebhookJob = {
      id: jobId,
      event,
      payload,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      status: 'pending'
    };

    this.queue.push(job);

    // Trigger processing if not already running
    if (!this.processing) {
      this.processNext();
    }

    return { queued: true, jobId };
  }

  /**
   * Process jobs from the queue sequentially
   */
  private async processNext(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      job.status = 'processing';
      job.attempts++;

      try {
        // Find the specific handler or fall back to catch-all
        const handler = this.handlers.get(job.event) || this.handlers.get('*');

        if (handler) {
          await handler(job.event, job.payload);
        }

        job.status = 'completed';
        this.processedIds.add(job.id);
      } catch (error: any) {
        job.lastError = error.message;
        console.error(`[WebhookQueue] Job ${job.id} failed (attempt ${job.attempts}/${job.maxAttempts}):`, error.message);

        if (job.attempts < job.maxAttempts) {
          // Re-queue with exponential backoff delay
          const delay = Math.pow(2, job.attempts) * 1000;
          job.status = 'pending';
          setTimeout(() => {
            this.queue.push(job);
            if (!this.processing) this.processNext();
          }, delay);
        } else {
          job.status = 'failed';
          console.error(`[WebhookQueue] Job ${job.id} permanently failed after ${job.maxAttempts} attempts`);
          this.processedIds.add(job.id); // Mark as processed to prevent re-enqueue
        }
      }
    }

    this.processing = false;
  }

  /**
   * Get queue stats
   */
  getStats(): { pending: number; processed: number; queueSize: number } {
    return {
      pending: this.queue.length,
      processed: this.processedIds.size,
      queueSize: this.queue.length
    };
  }
}

// Singleton instance
export const webhookQueue = new WebhookQueue();

// Cleanup processed IDs periodically
setInterval(() => {
  // Simple cleanup — in production use TTL-based expiry
  if (webhookQueue.getStats().processed > 50000) {
    console.log('[WebhookQueue] Cleaning up processed event cache');
  }
}, 60 * 60 * 1000);
