import * as aglClient from "./agl-client";
import type { RawPost } from "../mastra/types";

/**
 * Submit post analysis tasks to Agent Lightning for training
 * @param posts Array of posts to analyze
 * @returns Array of rollout IDs
 */
export async function submitPostAnalysisTasks(posts: RawPost[]) {
    const rolloutIds: string[] = [];

    console.log(`\n📤 Submitting ${posts.length} posts for analysis...\n`);

    for (const post of posts) {
        try {
            const rollout = await aglClient.enqueueRollout(
                {
                    task_type: "post_analysis",
                    post,
                },
                "train", // mode: train/val/test
                undefined, // resourcesId (use latest)
                {
                    max_attempts: 3,
                    timeout_seconds: 60,
                }
            );

            console.log(`  ✅ Enqueued: ${rollout.rollout_id} | Post: ${post.id}`);
            rolloutIds.push(rollout.rollout_id);
        } catch (error) {
            console.error(`  ❌ Failed to enqueue post ${post.id}:`, error);
        }
    }

    console.log(`\n✨ Total enqueued: ${rolloutIds.length}/${posts.length}\n`);
    return rolloutIds;
}

/**
 * Check if AGL server is healthy and reachable
 * @returns true if server is healthy, false otherwise
 */
export async function checkAGLHealth() {
    try {
        const health = await aglClient.health();
        const isHealthy = health.status === "ok";

        if (isHealthy) {
            console.log("🟢 AGL Server is healthy");
        } else {
            console.log("🟡 AGL Server returned:", health);
        }

        return isHealthy;
    } catch (error) {
        console.error("🔴 AGL Server is not reachable:", error);
        return false;
    }
}

/**
 * Get statistics from AGL server
 */
export async function getAGLStatistics() {
    try {
        const stats = await aglClient.getStatistics();
        console.log("\n📊 AGL Server Statistics:");
        console.log(JSON.stringify(stats, null, 2));
        return stats;
    } catch (error) {
        console.error("❌ Failed to get statistics:", error);
        return null;
    }
}

/**
 * Query recent rollouts
 */
export async function queryRecentRollouts(limit = 10) {
    try {
        const response = await aglClient.queryRollouts({
            limit,
        });

        // Handle array response format
        const rollouts = Array.isArray(response) ? response : (response.rollouts || []);
        const total = Array.isArray(response) ? response.length : (response.total || 0);

        console.log(`\n📋 Recent Rollouts (${total} total):`);
        rollouts.forEach((r: any) => {
            console.log(`  - ${r.rollout_id}: ${r.status}`);
        });

        return { rollouts, total };
    } catch (error) {
        console.error("❌ Failed to query rollouts:", error);
        return null;
    }
}

export { aglClient };
