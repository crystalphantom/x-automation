# 🎓 AGL Framework: Complete Understanding

## Your Questions (Answered)

### Q1: "Don't workers just execute the agent? Shouldn't AGL only collect traces?"

**You're absolutely right to question this!** There are TWO different patterns:

---

## 📐 The Two Integration Patterns

### Pattern A: OTLP Passive Collection (Production Use)

```
┌──────────────────────────────────────┐
│         Your Web Application         │
│                                      │
│  User visits page                    │
│    ↓                                 │
│  POST /api/analyze-post              │
│    ↓                                 │
│  postAnalyzer.generate(post)  ←──────┼─── This is YOUR code
│    ↓                                 │      running normally
│  Return category & sentiment         │
└──────────────────────────────────────┘
            │
            │ Automatic OTLP traces
            │ (Mastra sends these)
            ↓
┌──────────────────────────────────────┐
│         AGL Server                   │
│  (Just collects & stores traces)     │
│  - Doesn't control execution         │
│  - Doesn't run the agent             │
│  - Just observes                     │
└──────────────────────────────────────┘
```

**This is what you were thinking!**
- ✅ Your app runs normally
- ✅ AGL passively collects execution traces
- ✅ No "worker" needed
- ✅ No duplicate execution

---

### Pattern B: Worker Queue (Training/Testing Use)

```
┌──────────────────────────────────────┐
│       Your Web Application           │
│   (Runs separately, no change)       │
└──────────────────────────────────────┘

        Meanwhile, for TRAINING:

┌──────────────────────────────────────┐
│         Test Harness                 │
│  submitTestPosts() →                 │
└──────────────────────────────────────┘
            ↓
┌──────────────────────────────────────┐
│         AGL Server                   │
│  Queue: [task1, task2, task3...]     │
└──────────────────────────────────────┘
            ↓
┌──────────────────────────────────────┐
│         AGL Worker                   │
│  1. Dequeue task                     │
│  2. Execute agent (same code!)       │
│  3. Report results                   │
└──────────────────────────────────────┘
            ↓
┌──────────────────────────────────────┐
│      Post Analyzer Agent             │
│   (Same agent, different context)    │
└──────────────────────────────────────┘
```

**This is what I built!**
- ✅ Separate from production
- ✅ Controlled testing environment
- ✅ Can batch 1000s of test cases
- ✅ Good for systematic evaluation

---

## 🤔 Why Did I Build Pattern B?

**Short answer:** For **systematic training data collection**.

**Long answer:**

1. **Production OTLP** (Pattern A) gives you real user data, but:
   - ❌ Can't control what posts users send
   - ❌ Can't guarantee diverse test coverage
   - ❌ Hard to get labeled ground truth
   - ❌ Real users don't want to wait for experiments

2. **Worker Queue** (Pattern B) lets you:
   - ✅ Submit specific test cases
   - ✅ Know the expected output (ground truth)
   - ✅ Run 1000s of variations quickly
   - ✅ Compare different prompts systematically

**Analogy:**
- Pattern A = Collecting data from real customers
- Pattern B = Running controlled A/B tests in a lab

**Both are useful!** You can use BOTH:
- Use Pattern A for production traces
- Use Pattern B for systematic evaluation

---

## Q2: "Without evals, how does AGL know if output is correct?"

**You're 100% correct!** AGL **cannot** optimize without a reward signal.

### The Missing Piece: Reward / Evaluation

```
┌────────────────────────────────────┐
│  What AGL Collects (Automatic)     │
├────────────────────────────────────┤
│ Input:  "Just launched our SDK!"   │
│ Output: category = "technology"    │
│ Time:   3.7 seconds                │
│ Tokens: 150                        │
└────────────────────────────────────┘
            ↓
       ❓ QUESTION ❓
            ↓
  "Is 'technology' correct?"
            ↓
┌────────────────────────────────────┐
│  What You MUST Add                 │
├────────────────────────────────────┤
│ Reward / Evaluation Signal:        │
│  - Ground truth comparison         │
│  - Human rating                    │
│  - Success metric                  │
│  - LLM-as-judge                    │
└────────────────────────────────────┘
```

