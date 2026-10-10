import type { Router, Result, Invocation, TokenRecord, AccountRoutingPolicy } from './index.js';
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
  /** Native OAuth validation/endpoint overrides, useful for isolated integrations. */
  oauth?: { endpoints?: Partial<Record<'claude' | 'codex', string>>; allowLoopback?: boolean; catalogBaseURL?: string;
    validateCatalog?: (options: Record<string, unknown>) => Promise<string[]> };
  responseStore?: ResponsesStore;
  responseStoreOptions?: { ttlMs?: number; maxRecords?: number; maxBytes?: number; maxRecordBytes?: number };
}
export class NativeRouterError extends Error {
  constructor(message: string, options?: { code?: string; result?: Result | null; cause?: unknown });
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
export interface NativeTokenOptions {
  ttl_hours?: number;
  label?: string;
  account?: string;
  scope?: '' | 'admin';
  max_requests?: number;
  max_tokens?: number;
  rate_limit_per_minute?: number;
  github_repos?: string[];
  model_policy?: { allowed_models?: string[]; allow_substitution?: boolean; substitution_source?: string };
}
export interface NativeTokenManager {
  issue(options?: NativeTokenOptions): Promise<{ token: string; id: string; record: TokenRecord }>;
  list(): Promise<TokenRecord[]>;
  get(id: string): Promise<TokenRecord | null>;
  validate(token: string, options?: { admin?: boolean; model?: string; repository?: string }): Promise<Record<string, unknown>>;
  revoke(id: string): Promise<boolean>;
  expire(id: string): Promise<TokenRecord>;
  rotate(id: string, options?: NativeTokenOptions): Promise<{ token: string; id: string; record: TokenRecord }>;
  admit(id: string, reserve?: number): Promise<string>;
  settle(id: string, reserved: number, used: number): Promise<void>;
}
export class RouterCore {
  constructor(options: NativeRouterOptions & { config: Record<string, unknown> });
  config: Record<string, unknown>;
  tokens: NativeTokenManager;
  listProviders(): Promise<Array<Record<string, unknown>>>;
  showProvider(name: string): Promise<Record<string, unknown> | null>;
  upsertProvider(provider: Record<string, unknown>): Promise<Record<string, unknown>>;
  removeProvider(name: string): Promise<boolean>;
  listAccounts(): Promise<Array<Record<string, unknown>>>;
  accountAction(name: string, action: 'pause' | 'resume' | 'policy', body?: AccountRoutingPolicy | Record<string, unknown>): Promise<Record<string, unknown>>;
  resetCooldowns(): Promise<{ cleared: number }>;
  resetCooldown(name: string, model?: string): Promise<{ cleared: number }>;
  models(): Promise<Array<Record<string, unknown>>>;
  candidates(context?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
  route(context?: Record<string, unknown>): Promise<Record<string, unknown>>;
  catalogFor(context?: Record<string, unknown>): Promise<Array<Record<string, unknown>>>;
  prepareCandidate(candidate: Record<string, unknown>, context?: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateRouting(update: Record<string, unknown>): Promise<Record<string, unknown>>;
  reportFailure(candidate: Record<string, unknown>, details: Record<string, unknown>): Promise<string>;
  reportSuccess(candidate: Record<string, unknown>): Promise<void>;
}
export function createRouterCore(options?: NativeRouterOptions): Promise<RouterCore>;
export function createNativeServerRouter(options: NativeRouterOptions & { core: unknown }): NativeHttpRouter;
export function startNativeServer(options?: NativeRouterOptions & { host?: string; port?: number }): Promise<NativeHttpRouter>;
export const nativeOperationSupport: Readonly<Record<string, 'implemented' | 'partial'>>;
export function validateNativeResult(name: string, result: unknown): Result;
export function operationResult(name: string, data: unknown, diagnostics?: string[], exitCode?: number): Result;
export { catalog, version, operationNames } from './index.js';

/** Bounded process-retained foreground Responses resources, isolated by owner and namespace. */
export class ResponsesStore {
  constructor(options?: { clock?: () => number; ttlMs?: number; maxRecords?: number; maxBytes?: number; maxRecordBytes?: number });
  save(namespace: string, owner: string, response: Record<string, unknown>, input: unknown[], options?: { abort?: () => void; update?: boolean }): Record<string, unknown>;
  get(namespace: string, owner: string, id: string): Record<string, unknown>;
  delete(namespace: string, owner: string, id: string): { id: string; object: string; deleted: boolean };
  cancel(namespace: string, owner: string, id: string): Record<string, unknown>;
  inputItems(namespace: string, owner: string, id: string, query?: URLSearchParams): Record<string, unknown>;
  close(): void;
}
export function responseOwner(claims: Record<string, unknown>, credential?: string): string;
export function normalizeResponseInput(body: { input: string | unknown[] }): Array<Record<string, unknown>>;
