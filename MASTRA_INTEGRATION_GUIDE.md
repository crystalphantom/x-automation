# Mastra Agents Integration & Deployment Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [How Mastra-API is Used in Web App](#how-mastra-api-is-used-in-web-app)
3. [Development Setup](#development-setup)
4. [Deployment Architecture](#deployment-architecture)
5. [Agent Monitoring & Observability](#agent-monitoring--observability)
6. [Production Considerations](#production-considerations)

---

## Architecture Overview

### Project Structure

This is a **monorepo** with two main applications:

```
x-automation/
├── apps/
│   ├── web/                    # Next.js frontend (port 3000)
│   │   ├── app/api/            # API routes that call agents
│   │   └── lib/mastra.config.ts # Imports mastra instance
│   └── mastra-api/             # Mastra agents package (port 4111)
│       └── src/mastra/         # Agent definitions
│           ├── index.ts         # Mastra instance & exports
│           └── agents/          # 4 AI agents
└── package.json                # Monorepo root
```

### Key Principle: Library Pattern, Not Microservice

**Important:** `mastra-api` is a **library package**, not a separate server. It's imported directly into the Next.js app as a dependency.

```json
// apps/web/package.json
{
  "dependencies": {
    "mastra-api": "*"  // ← Local workspace dependency
  }
}
```

---

## How Mastra-API is Used in Web App

### 1. Package Structure

**mastra-api exports:**
```typescript
// apps/mastra-api/src/mastra/index.ts
export const mastra = new Mastra({
  agents: {
    postAnalyzer,
    strategy,
    commentGenerator,
    qa
  },
  storage: new LibSQLStore({ url: `file:${DB_PATH}` })
})

// Export agent functions for direct use
export { analyzePost, makeStrategyDecision, generateComments, assessQuality }

// Export types
export type { PostMetadata, RawPost, UserPreferences }
```

### 2. Web App Import Pattern

**Step 1: Re-export Mastra instance**
```typescript
// apps/web/lib/mastra.config.ts
export { mastra } from "mastra-api";
```

**Step 2: Initialize in Next.js instrumentation**
```typescript
// apps/web/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { mastra } = await import('./lib/mastra.config')
    console.log('✅ Mastra AI Tracing initialized')
  }
}
```

**Step 3: Use agents in API routes**
```typescript
// apps/web/app/api/comments/generate/route.ts
import { analyzePost, makeStrategyDecision, generateComments, assessQuality } from "mastra-api"
import type { RawPost, UserPreferences, PostMetadata } from "mastra-api"

export async function POST(request: NextRequest) {
  // Step 1: Analyze post
  const metadata = await analyzePost(rawPost)
  
  // Step 2: Make strategy decision
  const strategy = await makeStrategyDecision(metadata, preferences)
  
  // Step 3: Generate comments
  const comments = await generateComments(metadata, strategy, preferences)
  
  // Step 4: Quality check
  const quality = await assessQuality(comments, metadata, strategy)
  
  return NextResponse.json({ metadata, strategy, comments, quality })
}
```

### 3. Agent Execution Flow

```
User Request (Browser)
    ↓
Next.js API Route (/api/comments/generate)
    ↓
Import agent functions from "mastra-api"
    ↓
Execute agents (in-process, same Node.js runtime)
    ↓
Agents call LLMs (Google Gemini)
    ↓
Traces written to mastra.db (LibSQL)
    ↓
Response returned to user
```

**Key Point:** Agents run **inside the Next.js server process**, not as a separate service.

---

## Development Setup

### Running Locally

You need **two separate terminal sessions**:

#### Terminal 1: Mastra Studio (Development UI)
```bash
cd apps/mastra-api
bun run dev
# Starts Mastra Studio on http://localhost:4111
```

**What it does:**
- Launches Mastra Studio web interface
- Provides UI to view traces, logs, and agent executions
- Reads from shared `mastra.db` database

#### Terminal 2: Next.js Web App
```bash
cd apps/web
bun run dev
# Starts Next.js on http://localhost:3000
```

**What it does:**
- Runs Next.js dev server
- Imports and executes agents from `mastra-api`
- Writes traces to shared `mastra.db`

### Why Two Servers in Development?

| Server | Purpose | Required For |
|--------|---------|--------------|
| Mastra Studio (4111) | Development/debugging UI | Viewing traces, testing agents |
| Next.js (3000) | Application server | Running your app |

**In production, you typically don't run Mastra Studio** - traces are exported to external observability platforms.

### Shared Database Architecture

Both processes share the **same SQLite database**:

```
apps/mastra-api/mastra.db  ← Shared trace storage
```

This is achieved using **absolute paths**:

```typescript
// apps/mastra-api/src/mastra/index.ts
const DB_PATH = join(_moduleDirname, "..", "..", "mastra.db")
console.log("🗄️  Mastra database path:", DB_PATH)

export const mastra = new Mastra({
  storage: new LibSQLStore({ url: `file:${DB_PATH}` })
})
```

When the web app imports this mastra instance, it uses the **exact same database file**.

---

## Deployment Architecture

### Option 1: Single Next.js Deployment (Recommended)

**Architecture:**
```
┌─────────────────────────────────────┐
│   Next.js App (Vercel/Docker)       │
│                                      │
│   ┌──────────────────────────────┐  │
│   │  API Routes                  │  │
│   │  ├─ /api/posts/analyze       │  │
│   │  ├─ /api/comments/generate   │  │
│   │  └─ /api/evaluate            │  │
│   └──────────────────────────────┘  │
│              ↓                       │
│   ┌──────────────────────────────┐  │
│   │  Mastra Agents (in-process)  │  │
│   │  ├─ Post Analyzer            │  │
│   │  ├─ Strategy Agent           │  │
│   │  ├─ Comment Generator        │  │
│   │  └─ Quality Assurance        │  │
│   └──────────────────────────────┘  │
│              ↓                       │
│   ┌──────────────────────────────┐  │
│   │  Traces → OTLP Exporter      │  │
│   └──────────────────────────────┘  │
└─────────────────────────────────────┘
              ↓
  ┌───────────────────────────┐
  │  Observability Platform   │
  │  (Opik, Langfuse, etc.)   │
  └───────────────────────────┘
```

**Deployment Steps:**

1. **Build the monorepo:**
```bash
bun install
bun run build
```

2. **Deploy to Vercel:**
```bash
cd apps/web
vercel deploy
```

3. **Environment Variables:**
```env
# .env.production
GOOGLE_GENERATIVE_AI_API_KEY=your_key
OTEL_EXPORTER_OTLP_ENDPOINT=https://opik.comet.com/otlp
OTEL_EXPORTER_OTLP_HEADERS=authorization=your_token
OPIK_API_KEY=your_key
OPIK_PROJECT_NAME=x-automation
```

**Key Benefits:**
- ✅ Simple deployment (single service)
- ✅ No network latency between app and agents
- ✅ Shared memory and resources
- ✅ Works great for Vercel/Netlify/Railway

### Option 2: Docker Deployment

**Dockerfile:**
```dockerfile
FROM oven/bun:1.2 AS builder

WORKDIR /app
COPY . .
RUN bun install
RUN bun run build

FROM oven/bun:1.2

WORKDIR /app
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["bun", "run", "start"]
```

**Docker Compose:**
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - GOOGLE_GENERATIVE_AI_API_KEY=${GOOGLE_GENERATIVE_AI_API_KEY}
      - OTEL_EXPORTER_OTLP_ENDPOINT=${OTEL_EXPORTER_OTLP_ENDPOINT}
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - ./data:/app/data  # For mastra.db if using local storage
```

### Option 3: Separate Agent Service (Advanced)

If you need to scale agents independently:

**Architecture:**
```
┌──────────────────┐         ┌─────────────────────┐
│   Next.js Web    │         │   Mastra API        │
│   (Frontend)     │────────▶│   (Agent Server)    │
│   Port 3000      │  HTTP   │   Port 4000         │
└──────────────────┘         └─────────────────────┘
```

**Agent Server (apps/mastra-api/server.ts):**
```typescript
import { mastra } from "./src/mastra/index"
import express from "express"

const app = express()
app.use(express.json())

app.post("/analyze", async (req, res) => {
  const { post } = req.body
  const result = await analyzePost(post)
  res.json(result)
})

app.listen(4000, () => {
  console.log("Agent server running on port 4000")
})
```

**Web App API Route:**
```typescript
// apps/web/app/api/posts/analyze/route.ts
export async function POST(request: NextRequest) {
  const { postId } = await request.json()
  
  // Call separate agent service
  const response = await fetch(`${process.env.AGENT_SERVICE_URL}/analyze`, {
    method: "POST",
    body: JSON.stringify({ post: rawPost })
  })
  
  return NextResponse.json(await response.json())
}
```

**When to use this:**
- You need to scale agents independently from web app
- Different teams manage frontend vs. agents
- Agents are used by multiple applications

---

## Agent Monitoring & Observability

### 1. Development Monitoring: Mastra Studio

**Access:** http://localhost:4111

**Features:**
- **Traces:** View execution timeline of all agent calls
- **Logs:** See detailed logs from each agent
- **Agents:** Test agents directly in UI
- **Scorers:** Run evaluations (toxicity, relevance, bias)

**Start Mastra Studio:**
```bash
cd apps/mastra-api
bun run dev
```

**View traces in database:**
```bash
cd apps/mastra-api
sqlite3 mastra.db "SELECT name, spanType, startedAt FROM mastra_ai_spans ORDER BY startedAt DESC LIMIT 10;"
```

### 2. Production Monitoring: OTLP Export

Mastra uses **OpenTelemetry** to export traces to external platforms.

**Supported Platforms:**
- [Opik](https://www.comet.com/opik) (Comet)
- [Langfuse](https://langfuse.com/)
- [Datadog](https://www.datadoghq.com/)
- [Honeycomb](https://www.honeycomb.io/)
- Any OTLP-compatible platform

**Configuration:**

```typescript
// apps/mastra-api/src/mastra/index.ts
import { OpikExporter } from "@mastra/opik"

export const mastra = new Mastra({
  agents: { /* ... */ },
  
  observability: {
    configs: {
      opik: {
        serviceName: "x-automation",
        exporters: [
          new OpikExporter({
            apiKey: process.env.OPIK_API_KEY!,
            apiUrl: process.env.OTEL_EXPORTER_OTLP_ENDPOINT!,
            projectName: "x-automation",
            workspaceName: "your-workspace",
            realtime: true,
            logLevel: "debug",
          }),
        ],
      },
    },
  },
})
```

**Environment Variables:**
```env
OTEL_EXPORTER_OTLP_ENDPOINT=https://opik.comet.com/otlp
OTEL_EXPORTER_OTLP_HEADERS=authorization=your_token
OPIK_API_KEY=your_api_key
OPIK_PROJECT_NAME=x-automation
```

### 3. Agent Lightning (AGL) Monitoring

For advanced agent training and monitoring, use **Agent Lightning**:

**Architecture:**
```
┌──────────────────┐         ┌─────────────────────┐
│   AGL Server     │         │   AGL Worker        │
│   Port 4747      │◀────────│   (Processes Tasks) │
└──────────────────┘         └─────────────────────┘
        ↓                              ↑
  Queue/History                        │
                                Fetches rollouts
```

**Start AGL Server:**
```bash
cd apps/mastra-api
bun run agl:server
# Starts on port 4747
```

**Start AGL Worker:**
```bash
cd apps/mastra-api
bun run agl:worker
```

**Submit Test Tasks:**
```bash
bun run agl:submit
```

**Monitor in Real-Time:**
```bash
# Option 1: Quick status check
bun run agl:status

# Option 2: Continuous monitoring
bun run agl:monitor
```

**What AGL Provides:**
- 📊 Task queue management
- 🔄 Rollout history and versioning
- 📈 Performance metrics per agent
- 🎯 A/B testing capabilities
- 🧠 Continuous learning from feedback

See [AGL_MONITORING_GUIDE.md](apps/mastra-api/AGL_MONITORING_GUIDE.md) for details.

### 4. Trace Data Structure

**What's Captured:**
```json
{
  "traceId": "trace-uuid",
  "name": "postAnalyzer",
  "spanType": "agent",
  "input": {
    "prompt": "Analyze this post...",
    "post": { "id": "123", "content": "..." }
  },
  "output": {
    "text": "{\"primary_category\":\"technology\"}",
    "metadata": { "primary_category": "technology", "sentiment": "positive" }
  },
  "startedAt": "2026-02-15T10:00:00Z",
  "endedAt": "2026-02-15T10:00:02Z",
  "duration": 2000,
  "modelUsage": {
    "inputTokens": 150,
    "outputTokens": 50,
    "totalCost": 0.0001
  }
}
```

### 5. Monitoring Dashboards

**Key Metrics to Track:**

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| Execution Time | How long each agent takes | > 5 seconds |
| Token Usage | LLM tokens consumed | Track costs |
| Error Rate | Failed agent executions | > 5% |
| Quality Scores | QA agent scores | < 0.7 |
| Throughput | Comments generated/hour | Capacity planning |

**Example Opik Dashboard:**
- Total agent calls per day
- Average execution time per agent
- Cost per request
- Error rate trends
- Token usage over time

---

## Production Considerations

### 1. Database Strategy

**Development:** Local SQLite
```typescript
storage: new LibSQLStore({
  url: `file:${DB_PATH}`
})
```

**Production:** Remote LibSQL (Turso)
```typescript
storage: new LibSQLStore({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})
```

**Why Turso?**
- ✅ Serverless SQLite-compatible database
- ✅ Global edge deployment
- ✅ No connection limit issues
- ✅ Built-in replication

### 2. Environment Variables

Create separate `.env` files:

**.env.development:**
```env
# Development uses local SQLite
DATABASE_URL=file:./mastra.db

# LLM Provider
GOOGLE_GENERATIVE_AI_API_KEY=your_dev_key
MODEL_NAME=gemini-2.0-flash-exp

# Observability (optional in dev)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

**.env.production:**
```env
# Production uses Turso
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_token

# LLM Provider
GOOGLE_GENERATIVE_AI_API_KEY=your_prod_key
MODEL_NAME=gemini-2.0-flash-exp

# Observability (required)
OTEL_EXPORTER_OTLP_ENDPOINT=https://opik.comet.com/otlp
OTEL_EXPORTER_OTLP_HEADERS=authorization=your_token
OPIK_API_KEY=your_key
OPIK_PROJECT_NAME=x-automation
```

### 3. Scaling Considerations

**Serverless (Vercel/Netlify):**
- ✅ Agents run in serverless functions
- ✅ Auto-scales with traffic
- ⚠️ Cold start time (~1-3s)
- ⚠️ Function timeout (10-60s limit)

**Container (Docker/Kubernetes):**
- ✅ Consistent performance
- ✅ No cold starts
- ✅ Longer timeout limits
- ⚠️ Need to manage scaling

**Hybrid Approach:**
- Web app on Vercel
- Long-running agents in Railway/Fly.io
- Communication via HTTP or message queue

### 4. Cost Management

**Token Usage Tracking:**
```typescript
// Check token usage in traces
const usage = await mastra.telemetry.getUsage({
  startDate: "2026-02-01",
  endDate: "2026-02-15"
})

console.log("Total tokens:", usage.totalTokens)
console.log("Estimated cost:", usage.estimatedCost)
```

**Budget Alerts:**
```typescript
// Set up cost alerts in your observability platform
if (dailyCost > DAILY_BUDGET) {
  await sendAlert("Budget exceeded!")
}
```

### 5. Error Handling

**Retry Logic:**
```typescript
import { retry } from "@mastra/core"

const result = await retry(
  () => analyzePost(post),
  {
    maxAttempts: 3,
    backoff: "exponential",
    onRetry: (attempt) => console.log(`Retry attempt ${attempt}`)
  }
)
```

**Fallback Strategies:**
```typescript
try {
  const metadata = await analyzePost(post)
} catch (error) {
  console.error("Analysis failed:", error)
  
  // Fallback to default metadata
  const metadata = {
    primary_category: "general",
    sentiment: "neutral",
    complexity: "moderate"
  }
}
```

---

## Quick Reference

### Commands

```bash
# Development
bun run dev                    # Start all services
cd apps/web && bun run dev     # Web app only (port 3000)
cd apps/mastra-api && bun run dev  # Mastra Studio (port 4111)

# Production Build
bun run build                  # Build all packages
cd apps/web && bun run start   # Start production server

# Monitoring
bun run agl:status             # Check agent status
bun run agl:monitor            # Real-time monitoring
bun run trace:view             # View SQLite traces

# Database
cd apps/web && bun run db:push     # Push Supabase schema
cd apps/web && bun run db:studio   # Open Drizzle Studio
```

### Key URLs

| Service | Development | Production |
|---------|-------------|------------|
| Web App | http://localhost:3000 | Your domain |
| Mastra Studio | http://localhost:4111 | N/A (dev only) |
| AGL Server | http://localhost:4747 | N/A (dev only) |
| Opik Dashboard | https://opik.comet.com | https://opik.comet.com |

### Architecture Decision: Why Library Pattern?

✅ **Advantages:**
- Simple deployment (single artifact)
- No network latency
- Type-safe imports
- Shared memory/cache
- Easier debugging

❌ **Trade-offs:**
- Agents can't scale independently
- Coupled deployment
- Resource sharing with web app

**Recommendation:** Start with library pattern, migrate to separate service only if needed for scale.

---

## Additional Resources

- [Mastra Documentation](https://mastra.ai/docs)
- [AGENTS.md](./AGENTS.md) - Agent specifications
- [AGL_MONITORING_GUIDE.md](./apps/mastra-api/AGL_MONITORING_GUIDE.md) - AGL setup
- [MASTRA_STUDIO_SETUP.md](./MASTRA_STUDIO_SETUP.md) - Studio configuration
- [VIEWING_TRACES.md](./apps/web/docs/VIEWING_TRACES.md) - Trace viewing guide

---

## Support & Feedback

Questions? Issues?
- Open an issue in the repository
- Check [Mastra Discord](https://discord.gg/mastra)
- Review example traces in Opik dashboard
