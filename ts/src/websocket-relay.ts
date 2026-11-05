// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=6bb28f05cbf332aea5e85206b4ab4c50578f27de6c0310c70ca690e519ec2c89; dynamic any annotations are explicit draft gaps.
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { createHash, randomBytes } from 'node:crypto';
import { ProtocolError, normalizeUsage } from "./protocols.js";
const guid: string = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const accept: any = (key?: any): string => createHash('sha1').update(key + guid).digest('base64');
const closeFrame: any = (code?: any, reason?: any, masked: any = false): any => {
    const text: any = (Buffer as any).from(reason).subarray(0, 123), payload: any = (Buffer as any).alloc(2 + text.length);
    payload.writeUInt16BE(code);
    text.copy(payload, 2);
    if (!masked)
        return (Buffer as any).concat([(Buffer as any).from([0x88, payload.length]), payload]);
    const mask: any = randomBytes(4);
    for (let i: any = 0; i < payload.length; i++)
        (payload as any)[i] ^= (mask as any)[i % 4];
    return (Buffer as any).concat([(Buffer as any).from([0x88, 0x80 | payload.length]), mask, payload]);
};
export class WebSocketInspector {
    declare buffer: any;
    declare limit: any;
    declare masked: any;
    declare onMessage: any;
    declare opcode: any;
    declare parts: any;
    declare size: any;
    constructor({ masked, maxMessageBytes = 4 * 1024 * 1024, onMessage = (): void => { } }: any) { this.masked = masked; this.limit = maxMessageBytes; this.onMessage = onMessage; this.buffer = (Buffer as any).alloc(0); this.parts = []; this.size = 0; this.opcode = null; }
    async feed(chunk?: any): Promise<void> {
        this.buffer = (Buffer as any).concat([this.buffer, chunk]);
        while (this.buffer.length >= 2) {
            const first: number = (this.buffer as any)[0], second: number = (this.buffer as any)[1], fin: boolean = Boolean(first & 0x80), opcode: number = first & 15, masked: boolean = Boolean(second & 0x80);
            if (first & 0x70 || masked !== this.masked || ![0, 1, 2, 8, 9, 10].includes(opcode))
                throw new (ProtocolError as any)('Invalid WebSocket frame', 400);
            let length: any = second & 127, offset: any = 2;
            if (length === 126) {
                if (this.buffer.length < 4)
                    return;
                (length as any) = this.buffer.readUInt16BE(2);
                (offset as any) = 4;
            }
            if (length === 127) {
                if (this.buffer.length < 10)
                    return;
                const wide: bigint = this.buffer.readBigUInt64BE(2);
                if (wide > BigInt(this.limit))
                    throw new (ProtocolError as any)('WebSocket frame exceeds limit', 413);
                (length as any) = Number(wide);
                (offset as any) = 10;
            }
            if (length > this.limit || opcode >= 8 && (!fin || length > 125))
                throw new (ProtocolError as any)('WebSocket frame exceeds limit or has invalid control framing', 413);
            const maskLength: number = masked ? 4 : 0;
            if (this.buffer.length < offset + maskLength + length)
                return;
            const payload: any = (Buffer as any).from(this.buffer.subarray(offset + maskLength, offset + maskLength + length));
            if (masked) {
                const mask: any = this.buffer.subarray(offset, offset + 4);
                for (let i: any = 0; i < payload.length; i++)
                    (payload as any)[i] ^= (mask as any)[i % 4];
            }
            this.buffer = this.buffer.subarray(offset + maskLength + length);
            if (opcode >= 8) {
                await (this.onMessage as any)(opcode, payload);
                continue;
            }
            if (opcode === 0 && this.opcode == null || opcode !== 0 && this.opcode != null)
                throw new (ProtocolError as any)('Invalid fragmented WebSocket message', 400);
            if (opcode !== 0)
                this.opcode = opcode;
            this.size += payload.length;
            if (this.size > this.limit)
                throw new (ProtocolError as any)('WebSocket message exceeds limit', 413);
            this.parts.push(payload);
            if (fin) {
                const value: any = (Buffer as any).concat(this.parts, this.size), kind: any = this.opcode;
                this.parts = [];
                this.size = 0;
                this.opcode = null;
                if (kind === 1)
                    new (TextDecoder as any)('utf8', { fatal: true }).decode(value);
                await (this.onMessage as any)(kind, value);
            }
        }
        if (this.buffer.length > this.limit + 14)
            throw new (ProtocolError as any)('WebSocket buffer exceeds limit', 413);
    }
}
function reject(socket?: any, status?: any, message?: any): void {
    const body: string = (JSON as any).stringify({ error: { message, type: 'api_error' } });
    (socket.end as any)(`HTTP/1.1 ${status} Error\r\nContent-Type: application/json\r\nContent-Length: ${(Buffer as any).byteLength(body)}\r\nConnection: close\r\n\r\n${body}`);
}
export async function relayWebSocket(incoming: any, downstream: any, head: any, { target, authorize, core, maxMessageBytes = 4 * 1024 * 1024, timeoutMs = 15000 }: any): Promise<void> {
    const key: any = (incoming.headers as any)['sec-websocket-key'];
    if (typeof key !== 'string' || !/^[A-Za-z0-9+/]{22}==$/.test(key) || (incoming.headers as any)['sec-websocket-version'] !== '13') {
        reject(downstream, 400, 'Invalid WebSocket handshake');
        return;
    }
    let binding: any;
    try {
        (binding as any) = await target();
    }
    catch (error: any) {
        reject(downstream, error.status ?? 500, error.message);
        return;
    }
    const { url, headers, claims }: any = binding, upstreamKey: string = randomBytes(16).toString('base64');
    const options: any = { ...(binding.ca?{ca:binding.ca}:{}), method: 'GET', headers: { ...(Object as any).fromEntries(headers), connection: 'Upgrade', upgrade: 'websocket', 'sec-websocket-key': upstreamKey, 'sec-websocket-version': '13' }, timeout: timeoutMs };
    let connecting: any = true;
    const request: any = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, options);
    request.once('timeout', (): any => request.destroy(new (Error as any)('WebSocket connect timeout')));
    request.once('error', (): void => { if (connecting)
        reject(downstream, 502, 'Upstream WebSocket connection failed'); });
    (downstream.once as any)('close', (): any => request.destroy());
    request.once('response', (response?: any): void => { (connecting as any) = false; const chunks: any = []; let size: any = 0; response.on('data', (chunk?: any): void => { (size as any) += chunk.length; if (size > maxMessageBytes) {
        response.destroy();
        downstream.destroy();
    }
    else
        chunks.push(chunk); }); response.once('end', (): void => { const body: any = (Buffer as any).concat(chunks); (downstream.end as any)((Buffer as any).concat([(Buffer as any).from(`HTTP/1.1 ${response.statusCode} Upstream\r\nContent-Type: ${(response.headers as any)['content-type'] ?? 'application/json'}\r\nContent-Length: ${body.length}\r\nConnection: close\r\n\r\n`), body])); }); });
    request.once('upgrade', (response?: any, upstream?: any, upstreamHead?: any): void => {
        (connecting as any) = false;
        if ((response.headers as any)['sec-websocket-accept'] !== accept(upstreamKey)) {
            upstream.destroy();
            reject(downstream, 502, 'Invalid upstream WebSocket handshake');
            return;
        }
        const protocol: any = (response.headers as any)['sec-websocket-protocol'];
        const offered: Array<string> = String((incoming.headers as any)['sec-websocket-protocol'] ?? '').split(',').map((v?: any): string => v.trim());
        if (protocol && !offered.includes(protocol)) {
            upstream.destroy();
            reject(downstream, 502, 'Upstream selected an unoffered WebSocket protocol');
            return;
        }
        (downstream.write as any)(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept(key)}\r\n${protocol ? `Sec-WebSocket-Protocol: ${protocol}\r\n` : ''}\r\n`);
        const completed: any = new (Set as any)();
        let inFlight: any = 0, closed: any = false;
        const tokenId: any = claims.sub ?? claims.id;
        const stop: any = async (code?: any, reason?: any): Promise<void> => { if (closed)
            return; (closed as any) = true; (downstream.end as any)(closeFrame(code, reason)); upstream.end(closeFrame(code, reason, true)); while (inFlight > 0) {
            inFlight--;
            await core.tokens?.settle?.(tokenId, 0, 0);
        } };
        const fromClient: any = new (WebSocketInspector as any)({ masked: true, maxMessageBytes, onMessage: async (opcode?: any, payload?: any): Promise<void> => {
                if (opcode !== 1)
                    return;
                let event: any;
                try {
                    (event as any) = (JSON as any).parse((payload.toString as any)('utf8'));
                }
                catch {
                    return;
                }
                if ((event as any).type !== 'response.create')
                    return;
                const model: any = (event as any).response?.model ?? (event as any).model;
                const allowed: any = claims.record?.model_policy?.allowed_models ?? [];
                if (allowed.length && (!model || !(allowed.includes as any)(model)))
                    throw new (ProtocolError as any)(model ? 'model_not_allowed' : 'model_required', 403);
                if (model)
                    await (authorize as any)(model);
                if (tokenId && core.tokens?.admit) {
                    const admitted: any = await (core.tokens.admit as any)(tokenId, 0);
                    if (admitted === false || typeof admitted === 'string' && admitted !== 'admitted')
                        throw new (ProtocolError as any)('Router token budget is exhausted', 429);
                    inFlight++;
                }
            } });
        const fromUpstream: any = new (WebSocketInspector as any)({ masked: false, maxMessageBytes, onMessage: async (opcode?: any, payload?: any): Promise<void> => {
                if (opcode !== 1)
                    return;
                let event: any;
                try {
                    (event as any) = (JSON as any).parse((payload.toString as any)('utf8'));
                }
                catch {
                    return;
                }
                const response: any = (event as any).response;
                if (!['response.completed', 'response.done'].includes((event as any).type) || !response?.id || completed.has(response.id))
                    return;
                completed.add(response.id);
                if (completed.size > 10000)
                    throw new (ProtocolError as any)('WebSocket response identity limit exceeded', 413);
                const usage: any = normalizeUsage(response.usage);
                if (tokenId)
                    await core.tokens?.settle?.(tokenId, 0, usage.total);
                if (inFlight > 0)
                    inFlight--;
            } });
        const forward: any = (source?: any, sink?: any, inspector?: any, initial?: any): void => {
            let pending: any = (Promise as any).resolve();
            const consume: any = (chunk?: any): void => { source.pause(); (pending as any) = pending.then(async (): Promise<void> => { if (closed)
                return; await (inspector.feed as any)(chunk); if (!(sink.write as any)(chunk))
                await new (Promise as any)((resolve?: any): any => (sink.once as any)('drain', resolve)); source.resume(); }).catch((): Promise<void> => stop(1008, 'Router rejected WebSocket message')); };
            (source.on as any)('data', consume);
            (source.once as any)('end', (): void => { sink.end(); });
            (source.once as any)('error', (): Promise<void> => stop(1011, 'WebSocket peer disconnected'));
            (source.once as any)('close', (): void => { sink.destroy(); });
            if (initial.length)
                consume(initial);
        };
        forward(downstream, upstream, fromClient, head);
        forward(upstream, downstream, fromUpstream, upstreamHead);
    });
    request.end();
}
