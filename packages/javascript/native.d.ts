import type { Router, Result, Invocation } from './index.js';
/** Native JS runtime. Defaults to native core configuration; never executes Rust. */
export interface NativeRouterOptions {
  config?: Record<string, unknown>;
  configPath?: string;
  env?: Record<string, string | undefined>;
  storage?: unknown;
  core?: unknown;
  fetch?: typeof fetch;
  authenticate?: (request: Request) => unknown | Promise<unknown>;
  /** Core clock in Unix seconds. */
  clock?: () => number;
  /** HTTP runtime clock in milliseconds. */
  serverClock?: () => number;
}
export class NativeRouterError extends Error {
  code: string; exitCode: number | null; stderr: string; result: Result | null;
}
export interface NativeRouter extends Omit<Router, 'options' | 'binaryPromise'> {}
export class NativeRouter {
  constructor(options?: NativeRouterOptions);
  options: NativeRouterOptions;
  /** Returns a failed operation envelope instead of throwing for operation failures. */
  execute(name: string, options?: Record<string, unknown>, invocation?: Invocation): Promise<Result>;
  fetch(request: Request): Promise<Response>;
  listen(options?: { host?: string; port?: number }): Promise<NativeHttpRouter>;
  close(): Promise<void>;
}
export function createNativeRouter(options?: NativeRouterOptions): NativeRouter;

export interface NativeHttpRouter {
  core: unknown;
  readonly address: { address: string; family: string; port: number } | string | null | undefined;
  fetch(request: Request): Promise<Response>;
  listen(options?: { host?: string; port?: number }): Promise<NativeHttpRouter>;
  close(): Promise<void>;
}
export class RouterCore {
  constructor(options: NativeRouterOptions & { config: Record<string, unknown> });
  config: Record<string, unknown>;
  models(): Promise<Array<Record<string, unknown>>>;
  candidates(context?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
  route(context?: Record<string, unknown>): Promise<Record<string, unknown>>;
}
export function createRouterCore(options?: NativeRouterOptions): Promise<RouterCore>;
export function createNativeServerRouter(options: NativeRouterOptions & { core: unknown }): NativeHttpRouter;
export function startNativeServer(options?: NativeRouterOptions & { host?: string; port?: number }): Promise<NativeHttpRouter>;
export const nativeOperationSupport: Readonly<Record<string, 'implemented' | 'partial'>>;
export function validateNativeResult(name: string, result: unknown): Result;
export function operationResult(name: string, data: unknown, diagnostics?: string[], exitCode?: number): Result;
export { catalog, version, operationNames } from './index.js';
