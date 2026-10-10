// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=1927063402d3657716183fd8466bf57b5f1dd2e4c8236fa47a54143fa7669bb3; dynamic any annotations are explicit draft gaps.
import { canonicalResponse, normalizeUsage, ProtocolError } from "./protocols.js";
const encoder: any = new (TextEncoder as any)();
const frame: any = (data?: any, event?: any): any => `${event ? `event: ${event}\n` : ''}data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`;
export async function* decodeSSE(body?: any, { maxFrameBytes = 1024 * 1024 }: any = {}): AsyncGenerator<any, any, any> {
    const reader: any = body.getReader(), decoder: any = new (TextDecoder as any)();
    let buffer: any = '', data: any = [], event: any = '';
    const consume: any = (line?: any): any => {
        if (encoder.encode(line).byteLength > maxFrameBytes)
            throw new (ProtocolError as any)('Upstream SSE line exceeds limit', 502);
        if (!line) {
            const value: any = data.length ? { event, data: data.join('\n') } : null;
            data = [];
            event = '';
            return value;
        }
        if ((line as any)[0] === ':')
            return null;
        const colon: any = line.indexOf(':'), key: any = colon < 0 ? line : line.slice(0, colon);
        let value: any = colon < 0 ? '' : line.slice(colon + 1);
        if ((value as any)[0] === ' ')
            value = value.slice(1);
        if (key === 'data')
            data.push(value);
        else if (key === 'event')
            event = value;
        if (data.reduce((n?: any, value?: any): any => n + encoder.encode(value).byteLength + 1, 0) > maxFrameBytes)
            throw new (ProtocolError as any)('Upstream SSE frame exceeds limit', 502);
        return null;
    };
    try {
        while (true) {
            const { value, done }: any = await reader.read();
            buffer += decoder.decode(value, { stream: !done });
            let match: any;
            while ((match = /\r\n|\n|\r/.exec(buffer))) {
                if ((match as any)[0] === '\r' && match.index === buffer.length - 1 && !done)
                    break;
                const line: any = buffer.slice(0, match.index);
                buffer = buffer.slice(match.index + (match as any)[0].length);
                const parsed: any = consume(line);
                if (parsed)
                    yield parsed;
            }
            if (encoder.encode(buffer).byteLength > maxFrameBytes)
                throw new (ProtocolError as any)('Upstream SSE line exceeds limit', 502);
            if (done) {
                if (buffer)
                    consume(buffer);
                const parsed: any = consume('');
                if (parsed)
                    yield parsed;
                return;
            }
        }
    }
    finally {
        await reader.cancel().catch((): any => { });
        reader.releaseLock();
    }
}
async function* normalizedEvents(body?: any, protocol?: any): AsyncGenerator<any, any, any> {
    const tools: any = new (Map as any)();
    let ended: any = false, finish: any = 'stop', usage: any = normalizeUsage(), id: any, started: any = false;
    for await (const f of decodeSSE(body) as any) {
        if (f.data === '[DONE]') {
            ended = true;
            break;
        }
        let p: any;
        try {
            p = JSON.parse(f.data as any);
        }
        catch {
            throw new (ProtocolError as any)('Malformed upstream SSE JSON', 502);
        }
        if (p.error || p.type === 'error' || ['response.failed', 'response.incomplete'].includes(p.type) && p.response?.error)
            throw new (ProtocolError as any)(p.error?.message ?? p.response?.error?.message ?? 'Upstream stream failed', 502);
        const type: any = p.type ?? f.event;
        if (protocol === 'chat') {
            if (!started) {
                id = p.id;
                started = true;
                yield { type: 'start', id };
            }
            if (p.usage) {
                usage = normalizeUsage(p.usage);
                yield { type: 'usage', usage };
            }
            if (p.choices?.length > 1 || p.choices?.[0]?.index > 0)
                throw new (ProtocolError as any)('Cannot translate multiple streamed choices', 502);
            const c: any = p.choices?.[0];
            if (!c)
                continue;
            if (c.delta?.content)
                yield { type: 'text', text: c.delta.content };
            if (c.delta?.refusal)
                throw new (ProtocolError as any)('Cannot translate streamed refusal', 502);
            for (const t of c.delta?.tool_calls ?? [] as any) {
                const index: any = t.index ?? 0;
                if (!tools.has(index)) {
                    if (!t.id || !t.function?.name)
                        throw new (ProtocolError as any)('Cannot translate fragmented tool identity', 502);
                    const tool: any = { id: t.id, name: t.function.name, index };
                    tools.set(index, tool);
                    yield { type: 'tool', ...tool };
                }
                else if (t.id || t.function?.name)
                    throw new (ProtocolError as any)('Cannot translate fragmented tool identity', 502);
                if (t.function?.arguments)
                    yield { type: 'arguments', index, text: t.function.arguments };
            }
            if (c.finish_reason) {
                if (!['stop', 'length', 'tool_calls'].includes(c.finish_reason))
                    throw new (ProtocolError as any)(`Cannot translate finish reason ${c.finish_reason}`, 502);
                finish = c.finish_reason;
            }
        }
        else if (protocol === 'anthropic') {
            if (type === 'message_start') {
                started = true;
                id = p.message.id;
                usage = normalizeUsage(p.message.usage, protocol);
                yield { type: 'start', id };
                yield { type: 'usage', usage };
            }
            else if (type === 'content_block_start') {
                const b: any = p.content_block;
                if (b.type === 'tool_use') {
                    const tool: any = { id: b.id, name: b.name, index: p.index };
                    tools.set(p.index, tool);
                    yield { type: 'tool', ...tool };
                    if (b.input && Object.keys(b.input).length)
                        yield { type: 'arguments', index: p.index, text: JSON.stringify(b.input) };
                }
                else if (b.type === 'text') {
                    if (b.text)
                        yield { type: 'text', text: b.text };
                }
                else
                    throw new (ProtocolError as any)(`Cannot translate streamed block ${b.type}`, 502);
            }
            else if (type === 'content_block_delta') {
                if (p.delta.type === 'text_delta')
                    yield { type: 'text', text: p.delta.text };
                else if (p.delta.type === 'input_json_delta')
                    yield { type: 'arguments', index: p.index, text: p.delta.partial_json };
                else
                    throw new (ProtocolError as any)(`Cannot translate streamed delta ${p.delta.type}`, 502);
            }
            else if (type === 'message_delta') {
                if (p.delta.stop_reason) {
                    finish = ({ end_turn: 'stop', stop_sequence: 'stop', tool_use: 'tool_calls', max_tokens: 'length' } as any)[p.delta.stop_reason];
                    if (!finish)
                        throw new (ProtocolError as any)(`Cannot translate stop reason ${p.delta.stop_reason}`, 502);
                }
                if (p.usage) {
                    usage = { ...usage, output: p.usage.output_tokens ?? usage.output };
                    usage.total = usage.input + usage.output;
                    yield { type: 'usage', usage };
                }
            }
            else if (type === 'message_stop') {
                ended = true;
                break;
            }
        }
        else if (protocol === 'responses') {
            if (type === 'response.created') {
                started = true;
                id = p.response.id;
                yield { type: 'start', id };
            }
            else if (type === 'response.output_text.delta')
                yield { type: 'text', text: p.delta };
            else if (type === 'response.output_item.added') {
                if (p.item.type === 'function_call') {
                    const tool: any = { id: p.item.call_id, name: p.item.name, index: p.output_index };
                    tools.set(p.output_index, tool);
                    yield { type: 'tool', ...tool };
                }
                else if (p.item.type !== 'message')
                    throw new (ProtocolError as any)(`Cannot translate streamed item ${p.item.type}`, 502);
            }
            else if (type === 'response.function_call_arguments.delta')
                yield { type: 'arguments', index: p.output_index, text: p.delta };
            else if (['response.completed', 'response.incomplete'].includes(type)) {
                usage = normalizeUsage(p.response.usage);
                finish = type === 'response.incomplete' ? 'length' : tools.size ? 'tool_calls' : 'stop';
                yield { type: 'usage', usage };
                ended = true;
                break;
            }
            else if (type === 'response.refusal.delta')
                throw new (ProtocolError as any)('Cannot translate streamed refusal', 502);
        }
    }
    if (!ended)
        throw new (ProtocolError as any)('Upstream stream ended before its terminal event', 502);
    if (!started)
        yield { type: 'start', id };
    yield { type: 'finish', finish, usage };
}
export function translateStream(body?: any, source?: any, target?: any, model?: any, { clock = Date.now, onStart, onComplete, onError, onCancel, maxStateBytes = 32 * 1024 * 1024 }: any = {}): any {
    const events: any = (normalizedEvents(body, source) as any)[Symbol.asyncIterator]();
    const state: any = { id: undefined, text: '', tools: [], usage: normalizeUsage(), finish: 'stop' };
    const toolMap: any = new (Map as any)(), openToolBlocks: any = new (Set as any)();
    let stateBytes: any = 0, begun: any = false, finished: any = false, sequence: any = 0, activeBlock: any, nextBlock: any = 0, messageItem: any, outputIndex: any = 0;
    const now: any = clock();
    const responses: any = (type?: any, payload?: any): any => frame({ type, sequence_number: sequence++, ...payload }, type);
    const chat: any = (delta?: any, finish_reason: any = null, usage?: any): any => frame({ id: state.id, object: 'chat.completion.chunk', created: Math.floor(now / 1000), model, choices: usage ? [] : [{ index: 0, delta, finish_reason }], ...(usage ? { usage } : {}) });
    const closeBlock: any = (): any => { if (activeBlock === undefined)
        return ''; const result: any = frame({ type: 'content_block_stop', index: activeBlock }, 'content_block_stop'); activeBlock = undefined; return result; };
    const render: any = (e?: any): any => {
        let out: any = '';
        stateBytes += encoder.encode(e.text ?? '').byteLength + (e.type === 'tool' ? 1024 : 0);
        if (stateBytes > maxStateBytes)
            throw new (ProtocolError as any)('Upstream stream exceeds translation memory limit', 502);
        if (!begun) {
            begun = true;
            state.id = e.id ?? `native_${Math.floor(now / 1000)}`;
            if (target === 'chat')
                out += chat({ role: 'assistant', content: '' });
            else if (target === 'anthropic')
                out += frame({ type: 'message_start', message: { id: state.id, type: 'message', role: 'assistant', model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } } }, 'message_start');
            else {
                const response: any = { ...canonicalResponse(state, target, model, now), status: 'in_progress', usage: null };
                out += responses('response.created', { response });
                out += responses('response.in_progress', { response });
            }
        }
        if (e.type === 'text') {
            state.text += e.text;
            if (target === 'chat')
                out += chat({ content: e.text });
            else if (target === 'anthropic') {
                if (activeBlock === undefined) {
                    activeBlock = nextBlock++;
                    out += frame({ type: 'content_block_start', index: activeBlock, content_block: { type: 'text', text: '' } }, 'content_block_start');
                }
                out += frame({ type: 'content_block_delta', index: activeBlock, delta: { type: 'text_delta', text: e.text } }, 'content_block_delta');
            }
            else {
                if (!messageItem) {
                    messageItem = { id: `msg_${state.id}`, type: 'message', role: 'assistant', status: 'in_progress', content: [] };
                    messageItem.output_index = outputIndex++;
                    out += responses('response.output_item.added', { output_index: messageItem.output_index, item: { ...messageItem, output_index: undefined } });
                    out += responses('response.content_part.added', { item_id: messageItem.id, output_index: messageItem.output_index, content_index: 0, part: { type: 'output_text', text: '', annotations: [] } });
                }
                out += responses('response.output_text.delta', { item_id: messageItem.id, output_index: messageItem.output_index, content_index: 0, delta: e.text });
            }
        }
        else if (e.type === 'tool') {
            const index: any = state.tools.length, tool: any = { id: e.id ?? `call_${index}`, type: 'function', function: { name: e.name ?? '', arguments: '' } };
            state.tools.push(tool);
            const record: any = { index, tool, block: undefined, output_index: outputIndex++ };
            toolMap.set(e.index, record);
            if (target === 'chat')
                out += chat({ tool_calls: [{ index, ...tool }] });
            else if (target === 'anthropic') {
                out += closeBlock();
                record.block = nextBlock++;
                openToolBlocks.add(record.block);
                out += frame({ type: 'content_block_start', index: record.block, content_block: { type: 'tool_use', id: tool.id, name: tool.function.name, input: {} } }, 'content_block_start');
            }
            else
                out += responses('response.output_item.added', { output_index: record.output_index, item: { id: `fc_${tool.id}`, type: 'function_call', status: 'in_progress', call_id: tool.id, name: tool.function.name, arguments: '' } });
        }
        else if (e.type === 'arguments') {
            const r: any = toolMap.get(e.index);
            if (!r)
                throw new (ProtocolError as any)('Tool arguments arrived without a tool call', 502);
            r.tool.function.arguments += e.text;
            if (target === 'chat')
                out += chat({ tool_calls: [{ index: r.index, function: { arguments: e.text } }] });
            else if (target === 'anthropic')
                out += frame({ type: 'content_block_delta', index: r.block, delta: { type: 'input_json_delta', partial_json: e.text } }, 'content_block_delta');
            else
                out += responses('response.function_call_arguments.delta', { item_id: `fc_${r.tool.id}`, output_index: r.output_index, delta: e.text });
        }
        else if (e.type === 'usage')
            state.usage = e.usage;
        else if (e.type === 'finish') {
            state.finish = e.finish;
            state.usage = e.usage;
            for (const tool of state.tools as any) {
                if (!tool.function.arguments)
                    tool.function.arguments = '{}';
                try {
                    JSON.parse(tool.function.arguments as any);
                }
                catch {
                    throw new (ProtocolError as any)('Upstream streamed invalid tool arguments', 502);
                }
            }
            if (target === 'chat') {
                out += chat({}, state.finish);
                const u: any = canonicalResponse(state, 'chat', model, now).usage;
                out += chat({}, null, u);
                out += frame('[DONE]');
            }
            else if (target === 'anthropic') {
                out += closeBlock();
                for (const index of openToolBlocks as any)
                    out += frame({ type: 'content_block_stop', index }, 'content_block_stop');
                const message: any = canonicalResponse(state, 'anthropic', model, now);
                out += frame({ type: 'message_delta', delta: { stop_reason: message.stop_reason, stop_sequence: message.stop_sequence }, usage: message.usage }, 'message_delta');
                out += frame({ type: 'message_stop' }, 'message_stop');
            }
            else {
                if (messageItem) {
                    out += responses('response.output_text.done', { item_id: messageItem.id, output_index: messageItem.output_index, content_index: 0, text: state.text });
                    const item: any = { id: messageItem.id, type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: state.text, annotations: [] }] };
                    out += responses('response.content_part.done', { item_id: messageItem.id, output_index: messageItem.output_index, content_index: 0, part: (item.content as any)[0] });
                    out += responses('response.output_item.done', { output_index: messageItem.output_index, item });
                }
                for (const r of toolMap.values() as any) {
                    out += responses('response.function_call_arguments.done', { item_id: `fc_${r.tool.id}`, output_index: r.output_index, arguments: r.tool.function.arguments });
                    out += responses('response.output_item.done', { output_index: r.output_index, item: { id: `fc_${r.tool.id}`, type: 'function_call', status: 'completed', call_id: r.tool.id, name: r.tool.function.name, arguments: r.tool.function.arguments } });
                }
                const type: any = state.finish === 'length' ? 'response.incomplete' : 'response.completed', response: any = canonicalResponse(state, target, model, now);
                const order: any = new (Map as any)([...toolMap.values()].map((r?: any): any => [`fc_${r.tool.id}`, r.output_index]));
                if (messageItem)
                    order.set(messageItem.id, messageItem.output_index);
                response.output.sort((a?: any, b?: any): any => order.get(a.id) - order.get(b.id));
                state.response = response;
                out += responses(type, { response });
            }
            finished = true;
        }
        return out;
    };
    return new (ReadableStream as any)({
        async pull(controller?: any): Promise<any> {
            try {
                while (!finished) {
                    const { value, done }: any = await events.next();
                    if (done)
                        break;
                    const wasBegun: any = begun, output: any = render(value);
                    if (!wasBegun && begun)
                        await onStart?.({ ...canonicalResponse(state, target, model, now), status: 'in_progress', usage: null });
                    if (finished)
                        await onComplete?.(state);
                    if (output) {
                        controller.enqueue(encoder.encode(output));
                        if (finished)
                            controller.close();
                        return;
                    }
                }
                if (!finished)
                    controller.close();
            }
            catch (error: any) {
                await onError?.(error, state);
                const payload: any = { error: { type: 'upstream_stream_error', message: 'Upstream stream failed or ended prematurely' } };
                controller.enqueue(encoder.encode(target === 'responses' ? responses('error', payload) : frame(target === 'anthropic' ? { type: 'error', ...payload } : payload, target === 'anthropic' ? 'error' : undefined)));
                controller.close();
                finished = true;
                await events.return?.();
            }
        },
        async cancel(): Promise<any> { finished = true; await onCancel?.(); await events.return?.(); },
    });
}
export function monitorNativeStream(body?: any, protocol?: any, { model, onStart, onComplete, onError, onCancel }: any = {}): any {
    const events: any = (decodeSSE(body) as any)[Symbol.asyncIterator]();
    let terminal: any = false, usage: any = normalizeUsage(), anthropicUsage: any = {}, response: any, started: any = false;
    return new (ReadableStream as any)({
        async pull(controller?: any): Promise<any> {
            try {
                const { value: f, done }: any = await events.next();
                if (done) {
                    if (!terminal)
                        throw new (ProtocolError as any)('Upstream stream ended before its terminal event', 502);
                    await onComplete?.({ usage, response });
                    controller.close();
                    return;
                }
                let frameData: any = f.data;
                if (f.data === '[DONE]')
                    terminal = true;
                else {
                    let p: any;
                    try {
                        p = JSON.parse(f.data as any);
                    }
                    catch {
                        throw new (ProtocolError as any)('Malformed upstream SSE JSON', 502);
                    }
                    if (p.error || p.type === 'error' || p.type === 'response.failed')
                        throw new (ProtocolError as any)('Upstream stream reported failure', 502);
                    if (model) {
                        if (p.model)
                            p.model = model;
                        if (p.message?.model)
                            p.message.model = model;
                        if (p.response?.model)
                            p.response.model = model;
                        frameData = JSON.stringify(p);
                    }
                    if (p.usage) {
                        if (protocol === 'anthropic') {
                            anthropicUsage = { ...anthropicUsage, ...p.usage };
                            usage = normalizeUsage(anthropicUsage, protocol);
                        }
                        else
                            usage = normalizeUsage(p.usage, protocol);
                    }
                    if (p.message?.usage) {
                        anthropicUsage = p.message.usage;
                        usage = normalizeUsage(p.message.usage, protocol);
                    }
                    if (p.response?.usage)
                        usage = normalizeUsage(p.response.usage, protocol);
                    if (p.response?.id) {
                        response = p.response;
                        if (!started) {
                            started = true;
                            await onStart?.({ ...response, status: 'in_progress', usage: null });
                        }
                    }
                    if (p.type === 'message_stop' || ['response.completed', 'response.incomplete'].includes(p.type))
                        terminal = true;
                }
                if (terminal)
                    await onComplete?.({ usage, response });
                controller.enqueue(encoder.encode(frame(frameData, f.event)));
                if (terminal) {
                    controller.close();
                    await events.return?.();
                }
            }
            catch (error: any) {
                await onError?.(error, { usage, response });
                const payload: any = { error: { type: 'upstream_stream_error', message: 'Upstream stream failed or ended prematurely' } };
                controller.enqueue(encoder.encode(frame(protocol === 'anthropic' ? { type: 'error', ...payload } : payload, protocol === 'chat' ? undefined : 'error')));
                controller.close();
                await events.return?.();
            }
        },
        async cancel(): Promise<any> { await onCancel?.(); await events.return?.(); },
    });
}
