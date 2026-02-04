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
    }
};

// Initialize tables
studioDb.initTables();