### Without Rewards → No Learning

**What AGL can do:**
- ✅ Collect execution traces
- ✅ Store input/output pairs
- ✅ Track timing and resource usage
- ✅ Organize rollouts and attempts

**What AGL CANNOT do without rewards:**
- ❌ Know if output is "good" or "bad"
- ❌ Optimize prompts
- ❌ Train with RL
- ❌ Improve agent performance

**Think of it like a student:**
- Collecting traces = Taking notes in class
- Rewards = Getting grades on homework
- Without grades, student doesn't know what to improve!

---

## 🎯 How to Add Rewards (4 Approaches)

### Approach 1: Ground Truth Labels (What I Added)

```typescript
// test-data.ts
export const expectedClassifications = {
  "test-tech-1": { 
    category: "technology", 
    sentiment: "positive" 
  },
  // ... more labeled data
};

// evaluate-rollouts.ts
const expected = expectedClassifications[postId];
const actual = rollout.output.category;

const reward = (actual === expected.category) ? 1.0 : -1.0;

// Store reward in rollout metadata
updateRollout(rolloutId, { 
  metadata: { 
    reward: reward  // ← This is what RL uses!
  } 
});
```

**Pros:**
- ✅ Accurate
- ✅ You define what "correct" means

**Cons:**
- ❌ Requires manual labeling
- ❌ Doesn't scale beyond test set

---

### Approach 2: Human Feedback (RLHF)

```typescript
// Show human the result, get feedback
async function collectHumanFeedback(rollout) {
  const rating = await showToHuman({
    input: rollout.input.post,
    output: rollout.output.category,
  });
  
  // rating = 1 (good) to 5 (excellent)
  const reward = (rating - 3) / 2; // Scale to [-1, 1]
  
  updateRollout(rolloutId, {
    metadata: { reward: reward }
  });
}
```

**Pros:**
- ✅ Real human judgment
- ✅ Can capture nuance

**Cons:**
- ❌ Expensive
- ❌ Slow
- ❌ Doesn't scale

---

### Approach 3: Proxy Metrics (Indirect Signal)

```typescript
// Use downstream success as reward
async function calculateProxyReward(rollout) {
  const postId = rollout.input.post.id;
  
  //  Did user engage with the suggested action?
  const userEngaged = await checkUserEngagement(postId);
  
  // Did the pipeline succeed?
  const pipelineSucceeded = await checkPipelineSuccess(postId);
  
  let reward = 0;
  if (userEngaged) reward += 0.5;
  if (pipelineSucceeded) reward += 0.5;
  
  return reward;
}
```

**Pros:**
- ✅ Real-world signal
- ✅ Automatically collected

**Cons:**
- ❌ Noisy (many confounding factors)
- ❌ Delayed feedback

---

### Approach 4: LLM-as-Judge

```typescript
async function llmJudgeReward(rollout) {
  const judgePrompt = `
    Post: "${rollout.input.post.content}"
    Classified as: ${rollout.output.category}
    
    Is this classification correct?
    Categories:
    - technology: tech, code, APIs, frameworks
    - startups: fundraising, growth, hiring
    - product_management: features, users, product
    - general: everything else
    
    Answer: CORRECT or INCORRECT
  `;
  
  const judgment = await llm.generate(judgePrompt);
  return judgment.includes("CORRECT") ? 1.0 : -1.0;
}
```

**Pros:**
- ✅ Scales automatically
- ✅ No human labor

**Cons:**
- ❌ Judge LLM might be wrong
- ❌ Expensive (API calls)
- ❌ Can amplify biases

---

## 🔄 Complete RL Training Loop (Corrected)

```
Step 1: COLLECT TRACES
├─ Run agents on tasks
├─ AGL stores execution data
└─ But no learning happens yet! ❌

Step 2: ADD REWARDS ← YOU MUST DO THIS!
├─ Evaluate each rollout
├─ Assign reward: good (+1) or bad (-1)
└─ Store reward in rollout metadata

Step 3: TRAIN WITH RL (Python)
├─ Algorithm reads rollouts WITH rewards
├─ Learns: "What prompt led to +1 rewards?"
├─ Generates better prompts
└─ Stores optimized prompts as "resources"

Step 4: AGENT USES NEW PROMPTS
├─ Fetch latest resources from AGL
├─ Use improved prompts
└─ Performance improves!

Step 5: LOOP BACK TO STEP 1
```

