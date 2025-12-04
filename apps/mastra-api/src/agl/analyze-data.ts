import * as aglClient from "./agl-client";

/**
 * Analyze collected rollout data to see patterns
 */
async function analyzeData() {
    console.log("\n📊 AGL Data Analysis\n");
    console.log("=".repeat(60));

    const rollouts = await aglClient.queryRollouts({ limit: 1000 });
    const rolloutsArray = Array.isArray(rollouts) ? rollouts : [];

    // Overall stats
    const succeeded = rolloutsArray.filter((r: any) => r.status === "succeeded");
    const failed = rolloutsArray.filter((r: any) => r.status === "failed");

    console.log(`\n📈 Collection Progress:`);
    console.log(`   Total rollouts: ${rolloutsArray.length}`);
    console.log(`   Succeeded: ${succeeded.length}`);
    console.log(`   Failed: ${failed.length}`);
    console.log(`   Success rate: ${((succeeded.length / rolloutsArray.length) * 100).toFixed(1)}%`);

    // Time analysis
    if (succeeded.length > 0) {
        const times = succeeded.map((r: any) => {
            if (r.metadata?.execution_time_ms) return r.metadata.execution_time_ms;
            if (r.end_time && r.start_time) return (r.end_time - r.start_time) * 1000;
            return 0;
        }).filter((t: number) => t > 0);

        if (times.length > 0) {
            const avgTime = times.reduce((a: number, b: number) => a + b, 0) / times.length;
            const minTime = Math.min(...times);
            const maxTime = Math.max(...times);

            console.log(`\n⏱️  Execution Time:`);
            console.log(`   Average: ${avgTime.toFixed(0)}ms`);
            console.log(`   Min: ${minTime.toFixed(0)}ms`);
            console.log(`   Max: ${maxTime.toFixed(0)}ms`);
        }
    }

    // Category distribution
    const categories: Record<string, number> = {};
    succeeded.forEach((r: any) => {
        const category = r.metadata?.result?.primary_category || "unknown";
        categories[category] = (categories[category] || 0) + 1;
    });

    console.log(`\n📂 Category Distribution:`);
    Object.entries(categories).forEach(([cat, count]) => {
        const pct = ((count as number / succeeded.length) * 100).toFixed(1);
        console.log(`   ${cat.padEnd(20)}: ${count} (${pct}%)`);
    });

    console.log(`\n💡 Next Steps:`);
    if (succeeded.length < 100) {
        console.log(`   ⚠️  Need more data! Currently: ${succeeded.length}/500 minimum`);
        console.log(`   Run: bun run agl:submit (multiple times)`);
    } else if (succeeded.length < 500) {
        console.log(`   📊 Good progress! ${succeeded.length}/500`);
        console.log(`   Keep collecting: bun run agl:submit`);
    } else {
        console.log(`   ✅ Ready for training! (${succeeded.length} rollouts)`);
        console.log(`   Next: Implement Python training script`);
    }

    console.log("");
}

analyzeData().catch(console.error);
