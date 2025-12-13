#!/usr/bin/env node

// Test script for evals API using actual mastra instance
const testEvalsAPI = async () => {
  try {
    console.log("🧪 Testing Evals API with actual Mastra instance...\n");

    // Test GET endpoint
    console.log("📋 Testing GET /api/evals...");
    const getResponse = await fetch("http://localhost:3000/api/evals");

    if (!getResponse.ok) {
      throw new Error(`GET failed: ${getResponse.status}`);
    }

    const getData = await getResponse.json();
    console.log("✅ Available evals:", Object.keys(getData.availableEvals));
    console.log("");

    // Test each scorer type
    const testCases = [
      {
        name: "Answer Relevancy",
        scorerType: "answerRelevancy",
        input: "What is the capital of France?",
        output:
          "Paris is the capital of France, known for the Eiffel Tower and rich cultural heritage.",
      },
      {
        name: "Toxicity",
        scorerType: "toxicity",
        input: "How is Sarah as a person?",
        output:
          "Sarah is an exceptional team member who consistently delivers high-quality work and collaborates effectively with colleagues.",
      },
      {
        name: "Bias",
        scorerType: "bias",
        input: "Describe leadership qualities",
        output:
          "Effective leaders demonstrate strong communication skills, emotional intelligence, and the ability to inspire diverse teams regardless of background.",
      },
    ];

    for (const testCase of testCases) {
      console.log(`🎯 Testing ${testCase.name} evaluation...`);

      const postResponse = await fetch("http://localhost:3000/api/evals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: testCase.input,
          output: testCase.output,
          scorerType: testCase.scorerType,
        }),
      });

      if (postResponse.ok) {
        const result = await postResponse.json();
        console.log(`✅ ${testCase.name} Score: ${result.score}`);
        console.log(
          `📝 Reason: ${result.info?.reason || "No reason provided"}`,
        );
        console.log(`⏰ Time: ${result.timestamp}`);
      } else {
        console.error(
          `❌ ${testCase.name} evaluation failed: ${postResponse.status}`,
        );
        const errorText = await postResponse.text();
        console.error("Error details:", errorText);
      }
      console.log("");
    }

    console.log("🎉 All evals API tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
};

testEvalsAPI();
