import { isDeepStrictEqual } from 'node:util';
import { isObject, pointerSegments } from './runtime-config.mjs';

const stages = ['default', 'default-raw', 'override', 'override-raw', 'filter'];
const protectedFields = new Set(['model', 'modelId', 'stream', 'type', 'stream_id', 'conversation']);

function pathParts(path) {
  if (path.startsWith('/')) {
    const parts = pointerSegments(path);
    if (parts.some((part) => !part) || parts.length > 32) throw new Error('invalid payload path');
    return parts;
  }
  const parts = [];
  let start = 0;
  let inQuery = false;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < path.length; index += 1) {
    const character = path[index];
    if (inQuery) {
      if (escaped) escaped = false;
      else if (quoted && character === '\\') escaped = true;
      else if (character === '"') quoted = !quoted;
      else if (!quoted && character === ')') inQuery = false;
    } else if (index === start && path.startsWith('#(', index)) {
      inQuery = true;
    } else if (character === '.') {
      parts.push(path.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(path.slice(start));
  if (inQuery || parts.some((part) => !part) || parts.length > 32) throw new Error('invalid payload path');
  return parts;
}

function read(root, path) {
  return path.reduce((value, key) => value != null && Object.hasOwn(value, key) ? value[key] : undefined, root);
}

function matchesConditions(body, selector) {
  const found = (path, predicate) => paths(body, pathParts(path)).some((parts) => predicate(read(body, parts)));
  const matches = (checks, positive) => checks.every((check) => Object.entries(check).every(
    ([path, value]) => found(path, (current) => isDeepStrictEqual(current, value)) === positive,
  ));
  const exists = (checks, positive) => checks.every(
    (path) => found(path, (current) => current != null) === positive,
  );
  return matches(selector.match ?? [], true)
    && matches(selector['not-match'] ?? [], false)
    && exists(selector.exist ?? [], true)
    && exists(selector['not-exist'] ?? [], false);
}

function glob(pattern, value) {
  const pieces = pattern.split('*');
  if (pieces.length === 1) return pattern === value;
  const start = pieces.shift();
  const end = pieces.pop();
  if (!value.startsWith(start) || !value.endsWith(end) || value.length < start.length + end.length) return false;
  let offset = start.length;
  for (const piece of pieces) {
    const index = value.indexOf(piece, offset);
    if (index < 0) return false;
    offset = index + piece.length;
  }
  return offset <= value.length - end.length;
}

function canonicalProtocol(protocol) {
  return protocol === 'anthropic' ? 'claude' : protocol;
}

function select(selector, context) {
  return glob(selector.name, context.model ?? '')
    && (!selector.protocol || canonicalProtocol(selector.protocol) === context.protocol)
    && (!selector['from-protocol'] || canonicalProtocol(selector['from-protocol']) === context.fromProtocol)
    && (!selector.token || [context.tokenId, context.tokenLabel].includes(selector.token));
}

function write(root, parts, value, filter) {
  const key = parts.at(-1);
  let container = root;
  for (const part of parts.slice(0, -1)) {
    if (Array.isArray(container)) {
      if (!/^(0|[1-9][0-9]*)$/u.test(part) || Number(part) >= container.length) {
        if (filter) return;
        throw new Error('payload rule array index does not exist');
      }
    } else if (!isObject(container)) {
      if (filter) return;
      throw new Error('payload rule traverses a scalar');
    } else if (!Object.hasOwn(container, part)) {
      if (filter) return;
      Object.defineProperty(container, part, { value: {}, enumerable: true, configurable: true, writable: true });
    }
    container = container[part];
  }
  if (Array.isArray(container)) {
    if (!/^(0|[1-9][0-9]*)$/u.test(key) || Number(key) >= container.length) {
      if (filter) return;
      throw new Error('payload rule array index does not exist');
    }
    if (filter) container.splice(Number(key), 1);
    else container[key] = value;
  } else if (isObject(container)) {
    if (filter) delete container[key];
    else Object.defineProperty(container, key, { value, enumerable: true, configurable: true, writable: true });
  } else if (!filter) {
    throw new Error('payload rule traverses a scalar');
  }
}

function paths(root, parts, offset = 0) {
  if (offset === parts.length) return [[]];
  const part = parts[offset];
  const query = /^#\(([^=]+)==(.+)\)(#?)$/u.exec(part);
  if (!query) return paths(read(root, [part]), parts, offset + 1).map((tail) => [part, ...tail]);
  if (!Array.isArray(root)) return [];
  const [, key, literal, all] = query;
  const expected = JSON.parse(literal);
  const matches = [];
  for (const [index, item] of root.entries()) {
    if (isDeepStrictEqual(read(item, pathParts(key)), expected)) {
      matches.push(...paths(item, parts, offset + 1).map((tail) => [String(index), ...tail]));
      if (!all) break;
    }
  }
  return matches;
}

export function applyPayloadRules(rules, body, context) {
  const applicable = (stage) => (rules[stage] ?? []).filter((rule) => rule.models.some((selector) => select(selector, context)));
  if (!stages.some((stage) => applicable(stage).length)) return { body, applied: [] };
  if (!isObject(body)) throw new Error('payload rules require a JSON object');
  const result = structuredClone(body);
  const applied = [];
  const changed = new Set();
  for (const stage of stages) {
    for (const rule of applicable(stage)) {
      if (!rule.models.some((selector) => select(selector, context) && matchesConditions(result, selector))) continue;
      const filter = stage === 'filter';
      for (const [path, input] of filter ? rule.params.map((path) => [path, null]) : Object.entries(rule.params).sort()) {
        const parts = pathParts(path);
        if (parts[0] === 'previous_response_id' && (!filter || parts.length !== 1)) {
          throw new Error('payload rules may only remove a continuation ID');
        }
        if (protectedFields.has(parts[0])) throw new Error('payload rule changes a protected field');
        const targets = paths(result, parts);
        if (!filter && targets.length === 0) throw new Error('payload rule matches no parameter');
        for (const resolved of targets.reverse()) {
          const before = read(result, resolved);
          if (stage.startsWith('default') && before !== undefined) continue;
          if (filter && before === undefined) continue;
          const value = stage.endsWith('-raw') && typeof input === 'string' ? JSON.parse(input) : structuredClone(input);
          write(result, resolved, value, filter);
          applied.push({ stage, path, ...(filter ? {} : { value }) });
          changed.add(resolved[0]);
        }
      }
    }
  }
  if (['claude', 'bedrock', 'vertex'].includes(context.protocol) && (changed.has('temperature') || changed.has('top_p'))
    && result.temperature != null && result.top_p != null) {
    throw new Error('payload rules left incompatible sampling parameters');
  }
  if (['claude', 'bedrock', 'vertex', 'openai', 'codex'].includes(context.protocol)) {
    for (const key of ['max_tokens', 'max_output_tokens']) {
      if (changed.has(key) && Object.hasOwn(result, key) && (!Number.isSafeInteger(result[key]) || result[key] < 1)) {
        throw new Error(`payload rule ${key} requires a positive integer`);
      }
    }
  }
  return { body: result, applied };
}

export function applyCodexSubscriptionPayloadRules(rules, body, context, outputLimit, supportsSampling = true) {
  const virtualLimit = outputLimit !== undefined && isObject(body) && !Object.hasOwn(body, 'max_output_tokens');
  const candidate = virtualLimit ? { ...body, max_output_tokens: outputLimit } : body;
  const result = applyPayloadRules(rules, candidate, context);
  if (!result.applied.length) return { ...result, body, outputLimit };
  const affected = (field) => result.applied.some(({ path }) => pathParts(path)[0] === field);
  if (!supportsSampling && ['temperature', 'top_p'].some((field) => affected(field) && Object.hasOwn(result.body, field))) {
    throw new Error('the Codex subscription backend does not support configured sampling parameters');
  }
  const changed = affected('max_output_tokens');
  const effectiveLimit = changed ? result.body.max_output_tokens : outputLimit;
  if (virtualLimit || changed) delete result.body.max_output_tokens;
  return { ...result, outputLimit: effectiveLimit };
}