---

## 📊 What I Built vs What You Thought

| Aspect | What You Thought | What I Built | Reality |
|--------|------------------|--------------|---------|
| **Agent Execution** | AGL just observes | Worker executes agent | **Both valid** (2 patterns) |
| **Data Collection** | Automatic via OTLP | Worker-based queue | **Both valid** |
| **Use Case** | Production only | Training/testing | **Different purposes** |
| **Evals** | Not needed? ❌ | **REQUIRED!** ✅ | **You were right!** |
| **Rewards** | Automatic? ❌ | **Must add manually** ✅ | **Critical insight!** |

---

## ✅ Corrected Implementation Plan

### Phase 1: Data Collection (Done!)

```bash
bun run agl:submit  # Submit test posts
bun run agl:worker  # Process them
```

✅ You have 8 rollouts with execution traces

---

### Phase 2: Evaluation (NEW! - THIS IS THE KEY)

```bash
bun run agl:eval  # Evaluate rollouts, add rewards
```

This script:
1. Compares agent output vs ground truth
2. Calculates reward (+1, 0.5, or -1)
3. Stores reward in rollout metadata

**Without this step, training cannot work!**

---

### Phase 3: Training (Future)

```python
# agl-training/train_post_analyzer.py

# 1. Get rollouts WITH REWARDS
rollouts = store.query_rollouts(limit=1000)
rollouts_with_rewards = [r for r in rollouts if r.metadata.get("evaluation.reward")]

# 2. Extract features
good_prompts = [r.prompt for r in rollouts if r.metadata["evaluation"]["reward"] > 0.5]
bad_prompts = [r.prompt for r in rollouts if r.metadata["evaluation"]["reward"] < 0]

# 3. Use RL algorithm (PPO, GRPO, etc.)
optimizer = RLOptimizer()
better_prompt = optimizer.optimize(
    good_examples=good_prompts,
    bad_examples=bad_prompts
)

# 4. Store improved prompt
store.add_resources({
    "prompts": {"post_analyzer_v2": better_prompt}
})
```

---

## 🎯 Key Takeaways

1. **Two Patterns**: OTLP (passive) vs Worker (active) - both valid, different use cases

2. **Rewards are REQUIRED**: AGL cannot learn without evaluation/rewards

3. **You Must Add Evals**: Either:
   - Ground truth comparison (what I added)
   - Human ratings
   - Proxy metrics
   - LLM-as-judge

4. **RL is NOT automatic**: You must:
   - Collect traces ✅ (automatic)
   - Add rewards ✅ (manual - I added this)
   - Train with RL ⏳ (Python script - TODO)
   - Deploy improvements ⏳ (TODO)

---

## 📝 Updated Commands

```bash
# 1. Collect data
bun run agl:submit

# 2. Evaluate (ADD REWARDS) ← NEW!
bun run agl:eval

# 3. Analyze
bun run agl:analyze

# 4. Train (after 500+ evaluated rollouts)
bun run agl:train
```

---

## ❓ FAQ

**Q: Why build a worker if OTLP exists?**
A: Worker is for controlled testing. OTLP is for production data. Use both!

**Q: Can I use OTLP only?**
A: Yes! But you still need to add rewards somehow. Either:
- Collect human feedback
- Use proxy metrics (user engagement, etc.)
- Run periodic batch evaluations

**Q: Is the worker duplicating work?**
A: In a sense, yes. But it's for TESTING, not production. Production uses OTLP.

**Q: Can rewards be added retroactively?**
A: Yes! That's what `bun run agl:eval` does - it adds rewards to existing rollouts.

**Q: What if I don't have ground truth?**
A: Then you need one of the other reward approaches:
- Human rating
- LLM-as-judge
- Proxy metrics
Without rewards, you can collect data but cannot train.

---

**Your questions were excellent and helped correct my explanation. Thank you!** 🙏
