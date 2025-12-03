// Load environment variables from .env file
import "dotenv/config";

console.log("🔄 Loading worker...");

import * as aglClient from "./agl-client";

console.log("🔄 Loading Mastra...");
import { mastra } from "../mastra";

console.log("🔄 Loading types...");
import type { RawPost, PostMetadata } from "../mastra/types";

const workerId = process.env.AGL_WORKER_ID || "post-analyzer-worker-1";

/**
 * Main worker process for executing post analysis tasks from AGL queue
 */
async function processRollouts() {
    console.log(`\n🚀 Worker ${workerId} starting...`);
    console.log(`📍 Connecting to AGL server at http://localhost:4747\n`);

    // Verify AGL server is reachable
    try {
        const health = await aglClient.health();
        if (health.status !== "ok") {
            throw new Error(`AGL server not healthy: ${JSON.stringify(health)}`);
        }
        console.log("✅ Connected to AGL server\n");
    } catch (error) {
        console.error("❌ Failed to connect to AGL server:", error);
        console.error("\n💡 Make sure AGL server is running:");
        console.error("   source .venv/bin/activate && agl store --port 4747\n");
        process.exit(1);
    }

    // Main worker loop
    let tasksProcessed = 0;
    let tasksFailed = 0;

    while (true) {
        try {
            // Dequeue next task from Agent Lightning
            const attemptedRollout = await aglClient.dequeueRollout(workerId);

            if (!attemptedRollout) {
                // No tasks available, wait and retry
                process.stdout.write(".");
                await sleep(5000);
                continue;
            }

            const rolloutId = attemptedRollout.rollout_id;
            const attemptId = attemptedRollout.attempt.attempt_id;

            console.log(`\n📋 Processing rollout: ${rolloutId}`);

            try {
                // Extract input
                const input = attemptedRollout.input;
                const rawPost: RawPost = input.post;

                console.log(`   Post: "${rawPost.content.substring(0, 60)}..."`);

                // Get the Mastra agent
                const agent = mastra.getAgent("postAnalyzer");

                if (!agent) {
                    throw new Error("Post analyzer agent not found");
                }

                // Build prompt (same as analyzePost function)
                const prompt = `Analyze this post:

Author: ${rawPost.author}
Content: ${rawPost.content}
Posted at: ${rawPost.timestamp}

Provide metadata as JSON.`;

                // Execute the agent
                // Mastra will automatically send OTLP traces to Agent Lightning!
                const startTime = Date.now();
                const result = await agent.generate(prompt, {
                    modelSettings: {
                        temperature: 0.3,
                    },
                });
                const executionTime = Date.now() - startTime;

                // Parse result
                const jsonMatch = result.text.match(/\{[\s\S]*\}/);
                if (!jsonMatch) {
                    throw new Error("Failed to extract JSON from analysis");
                }

                const metadata: PostMetadata = JSON.parse(jsonMatch[0]);

                // Ensure post_id is set
                metadata.post_id = rawPost.id;

                console.log(`   Category: ${metadata.primary_category}`);
                console.log(`   Sentiment: ${metadata.sentiment}`);
                console.log(`   Time: ${executionTime}ms`);

                // Update attempt as succeeded
                await aglClient.updateAttempt(rolloutId, attemptId, {
                    status: "succeeded",
                });

                // Update rollout as succeeded with result metadata
                await aglClient.updateRollout(rolloutId, {
                    status: "succeeded",
                    metadata: {
                        result: metadata,
                        execution_time_ms: executionTime,
                        success: true,
                    },
                });

                tasksProcessed++;
                console.log(`   ✅ Completed (Total: ${tasksProcessed})`);
            } catch (error: any) {
                tasksFailed++;
                console.error(`   ❌ Failed: ${error.message}`);

                // Mark attempt as failed
                await aglClient.updateAttempt(rolloutId, attemptId, {
                    status: "failed",
                });

                // Mark rollout as failed
                await aglClient.updateRollout(rolloutId, {
                    status: "failed",
                    metadata: {
                        error: error.message,
                        success: false,
                    },
                });
            }

            // Update worker heartbeat
            await aglClient.updateWorker(workerId, {
                heartbeat_stats: {
                    memory_usage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
                    uptime: process.uptime(),
                    tasks_processed: tasksProcessed,
                    tasks_failed: tasksFailed,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (error) {
            console.error("\n⚠️  Worker error:", error);
            await sleep(5000);
        }
    }
}

/**
 * Helper function to sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Handle graceful shutdown
process.on("SIGINT", () => {
    console.log("\n\n👋 Worker shutting down gracefully...");
    process.exit(0);
});

process.on("SIGTERM", () => {
    console.log("\n\n👋 Worker shutting down gracefully...");
    process.exit(0);
});

// Start the worker
processRollouts().catch((error) => {
    console.error("\n💥 Worker crashed:", error);
    process.exit(1);
});
