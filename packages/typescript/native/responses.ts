// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=c94fc26b25e97c951679858dc2e488a51949a799cf0747f10c79c6626eefe46f; dynamic any annotations are explicit draft gaps.
import { createHash, randomUUID } from 'node:crypto';
import { ProtocolError } from "./protocols.js";
const TRANSITION_RESERVE_BYTES: any = 256;
export class ResponsesStore {
    declare bytes: any;
    declare clock: any;
    declare maxBytes: any;
    declare maxRecordBytes: any;
    declare maxRecords: any;
    declare records: any;
    declare ttlMs: any;
    constructor({ clock = Date.now, ttlMs = 3600000, maxRecords = 1000, maxBytes = 16 * 1024 * 1024, maxRecordBytes = 1024 * 1024 }: any = {}) {
        for (const [key, value] of Object.entries({ ttlMs, maxRecords, maxBytes, maxRecordBytes }) as any)
            if (!Number.isSafeInteger(value) || value < 1)
                throw new (TypeError as any)(`${key} must be a positive safe integer`);
        this.clock = clock;
        this.ttlMs = ttlMs;
        this.maxRecords = maxRecords;
        this.maxBytes = maxBytes;
        this.maxRecordBytes = maxRecordBytes;
        this.records = new (Map as any)();
        this.bytes = 0;
    }
    key(namespace?: any, owner?: any, id?: any): any { return JSON.stringify([namespace, owner, id]); }
    serializedBytes(record?: any): any { return Buffer.byteLength(JSON.stringify({ namespace: record.namespace, owner: record.owner, input: record.input, response: record.response })); }
    size(record?: any): any { return TRANSITION_RESERVE_BYTES + this.serializedBytes(record); }
    transition(record?: any, fields?: any): any {
        const next: any = { ...record, response: { ...record.response, ...fields } };
        const bytes: any = this.serializedBytes(next);
        if (bytes > record.bytes || bytes > this.maxRecordBytes)
            throw new (ProtocolError as any)('Response transition exceeds retention allocation', 507);
        record.response = next.response;
    }
    sweep(): any {
        for (const [key, record] of this.records as any)
            if (record.expiresAt <= this.clock()) {
                this.records.delete(key);
                this.bytes -= record.bytes;
                record.abort?.();
            }
    }
    save(namespace?: any, owner?: any, response?: any, input?: any, { abort, update = false }: any = {}): any {
        if (typeof response.id !== 'string' || !response.id || response.id.length > 512)
            throw new (ProtocolError as any)('Upstream returned an invalid response id', 502);
        this.sweep();
        const key: any = this.key(namespace, owner, response.id), previous: any = this.records.get(key);
        if (update && !previous)
            throw new (ProtocolError as any)('Response not found', 404);
        if (previous && !update)
            throw new (ProtocolError as any)('Response id is already retained', 409);
        if (previous?.response.status === 'cancelled')
            throw new (ProtocolError as any)('Response was cancelled', 409);
        const record: any = { namespace, owner, response: structuredClone(response), input: structuredClone(input), abort, expiresAt: this.clock() + this.ttlMs };
        record.bytes = this.size(record);
        if (record.bytes > this.maxRecordBytes || record.bytes > this.maxBytes)
            throw new (ProtocolError as any)('Response exceeds retention storage limit', 507);
        while (this.records.size - (previous ? 1 : 0) >= this.maxRecords || this.bytes - (previous?.bytes ?? 0) + record.bytes > this.maxBytes) {
            const evict: any = [...this.records].find(([k, r]: any): any => k !== key && !['in_progress', 'queued'].includes(r.response.status));
            if (!evict)
                throw new (ProtocolError as any)('Response retention storage is full', 507);
            this.records.delete((evict as any)[0]);
            this.bytes -= (evict as any)[1].bytes;
        }
        this.bytes -= previous?.bytes ?? 0;
        this.bytes += record.bytes;
        this.records.set(key, record);
        return structuredClone(record.response);
    }
    get(namespace?: any, owner?: any, id?: any): any {
        this.sweep();
        const record: any = this.records.get(this.key(namespace, owner, id));
        if (!record)
            throw new (ProtocolError as any)('Response not found', 404);
        return structuredClone(record.response);
    }
    delete(namespace?: any, owner?: any, id?: any): any {
        this.get(namespace, owner, id);
        const key: any = this.key(namespace, owner, id), record: any = this.records.get(key);
        this.records.delete(key);
        this.bytes -= record.bytes;
        record.abort?.();
        return { id, object: 'response.deleted', deleted: true };
    }
    cancel(namespace?: any, owner?: any, id?: any): any {
        const response: any = this.get(namespace, owner, id), record: any = this.records.get(this.key(namespace, owner, id));
        if (!['in_progress', 'queued'].includes(response.status) || !record.abort)
            throw new (ProtocolError as any)('Only an active foreground response can be cancelled', 409);
        this.transition(record, { status: 'cancelled', error: null, incomplete_details: null });
        const abort: any = record.abort;
        record.abort = undefined;
        abort();
        return structuredClone(record.response);
    }
    fail(namespace?: any, owner?: any, id?: any): any {
        const record: any = this.records.get(this.key(namespace, owner, id));
        if (!record || record.response.status === 'cancelled')
            return;
        this.transition(record, { status: 'failed', error: { code: 'upstream_stream_error', message: 'Upstream stream failed or ended prematurely' } });
        record.abort = undefined;
    }
    inputItems(namespace?: any, owner?: any, id?: any, query: any = new (URLSearchParams as any)()): any {
        this.get(namespace, owner, id);
        const record: any = this.records.get(this.key(namespace, owner, id));
        const limit: any = query.has('limit') ? Number(query.get('limit')) : 20;
        if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100)
            throw new (ProtocolError as any)('limit must be an integer from 1 to 100');
        const order: any = query.get('order') ?? 'desc';
        if (!['asc', 'desc'].includes(order))
            throw new (ProtocolError as any)('order must be asc or desc');
        let items: any = structuredClone(record.input);
        if (order === 'desc')
            items.reverse();
        for (const key of ['after', 'before'] as any)
            if (query.has(key)) {
                const index: any = items.findIndex((item?: any): any => item.id === query.get(key));
                if (index < 0)
                    throw new (ProtocolError as any)('Input-item cursor not found');
                items = key === 'after' ? items.slice(index + 1) : items.slice(0, index);
            }
        const data: any = items.slice(0, limit);
        return { object: 'list', data, first_id: (data as any)[0]?.id ?? null, last_id: data.at(-1)?.id ?? null, has_more: items.length > limit };
    }
    close(): any { for (const record of this.records.values() as any)
        record.abort?.(); this.records.clear(); this.bytes = 0; }
}
export function responseOwner(claims?: any, credential?: any): any {
    const value: any = claims.client_kind && claims.principal_id ? ['principal', claims.client_kind, claims.principal_id] : claims.sub ?? claims.id ? ['token', claims.sub ?? claims.id] : credential ? ['credential', credential] : null;
    if (!value)
        throw new (ProtocolError as any)('A stable credential identity is required for Responses storage', 403);
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
export function normalizeResponseInput(body?: any): any {
    if (!body || typeof body.input !== 'string' && !Array.isArray(body.input))
        throw new (ProtocolError as any)('input must be a string or array');
    const input: any = typeof body.input === 'string' ? [{ role: 'user', content: body.input }] : body.input;
    const ids: any = new (Set as any)();
    return input.map((raw?: any): any => {
        const item: any = typeof raw === 'string' ? { role: 'user', content: raw } : structuredClone(raw);
        if (!item || typeof item !== 'object' || Array.isArray(item))
            throw new (ProtocolError as any)('Response input items must be objects or strings');
        if (!item.id)
            item.id = `item_${randomUUID().replaceAll('-', '')}`;
        if (typeof item.id !== 'string' || item.id.length > 512 || ids.has(item.id))
            throw new (ProtocolError as any)('Input-item IDs must be unique nonempty strings of at most 512 characters');
        ids.add(item.id);
        if (!item.type || item.type === 'message') {
            item.type = 'message';
            item.status ??= 'completed';
            if (typeof item.content === 'string')
                item.content = [{ type: item.role === 'assistant' ? 'output_text' : 'input_text', text: item.content }];
        }
        return item;
    });
}
