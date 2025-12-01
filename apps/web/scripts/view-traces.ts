import { mastra } from '../lib/mastra.config'

async function viewTraces() {
  try {
    // Get recent traces
    const traces = await mastra.storage.getTraces({ limit: 10 })
    
    console.log('📊 Recent Traces:')
    console.log('================')
    
    for (const trace of traces) {
      console.log(`\n🔍 Trace ID: ${trace.traceId}`)
      console.log(`   Service: ${trace.serviceName}`)
      console.log(`   Timestamp: ${new Date(trace.timestamp).toLocaleString()}`)
      console.log(`   Duration: ${trace.duration}ms`)
      
      // Get spans for this trace
      const spans = await mastra.storage.getSpans({ traceId: trace.traceId })
      
      console.log(`   Spans (${spans.length}):`)
      spans.forEach(span => {
        console.log(`     - ${span.name}: ${span.duration}ms`)
      })
    }
    
    const totalTraces = await mastra.storage.countTraces()
    console.log(`\n✅ Total traces in database: ${totalTraces}`)
    
  } catch (error) {
    console.error('Error fetching traces:', error)
  }
}

viewTraces()
