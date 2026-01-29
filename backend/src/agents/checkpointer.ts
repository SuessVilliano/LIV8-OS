import {
    BaseCheckpointSaver,
    Checkpoint,
    CheckpointMetadata,
    CheckpointTuple
} from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';
import { agentSessions } from '../db/agent-sessions.js';

/**
 * PostgreSQL Checkpointer for LangGraph
 *
 * Persists agent state to Vercel Postgres using the agent_sessions table.
 * Enables session resumption and long-running agent workflows.
 */
export class PostgresCheckpointer extends BaseCheckpointSaver {
    /**
     * Get the latest checkpoint for a thread
     */
    async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
        const threadId = config.configurable?.thread_id as string;
        if (!threadId) {
            return undefined;
        }

        try {
            const session = await agentSessions.getByThreadId(threadId);
            if (!session || !session.checkpoint_data) {
                return undefined;
            }

            const checkpoint = session.checkpoint_data as Checkpoint;

            return {
                config,
                checkpoint,
                metadata: {
                    source: 'postgres',
                    step: session.current_node ? parseInt(session.current_node) || 0 : 0,
                    writes: {},
                    parents: {}
                } as CheckpointMetadata,
                parentConfig: undefined
            };
        } catch (error) {
            console.error('[PostgresCheckpointer] getTuple error:', error);
            return undefined;
        }
    }

    /**
     * Save a checkpoint
     */
    async put(
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata
    ): Promise<RunnableConfig> {
        const threadId = config.configurable?.thread_id as string;
        if (!threadId) {
            throw new Error('thread_id is required in config.configurable');
        }

        try {
            await agentSessions.saveCheckpoint(
                threadId,
                checkpoint as unknown as Record<string, any>,
                metadata.step?.toString()
            );

            return config;
        } catch (error) {
            console.error('[PostgresCheckpointer] put error:', error);
            throw error;
        }
    }

    /**
     * Delete a checkpoint (not typically used but required by interface)
     */
    async delete(config: RunnableConfig): Promise<void> {
        const threadId = config.configurable?.thread_id as string;
        if (!threadId) {
            return;
        }

        try {
            await agentSessions.saveCheckpoint(threadId, {}, undefined);
        } catch (error) {
            console.error('[PostgresCheckpointer] delete error:', error);
        }
    }

    /**
     * List checkpoints for a thread (returns latest only for simplicity)
     */
    async *list(
        config: RunnableConfig,
        _options?: { limit?: number; before?: RunnableConfig }
    ): AsyncGenerator<CheckpointTuple> {
        const threadId = config.configurable?.thread_id as string;
        if (!threadId) {
            return;
        }

        try {
            const session = await agentSessions.getByThreadId(threadId);
            if (!session || !session.checkpoint_data) {
                return;
            }

            const checkpoint = session.checkpoint_data as Checkpoint;

            yield {
                config,
                checkpoint,
                metadata: {
                    source: 'postgres',
                    step: session.current_node ? parseInt(session.current_node) || 0 : 0,
                    writes: {},
                    parents: {}
                } as CheckpointMetadata,
                parentConfig: undefined
            };
        } catch (error) {
            console.error('[PostgresCheckpointer] list error:', error);
        }
    }

    /**
     * Put writes for a checkpoint (used by LangGraph for intermediate state)
     */
    async putWrites(
        config: RunnableConfig,
        writes: [string, any][],
        taskId: string
    ): Promise<void> {
        const threadId = config.configurable?.thread_id as string;
        if (!threadId) {
            return;
        }

        try {
            // For now, we store writes as part of the checkpoint metadata
            const session = await agentSessions.getByThreadId(threadId);
            if (session) {
                const checkpointData = (session.checkpoint_data || {}) as Record<string, any>;
                checkpointData._writes = checkpointData._writes || {};
                checkpointData._writes[taskId] = writes;

                await agentSessions.saveCheckpoint(threadId, checkpointData);
            }
        } catch (error) {
            console.error('[PostgresCheckpointer] putWrites error:', error);
        }
    }
}

/**
 * Create a new PostgreSQL checkpointer instance
 */
export function createCheckpointer(): PostgresCheckpointer {
    return new PostgresCheckpointer();
}
