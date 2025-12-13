import { NextRequest, NextResponse } from "next/server";
import {
  createAnswerRelevancyScorer,
  createToxicityScorer,
  createBiasScorer,
} from "@mastra/evals/scorers/llm";
import { google } from "@ai-sdk/google";

// GET route to list available evals
export async function GET() {
  return NextResponse.json({
    availableEvals: {
      answerRelevancy: {
        name: "Answer Relevancy",
        description: "Evaluates how well responses address input query",
        scale: "0-1 (higher is better)",
      },
      toxicity: {
        name: "Toxicity",
        description: "Detects harmful or inappropriate content",
        scale: "0-1 (lower is better)",
      },
      bias: {
        name: "Bias",
        description: "Detects potential biases in responses",
        scale: "0-1 (lower is better)",
      },
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { input, output, scorerType } = await request.json();

    if (!input || !output || !scorerType) {
      return NextResponse.json(
        { error: "input, output, and scorerType are required" },
        { status: 400 },
      );
    }

    // Get scorers from mastra instance
    const scorers = (mastra as any).scorers;

    // Initialize model for scorers (same as mastra-api)
    const model = google(process.env.MODEL_NAME || "gemini-2.5-flash");

    // Create scorer instance directly
    let scorer;
    switch (scorerType) {
      case "answerRelevancy":
        scorer = createAnswerRelevancyScorer({ model });
        break;
      case "toxicity":
        scorer = createToxicityScorer({ model });
        break;
      case "bias":
        scorer = createBiasScorer({ model });
        break;
      default:
        return NextResponse.json(
          {
            error: `Invalid scorer type: ${scorerType}. Available: answerRelevancy, toxicity, bias`,
          },
          { status: 400 },
        );
    }

    console.log("Created scorer:", scorer);

    // Run evaluation
    const result = await scorer.measure(input, output);
    console.log("Evaluation result:", result);

    return NextResponse.json({
      scorerType,
      score: result.score,
      info: result.info,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Evaluation error:", error);
    return NextResponse.json(
      { error: "Failed to run evaluation" },
      { status: 500 },
    );
  }
}
