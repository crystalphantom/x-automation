# 🎯 AGL Integration - How to Monitor and Validate

## Current Status

✅ **AGL Server**: Running on port 4747  
✅ **Worker**: Running and waiting for tasks  
✅ **Fresh Rollouts**: 8 new posts queued for processing  

---

## Understanding What You're Seeing

### The Dots (`...`)
When you see dots in the worker output, it means:
- ✅ Worker is running and healthy
- ✅ Checking the queue every 5 seconds
- ℹ️  No tasks currently available in "queuing" status

**Why you saw dots before**: All 24 previous rollouts had already failed (due to missing API key earlier). The queue was empty.

**What should happen now**: With the 8 new rollouts we just submitted, the worker should start processing them!

---

## 📊 How to Monitor the System

### Option 1: Quick Status Check (One-time snapshot)
```bash
cd apps/mastra-api
bun run agl:status
```

**What it shows:**
- ✅ Server health
- 📊 Total rollouts by status (succeeded, failed, queuing, running)
- 📋 List of recent rollouts
- 🔄 Test dequeue to see if tasks are available

### Option 2: Real-Time Monitoring (Continuous updates)
```bash
cd apps/mastra-api
bun run agl:monitor
```

**What it shows:**
- 🔄 Updates every 2 seconds
- 📊 Count of rollouts by status  
- 📋 Recent active rollouts
- Press Ctrl+C to stop

### Option 3: Watch Worker Logs
The worker terminal should show:
```
📋 Processing rollout: ro-cb203d876e90
   Post: "Just launched our new TypeScript SDK..."
   Category: technology
   Sentiment: positive  
   Time: 245ms
   ✅ Completed (Total: 1)
```

---

## 🔍 What to Look For

### ✅ Success Indicators

1. **Worker Processing**:
   ```
   📋 Processing rollout: ro-xxxxx
   Category: technology
   Sentiment: positive
   ✅ Completed
   ```

2. **Status Changes**:
   - `queuing` → `running` → `succeeded` ✅
   
3. **Completion Messages**:
   - Tasks processed counter increases
   - No error messages

### ❌ Failure Indicators  

1. **API Key Issues**:
   ```
   ❌ Failed: Google Generative AI API key is missing
   ```
   **Fix**: Make sure `GOOGLE_GENERATIVE_AI_API_KEY` is set

2. **Connection Errors**:
   ```
   ❌ AGL server is not reachable
   ```
   **Fix**: Check if AGL server is running (`bun run agl:server`)

3. **Status stuck on `queuing`**:
   - Worker might not be running
   - Worker might have crashed
   
---

## 📈 View Results

### 1. Check Rollout Status
```bash
cd apps/mastra-api
bun run agl:status
```

Look for `succeeded` status on the recent rollouts.

### 2. View Traces in Mastra Studio
```bash
cd apps/mastra-api
bun run dev  # Starts Mastra Studio on port 4111
```

Then visit: http://localhost:4111

- Navigate to "Traces" or "Observability"
- You'll see execution traces for each agent call
- Shows timing, inputs, outputs

### 3. Query Specific Rollout
You can check individual rollouts:
```bash
curl http://localhost:4747/get_rollout_by_id/ro-cb203d876e90
```

---

## 🧪 Testing Workflow

### Step 1: Submit Test Posts
```bash
cd apps/mastra-api
bun run agl:submit
```
Expected: 8 rollouts enqueued

### Step 2: Start Monitor (Optional)
```bash
# In a new terminal
cd apps/mastra-api
bun run agl:monitor
```

### Step 3: Check Worker
The worker should automatically process the rollouts (if it's running).

You should see:
- Monitor showing count increasing for "succeeded"
- Worker showing processing logs
- Dots stop appearing (tasks being processed)

### Step 4: Verify Results
```bash
cd apps/mastra-api
bun run agl:status
```

Look for:
- ✅ 8 rollouts with `succeeded` status
- Tasks processed: 8

---

## 🏃‍♂️ Quick Command Reference

| Command | Purpose |
|---------|---------|
| `bun run agl:server` | Start AGL server (Terminal 1) |
| `bun run agl:worker` | Start worker (Terminal 2) |
| `bun run agl:submit` | Submit 8 test posts |
| `bun run agl:status` | One-time status check |
| `bun run agl:monitor` | Real-time monitoring |
| `bun run dev` | Start Mastra Studio |

---

## 🎬 What Should Be Happening Right Now

Since you just ran `bun run agl:submit`, you should:

1. **In Worker Terminal**: See `📋 Processing rollout...` messages
   - If still seeing dots, the API key might not be loaded
   - Try restarting the worker: Ctrl+C, then `GOOGLE_GENERATIVE_AI_API_KEY=your-key bun run agl:worker`

2. **Run Status Check**:
   ```bash
   cd apps/mastra-api
   bun run agl:status
   ```
   You should see some rollouts with `running` or `succeeded` status

3. **Run Monitor**:
   ```bash
   cd apps/mastra-api  
   bun run agl:monitor
   ```
   Watch the status counts change in real-time!

---

## 🐛 Troubleshooting

### Worker shows dots but rollouts exist
- Check API key is set: `echo $GOOGLE_GENERATIVE_AI_API_KEY`
- Restart worker with explicit API key
- Check if rollouts are actually in "queuing" status (not "failed")

### No rollouts showing
- AGL server might have been restarted (in-memory mode loses data)
- Submit new tasks: `bun run agl:submit`

### Worker crashes
- Check error message
- Ensure all dependencies installed
- Verify Mastra configuration is correct

---

## 📝 Next Steps

Once you see successful processing:

1. ✅ Verify all 8 rollouts succeeded
2. 📊 Compare results with expected classifications (shown in submit output)
3. 🔄 Submit more batches to collect training data
4. 📈 After 500+ rollouts, implement Python training script
5. 🚀 See 15-20% accuracy improvements!

---

**Try running `bun run agl:monitor` in a new terminal to watch the processing in real-time!** 🎉
