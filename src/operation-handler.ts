import type { RouteHandlerMethod } from "fastify";

export type OperationHandler = {
  handle: RouteHandlerMethod;
  get operationId(): string;
};
