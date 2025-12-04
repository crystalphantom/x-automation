import * as aglClient from "./agl-client";
import { expectedClassifications } from "./test-data";

/**
 * Evaluate rollouts by comparing agent output with expected ground truth
 * Adds reward scores to rollout metadata for RL training
 */
async function evaluateRollouts() {
    console.log("\n🎯 AGL Rollout Evaluation\n");
    console.log("=".repeat(60));

    // Get all succeeded rollouts
    const response = await aglClient.queryRollouts({ limit: 1000 });
    const rollouts = Array.isArray(response) ? response : [];

    const succeeded = rollouts.filter((r: any) => r.status === "succeeded");

    console.log(`\n📊 Found ${succeeded.length} successful rollouts to evaluate\n`);

    let evaluated = 0;
    let correctCategory = 0;
    let correctSentiment = 0;
    let perfectMatch = 0;

    for (const rollout of succeeded) {
        const postId = rollout.input?.post?.id;

        if (!postId || !postId.startsWith("test-")) {
            continue; // Skip non-test posts (no ground truth)
        }

        const expected = expectedClassifications[postId as keyof typeof expectedClassifications];
        if (!expected) {
            continue; // No ground truth for this post
        }

        const actual = rollout.metadata?.result;
        if (!actual) {
            continue; // No result in metadata
        }

        // Calculate reward
        const categoryMatch = actual.primary_category === expected.category;
        const sentimentMatch = actual.sentiment === expected.sentiment;

        let reward = 0;
        if (categoryMatch && sentimentMatch) {
            reward = 1.0; // Perfect!
            perfectMatch++;
        } else if (categoryMatch) {
            reward = 0.5; // Category correct, sentiment wrong
        } else {
            reward = -1.0; // Category wrong (major error)
        }

        if (categoryMatch) correctCategory++;
        if (sentimentMatch) correctSentiment++;

        // Update rollout with reward
        try {
            await aglClient.updateRollout(rollout.rollout_id, {
                metadata: {
                    ...rollout.metadata,
                    evaluation: {
                        expected: expected,
                        actual: {
                            category: actual.primary_category,
                            sentiment: actual.sentiment,
                        },
                        reward: reward,
                        category_correct: categoryMatch,
                        sentiment_correct: sentimentMatch,
                        evaluated_at: new Date().toISOString(),
                    },
                },
            });

            evaluated++;

            const emoji = reward === 1.0 ? "✅" : reward === 0.5 ? "⚠️" : "❌";
            console.log(
                `${emoji} ${rollout.rollout_id.substring(0, 16)}: ` +
                `Expected ${expected.category}/${expected.sentiment}, ` +
                `Got ${actual.primary_category}/${actual.sentiment} ` +
                `(reward: ${reward.toFixed(1)})`
            );
        } catch (error) {
            console.error(`   Failed to update rollout: ${rollout.rollout_id}`);
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("\n📈 Evaluation Results:\n");
    console.log(`   Rollouts evaluated: ${evaluated}`);
    console.log(`   Perfect matches: ${perfectMatch} (${((perfectMatch / evaluated) * 100).toFixed(1)}%)`);
    console.log(`   Category accuracy: ${correctCategory}/${evaluated} (${((correctCategory / evaluated) * 100).toFixed(1)}%)`);
    console.log(`   Sentiment accuracy: ${correctSentiment}/${evaluated} (${((correctSentiment / evaluated) * 100).toFixed(1)}%)`);

    console.log("\n💡 What This Means:\n");

    if (evaluated === 0) {
        console.log("   ⚠️  No test rollouts found to evaluate!");
        console.log("   Run: bun run agl:submit");
    } else {
        const accuracy = (perfectMatch / evaluated) * 100;

        if (accuracy === 100) {
            console.log("   🎉 Perfect! 100% accuracy on test set!");
            console.log("   This is your baseline. Collect more diverse data.");
        } else if (accuracy >= 80) {
            console.log(`   ✅ Good! ${accuracy.toFixed(1)}% accuracy`);
            console.log("   Agent is performing well on this test set.");
        } else {
            console.log(`   ⚠️  ${accuracy.toFixed(1)}% accuracy - room for improvement!`);
            console.log("   This is where RL/optimization can help.");
        }

        console.log("\n🔄 These rewards will be used for RL training:");
        console.log("   - Reward +1.0 → Reinforce this prompt/approach");
        console.log("   - Reward +0.5 → Partially good, needs refinement");
        console.log("   - Reward -1.0 → Avoid this approach");
    }

    console.log("\n📚 Next Step:");
    console.log("   After collecting 500+ evaluated rollouts:");
    console.log("   → Run: bun run agl:train");
    console.log("   → RL algorithm uses rewards to optimize prompts\n");
}

evaluateRollouts().catch(console.error);
