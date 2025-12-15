# @mastra/opik

Opik AI Observability exporter for Mastra applications.

## Installation

```bash
npm install @mastra/opik
```

## Usage

```typescript
import { OpikExporter } from '@mastra/opik';

// Use with Mastra
const mastra = new Mastra({
  ...,
  observability: {
    configs: {
      opik: {
        serviceName: 'my-service',
        exporters: [
          new OpikExporter({
            apiKey: process.env.OPIK_API_KEY,
            apiUrl: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://www.comet.com/opik/api',
            projectName: 'my-project',
            workspaceName: 'default',
            realtime: true, // Optional - flush after each event
          }),
        ],
      },
    },
  },
});
```

## Configuration

| Option          | Type    | Required | Description                                 |
| --------------- | ------- | -------- | ------------------------------------------- |
| `apiKey`        | string  | Yes      | Your Opik API key                           |
| `projectName`   | string  | No       | Opik project name                           |
| `workspaceName` | string  | No       | Opik workspace name                         |
| `apiUrl`        | string  | No       | Custom API URL (for self-hosted)            |
| `realtime`      | boolean | No       | Flush after each event (default: false)     |
| `logLevel`      | string  | No       | Log level: 'debug', 'info', 'warn', 'error' |

## Features

### Tracing

- **Automatic span mapping**: Root spans become Opik traces
- **LLM generation support**: `MODEL_GENERATION` spans become Opik spans with type `llm` and token usage
- **Tool tracking**: `TOOL_CALL` spans become Opik spans with type `tool`
- **Error tracking**: Automatic error status and message tracking
- **Hierarchical traces**: Maintains parent-child relationships
- **Scoring support**: Add scores/feedback to traces and spans

## Environment Variables

You can also configure via environment variables:

```bash
OPIK_API_KEY=your-api-key
OPIK_URL_OVERRIDE=https://www.comet.com/opik/api
OPIK_PROJECT_NAME=your-project-name
OPIK_WORKSPACE_NAME=your-workspace-name
```
