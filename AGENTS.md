# AGENTS.md

## Project Structure

- `apps/web` - Next.js frontend with Supabase database
- `apps/mastra-api` - Mastra AI agents backend (dependency of web)

## Build & Test Commands

### Root (monorepo)

- `bun install` - Install all dependencies
- `bun run dev` - Start all development servers
- `bun run build` - Build all packages
- `bun run lint` - Run ESLint (max 0 warnings)
- `bun run check-types` - Type check with TypeScript
- `bun run format` - Format with Prettier

### Web App (apps/web)

- `bun run dev` - Start Next.js dev server (port 3000)
- `bun run db:push` - Push database schema to Supabase
- `bun run db:studio` - Open Drizzle Studio
- `bun run mastra:studio` - Start Mastra Studio (port 4111)

### Mastra API (apps/mastra-api)

- `bun run dev` - Start Mastra Studio (port 4111)
- `bun run agl:status` - Check Agent Lightning status
- `bun run agl:worker` - Start AGL worker
- `bun run agl:submit` - Submit test tasks

## Code Style Guidelines

- Use TypeScript with strict mode enabled
- Import React components: `import * as React from "react"`
- Use forwardRef for component props extending HTML attributes
- Follow Radix UI patterns for component variants with class-variance-authority
- Use Drizzle ORM for database operations with typed schemas
- Error handling: try/catch with console.error and NextResponse.json status codes
- ESLint config: React Hooks, Next.js core web vitals, no React in JSX scope
- Use @/\* path aliases for imports within apps
- Component files: export interface Props, forwardRef pattern, displayName

## Dependencies

- `web` depends on `mastra-api` for AI agent functions
- Both apps share the same Mastra database (mastra.db) for traces
- Web app uses Supabase for production data, Mastra uses LibSQL for traces
