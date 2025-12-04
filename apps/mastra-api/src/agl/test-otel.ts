/**
 * Test OTEL integration with AGL
 * 
 * This script tests if traces are being sent to AGL correctly
 * when agents run.
 * 
 * Run: AGL_ENABLED=true bun run src/agl/test-otel.ts
 */

// Load environment first
import "dotenv/config";

async function testOtelIntegration() {
    console.log("\n🧪 Testing OTEL Integration with AGL\n");
    console.log("=".repeat(60));

    // Check if AGL is enabled
    const aglEnabled = process.env.AGL_ENABLED === "true";
    console.log(`\n📋 Configuration:`);
    console.log(`   AGL_ENABLED: ${aglEnabled ? "✅ true" : "❌ false"}`);

    if (!aglEnabled) {
        console.log("\n⚠️  AGL_ENABLED is not true. Set it to enable OTEL exporter.");
        console.log("   Example: AGL_ENABLED=true bun run agl:otel-test");
        return;
    }

    // Check if AGL server is running
    try {
        const response = await fetch("http://localhost:4747/health");
        if (response.ok) {
            console.log("   AGL Server: ✅ Running at http://localhost:4747");
        } else {
            console.log("   AGL Server: ❌ Returned status:", response.status);
            return;
        }
    } catch (error) {
        console.log("   AGL Server: ❌ Not reachable at http://localhost:4747");
        console.log("   Please start it with: agl store --port 4747");
        return;
    }

    // Now import instrumentation (this sets up OTEL)
    console.log("\n🔧 Loading OTEL instrumentation...");
    await import("./instrumentation");

    // Import Mastra (after instrumentation)
    console.log("🔧 Loading Mastra...");
    const { mastra } = await import("../mastra");

    // Create a test post
    const testPost = {
        id: "otel-test-" + Date.now(),
        author: "test-user",
        content: "Testing OTEL integration with our cool TypeScript SDK! 🚀",
        timestamp: new Date().toISOString(),
    };

    console.log("\n📤 Running Post Analyzer agent...");
    console.log(`   Post: "${testPost.content}"`);

    try {
        // Get the agent
        const postAnalyzer = mastra.getAgent("postAnalyzer");

        if (!postAnalyzer) {
            console.log("❌ Post Analyzer agent not found");
            return;
        }

        // Run the agent
        const result = await postAnalyzer.generate([
            {
                role: "user",
                content: `Analyze this post: ${JSON.stringify(testPost)}`,
            },
        ]);

        console.log("\n📊 Agent Response:");
        console.log(`   ${result.text.substring(0, 200)}...`);

        // Wait a bit for traces to be sent
        console.log("\n⏳ Waiting for traces to be exported...");
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if rollouts were created
        const rolloutsResponse = await fetch("http://localhost:4747/query_rollouts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ limit: 5 }),
        });
        const rollouts = await rolloutsResponse.json();

        if (Array.isArray(rollouts) && rollouts.length > 0) {
            console.log("\n✅ Rollouts found in AGL server:");
            rollouts.slice(0, 3).forEach((r: any) => {
                console.log(`   - ${r.rollout_id}: ${r.status}`);
            });
            console.log("\n🎉 OTEL integration is working!");
        } else {
            console.log("\n⚠️  No NEW rollouts found after agent run.");
            console.log("   This might mean OTEL instrumentation isn't capturing Mastra spans.");
            console.log("   Check if Mastra creates OpenTelemetry spans that our exporter can capture.");
        }

    } catch (error) {
        console.error("\n❌ Error running agent:", error);
    }

    console.log("\n" + "=".repeat(60));
    console.log("Test complete!\n");

    // Force exit after clean shutdown
    setTimeout(() => process.exit(0), 500);
}

testOtelIntegration().catch(console.error);
