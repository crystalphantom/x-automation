// Re-export the mastra instance from mastra-api
// This ensures both the web app and mastra-api use the SAME instance
// and share the same database for traces
export { mastra } from "mastra-api";
