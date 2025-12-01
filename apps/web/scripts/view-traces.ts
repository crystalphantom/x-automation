import { mastra } from "../lib/mastra.config";

async function viewTraces() {
  try {
    console.log("📊 Mastra Studio Traces Viewer");
    console.log("=============================");
    console.log("To view traces, use the Studio UI at http://localhost:4111");
    console.log("Or run: cd ../mastra-api && bun run dev");
    console.log("");
    console.log("Available agents:");
    console.log("- postAnalyzer: Post Analyzer Agent");
    console.log("- strategy: Strategy Agent");
    console.log("- commentGenerator: Comment Generator Agent");
    console.log("- qa: Quality Assurance Agent");
  } catch (error) {
    console.error("Error:", error);
  }
}

viewTraces();
