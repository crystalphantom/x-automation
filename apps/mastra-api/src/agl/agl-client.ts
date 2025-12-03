/**
 * Custom AGL client wrapper that works with the actual server endpoints
 * The agent-lightning-sdk package uses /v1/agl/* paths, but the server uses /* paths
 */

import axios from "axios";
import type { RawPost } from "../mastra/types";

const BASE_URL = "http://localhost:4747";

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

/**
 * Check server health
 */
export async function health() {
    const response = await client.get("/health");
    return response.data;
}

/**
 * Enqueue a rollout
 */
export async function enqueueRollout(
    input: any,
    mode: "train" | "val" | "test" = "train",
    resources_id?: string,
    config?: {
        max_attempts?: number;
        timeout_seconds?: number;
    }
) {
    const response = await client.post("/enqueue_rollout", {
        input,
        mode,
        resources_id,
        config,
    });
    return response.data;
}

/**
 * Dequeue a rollout for processing
 */
export async function dequeueRollout(workerId?: string) {
    const params: any = {};
    if (workerId) {
        params.worker_id = workerId;
    }

    const response = await client.get("/dequeue_rollout", { params });
    return response.data;
}

/**
 * Update attempt status
 */
export async function updateAttempt(
    rolloutId: string,
    attemptId: string,
    updates: {
        status?: "preparing" | "running" | "failed" | "succeeded" | "unresponsive" | "timeout";
        metadata?: any;
    }
) {
    const response = await client.post("/update_attempt", {
        rollout_id: rolloutId,
        attempt_id: attemptId,
        ...updates,
    });
    return response.data;
}

/**
 * Update rollout
 */
export async function updateRollout(
    rolloutId: string,
    updates: {
        status?: "queuing" | "preparing" | "running" | "failed" | "succeeded" | "cancelled" | "requeuing";
        metadata?: any;
    }
) {
    const response = await client.post("/update_rollout", {
        rollout_id: rolloutId,
        ...updates,
    });
    return response.data;
}

/**
 * Update worker heartbeat
 */
export async function updateWorker(
    workerId: string,
    updates: {
        heartbeat_stats?: any;
    }
) {
    // Note: There might not be a dedicated worker endpoint
    // Workers are tracked via attempt updates
    // This is a placeholder for now
    console.log(`Worker ${workerId} heartbeat:`, updates);
    return { success: true };
}

/**
 * Query rollouts
 */
export async function queryRollouts(params?: {
    status_in?: string[];
    limit?: number;
    offset?: number;
}) {
    const response = await client.post("/query_rollouts", params || {});
    return response.data;
}

/**
 * Get statistics
 */
export async function getStatistics() {
    // Note: statistics endpoint might not exist, return mock data
    const rollouts = await queryRollouts({ limit: 1000 });
    return {
        total_rollouts: rollouts.total || 0,
        message: "Statistics endpoint not available, showing rollout count",
    };
}

/**
 * Get latest resources
 */
export async function getLatestResources() {
    const response = await client.get("/get_latest_resources");
    return response.data;
}
