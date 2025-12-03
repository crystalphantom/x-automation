import type { RawPost } from "../mastra/types";

/**
 * Test dataset for AGL integration testing
 * These posts cover different categories to test classification accuracy
 */
export const testPosts: RawPost[] = [
    {
        id: "test-tech-1",
        author: "techfounder",
        content: "Just launched our new TypeScript SDK for agent training! 🚀 It integrates with Mastra and supports OpenTelemetry. Check it out on GitHub.",
        timestamp: new Date("2024-01-15T10:30:00Z").toISOString(),
    },
    {
        id: "test-startup-1",
        author: "startup_ceo",
        content: "Thrilled to announce we've raised $5M in Series A! Thank you to our amazing investors and team. Onwards and upwards! 🎉",
        timestamp: new Date("2024-01-15T14:20:00Z").toISOString(),
    },
    {
        id: "test-pm-1",
        author: "pm_guru",
        content: "Hot take: Great product managers focus on the 'why' before the 'what'. Too many PMs jump straight to solutions. What do you think?",
        timestamp: new Date("2024-01-15T16:45:00Z").toISOString(),
    },
    {
        id: "test-general-1",
        author: "random_user",
        content: "What should I have for lunch today? Thinking pizza vs sushi 🤔",
        timestamp: new Date("2024-01-15T12:30:00Z").toISOString(),
    },
    {
        id: "test-tech-2",
        author: "devrel",
        content: "New blog: How we scaled our API from 1K to 1M requests per second using Rust and WebAssembly. Link in bio! ⚡",
        timestamp: new Date("2024-01-16T09:15:00Z").toISOString(),
    },
    {
        id: "test-startup-2",
        author: "founder_life",
        content: "Month 6 of building in public. Revenue hit $10K MRR! Here's what we learned about customer acquisition...",
        timestamp: new Date("2024-01-16T11:00:00Z").toISOString(),
    },
    {
        id: "test-pm-2",
        author: "product_insights",
        content: "Shipped our first AI feature today. Key learning: User feedback > Perfect implementation. Always talk to users early!",
        timestamp: new Date("2024-01-16T15:30:00Z").toISOString(),
    },
    {
        id: "test-tech-3",
        author: "ml_engineer",
        content: "Experimenting with fine-tuning Gemini models. The results are incredible - 40% accuracy improvement on our task!",
        timestamp: new Date("2024-01-17T08:45:00Z").toISOString(),
    },
];

/**
 * Expected classifications for test posts (for accuracy measurement)
 */
export const expectedClassifications = {
    "test-tech-1": { category: "technology", sentiment: "positive" },
    "test-startup-1": { category: "startups", sentiment: "positive" },
    "test-pm-1": { category: "product_management", sentiment: "neutral" },
    "test-general-1": { category: "general", sentiment: "neutral" },
    "test-tech-2": { category: "technology", sentiment: "positive" },
    "test-startup-2": { category: "startups", sentiment: "positive" },
    "test-pm-2": { category: "product_management", sentiment: "positive" },
    "test-tech-3": { category: "technology", sentiment: "positive" },
};
