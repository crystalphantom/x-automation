import * as aglClient from "./agl-client";

/**
 * Monitor rollouts in real-time
 */
async function monitorRollouts() {
    console.log("\n🔍 AGL Rollout Monitor - Press Ctrl+C to stop\n");

    let iteration = 0;

    while (true) {
        iteration++;
        const now = new Date().toLocaleTimeString();

        try {
            const rollouts = await aglClient.queryRollouts({ limit: 100 });
            const rolloutsArray = Array.isArray(rollouts) ? rollouts : [];

            // Group by status
            const byStatus: Record<string, number> = {};
            rolloutsArray.forEach((r: any) => {
                byStatus[r.status] = (byStatus[r.status] || 0) + 1;
            });

            // Clear screen (optional - comment out if too flashy)
            // console.clear();

            console.log(`\n[${now}] Iteration #${iteration}`);
            console.log("─".repeat(60));
            console.log("Status Summary:");
            Object.entries(byStatus).forEach(([status, count]) => {
                const emoji = status === "succeeded" ? "✅" :
                    status === "failed" ? "❌" :
                        status === "running" ? "🔄" :
                            status === "queuing" ? "⏳" : "📋";
                console.log(`  ${emoji} ${status.padEnd(15)}: ${count}`);
            });

            // Show recent activity
            const recent = rolloutsArray
                .filter((r: any) => r.status !== "failed") // Hide old failures
                .slice(0, 5);

            if (recent.length > 0) {
                console.log("\nRecent Active Rollouts:");
                recent.forEach((r: any) => {
                    const emoji = r.status === "succeeded" ? "✅" :
                        r.status === "running" ? "🔄" : "⏳";
                    console.log(`  ${emoji} ${r.rollout_id}: ${r.status}`);
                });
            }

        } catch (error: any) {
            console.log(`❌ Error: ${error.message}`);
        }

        // Wait 2 seconds before next check
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
    console.log("\n\n👋 Monitoring stopped\n");
    process.exit(0);
});

monitorRollouts().catch(console.error);
