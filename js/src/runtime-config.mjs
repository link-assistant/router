// Transport-independent JSON configuration operations for the runtime document.

import { isDeepStrictEqual } from 'node:util';

const localCliSettings = [
  'token-secret', 'admin-key', 'upstream-base-url', 'openai-compatible-base-url',
  'openai-compatible-api-key-env', 'gonka-source-url', 'crater-forgefed-inbox',
  'account-egress-proxy', 'model-catalog-sources', 'claude-code-home',
  'additional-account-dirs', 'login-cli-command', 'login-cli-args', 'claude-cli-bin',
  'codex-cli-bin', 'audit-log', 'request-log', 'listener', 'admin-host', 'admin-port',
  'management-allow-remote', 'management-lockout-failures', 'management-lockout-secs',
  'management-lockout-exempt-loopback',
];

export function assertConfigWriterCanEdit(before, after) {
  for (const key of localCliSettings) {
    if (!isDeepStrictEqual(before?.cli?.[key], after?.cli?.[key])) {
      throw new Error('this CLI setting may only be changed in the local TOML file');
    }
  }
}

export function pointerSegments(pointer) {
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) throw new Error('JSON Pointer must start with /');
  return pointer.slice(1).split('/').map((part) => {
    if (/~(?![01])/u.test(part)) throw new Error('invalid JSON Pointer escape');
    return part.replaceAll('~1', '/').replaceAll('~0', '~');
  });
}

export function mergeConfigPatch(current, patch) {
  if (!isObject(patch)) return structuredClone(patch);
  const entries = new Map(Object.entries(isObject(current) ? current : {}));
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) entries.delete(key);
    else entries.set(key, mergeConfigPatch(entries.get(key), value));
  }
  return Object.fromEntries(entries);
}

export function configPointer(document, pointer, operation = 'get', value) {
  const segments = pointerSegments(pointer);
  if (segments.length === 0) {
    if (operation === 'get') return structuredClone(document);
    if (operation === 'put') return structuredClone(value);
    throw new Error('cannot delete the configuration root');
  }
  const result = structuredClone(document);
  const key = segments.pop();
  let container = result;
  for (const segment of segments) container = child(container, segment);
  if (operation === 'get') return child(container, key);
  if (Array.isArray(container)) {
    const index = arrayIndex(key, container.length, operation === 'put');
    if (operation === 'delete') container.splice(index, 1);
    else container[index] = structuredClone(value);
  } else if (isObject(container)) {
    if (operation === 'delete') {
      child(container, key);
      delete container[key];
    } else {
      Object.defineProperty(container, key, { value: structuredClone(value), enumerable: true, configurable: true, writable: true });
    }
  } else {
    throw new Error('configuration parent is not a container');
  }
  return result;
}

export function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function child(container, key) {
  if (Array.isArray(container)) return container[arrayIndex(key, container.length, false)];
  if (isObject(container) && Object.hasOwn(container, key)) return container[key];
  throw new Error('configuration path does not exist');
}

function arrayIndex(key, length, append) {
  if (append && key === '-') return length;
  if (!/^(0|[1-9][0-9]*)$/u.test(key) || Number(key) >= length) {
    throw new Error('configuration array index does not exist');
  }
  return Number(key);
}

const redacted = '[REDACTED]';
const secretKey = /(?:^|[._/-])(?:api[-_]?key|admin[-_]?key|private[-_]?key|password|secret|token|cookie|authorization)(?:$|[._/-])/iu;

export function redactRuntimeConfig(value) {
  if (Array.isArray(value)) return value.map(redactRuntimeConfig);
  if (isObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [
      key, secretKey.test(key) ? redacted : redactRuntimeConfig(child),
    ]));
  }
  if (typeof value === 'string') {
    if (/^(bearer\s|la_(sk|admin)_)/iu.test(value)) return redacted;
    if (value.includes('://')) {
      try {
        const url = new URL(value);
        if (url.username || url.password || [...url.searchParams.keys()].some((key) => secretKey.test(key))) return redacted;
      } catch {
        // A string containing a URL fragment can still be ordinary payload text.
      }
    }
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        const json = JSON.parse(value);
        if (JSON.stringify(json) !== JSON.stringify(redactRuntimeConfig(json))) return redacted;
      } catch {
        // Only complete raw JSON values participate in recursive redaction.
      }
    }
  }
  return value;
}

export function validateCors({ origins = [], methods = ['GET', 'POST'], headers = [], credentials = false } = {}) {
  if (credentials && [...origins, ...methods, ...headers].includes('*')) throw new Error('credentialed CORS requires explicit values');
  for (const values of [origins, methods, headers]) {
    if (values.includes('*') && values.length !== 1) throw new Error('CORS wildcard must be used alone');
  }
  for (const origin of origins) {
    if (origin === '*') continue;
    const url = new URL(origin);
    if (url.origin !== origin || !['http:', 'https:'].includes(url.protocol)) throw new Error('invalid CORS origin');
  }
  const httpToken = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/u;
  if (![...methods, ...headers].every((name) => httpToken.test(name))) throw new Error('invalid CORS method or header');
}
