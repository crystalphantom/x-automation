# Mastra API - X Automation Agents

AI-powered agents for intelligent Twitter/X engagement, built with [Mastra](https://mastra.ai).

## Quick Start

```bash
# Install dependencies
bun install

# Start Mastra Studio
pnpm dev
```

Open [http://localhost:4111](http://localhost:4111) for Mastra Studio.

---

## Agents

### 1. Post Analyzer
Analyzes Twitter/X posts and extracts structured metadata.

**Output:**
```json
{
  "post_id": "string",
  "primary_category": "technology|startups|product_management|general",
  "sentiment": "positive|negative|neutral",
  "post_type": "question|opinion|news|meme|promotional|discussion",
  "tone": "string",
  "complexity": "simple|moderate|complex"
}
```

### 2. Strategy Agent
Decides whether and how to engage with a post.

**Output:**
```json
{
  "should_comment": true,
  "confidence": 0.85,
  "selected_tone": "professional_insightful",
  "comment_style": "insight_based",
  "length": "medium",
  "include_emoji": false,
  "risk_level": "low",
  "reasoning": "..."
}
```

### 3. Comment Generator
Creates engaging, contextually relevant comments.

**Output:**
```json
{
  "variants": [
    { "version": 1, "comment": "...", "style": "...", "length": 25 }
  ]
}
```

### 4. Quality Assurance Agent
Evaluates generated comments for quality and safety.

**Output:**
```json
{
  "variant_scores": [
    {
      "version": 1,
      "quality_score": 0.9,
      "relevance_score": 0.85,
      "safety_score": 1.0,
      "engagement_potential": 0.8,
      "recommendation": "highly_recommended",
      "issues": []
    }
  ],
  "recommended_variant": 1,
  "overall_assessment": "safe_to_post"
}
```

---

## Scorers

Scorers evaluate AI outputs in real-time and can be used for trace evaluation in Mastra Studio.

| Scorer | Description | Score Range |
|--------|-------------|-------------|
| `answerRelevancy` | How well responses address the input | 0-1 (higher = better) |
| `toxicity` | Detects harmful content | 0-1 (lower = better) |
| `bias` | Detects potential biases | 0-1 (lower = better) |

### Agent-Level Scorers

| Agent | Scorers |
|-------|---------|
| Post Analyzer | `answerRelevancy` |
| Strategy Agent | `answerRelevancy` |
| Comment Generator | `toxicity`, `bias` |
| Quality Assurance | `answerRelevancy` |

### Using Scorers in Studio

1. Run `pnpm dev` to start Mastra Studio
2. Execute an agent in the **Playground**
3. View real-time scores in the **Scorers tab**
4. For trace evaluation, go to **Observability** and select historical traces

---

## Usage

```typescript
import { 
  analyzePost, 
  makeStrategyDecision, 
  generateComments, 
  assessQuality 
} from "mastra-api";

// 1. Analyze a post
const metadata = await analyzePost({
  id: "123",
  author: "@user",
  content: "Just shipped a new feature!",
  timestamp: new Date().toISOString(),
});

// 2. Get strategy decision
const strategy = await makeStrategyDecision(metadata, userPreferences);

// 3. Generate comments
if (strategy.should_comment) {
  const comments = await generateComments(post, strategy);
  
  // 4. QA check
  const qa = await assessQuality(post.content, comments);
}
```

---

## Environment Variables

```env
MODEL_NAME=gemini-2.5-flash  # Optional, defaults to gemini-2.5-flash
GOOGLE_API_KEY=your-api-key
```

## License

MIT
