import { sql } from '@vercel/postgres';

/**
 * Agent session status types
 */
export type AgentSessionStatus =
    | 'active'
    | 'awaiting_input'
    | 'awaiting_approval'
    | 'completed'
    | 'failed'
    | 'expired';

/**
 * Agent session record
 */
export interface AgentSession {
    id: string;
    thread_id: string;
    agent_type: string;
    location_id: string;
    user_id: string | null;
    agency_id: string | null;
    current_node: string | null;
    state_data: Record<string, any>;
    status: AgentSessionStatus;
    checkpoint_data: Record<string, any> | null;
    metadata: Record<string, any>;
    created_at: Date;
    updated_at: Date;
    expires_at: Date;
}

/**
 * Agent event record
 */
export interface AgentEvent {
    id: string;
    session_id: string;
    event_type: string;
    node_name: string | null;
    event_data: Record<string, any> | null;
    timestamp: Date;
}

/**
 * Agent Sessions Database Operations
 */
export const agentSessions = {
    /**
     * Initialize agent session tables
     */
    async initTables(): Promise<void> {
        await sql`
            CREATE TABLE IF NOT EXISTS agent_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                thread_id TEXT UNIQUE NOT NULL,
                agent_type TEXT NOT NULL,
                location_id TEXT NOT NULL,
                user_id UUID,
                agency_id UUID,
                current_node TEXT,
                state_data JSONB NOT NULL DEFAULT '{}',
                status TEXT CHECK (status IN ('active', 'awaiting_input', 'awaiting_approval', 'completed', 'failed', 'expired')) DEFAULT 'active',
                checkpoint_data JSONB,
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
            )
        `;

        await sql`
            CREATE INDEX IF NOT EXISTS idx_agent_sessions_thread ON agent_sessions(thread_id)
        `;

        await sql`
            CREATE INDEX IF NOT EXISTS idx_agent_sessions_location ON agent_sessions(location_id)
        `;

        await sql`
            CREATE INDEX IF NOT EXISTS idx_agent_sessions_status ON agent_sessions(status)
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS agent_events (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,
                event_type TEXT NOT NULL,
                node_name TEXT,
                event_data JSONB,
                timestamp TIMESTAMP DEFAULT NOW()
            )
        `;

        await sql`
            CREATE INDEX IF NOT EXISTS idx_agent_events_session ON agent_events(session_id)
        `;
    },

    /**
     * Create a new agent session
     */
    async create(params: {
        threadId: string;
        agentType: string;
        locationId: string;
        userId?: string;
        agencyId?: string;
        status?: AgentSessionStatus;
        metadata?: Record<string, any>;
    }): Promise<AgentSession> {
        const result = await sql`
            INSERT INTO agent_sessions (
                thread_id, agent_type, location_id, user_id, agency_id, status, metadata
            )
            VALUES (
                ${params.threadId},
                ${params.agentType},
                ${params.locationId},
                ${params.userId || null},
                ${params.agencyId || null},
                ${params.status || 'active'},
                ${JSON.stringify(params.metadata || {})}
            )
            RETURNING *
        `;
        return result.rows[0] as AgentSession;
    },

    /**
     * Get session by thread ID
     */
    async getByThreadId(threadId: string): Promise<AgentSession | null> {
        const result = await sql`
            SELECT * FROM agent_sessions WHERE thread_id = ${threadId}
        `;
        return result.rows[0] as AgentSession || null;
    },

    /**
     * Get session by ID
     */
    async getById(id: string): Promise<AgentSession | null> {
        const result = await sql`
            SELECT * FROM agent_sessions WHERE id = ${id}
        `;
        return result.rows[0] as AgentSession || null;
    },

    /**
     * Update session state data
     */
    async updateState(threadId: string, stateData: Record<string, any>): Promise<void> {
        await sql`
            UPDATE agent_sessions
            SET
                state_data = ${JSON.stringify(stateData)},
                updated_at = NOW()
            WHERE thread_id = ${threadId}
        `;
    },

    /**
     * Update session status and current node
     */
    async updateStatus(
        threadId: string,
        status: AgentSessionStatus,
        currentNode?: string
    ): Promise<void> {
        await sql`
            UPDATE agent_sessions
            SET
                status = ${status},
                current_node = ${currentNode || null},
                updated_at = NOW()
            WHERE thread_id = ${threadId}
        `;
    },

    /**
     * Save checkpoint data
     */
    async saveCheckpoint(
        threadId: string,
        checkpointData: Record<string, any>,
        currentNode?: string
    ): Promise<void> {
        await sql`
            UPDATE agent_sessions
            SET
                checkpoint_data = ${JSON.stringify(checkpointData)},
                current_node = ${currentNode || null},
                updated_at = NOW()
            WHERE thread_id = ${threadId}
        `;
    },

    /**
     * Get checkpoint data
     */
    async getCheckpoint(threadId: string): Promise<Record<string, any> | null> {
        const result = await sql`
            SELECT checkpoint_data, current_node FROM agent_sessions
            WHERE thread_id = ${threadId}
        `;
        if (result.rows.length === 0) return null;
        return result.rows[0].checkpoint_data;
    },

    /**
     * List sessions by agency
     */
    async listByAgency(agencyId: string, limit: number = 50): Promise<AgentSession[]> {
        const result = await sql`
            SELECT * FROM agent_sessions
            WHERE agency_id = ${agencyId}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
        return result.rows as AgentSession[];
    },

    /**
     * List sessions by location
     */
    async listByLocation(locationId: string, limit: number = 50): Promise<AgentSession[]> {
        const result = await sql`
            SELECT * FROM agent_sessions
            WHERE location_id = ${locationId}
            ORDER BY created_at DESC
            LIMIT ${limit}
        `;
        return result.rows as AgentSession[];
    },

    /**
     * List active sessions
     */
    async listActive(agencyId?: string): Promise<AgentSession[]> {
        if (agencyId) {
            const result = await sql`
                SELECT * FROM agent_sessions
                WHERE agency_id = ${agencyId}
                AND status IN ('active', 'awaiting_input', 'awaiting_approval')
                AND expires_at > NOW()
                ORDER BY updated_at DESC
            `;
            return result.rows as AgentSession[];
        }

        const result = await sql`
            SELECT * FROM agent_sessions
            WHERE status IN ('active', 'awaiting_input', 'awaiting_approval')
            AND expires_at > NOW()
            ORDER BY updated_at DESC
        `;
        return result.rows as AgentSession[];
    },

    /**
     * Mark session as completed
     */
    async complete(threadId: string): Promise<void> {
        await sql`
            UPDATE agent_sessions
            SET status = 'completed', updated_at = NOW()
            WHERE thread_id = ${threadId}
        `;
    },

    /**
     * Mark session as failed
     */
    async fail(threadId: string, error?: string): Promise<void> {
        await sql`
            UPDATE agent_sessions
            SET
                status = 'failed',
                updated_at = NOW(),
                metadata = jsonb_set(COALESCE(metadata, '{}'), '{lastError}', ${JSON.stringify(error || 'Unknown error')})
            WHERE thread_id = ${threadId}
        `;
    },

    /**
     * Delete expired sessions
     */
    async cleanupExpired(): Promise<number> {
        const result = await sql`
            DELETE FROM agent_sessions
            WHERE expires_at < NOW()
            RETURNING id
        `;
        return result.rows.length;
    },

    /**
     * Log an agent event
     */
    async logEvent(params: {
        sessionId: string;
        eventType: string;
        nodeName?: string;
        eventData?: Record<string, any>;
    }): Promise<AgentEvent> {
        const result = await sql`
            INSERT INTO agent_events (session_id, event_type, node_name, event_data)
            VALUES (
                ${params.sessionId},
                ${params.eventType},
                ${params.nodeName || null},
                ${JSON.stringify(params.eventData || {})}
            )
            RETURNING *
        `;
        return result.rows[0] as AgentEvent;
    },

    /**
     * Get events for a session
     */
    async getEvents(sessionId: string, limit: number = 100): Promise<AgentEvent[]> {
        const result = await sql`
            SELECT * FROM agent_events
            WHERE session_id = ${sessionId}
            ORDER BY timestamp DESC
            LIMIT ${limit}
        `;
        return result.rows as AgentEvent[];
    }
};
