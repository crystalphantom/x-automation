# How to View Mastra AI Traces

## ✅ Current Status

Your Mastra AI tracing is **fully configured and working**! The database (`mastra.db`) exists with the correct tables:
- `mastra_ai_spans` - Individual agent/LLM operations
- `mastra_traces` - Top-level trace records

**Currently: 0 traces** (because no agents have been executed since enabling tracing)

---

## 🎯 Step 1: Generate Some Traces

First, let's create traces by using your agents. Choose one of these methods:

### Option A: Via Web UI (Easiest)

1. Open your app: `http://localhost:3000`
2. Upload a post or select an existing one
3. Click "Generate Comments"
4. ✅ This will execute all 4 agents and create traces!

### Option B: Via API Call

```bash
# Analyze a post (triggers Post Analyzer agent)
curl -X POST http://localhost:3000/api/posts/analyze \
  -H "Content-Type: application/json" \
  -d '{"postId": "your-post-id-here"}'

# Generate comments (triggers all 4 agents)
curl -X POST http://localhost:3000/api/comments/generate \
  -H "Content-Type: application/json" \
  -d '{"postId": "your-post-id-here"}'
```

---

## 📊 Step 2: View the Traces

### Method 1: SQLite Queries (Quick & Simple)

**Check if traces exist:**
```bash
cd apps/web
sqlite3 mastra.db "SELECT COUNT(*) FROM mastra_ai_spans;"
```

**View recent agent executions:**
```bash
sqlite3 -header -column mastra.db "
SELECT 
  name,
  spanType,
  datetime(startedAt) as started,
  CAST((julianday(endedAt) - julianday(startedAt)) * 86400000 AS INT) as duration_ms
FROM mastra_ai_spans 
WHERE endedAt IS NOT NULL
ORDER BY startedAt DESC 
LIMIT 10;
"
```

**View trace details with input/output:**
```bash
sqlite3 -header -column mastra.db "
SELECT 
  traceId,
  name,
  json_extract(input, '$.prompt') as prompt_preview,
  json_extract(output, '$.text') as response_preview
FROM mastra_ai_spans 
WHERE spanType = 'agent'
LIMIT 5;
"
```

### Method 2: Mastra Cloud (Production-Ready)

For a visual dashboard experience:

1. **Sign up at** https://cloud.mastra.ai
2. **Get your access token**
3. **Add to `.env.local`:**
   ```bash
   MASTRA_CLOUD_ACCESS_TOKEN=your_token_here
   ```
4. **Restart your dev server**
5. **Generate traces** (use your app)
6. **View in cloud dashboard** at cloud.mastra.ai → Observability → Traces

### Method 3: Custom Script

I've created a script you can use (once traces exist):

```bash
bun run scripts/view-traces.ts
```

This will show formatted output of your traces.

---

## 🔍 What You'll See in Traces

When you generate comments, expect traces like this:

```
Trace Group: comment-generation-[unique-id]
├── 📝 Post Analyzer (2-3s, ~450 tokens)
│   ├── Input: Original post content
│   └── Output: { category, sentiment, tone, complexity }
│
├── 🎯 Strategy Agent (1-2s, ~280 tokens)
│   ├── Input: Post metadata + user preferences  
│   └── Output: { should_comment, selected_tone, risk_level }
│
├── ✍️ Comment Generator (3-5s, ~900 tokens)
│   ├── Input: Post + strategy
│   └── Output: 3 comment variants
│
└── ✅ QA Agent (2-3s, ~600 tokens)
    ├── Input: Post + generated comments
    └── Output: Quality scores + recommendations
```

---

## 🎨 Advanced: Custom Trace Viewer

Add this script to quickly view traces:

```bash
# Add to package.json
"trace:view": "sqlite3 -header -column mastra.db 'SELECT * FROM mastra_ai_spans ORDER BY startedAt DESC LIMIT 20;'"
```

Then run:
```bash
bun run trace:view
```

---

## 🐛 Troubleshooting

### "0 traces found"
✅ **Solution:** Generate traces first by using your app or API

### "No such table: traces"  
✅ **Solution:** Use `mastra_ai_spans` (correct table name)

### "Mastra Studio not working"
✅ **Solution:** Mastra CLI v0.24.6 doesn't have a `studio` command. Use:
- SQLite queries (immediate)
- Mastra Cloud dashboard (recommended for production)

---

## 📌 Quick Commands Cheatsheet

```bash
# Check trace count
sqlite3 mastra.db "SELECT COUNT(*) FROM mastra_ai_spans;"

# View latest traces
sqlite3 mastra.db "SELECT name, spanType FROM mastra_ai_spans ORDER BY startedAt DESC LIMIT 10;"

# See full trace data for an agent
sqlite3 -json mastra.db "SELECT * FROM mastra_ai_spans WHERE name='Post Analyzer' LIMIT 1;" | jq

# View all agents executed
sqlite3 mastra.db "SELECT DISTINCT name FROM mastra_ai_spans WHERE spanType='agent';"
```

---

## 🚀 Next Steps

1. **Generate traces**: Use your app to create some comments
2. **Query traces**: Run the SQLite commands above
3. **Set up Mastra Cloud** (optional but recommended for production)
4. **Monitor performance**: Track which agents are slowest
5. **Optimize**: Use trace data to improve response times

---

**Ready to see your traces?** Just use your app at http://localhost:3000 and generate some comments! 🎉
