import { sql } from '@vercel/postgres';

/**
 * Knowledge Base Persistence Layer
 *
 * Replaces in-memory storage with PostgreSQL for:
 * - Knowledge entries (FAQs, docs, brand info)
 * - Brand assets (logos, documents, files)
 * - Voice settings (tone, personality)
 */

// ============ TYPE DEFINITIONS ============

export interface KnowledgeEntry {
    id: string;
    clientId: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    source?: string;
    sourceType?: 'manual' | 'import' | 'scrape' | 'api';
    confidence?: number;
    createdAt: string;
    updatedAt: string;
}

export interface BrandAsset {
    id: string;
    clientId: string;
    name: string;
    type: string;
    url: string;
    size: string;
    category: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface VoiceSettings {
    clientId: string;
    professional: number;
    empathetic: number;
    direct: number;
    friendly: number;
    customTraits?: Record<string, number>;
    updatedAt: string;
}

// ============ DATABASE OPERATIONS ============

export const knowledgeDb = {
    /**
     * Initialize knowledge tables
     */
    async initTables(): Promise<void> {
        await sql`
            CREATE TABLE IF NOT EXISTS knowledge_entries (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT DEFAULT 'general',
                tags JSONB DEFAULT '[]',
                source TEXT,
                source_type TEXT DEFAULT 'manual',
                confidence INTEGER DEFAULT 100,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;

        await sql`
            CREATE INDEX IF NOT EXISTS idx_knowledge_client ON knowledge_entries(client_id)
        `;

        await sql`
            CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_entries(category)
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS brand_assets (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                client_id TEXT NOT NULL,
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                url TEXT,
                size TEXT,
                category TEXT DEFAULT 'document',
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;

        await sql`
            CREATE INDEX IF NOT EXISTS idx_assets_client ON brand_assets(client_id)
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS voice_settings (
                client_id TEXT PRIMARY KEY,
                professional INTEGER DEFAULT 85,
                empathetic INTEGER DEFAULT 40,
                direct INTEGER DEFAULT 92,
                friendly INTEGER DEFAULT 15,
                custom_traits JSONB DEFAULT '{}',
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;
    },

    // ============ KNOWLEDGE ENTRIES ============

    /**
     * Get all knowledge entries for a client
     */
    async getKnowledge(clientId: string): Promise<KnowledgeEntry[]> {
        try {
            const result = await sql`
                SELECT * FROM knowledge_entries
                WHERE client_id = ${clientId}
                ORDER BY updated_at DESC
            `;
            return result.rows.map(this.mapRowToEntry);
        } catch (error: any) {
            // Table might not exist yet, return empty array
            if (error.message?.includes('does not exist')) {
                return [];
            }
            throw error;
        }
    },

    /**
     * Get knowledge by category
     */
    async getKnowledgeByCategory(clientId: string, category: string): Promise<KnowledgeEntry[]> {
        const result = await sql`
            SELECT * FROM knowledge_entries
            WHERE client_id = ${clientId} AND category = ${category}
            ORDER BY confidence DESC, updated_at DESC
        `;
        return result.rows.map(this.mapRowToEntry);
    },

    /**
     * Search knowledge entries
     */
    async searchKnowledge(clientId: string, query: string): Promise<KnowledgeEntry[]> {
        const searchPattern = `%${query}%`;
        const result = await sql`
            SELECT * FROM knowledge_entries
            WHERE client_id = ${clientId}
            AND (title ILIKE ${searchPattern} OR content ILIKE ${searchPattern})
            ORDER BY confidence DESC, updated_at DESC
            LIMIT 50
        `;
        return result.rows.map(this.mapRowToEntry);
    },

    /**
     * Add a knowledge entry
     */
    async addKnowledge(entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<KnowledgeEntry> {
        const result = await sql`
            INSERT INTO knowledge_entries (
                client_id, title, content, category, tags, source, source_type, confidence
            )
            VALUES (
                ${entry.clientId},
                ${entry.title},
                ${entry.content},
                ${entry.category || 'general'},
                ${JSON.stringify(entry.tags || [])},
                ${entry.source || null},
                ${entry.sourceType || 'manual'},
                ${entry.confidence || 100}
            )
            RETURNING *
        `;
        return this.mapRowToEntry(result.rows[0]);
    },

    /**
     * Update a knowledge entry
     */
    async updateKnowledge(id: string, clientId: string, updates: Partial<KnowledgeEntry>): Promise<KnowledgeEntry | null> {
        const result = await sql`
            UPDATE knowledge_entries
            SET
                title = COALESCE(${updates.title || null}, title),
                content = COALESCE(${updates.content || null}, content),
                category = COALESCE(${updates.category || null}, category),
                tags = COALESCE(${updates.tags ? JSON.stringify(updates.tags) : null}::jsonb, tags),
                source = COALESCE(${updates.source || null}, source),
                confidence = COALESCE(${updates.confidence || null}, confidence),
                updated_at = NOW()
            WHERE id = ${id}::uuid AND client_id = ${clientId}
            RETURNING *
        `;
        if (result.rows.length === 0) return null;
        return this.mapRowToEntry(result.rows[0]);
    },

    /**
     * Delete a knowledge entry
     */
    async deleteKnowledge(id: string, clientId: string): Promise<boolean> {
        const result = await sql`
            DELETE FROM knowledge_entries
            WHERE id = ${id}::uuid AND client_id = ${clientId}
            RETURNING id
        `;
        return result.rows.length > 0;
    },

    /**
     * Bulk import knowledge entries
     */
    async bulkImportKnowledge(clientId: string, entries: Array<{ title: string; content: string; category?: string }>): Promise<number> {
        let imported = 0;
        for (const entry of entries) {
            await this.addKnowledge({
                clientId,
                title: entry.title,
                content: entry.content,
                category: entry.category || 'imported',
                tags: [],
                sourceType: 'import'
            });
            imported++;
        }
        return imported;
    },

    // ============ BRAND ASSETS ============

    /**
     * Get all brand assets for a client
     */
    async getAssets(clientId: string): Promise<BrandAsset[]> {
        try {
            const result = await sql`
                SELECT * FROM brand_assets
                WHERE client_id = ${clientId}
                ORDER BY created_at DESC
            `;
            return result.rows.map(this.mapRowToAsset);
        } catch (error: any) {
            if (error.message?.includes('does not exist')) {
                return [];
            }
            throw error;
        }
    },

    /**
     * Add a brand asset
     */
    async addAsset(asset: Omit<BrandAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<BrandAsset> {
        const result = await sql`
            INSERT INTO brand_assets (
                client_id, name, type, url, size, category, metadata
            )
            VALUES (
                ${asset.clientId},
                ${asset.name},
                ${asset.type},
                ${asset.url || null},
                ${asset.size || '0 KB'},
                ${asset.category || 'document'},
                ${JSON.stringify(asset.metadata || {})}
            )
            RETURNING *
        `;
        return this.mapRowToAsset(result.rows[0]);
    },

    /**
     * Delete a brand asset
     */
    async deleteAsset(id: string, clientId: string): Promise<boolean> {
        const result = await sql`
            DELETE FROM brand_assets
            WHERE id = ${id}::uuid AND client_id = ${clientId}
            RETURNING id
        `;
        return result.rows.length > 0;
    },

    // ============ VOICE SETTINGS ============

    /**
     * Get voice settings for a client
     */
    async getVoiceSettings(clientId: string): Promise<VoiceSettings> {
        try {
            const result = await sql`
                SELECT * FROM voice_settings WHERE client_id = ${clientId}
            `;
            if (result.rows.length === 0) {
                // Return defaults
                return {
                    clientId,
                    professional: 85,
                    empathetic: 40,
                    direct: 92,
                    friendly: 15,
                    updatedAt: new Date().toISOString()
                };
            }
            return this.mapRowToVoice(result.rows[0]);
        } catch (error: any) {
            if (error.message?.includes('does not exist')) {
                return {
                    clientId,
                    professional: 85,
                    empathetic: 40,
                    direct: 92,
                    friendly: 15,
                    updatedAt: new Date().toISOString()
                };
            }
            throw error;
        }
    },

    /**
     * Save voice settings for a client
     */
    async saveVoiceSettings(settings: VoiceSettings): Promise<VoiceSettings> {
        const result = await sql`
            INSERT INTO voice_settings (
                client_id, professional, empathetic, direct, friendly, custom_traits, updated_at
            )
            VALUES (
                ${settings.clientId},
                ${settings.professional},
                ${settings.empathetic},
                ${settings.direct},
                ${settings.friendly},
                ${JSON.stringify(settings.customTraits || {})},
                NOW()
            )
            ON CONFLICT (client_id) DO UPDATE SET
                professional = ${settings.professional},
                empathetic = ${settings.empathetic},
                direct = ${settings.direct},
                friendly = ${settings.friendly},
                custom_traits = ${JSON.stringify(settings.customTraits || {})},
                updated_at = NOW()
            RETURNING *
        `;
        return this.mapRowToVoice(result.rows[0]);
    },

    // ============ MAPPERS ============

    mapRowToEntry(row: any): KnowledgeEntry {
        return {
            id: row.id,
            clientId: row.client_id,
            title: row.title,
            content: row.content,
            category: row.category,
            tags: row.tags || [],
            source: row.source,
            sourceType: row.source_type,
            confidence: row.confidence,
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
            updatedAt: row.updated_at?.toISOString() || new Date().toISOString()
        };
    },

    mapRowToAsset(row: any): BrandAsset {
        return {
            id: row.id,
            clientId: row.client_id,
            name: row.name,
            type: row.type,
            url: row.url,
            size: row.size,
            category: row.category,
            metadata: row.metadata || {},
            createdAt: row.created_at?.toISOString() || new Date().toISOString(),
            updatedAt: row.updated_at?.toISOString() || new Date().toISOString()
        };
    },

    mapRowToVoice(row: any): VoiceSettings {
        return {
            clientId: row.client_id,
            professional: row.professional,
            empathetic: row.empathetic,
            direct: row.direct,
            friendly: row.friendly,
            customTraits: row.custom_traits || {},
            updatedAt: row.updated_at?.toISOString() || new Date().toISOString()
        };
    }
};
