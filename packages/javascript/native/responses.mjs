import { createHash, randomUUID } from 'node:crypto';
import { ProtocolError } from './protocols.mjs';

/** Foreground resources retained only in this runtime, with explicit bounds. */
export class ResponsesStore {
  constructor({ clock = Date.now, ttlMs = 3_600_000, maxRecords = 1000, maxBytes = 16 * 1024 * 1024, maxRecordBytes = 1024 * 1024 } = {}) {
    for (const [key, value] of Object.entries({ ttlMs, maxRecords, maxBytes, maxRecordBytes })) if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${key} must be a positive safe integer`);
    this.clock = clock; this.ttlMs = ttlMs; this.maxRecords = maxRecords; this.maxBytes = maxBytes; this.maxRecordBytes = maxRecordBytes; this.records = new Map(); this.bytes = 0;
  }
  key(namespace, owner, id) { return JSON.stringify([namespace, owner, id]); }
  size(record) { return 256 + Buffer.byteLength(JSON.stringify({ namespace: record.namespace, owner: record.owner, input: record.input, response: record.response })); }
  sweep() {
    for (const [key, record] of this.records) if (record.expiresAt <= this.clock()) { this.records.delete(key); this.bytes -= record.bytes; record.abort?.(); }
  }
  save(namespace, owner, response, input, { abort, update = false } = {}) {
    if (typeof response.id !== 'string' || !response.id || response.id.length > 512) throw new ProtocolError('Upstream returned an invalid response id', 502);
    this.sweep();
    const key = this.key(namespace, owner, response.id), previous = this.records.get(key);
    if (update && !previous) throw new ProtocolError('Response not found', 404);
    if (previous && !update) throw new ProtocolError('Response id is already retained', 409);
    if (previous?.response.status === 'cancelled') throw new ProtocolError('Response was cancelled', 409);
    const record = { namespace, owner, response: structuredClone(response), input: structuredClone(input), abort, expiresAt: this.clock() + this.ttlMs };
    record.bytes = this.size(record);
    if (record.bytes > this.maxRecordBytes || record.bytes > this.maxBytes) throw new ProtocolError('Response exceeds retention storage limit', 507);
    while (this.records.size - (previous ? 1 : 0) >= this.maxRecords || this.bytes - (previous?.bytes ?? 0) + record.bytes > this.maxBytes) {
      const evict = [...this.records].find(([k, r]) => k !== key && !['in_progress', 'queued'].includes(r.response.status));
      if (!evict) throw new ProtocolError('Response retention storage is full', 507);
      this.records.delete(evict[0]); this.bytes -= evict[1].bytes;
    }
    this.bytes -= previous?.bytes ?? 0; this.bytes += record.bytes; this.records.set(key, record);
    return structuredClone(record.response);
  }
  get(namespace, owner, id) {
    this.sweep(); const record = this.records.get(this.key(namespace, owner, id));
    if (!record) throw new ProtocolError('Response not found', 404);
    return structuredClone(record.response);
  }
  delete(namespace, owner, id) {
    this.get(namespace, owner, id); const key = this.key(namespace, owner, id), record = this.records.get(key);
    this.records.delete(key); this.bytes -= record.bytes; record.abort?.();
    return { id, object: 'response.deleted', deleted: true };
  }
  cancel(namespace, owner, id) {
    const response = this.get(namespace, owner, id), record = this.records.get(this.key(namespace, owner, id));
    if (!['in_progress', 'queued'].includes(response.status) || !record.abort) throw new ProtocolError('Only an active foreground response can be cancelled', 409);
    record.response.status = 'cancelled'; record.response.error = null; record.response.incomplete_details = null;
    const abort = record.abort; record.abort = undefined; abort();
    return structuredClone(record.response);
  }
  fail(namespace, owner, id) {
    const record = this.records.get(this.key(namespace, owner, id));
    if (!record || record.response.status === 'cancelled') return;
    record.response.status = 'failed'; record.response.error = { code: 'upstream_stream_error', message: 'Upstream stream failed or ended prematurely' }; record.abort = undefined;
  }
  inputItems(namespace, owner, id, query = new URLSearchParams()) {
    this.get(namespace, owner, id); const record = this.records.get(this.key(namespace, owner, id));
    const limit = query.has('limit') ? Number(query.get('limit')) : 20;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new ProtocolError('limit must be an integer from 1 to 100');
    const order = query.get('order') ?? 'desc'; if (!['asc', 'desc'].includes(order)) throw new ProtocolError('order must be asc or desc');
    let items = structuredClone(record.input); if (order === 'desc') items.reverse();
    for (const key of ['after', 'before']) if (query.has(key)) {
      const index = items.findIndex(item => item.id === query.get(key));
      if (index < 0) throw new ProtocolError('Input-item cursor not found');
      items = key === 'after' ? items.slice(index + 1) : items.slice(0, index);
    }
    const data = items.slice(0, limit);
    return { object: 'list', data, first_id: data[0]?.id ?? null, last_id: data.at(-1)?.id ?? null, has_more: items.length > limit };
  }
  close() { for (const record of this.records.values()) record.abort?.(); this.records.clear(); this.bytes = 0; }
}

export function responseOwner(claims, credential) {
  const value = claims.client_kind && claims.principal_id ? ['principal', claims.client_kind, claims.principal_id] : claims.sub ?? claims.id ? ['token', claims.sub ?? claims.id] : credential ? ['credential', credential] : null;
  if (!value) throw new ProtocolError('A stable credential identity is required for Responses storage', 403);
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
export function normalizeResponseInput(body) {
  const input = typeof body.input === 'string' ? [{ role: 'user', content: body.input }] : body.input;
  const ids = new Set();
  return input.map(raw => {
    const item = typeof raw === 'string' ? { role: 'user', content: raw } : structuredClone(raw);
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ProtocolError('Response input items must be objects or strings');
    if (!item.id) item.id = `item_${randomUUID().replaceAll('-', '')}`;
    if (typeof item.id !== 'string' || item.id.length > 512 || ids.has(item.id)) throw new ProtocolError('Input-item IDs must be unique nonempty strings of at most 512 characters');
    ids.add(item.id);
    if (!item.type || item.type === 'message') {
      item.type = 'message'; item.status ??= 'completed';
      if (typeof item.content === 'string') item.content = [{ type: item.role === 'assistant' ? 'output_text' : 'input_text', text: item.content }];
    }
    return item;
  });
}
