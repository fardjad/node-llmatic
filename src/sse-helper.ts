/* eslint-disable @typescript-eslint/naming-convention */
import type { FastifyReply } from "fastify";

export class SseHelper {
  sse(reply: FastifyReply, data: unknown) {
    if (!reply.raw.headersSent) {
      const headers = {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
      };
      reply.raw.writeHead(200, headers);
    }

    const normalizedData =
      typeof data === "string" ? data : JSON.stringify(data);
    const payload = `data: ${normalizedData}\n\n`;
    reply.raw.write(payload);
  }
}
