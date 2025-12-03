import {
    submitPostAnalysisTasks,
    checkAGLHealth,
    getAGLStatistics,
    queryRecentRollouts,
} from "./submit-tasks";
import { testPosts, expectedClassifications } from "./test-data";

/**
 * Test runner for AGL integration
 * Submits test posts and provides next steps
 */
async function runTests() {
    console.log("\n" + "=".repeat(60));
    console.log("🧪 AGL Integration Test Runner");
    console.log("=".repeat(60) + "\n");

    // Step 1: Check AGL server health
    console.log("Step 1: Checking AGL server health...");
    const isHealthy = await checkAGLHealth();

    if (!isHealthy) {
        console.error("\n❌ AGL server is not reachable.");
        console.error("\n💡 Please start the AGL server first:");
        console.error("   cd /Users/vaishnav/playground1/battleground/x-automation");
        console.error("   source .venv/bin/activate");
        console.error("   agl store --port 4747\n");
        process.exit(1);
    }

    console.log("");

    // Step 2: Get current statistics
    console.log("Step 2: Getting current server statistics...");
    await getAGLStatistics();

    // Step 3: Submit test posts
    console.log("\nStep 3: Submitting test posts for analysis...");
    const rolloutIds = await submitPostAnalysisTasks(testPosts);

    if (rolloutIds.length === 0) {
        console.error("❌ Failed to submit any tasks");
        process.exit(1);
    }

    // Step 4: Show expected classifications
    console.log("\n📖 Expected Classifications:");
    console.log("─".repeat(60));
    Object.entries(expectedClassifications).forEach(([postId, expected]) => {
        console.log(`  ${postId.padEnd(20)} → ${expected.category} (${expected.sentiment})`);
    });
    console.log("");

    // Step 5: Query submitted rollouts
    console.log("Step 4: Querying submitted rollouts...");
    await queryRecentRollouts(rolloutIds.length);

    // Step 6: Print next steps
    console.log("\n" + "=".repeat(60));
    console.log("✨ Test submission complete!");
    console.log("=".repeat(60));
    console.log("\n📌 Next Steps:\n");
    console.log("1. Start the worker to process these tasks:");
    console.log("   Terminal 2: bun run agl:worker\n");
    console.log("2. Watch the worker process the " + rolloutIds.length + " rollouts\n");
    console.log("3. View traces in Mastra Studio:");
    console.log("   http://localhost:4111\n");
    console.log("4. Check rollout status:");
    console.log("   curl http://localhost:4747/rollouts\n");
    console.log("5. View statistics:");
    console.log("   curl http://localhost:4747/statistics\n");

    console.log("💡 Tips:");
    console.log("  - Worker logs show category and sentiment for each post");
    console.log("  - Compare with expected classifications above");
    console.log("  - After 500+ rollouts, accuracy should improve 15-20%");
    console.log("");
}

// Run the tests
runTests().catch((error) => {
    console.error("\n💥 Test runner failed:", error);
    process.exit(1);
});
