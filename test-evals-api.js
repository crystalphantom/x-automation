#!/usr/bin/env node

// Simple test script to demonstrate evals API
const testEvalsAPI = async () => {
  try {
    // Test GET endpoint
    console.log("Testing GET /api/evals...");
    const getResponse = await fetch("http://localhost:3000/api/evals");
    const getData = await getResponse.json();
    console.log("Available evals:", getData);

    // Test POST endpoint
    console.log("\nTesting POST /api/evals...");
    const postResponse = await fetch("http://localhost:3000/api/evals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: "What is the capital of France?",
        output: "Paris is the capital of France.",
        scorerType: "answerRelevancy",
      }),
    });

    if (postResponse.ok) {
      const postData = await postResponse.json();
      console.log("Evaluation result:", postData);
    } else {
      console.error("POST request failed:", postResponse.status);
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
};

testEvalsAPI();
