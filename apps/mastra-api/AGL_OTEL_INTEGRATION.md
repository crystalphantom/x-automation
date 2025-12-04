# 🔗 AGL OTEL Integration

This document explains how to use the OTEL-based (passive) integration pattern for AGL.

## Overview

There are two ways to integrate with AGL:

| Pattern | How It Works | Use Case |
|---------|--------------|----------|
| **Worker Queue** | AGL controls execution, worker runs agents | Batch testing, training data collection |
| **OTEL (Passive)** | Agents run normally, traces sent to AGL | Production monitoring, passive data collection |

This document covers the **OTEL (Passive)** pattern.

## How It Works

```
┌─────────────────────────────────────────────────┐
│            Your Application                     │
│                                                 │
│  User Action → API Route → Mastra Agent        │
│                     │                          │
│                     ↓                          │
│           OTEL Instrumentation                 │
│              (Automatic)                       │
└─────────────────────────────────────────────────┘
                      │
                      │ Traces (via AGLSpanExporter)
                      ↓
┌─────────────────────────────────────────────────┐
│            AGL Server (Port 4747)               │
│                                                 │
│  • Receives spans as rollouts                  │
│  • Stores execution data                       │
│  • Ready for analysis/training                 │
└─────────────────────────────────────────────────┘
```

## Setup

### 1. Start AGL Server

```bash
cd /Users/vaishnav/playground1/battleground/x-automation
source .venv/bin/activate
agl store --port 4747
```

### 2. Enable OTEL Integration

Set the environment variable:

```bash
export AGL_ENABLED=true
```

Or add to your `.env` file:

```
AGL_ENABLED=true
```

### 3. Test the Integration

```bash
cd apps/mastra-api
bun run agl:otel-test
```

This will:
1. Check if AGL server is running
2. Run the Post Analyzer agent
3. Verify traces were sent to AGL

## Files Created

| File | Purpose |
|------|---------|
| `src/agl/otel-exporter.ts` | Custom SpanExporter that sends traces to AGL |
| `src/agl/instrumentation.ts` | OTEL instrumentation setup |
| `src/agl/test-otel.ts` | Test script for OTEL integration |

## How the Custom Exporter Works

### 1. Span Capture

The `AGLSpanExporter` implements OpenTelemetry's `SpanExporter` interface:

```typescript
class AGLSpanExporter implements SpanExporter {
  async export(spans: ReadableSpan[], resultCallback) {
    for (const span of spans) {
      await this.exportSpan(span);
    }
  }
}
```

### 2. Rollout Creation

When an agent execution starts (root span), we create a rollout in AGL:

```typescript
private async createRollout(span, traceId) {
  // POST /enqueue_rollout - Create new rollout
  // POST /start_rollout - Move to running state
  // POST /start_attempt - Create attempt within rollout
}
```

### 3. Span Storage

Each span is converted to AGL format and stored:

```typescript
// AGL Span Format
{
  rollout_id: "ro-abc123",
  attempt_id: "at-def456",
  sequence_id: 0,
  trace_id: "abc...",
  span_id: "def...",
  name: "agent.postAnalyzer.generate",
  attributes: { ... },
  start_time: 1234567890.123,
  end_time: 1234567891.456,
}
```

## Usage in Production

### Option 1: Mastra Dev Server

```bash
AGL_ENABLED=true bun run dev
```

### Option 2: Next.js App

Add to your `instrumentation.ts`:

```typescript
// apps/web/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Import AGL instrumentation FIRST
    await import('mastra-api/src/agl/instrumentation');
    
    // Then Mastra
    const { mastra } = await import('./lib/mastra.config');
    console.log('✅ Mastra + AGL initialized');
  }
}
```

### Option 3: Standalone Script

```typescript
// Always import instrumentation FIRST
import '../agl/instrumentation';
import { mastra } from './mastra';

// Your code here...
```

## Checking Results

### Quick Status

```bash
bun run agl:status
```

### Query Rollouts

```bash
curl -X POST http://localhost:4747/query_rollouts \
  -H "Content-Type: application/json" \
  -d '{"limit": 10}'
```

### Monitor Real-Time

```bash
bun run agl:monitor
```

## Comparison: OTEL vs Worker

| Aspect | OTEL (Passive) | Worker (Active) |
|--------|---------------|-----------------|
| **When to use** | Production, monitoring | Testing, training |
| **Execution control** | Agent runs naturally | AGL controls timing |
| **Setup complexity** | Low | Medium |
| **Data collection** | From real usage | From test cases |
| **Ground truth** | Harder (need proxy signals) | Easier (you define expected output) |
| **Scalability** | Automatic | Manual batch submission |

## Troubleshooting

### Traces Not Appearing

1. Check `AGL_ENABLED=true` is set
2. Verify AGL server is running: `curl http://localhost:4747/health`
3. Check for errors in console output
4. Ensure instrumentation is imported FIRST

### Connection Errors

```
❌ AGL Server is not reachable at http://localhost:4747
```

Start the AGL server:
```bash
agl store --port 4747
```

### No Rollouts Created

This might mean spans aren't being recognized as agent executions. Check:
- Span names include "agent", "generate", or "mastra"
- Root spans are being detected correctly

## Next Steps

1. **Test the integration**: `bun run agl:otel-test`
2. **Monitor in production**: `bun run agl:monitor`
3. **Add evaluation**: After collecting data, use `bun run agl:eval`
4. **Train models**: When you have 500+ rollouts with rewards

## Commands Summary

```bash
# Start AGL server
bun run agl:server

# Test OTEL integration
bun run agl:otel-test

# Check status  
bun run agl:status

# Monitor real-time
bun run agl:monitor

# Analyze collected data
bun run agl:analyze

# Evaluate rollouts (add rewards)
bun run agl:eval
```
