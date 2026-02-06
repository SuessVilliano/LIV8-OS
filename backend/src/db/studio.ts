/**
 * Studio Database - Persistence for generated assets
 * Stores images, videos, websites, and emails with metadata
 */

import { sql } from '@vercel/postgres';

export interface StudioAsset {
    id: string;
    clientId: string;
    type: 'image' | 'video' | 'website' | 'email';
    name: string;
    content: string; // URL for images/videos, HTML for websites/emails
    thumbnail?: string;
    prompt?: string;
    metadata?: Record<string, any>;
    status: 'generating' | 'complete' | 'failed' | 'published';
    publishedUrl?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    htmlSnapshot?: string;
}

export interface WebsiteSession {
    id: string;
    clientId: string;
    assetId?: string;
    conversationHistory: ConversationMessage[];
    currentHtml: string;
    model: string;
    siteType: string;
    brandContext: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

export const studioDb = {
    /**
     * Initialize studio tables
     */
    async initTables(): Promise<void> {
        try {
            await sql`
                CREATE TABLE IF NOT EXISTS studio_assets (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    client_id TEXT NOT NULL,
                    type TEXT NOT NULL CHECK (type IN ('image', 'video', 'website', 'email')),
                    name TEXT NOT NULL,
                    content TEXT NOT NULL,
                    thumbnail TEXT,
                    prompt TEXT,
                    metadata JSONB DEFAULT '{}',
                    status TEXT DEFAULT 'complete',
                    published_url TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `;

            // Create index for faster queries
            await sql`
                CREATE INDEX IF NOT EXISTS idx_studio_assets_client_type
                ON studio_assets(client_id, type)
            `;

            // Create website sessions table for conversation history
            await sql`
                CREATE TABLE IF NOT EXISTS studio_website_sessions (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    client_id TEXT NOT NULL,
                    asset_id UUID REFERENCES studio_assets(id) ON DELETE SET NULL,
                    conversation_history JSONB DEFAULT '[]',
                    current_html TEXT,
                    model TEXT DEFAULT 'gpt-4o',
                    site_type TEXT,
                    brand_context JSONB DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `;

            await sql`
                CREATE INDEX IF NOT EXISTS idx_studio_sessions_client
                ON studio_website_sessions(client_id)
            `;

            console.log('[StudioDB] Tables initialized');
        } catch (error) {
            console.error('[StudioDB] Table init error:', error);
        }
    },

    /**
     * Save a generated asset
     */
    async saveAsset(asset: Omit<StudioAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudioAsset> {
        try {
            const result = await sql`
                INSERT INTO studio_assets (
                    client_id, type, name, content, thumbnail, prompt,
                    metadata, status, published_url
                )
                VALUES (
                    ${asset.clientId},
                    ${asset.type},
                    ${asset.name},
                    ${asset.content},
                    ${asset.thumbnail || null},
                    ${asset.prompt || null},
                    ${JSON.stringify(asset.metadata || {})},
                    ${asset.status || 'complete'},
                    ${asset.publishedUrl || null}
                )
                RETURNING *
            `;

            const row = result.rows[0];
            return {
                id: row.id,
                clientId: row.client_id,
                type: row.type,
                name: row.name,
                content: row.content,
                thumbnail: row.thumbnail,
                prompt: row.prompt,
                metadata: row.metadata,
                status: row.status,
                publishedUrl: row.published_url,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            console.error('[StudioDB] Save asset error:', error);
            // Return a mock asset if database fails
            return {
                id: `local_${Date.now()}`,
                clientId: asset.clientId,
                type: asset.type,
                name: asset.name,
                content: asset.content,
                thumbnail: asset.thumbnail,
                prompt: asset.prompt,
                metadata: asset.metadata,
                status: asset.status || 'complete',
                publishedUrl: asset.publishedUrl,
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }
    },

    /**
     * Get all assets for a client
     */
    async getAssets(clientId: string, type?: string): Promise<StudioAsset[]> {
        try {
            let result;

            if (type) {
                result = await sql`
                    SELECT * FROM studio_assets
                    WHERE client_id = ${clientId} AND type = ${type}
                    ORDER BY created_at DESC
                    LIMIT 100
                `;
            } else {
                result = await sql`
                    SELECT * FROM studio_assets
                    WHERE client_id = ${clientId}
                    ORDER BY created_at DESC
                    LIMIT 100
                `;
            }

            return result.rows.map(row => ({
                id: row.id,
                clientId: row.client_id,
                type: row.type,
                name: row.name,
                content: row.content,
                thumbnail: row.thumbnail,
                prompt: row.prompt,
                metadata: row.metadata,
                status: row.status,
                publishedUrl: row.published_url,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));
        } catch (error) {
            console.error('[StudioDB] Get assets error:', error);
            return [];
        }
    },

    /**
     * Get a single asset by ID
     */
    async getAsset(assetId: string): Promise<StudioAsset | null> {
        try {
            const result = await sql`
                SELECT * FROM studio_assets
                WHERE id = ${assetId}::uuid
            `;

            if (result.rows.length === 0) return null;

            const row = result.rows[0];
            return {
                id: row.id,
                clientId: row.client_id,
                type: row.type,
                name: row.name,
                content: row.content,
                thumbnail: row.thumbnail,
                prompt: row.prompt,
                metadata: row.metadata,
                status: row.status,
                publishedUrl: row.published_url,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            console.error('[StudioDB] Get asset error:', error);
            return null;
        }
    },

    /**
     * Update an asset
     */
    async updateAsset(assetId: string, updates: Partial<StudioAsset>): Promise<StudioAsset | null> {
        try {
            const result = await sql`
                UPDATE studio_assets
                SET
                    name = COALESCE(${updates.name || null}, name),
                    content = COALESCE(${updates.content || null}, content),
                    thumbnail = COALESCE(${updates.thumbnail || null}, thumbnail),
                    status = COALESCE(${updates.status || null}, status),
                    published_url = COALESCE(${updates.publishedUrl || null}, published_url),
                    metadata = COALESCE(${updates.metadata ? JSON.stringify(updates.metadata) : null}::jsonb, metadata),
                    updated_at = NOW()
                WHERE id = ${assetId}::uuid
                RETURNING *
            `;

            if (result.rows.length === 0) return null;

            const row = result.rows[0];
            return {
                id: row.id,
                clientId: row.client_id,
                type: row.type,
                name: row.name,
                content: row.content,
                thumbnail: row.thumbnail,
                prompt: row.prompt,
                metadata: row.metadata,
                status: row.status,
                publishedUrl: row.published_url,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            console.error('[StudioDB] Update asset error:', error);
            return null;
        }
    },

    /**
     * Delete an asset
     */
    async deleteAsset(assetId: string): Promise<boolean> {
        try {
            await sql`
                DELETE FROM studio_assets
                WHERE id = ${assetId}::uuid
            `;
            return true;
        } catch (error) {
            console.error('[StudioDB] Delete asset error:', error);
            return false;
        }
    },

    /**
     * Get assets count by type for a client
     */
    async getAssetCounts(clientId: string): Promise<Record<string, number>> {
        try {
            const result = await sql`
                SELECT type, COUNT(*) as count
                FROM studio_assets
                WHERE client_id = ${clientId}
                GROUP BY type
            `;

            const counts: Record<string, number> = {
                image: 0,
                video: 0,
                website: 0,
                email: 0
            };

            result.rows.forEach(row => {
                counts[row.type] = parseInt(row.count);
            });

            return counts;
        } catch (error) {
            console.error('[StudioDB] Get counts error:', error);
            return { image: 0, video: 0, website: 0, email: 0 };
        }
    },

    /**
     * Search assets by prompt or name
     */
    async searchAssets(clientId: string, query: string): Promise<StudioAsset[]> {
        try {
            const searchPattern = `%${query}%`;
            const result = await sql`
                SELECT * FROM studio_assets
                WHERE client_id = ${clientId}
                AND (
                    name ILIKE ${searchPattern}
                    OR prompt ILIKE ${searchPattern}
                )
                ORDER BY created_at DESC
                LIMIT 50
            `;

            return result.rows.map(row => ({
                id: row.id,
                clientId: row.client_id,
                type: row.type,
                name: row.name,
                content: row.content,
                thumbnail: row.thumbnail,
                prompt: row.prompt,
                metadata: row.metadata,
                status: row.status,
                publishedUrl: row.published_url,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));
        } catch (error) {
            console.error('[StudioDB] Search error:', error);
            return [];
        }
    },

    // ==================== Website Sessions ====================

    /**
     * Create a new website session
     */
    async createSession(session: Omit<WebsiteSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<WebsiteSession> {
        try {
            const result = await sql`
                INSERT INTO studio_website_sessions (
                    client_id, asset_id, conversation_history, current_html,
                    model, site_type, brand_context
                )
                VALUES (
                    ${session.clientId},
                    ${session.assetId || null},
                    ${JSON.stringify(session.conversationHistory || [])},
                    ${session.currentHtml || ''},
                    ${session.model || 'gpt-4o'},
                    ${session.siteType || 'landing'},
                    ${JSON.stringify(session.brandContext || {})}
                )
                RETURNING *
            `;

            const row = result.rows[0];
            return {
                id: row.id,
                clientId: row.client_id,
                assetId: row.asset_id,
                conversationHistory: row.conversation_history || [],
                currentHtml: row.current_html,
                model: row.model,
                siteType: row.site_type,
                brandContext: row.brand_context || {},
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            console.error('[StudioDB] Create session error:', error);
            // Return a local session if database fails
            return {
                id: `local_${Date.now()}`,
                clientId: session.clientId,
                assetId: session.assetId,
                conversationHistory: session.conversationHistory || [],
                currentHtml: session.currentHtml || '',
                model: session.model || 'gpt-4o',
                siteType: session.siteType || 'landing',
                brandContext: session.brandContext || {},
                createdAt: new Date(),
                updatedAt: new Date()
            };
        }
    },

    /**
     * Get a session by ID
     */
    async getSession(sessionId: string): Promise<WebsiteSession | null> {
        try {
            const result = await sql`
                SELECT * FROM studio_website_sessions
                WHERE id = ${sessionId}::uuid
            `;

            if (result.rows.length === 0) return null;

            const row = result.rows[0];
            return {
                id: row.id,
                clientId: row.client_id,
                assetId: row.asset_id,
                conversationHistory: row.conversation_history || [],
                currentHtml: row.current_html,
                model: row.model,
                siteType: row.site_type,
                brandContext: row.brand_context || {},
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            console.error('[StudioDB] Get session error:', error);
            return null;
        }
    },

    /**
     * Update a session
     */
    async updateSession(sessionId: string, updates: Partial<WebsiteSession>): Promise<WebsiteSession | null> {
        try {
            const result = await sql`
                UPDATE studio_website_sessions
                SET
                    conversation_history = COALESCE(${updates.conversationHistory ? JSON.stringify(updates.conversationHistory) : null}::jsonb, conversation_history),
                    current_html = COALESCE(${updates.currentHtml || null}, current_html),
                    asset_id = COALESCE(${updates.assetId || null}::uuid, asset_id),
                    updated_at = NOW()
                WHERE id = ${sessionId}::uuid
                RETURNING *
            `;

            if (result.rows.length === 0) return null;

            const row = result.rows[0];
            return {
                id: row.id,
                clientId: row.client_id,
                assetId: row.asset_id,
                conversationHistory: row.conversation_history || [],
                currentHtml: row.current_html,
                model: row.model,
                siteType: row.site_type,
                brandContext: row.brand_context || {},
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            console.error('[StudioDB] Update session error:', error);
            return null;
        }
    },

    /**
     * Get published site by subdomain
     */
    async getPublishedSite(subdomain: string): Promise<StudioAsset | null> {
        try {
            const result = await sql`
                SELECT * FROM studio_assets
                WHERE status = 'published'
                AND metadata->>'subdomain' = ${subdomain}
                ORDER BY updated_at DESC
                LIMIT 1
            `;

            if (result.rows.length === 0) return null;

            const row = result.rows[0];
            return {
                id: row.id,
                clientId: row.client_id,
                type: row.type,
                name: row.name,
                content: row.content,
                thumbnail: row.thumbnail,
                prompt: row.prompt,
                metadata: row.metadata,
                status: row.status,
                publishedUrl: row.published_url,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            };
        } catch (error) {
            console.error('[StudioDB] Get published site error:', error);
            return null;
        }
    }
};

// Initialize tables
studioDb.initTables();
