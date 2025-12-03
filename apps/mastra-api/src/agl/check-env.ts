// Load environment variables from .env file
import "dotenv/config";

console.log("\n🔍 Environment Variable Check\n");
console.log("=".repeat(60));

const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
const modelName = process.env.MODEL_NAME;

if (apiKey) {
    const masked = apiKey.substring(0, 10) + "..." + apiKey.substring(apiKey.length - 4);
    console.log("✅ GOOGLE_GENERATIVE_AI_API_KEY:", masked);
} else {
    console.log("❌ GOOGLE_GENERATIVE_AI_API_KEY: NOT SET");
}

if (modelName) {
    console.log("✅ MODEL_NAME:", modelName);
} else {
    console.log("ℹ️  MODEL_NAME: NOT SET (will use default)");
}

console.log("=".repeat(60));
console.log("");

if (!apiKey) {
    console.log("⚠️  WARNING: API key is not set!");
    console.log("   The worker will fail when trying to call the LLM.");
    console.log("");
    process.exit(1);
}

console.log("✅ Environment is properly configured!");
console.log("   You can now run the worker.\n");
