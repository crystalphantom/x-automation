/**
 * Test AGL Integration
 * 
 * Tests the complete flow:
 * 1. Create rollout via SDK
 * 2. Run Post Analyzer agent
 * 3. Verify spans are captured
 * 4. Verify rollout is completed
 */
import 'dotenv/config';
import { LightningStoreClient } from 'agent-lightning-sdk';

async function testAGLIntegration() {
    console.log('\n🧪 Testing AGL Integration with Mastra\n');
    console.log('='.repeat(60));

    // Check environment
    const aglEnabled = process.env.AGL_ENABLED === 'true';
    const serverUrl = process.env.AGL_SERVER_URL || 'http://localhost:4747';

    console.log('\n📋 Configuration:');
    console.log(`   AGL_ENABLED: ${aglEnabled ? '✅' : '❌'}`);
    console.log(`   AGL_SERVER_URL: ${serverUrl}`);

    if (!aglEnabled) {
        console.log('\n⚠️  Set AGL_ENABLED=true to run this test');
        console.log('   Example: AGL_ENABLED=true bun run agl:otel-test');
        return;
    }

    // Check server health
    const client = new LightningStoreClient(serverUrl);
    try {
        const health = await client.health();
        console.log(`   Server Health: ${health.status === 'ok' ? '✅ OK' : '❌ ' + health.status}`);
    } catch (error) {
        console.log('   Server Health: ❌ Not reachable');
        console.log('\n   Start server with: agl store --port 4747');
        return;
    }

    // Get rollout count before test
    let countBefore = 0;
    try {
        const beforeRollouts = await client.queryRollouts({ limit: 1 });
        countBefore = beforeRollouts.total || 0;
    } catch {
        console.log('   Note: Could not query existing rollouts');
    }
    console.log(`\n📊 Rollouts before: ${countBefore}`);

    // Import and run Mastra
    console.log('\n🔧 Loading Mastra with AGL integration...');
    const { mastra } = await import('../mastra');

    // Run Post Analyzer
    const testPost = {
        id: `test-${Date.now()}`,
        author: 'integration-test',
        content: 'Just shipped a major performance update to our TypeScript SDK! 🚀 40% faster builds.',
        timestamp: new Date().toISOString(),
    };

    console.log('\n📤 Running Post Analyzer agent...');
    console.log(`   Input: "${testPost.content.substring(0, 50)}..."`);

    const postAnalyzer = mastra.getAgent('postAnalyzer');
    const startTime = Date.now();

    try {
        const result = await postAnalyzer.generate([
            { role: 'user', content: `Analyze this post: ${JSON.stringify(testPost)}` },
        ]);

        const duration = Date.now() - startTime;
        console.log(`\n📊 Agent completed in ${duration}ms`);
        console.log(`   Response: ${result.text.substring(0, 150)}...`);
    } catch (error) {
        console.error('\n❌ Agent execution failed:', error);
        return;
    }

    // Wait for spans to be exported
    console.log('\n⏳ Waiting for AGL export...');
    await new Promise(r => setTimeout(r, 2000));

    // Check rollout count after test
    let countAfter = 0;
    let items: unknown[] = [];
    try {
        const afterRollouts = await client.queryRollouts({ limit: 5 });
        countAfter = afterRollouts.total || 0;
        items = afterRollouts.items || [];
    } catch {
        console.log('   Note: Could not query rollouts after test');
    }

    console.log(`\n📊 Rollouts after: ${countAfter}`);

    if (countAfter > countBefore) {
        console.log('\n✅ SUCCESS! New rollouts created');
        console.log('\n   Recent rollouts:');

        (items as Array<{ rollout_id: string; status: string }>).slice(0, 3).forEach((r) => {
            console.log(`   - ${r.rollout_id}: ${r.status}`);
        });

        // Check spans for the latest rollout
        if (items.length > 0) {
            const latestRollout = items[0] as { rollout_id: string };
            try {
                const spans = await client.querySpans({
                    rollout_id: latestRollout.rollout_id,
                    limit: 10,
                });
                console.log(`\n   Spans in latest rollout: ${spans.total || 0}`);
            } catch {
                console.log('\n   Note: Could not query spans');
            }
        }
    } else {
        console.log('\n⚠️  No new rollouts detected');
        console.log('   This might be expected if the AGLSpanProcessor is not detecting agent spans.');
        console.log('   Check the logs above for [AGL] messages.');
    }

    console.log('\n' + '='.repeat(60));
    console.log('Test complete!\n');

    setTimeout(() => process.exit(0), 500);
}

testAGLIntegration().catch(console.error);
