import { createContainer, diTokens } from "./container.mjs";

const container = await createContainer();
const fastifyServer = container.resolve(diTokens.fastifyServer);
await fastifyServer.listen({ port: 3000 });
