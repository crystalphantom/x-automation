/**
 * AGL Agent Wrapper
 * 
 * Wraps Mastra agent generate calls to create AGL rollouts.
 * This approach works without modifying Mastra's observability config.
 */
import type { Agent } from '@mastra/core/agent';
import {
    createAgentRollout,
    completeAgentRollout,
    AGL_ENABLED,
} from './agl-integration';

// Use any for the agent type to avoid complex generic constraints
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAgent = Agent<any, any, any>;

/**
 * Wrap an agent's generate method to integrate with AGL
 */
export function wrapAgentWithAGL<T extends AnyAgent>(
    agent: T,
    agentName: string
): T {
    if (!AGL_ENABLED) {
        return agent; // Return unwrapped agent if AGL is disabled
    }

    const originalGenerate = agent.generate.bind(agent);

    // Override the generate method with a wrapper
    const wrappedGenerate = async function (this: T, messages: unknown, options?: unknown) {
        // Generate a unique trace ID for this execution
        const traceId = `tr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

        // Extract input for rollout metadata
        const inputSummary = typeof messages === 'string'
            ? messages.substring(0, 200)
            : JSON.stringify(messages).substring(0, 200);

        console.log(`[AGL Wrapper] Starting ${agentName} execution (${traceId})`);

        // Create rollout before execution
        let rolloutCreated = false;
        try {
            await createAgentRollout(traceId, agentName, {
                input_summary: inputSummary,
                input_type: typeof messages,
            });
            rolloutCreated = true;
        } catch (error) {
            console.error(`[AGL Wrapper] Failed to create rollout for ${agentName}:`, error);
        }

        // Execute the original generate method
        const startTime = Date.now();
        let result: unknown;
        let success = true;
        let errorMessage: string | undefined;

        try {
            // Call original generate with the same arguments
            result = await (originalGenerate as Function).call(this, messages, options);
        } catch (error) {
            success = false;
            errorMessage = error instanceof Error ? error.message : String(error);
            throw error; // Re-throw to maintain original behavior
        } finally {
            const duration = Date.now() - startTime;

            // Complete the rollout
            if (rolloutCreated) {
                try {
                    const resultObj = result as { text?: string } | null;
                    const output = {
                        duration_ms: duration,
                        success,
                        error_message: errorMessage,
                        response_preview: resultObj?.text?.substring(0, 500),
                    };
                    await completeAgentRollout(traceId, output, success);
                    console.log(`[AGL Wrapper] Completed ${agentName} (${duration}ms, ${success ? 'succeeded' : 'failed'})`);
                } catch (error) {
                    console.error(`[AGL Wrapper] Failed to complete rollout for ${agentName}:`, error);
                }
            }
        }

        return result;
    };

    // Replace the generate method
    (agent as unknown as { generate: typeof wrappedGenerate }).generate = wrappedGenerate;

    return agent;
}

/**
 * Wrap all agents in a Mastra instance with AGL integration
 */
export function wrapAllAgentsWithAGL(agents: Record<string, AnyAgent>): void {
    if (!AGL_ENABLED) {
        console.log('[AGL Wrapper] AGL disabled, skipping agent wrapping');
        return;
    }

    for (const [name, agent] of Object.entries(agents)) {
        wrapAgentWithAGL(agent, name);
        console.log(`[AGL Wrapper] Wrapped agent: ${name}`);
    }
}
