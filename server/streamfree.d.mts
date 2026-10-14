import type { IncomingMessage, ServerResponse } from 'node:http'
export function streamfreeHandler(req: IncomingMessage, res: ServerResponse): Promise<void>
