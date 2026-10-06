import type { Router, Invocation, JsonValue } from './index.js';
export interface FixtureHome { home: string; env: Record<string, string>; close(): Promise<void>; }
export function temporaryHome(): Promise<FixtureHome>;
export interface MockRequest { method: string; path: string; body: JsonValue; }
export function mockUpstream(handler?: (request: MockRequest) => { status?: number; body: JsonValue | string }): Promise<{ origin: string; requests: MockRequest[]; close(): Promise<void> }>;
export function vendorStub(options?: { name?: string; version?: string; output?: string; exitCode?: number }): Promise<{ binary: string; directory: string; env: Record<string, string>; close(): Promise<void> }>;
export function verifyContracts(options?: { router?: Router; areas?: string[]; linux?: boolean; repository?: string; output?: string; clientVersions?: 'installed' | 'ci' | 'latest'; requireParity?: boolean; deadlineMs?: number; env?: Record<string, string> }): Promise<JsonValue>;
