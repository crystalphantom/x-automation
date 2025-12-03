import * as aglClient from "./agl-client";

async function checkStatus() {
    console.log("\n🔍 AGL Integration Status Check\n");
    console.log("=".repeat(60));

    // 1. Health check
    try {
        const health = await aglClient.health();
        console.log("✅ AGL Server Health:", health);
    } catch (error) {
        console.log("❌ AGL Server Health:", error);
    }

    // 2. Query all rollouts
    try {
        console.log("\n📋 All Rollouts:");
        const allRollouts = await aglClient.queryRollouts({ limit: 100 });

        console.log("allRollouts ", allRollouts)

        if (Array.isArray(allRollouts)) {
            console.log(`   Total: ${allRollouts.length}`);

            // Group by status
            const byStatus: Record<string, number> = {};
            allRollouts.forEach((r: any) => {
                byStatus[r.status] = (byStatus[r.status] || 0) + 1;
            });

            console.log("\n   By Status:");
            Object.entries(byStatus).forEach(([status, count]) => {
                console.log(`   - ${status}: ${count}`);
            });

            // Show recent rollouts
            console.log("\n   Recent 10:");
            allRollouts.slice(0, 10).forEach((r: any) => {
                console.log(`   - ${r.rollout_id}: ${r.status} (mode: ${r.mode || 'N/A'})`);
            });
        } else {
            console.log("   Response:", JSON.stringify(allRollouts, null, 2));
        }
    } catch (error: any) {
        console.log("❌ Query Rollouts Error:", error.message);
    }

    // 3. Try to dequeue
    try {
        console.log("\n🔄 Attempting to dequeue (as test-worker):");
        const dequeued = await aglClient.dequeueRollout("test-worker");
        if (dequeued) {
            console.log("   ✅ Dequeued rollout:", dequeued.rollout_id);
            console.log("   Status:", dequeued.status);
            console.log("   Input:", JSON.stringify(dequeued.input).substring(0, 100) + "...");
        } else {
            console.log("   ℹ️  No rollouts available to dequeue (queue is empty)");
        }
    } catch (error: any) {
        console.log("   ❌ Dequeue Error:", error.message);
    }

    console.log("\n" + "=".repeat(60));
    console.log("\n💡 Interpretation:");
    console.log("  - If all rollouts show 'succeeded' or 'failed', they've been processed");
    console.log("  - If rollouts show 'queuing', the worker should pick them up");
    console.log("  - Dots (...) in worker mean queue is empty\n");
}

checkStatus().catch(console.error);
