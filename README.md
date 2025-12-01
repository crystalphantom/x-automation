# Twitter Comment Agent - Setup Instructions

## Prerequisites
- Bun installed
- Supabase account
- Google AI (Gemini) API key

## Setup Steps

### 1. Install Dependencies
```bash
bun install
```

### 2. Setup Supabase & Database

1. Create a new Supabase project at https://supabase.com
2. Get your DATABASE_URL from: Project Settings > Database > Connection String (Transaction Pooler)
3. Get your project URL and anon key from: Project Settings > API

### 3. Configure Environment Variables

Create `apps/web/.env.local`:

```env
# Database Connection (from Supabase Project Settings > Database > Connection String)
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google AI (Gemini)
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-api-key
MODEL_NAME=gemini-2.5-flash

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Push Database Schema

```bash
cd apps/web
bun run db:push
```

This will create all the tables in your Supabase database using Drizzle.

### 5. Run Development Server

```bash
bun run dev
```

The app will be available at http://localhost:3000

## Project Structure

```
celestial-kuiper/
├── apps/
│   └── web/                    # Main Next.js app
│       ├── app/                # Next.js app router
│       ├── components/         # React components
│       ├── lib/                # Utilities & Supabase client
│       └── db/                 # Database schema
├── packages/
│   ├── agents/                 # Core Mastra agents
│   │   └── src/
│   │       ├── post-analyzer.ts
│   │       ├── strategy-agent.ts
│   │       ├── comment-generator.ts
│   │       ├── quality-assurance.ts
│   │       └── types.ts
│   ├── ui/                     # Shared UI components
│   └── typescript-config/      # Shared TS configs
└── turbo.json                  # Turborepo config
```

## Next Steps

1. Set up your environment variables
2. Run the database schema in Supabase
3. Start the development server
4. Begin building the UI pages
