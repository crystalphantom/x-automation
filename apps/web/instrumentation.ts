export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { mastra } = await import('./lib/mastra.config')

    // Initialize Mastra tracing on server startup
    console.log('✅ Mastra AI Tracing initialized')
  }
}
