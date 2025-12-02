# Mastra Studio Trace Integration

## Problem Solved ✅

Your web app was creating its **own separate database** (`apps/web/mastra.db`) instead of using the shared database from mastra-api. This is why traces weren't visible in Mastra Studio.

## The Solution

We fixed the database path in `mastra-api` to use an **absolute path** instead of a relative one. This ensures that both the mastra-api server and web app always use the exact same database file, regardless of which directory they're running from.

### What Changed

1. **`apps/mastra-api/src/mastra/index.ts`**
   - Changed from relative path `file:mastra.db` to absolute path using `import.meta.url`
   - Uses `fileURLToPath` and `path.join` to construct: `/full/path/to/apps/mastra-api/mastra.db`
   - Added console log to show the database path on startup
   - Exported individual agent instances for flexibility
   
2. **`apps/web/lib/mastra.config.ts`**
   - Simplified to re-export the mastra instance from mastra-api
   - Now uses the same absolute path defined in mastra-api
   
3. **`apps/web/next.config.js`**
   - Removed deprecated `experimental.instrumentationHook` (enabled by default in Next.js 16+)

4. **Fixed ESM dependency issue**
   - Ran `bun install` in mastra-api to fix `is-stream` module compatibility

## How to Use

### Step 1: Start Mastra Studio
```bash
cd apps/mastra-api
bun run dev
```

This starts:
- **Mastra Studio UI** at `http://localhost:4111` ✨
- Mastra API server

### Step 2: Start Your Web App (in a new terminal)
```bash
cd apps/web
bun run dev
```

This starts your Next.js app at `http://localhost:3000`

### Step 3: Generate Comments
1. Open `http://localhost:3000`
2. Create/select a post
3. Click "Generate Comments"

### Step 4: View Traces in Mastra Studio
1. Open `http://localhost:4111` (Mastra Studio)
2. Navigate to the **Traces** or **Logs** section
3. You should now see traces from all 4 agents:
   - Post Analyzer
   - Strategy Agent
   - Comment Generator
   - Quality Assurance

## How It Works

Both processes share the same Mastra instance which writes to:
```
apps/mastra-api/mastra.db
```

When your web app runs agents like `generateComments()`, it:
1. Uses the Mastra client configured in `apps/web/lib/mastra.config.ts`
2. Writes traces to `../mastra-api/mastra.db`
3. Mastra Studio reads from the same database
4. All traces appear in the Studio UI ✨

## Troubleshooting

### Traces still not appearing?

1. **Restart both processes** after the config changes
2. **Check the database file exists**: Look for `apps/mastra-api/mastra.db`
3. **Verify instrumentation is enabled** in Next.js:
   - Check `apps/web/next.config.js` has `instrumentationHook: true`
   - Check `apps/web/instrumentation.ts` is importing mastra config
4. **Check console logs**: Look for "✅ Mastra AI Tracing initialized"

### Database locked errors?

If you get SQLite lock errors, it means both processes are trying to write simultaneously. This is normal for SQLite but can cause occasional conflicts. Consider upgrading to a remote Turso database for production use.

## Next Steps (Optional)

For production or better performance, consider:

1. **Use Turso (Remote LibSQL)**
   ```typescript
   storage: new LibSQLStore({
     url: process.env.TURSO_DATABASE_URL,
     authToken: process.env.TURSO_AUTH_TOKEN,
   })
   ```

2. **Use OpenTelemetry HTTP Exporter**
   - Export traces via HTTP to a dedicated collector
   - Better for distributed systems

3. **Environment-based configuration**
   - Use different databases for dev/staging/prod
   - Configure via environment variables

## Verification Commands

Check if traces are being created:
```bash
cd apps/mastra-api
sqlite3 mastra.db "SELECT COUNT(*) as total_traces FROM mastra_ai_spans;"
sqlite3 mastra.db "SELECT name, spanType, startedAt FROM mastra_ai_spans ORDER BY startedAt DESC LIMIT 10;"
```
