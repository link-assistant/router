// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=46af4605b7e1f58a946022cfe8d122492d256bc2926a4c91c133885c340f9164; dynamic any annotations are explicit draft gaps.
export class ProtocolError extends Error {
    declare code: any;
    declare status: any;
    constructor(message: any, status: any = 400) { super(message); this.status = status; this.code = 'unsupported_translation'; }
}
const copy: any = (value?: any): any => structuredClone(value);
const text: any = (content?: any): any => typeof content === 'string' ? content : (content ?? []).map((p?: any): any => p.text ?? '').join('');
const parseArguments: any = (raw?: any): any => {
    try {
        return typeof raw === 'string' ? JSON.parse(raw as any) : raw ?? {};
    }
    catch {
        throw new (ProtocolError as any)('Function arguments must contain valid JSON');
    }
};
function chatParts(content?: any): any {
    if (content == null || typeof content === 'string')
        return content ?? '';
    if (!Array.isArray(content))
        throw new (ProtocolError as any)('Message content must be a string or array');
    return content.map((p?: any): any => {
        if (['text', 'input_text', 'output_text'].includes(p.type))
            return { type: 'text', text: p.text };
        if (p.type === 'image_url') {
            const url: any = p.image_url?.url;
            const match: any = /^data:([^;]+);base64,(.+)$/s.exec(url ?? '');
            return { type: 'image', source: match ? { type: 'base64', media_type: (match as any)[1], data: (match as any)[2] } : { type: 'url', url } };
        }
        throw new (ProtocolError as any)(`Cannot translate content part ${p.type}`);
    });
}
function anthropicParts(content?: any): any {
    if (typeof content === 'string')
        return content;
    return (content ?? []).map((p?: any): any => {
        if (p.cache_control || p.citations?.length)
            throw new (ProtocolError as any)('Cache controls and citations require a native Anthropic upstream');
        if (p.type === 'text')
            return { type: 'text', text: p.text };
        if (p.type === 'image')
            return { type: 'image_url', image_url: { url: p.source?.type === 'base64' ? `data:${p.source.media_type};base64,${p.source.data}` : p.source?.url } };
        throw new (ProtocolError as any)(`Cannot translate Anthropic content part ${p.type}`);
    });
}
export function requestToChat(body?: any, source?: any): any {
    if (source === 'chat')
        return copy(body);
    const out: any = { model: body.model, messages: [], stream: body.stream ?? false };
    for (const key of ['temperature', 'top_p', 'parallel_tool_calls'] as any)
        if ((body as any)[key] !== undefined)
            (out as any)[key] = copy((body as any)[key]);
    if (source === 'anthropic') {
        out.max_tokens = body.max_tokens;
        if (body.system)
            out.messages.push({ role: 'system', content: anthropicParts(body.system) });
        for (const message of body.messages as any) {
            if (typeof message.content === 'string') {
                out.messages.push(copy(message));
                continue;
            }
            const ordinary: any = [], tools: any = [];
            for (const block of message.content ?? [] as any) {
                if (block.type === 'tool_result') {
                    if (block.is_error)
                        throw new (ProtocolError as any)('Tool error flags require a native Anthropic upstream');
                    out.messages.push({ role: 'tool', tool_call_id: block.tool_use_id, content: anthropicParts(block.content) });
                }
                else if (block.type === 'tool_use') {
                    tools.push({ id: block.id, type: 'function', function: { name: block.name, arguments: JSON.stringify(block.input ?? {}) } });
                }
                else
                    ordinary.push(block);
            }
            if (ordinary.length || tools.length)
                out.messages.push({ role: message.role, content: anthropicParts(ordinary), ...(tools.length ? { tool_calls: tools } : {}) });
        }
        if (body.tools)
            out.tools = body.tools.map((t?: any): any => {
                if (t.type && t.type !== 'custom')
                    throw new (ProtocolError as any)(`Cannot translate server tool ${t.type}`);
                return { type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } };
            });
        if (body.tool_choice) {
            const t: any = body.tool_choice;
            out.tool_choice = t.type === 'tool' ? { type: 'function', function: { name: t.name } } : (({ auto: 'auto', any: 'required', none: 'none' } as any)[t.type]);
            if (!out.tool_choice)
                throw new (ProtocolError as any)('Unsupported Anthropic tool_choice');
            if (t.disable_parallel_tool_use !== undefined)
                out.parallel_tool_calls = !t.disable_parallel_tool_use;
        }
        if (body.stop_sequences)
            out.stop = copy(body.stop_sequences);
        if (body.thinking || body.output_config)
            throw new (ProtocolError as any)('Thinking controls require a native Anthropic upstream');
    }
    else if (source === 'responses') {
        if (body.previous_response_id || body.conversation || body.background)
            throw new (ProtocolError as any)('Stateful Responses controls require a native Responses upstream');
        out.max_completion_tokens = body.max_output_tokens;
        if (body.instructions)
            out.messages.push({ role: 'system', content: body.instructions });
        const input: any = typeof body.input === 'string' ? [{ role: 'user', content: body.input }] : body.input;
        for (const item of input ?? [] as any) {
            if (item.type === 'function_call')
                out.messages.push({ role: 'assistant', content: null, tool_calls: [{ id: item.call_id, type: 'function', function: { name: item.name, arguments: item.arguments } }] });
            else if (item.type === 'function_call_output')
                out.messages.push({ role: 'tool', tool_call_id: item.call_id, content: typeof item.output === 'string' ? item.output : JSON.stringify(item.output) });
            else if (!item.type || item.type === 'message')
                out.messages.push({ role: item.role, content: (typeof item.content === 'string') ? item.content : (item.content ?? []).map((p?: any): any => {
                        if (['input_text', 'output_text', 'text'].includes(p.type))
                            return { type: 'text', text: p.text };
                        if (p.type === 'input_image')
                            return { type: 'image_url', image_url: { url: p.image_url, detail: p.detail } };
                        throw new (ProtocolError as any)(`Cannot translate Responses content ${p.type}`);
                    }) });
            else
                throw new (ProtocolError as any)(`Cannot translate Responses input ${item.type}`);
        }
        if (body.tools)
            out.tools = body.tools.map((t?: any): any => {
                if (t.type !== 'function')
                    throw new (ProtocolError as any)(`Cannot translate Responses tool ${t.type}`);
                const { type, ...fn }: any = t;
                return { type, function: fn };
            });
        if (body.tool_choice)
            out.tool_choice = typeof body.tool_choice === 'string' ? body.tool_choice : { type: 'function', function: { name: body.tool_choice.name } };
        if (body.reasoning || body.text?.format)
            throw new (ProtocolError as any)('Reasoning and structured output require a native Responses upstream');
    }
    else
        throw new (ProtocolError as any)(`Unknown source protocol ${source}`);
    return out;
}
export function translateRequest(body?: any, source?: any, target?: any, model: any = body.model): any {
    if (source === target)
        return { ...copy(body), model };
    const chat: any = requestToChat(body, source);
    chat.model = model;
    if (target === 'chat')
        return chat;
    if (chat.n && chat.n !== 1)
        throw new (ProtocolError as any)('Only n=1 can be translated');
    for (const key of ['response_format', 'audio', 'modalities', 'logprobs', 'logit_bias', 'frequency_penalty', 'presence_penalty', 'seed', 'reasoning', 'reasoning_effort'] as any) {
        if ((chat as any)[key] != null && (chat as any)[key] !== false)
            throw new (ProtocolError as any)(`${key} requires a native Chat upstream`);
    }
    if (target === 'anthropic') {
        const out: any = { model, messages: [], max_tokens: chat.max_completion_tokens ?? chat.max_tokens ?? 4096, stream: chat.stream ?? false };
        const systems: any = [];
        for (const m of chat.messages as any) {
            if (m.role === 'system' || m.role === 'developer') {
                systems.push(text(m.content));
                continue;
            }
            if (m.role === 'tool') {
                const block: any = { type: 'tool_result', tool_use_id: m.tool_call_id, content: chatParts(m.content) };
                const previous: any = out.messages.at(-1);
                if (previous?.role === 'user') {
                    if (typeof previous.content === 'string')
                        previous.content = [{ type: 'text', text: previous.content }];
                    previous.content.push(block);
                }
                else
                    out.messages.push({ role: 'user', content: [block] });
                continue;
            }
            if (!['user', 'assistant'].includes(m.role))
                throw new (ProtocolError as any)(`Cannot translate role ${m.role}`);
            let content: any = chatParts(m.content);
            if (m.tool_calls?.length) {
                if (typeof content === 'string')
                    content = content ? [{ type: 'text', text: content }] : [];
                content.push(...m.tool_calls.map((t?: any): any => ({ type: 'tool_use', id: t.id, name: t.function.name, input: parseArguments(t.function.arguments) })));
            }
            out.messages.push({ role: m.role, content });
        }
        if (systems.length)
            out.system = systems.join('\n\n');
        for (const key of ['temperature', 'top_p'] as any)
            if ((chat as any)[key] !== undefined)
                (out as any)[key] = (chat as any)[key];
        if (chat.stop)
            out.stop_sequences = Array.isArray(chat.stop) ? chat.stop : [chat.stop];
        if (chat.tools)
            out.tools = chat.tools.map((t?: any): any => ({ name: t.function.name, description: t.function.description, input_schema: t.function.parameters ?? { type: 'object', properties: {} } }));
        if (chat.tool_choice)
            out.tool_choice = typeof chat.tool_choice === 'string' ? { type: ({ auto: 'auto', required: 'any', none: 'none' } as any)[chat.tool_choice] } : { type: 'tool', name: chat.tool_choice.function.name };
        if (chat.parallel_tool_calls !== undefined)
            out.tool_choice = { ...(out.tool_choice ?? { type: 'auto' }), disable_parallel_tool_use: !chat.parallel_tool_calls };
        return out;
    }
    if (target === 'responses') {
        const out: any = { model, input: [], stream: chat.stream ?? false };
        if (chat.stop)
            throw new (ProtocolError as any)('Responses has no stop sequence control');
        for (const m of chat.messages as any) {
            if (m.role === 'tool')
                out.input.push({ type: 'function_call_output', call_id: m.tool_call_id, output: text(m.content) });
            else {
                if (m.content != null && (typeof m.content === 'string' ? m.content.length : m.content.length))
                    out.input.push({ role: m.role, content: typeof m.content === 'string' ? m.content : m.content.map((p?: any): any => {
                            if (p.type === 'text')
                                return { type: m.role === 'assistant' ? 'output_text' : 'input_text', text: p.text };
                            if (p.type === 'image_url')
                                return { type: 'input_image', image_url: p.image_url.url, detail: p.image_url.detail };
                            throw new (ProtocolError as any)(`Cannot translate content ${p.type}`);
                        }) });
                for (const call of m.tool_calls ?? [] as any)
                    out.input.push({ type: 'function_call', call_id: call.id, name: call.function.name, arguments: call.function.arguments });
            }
        }
        if (chat.max_completion_tokens ?? chat.max_tokens)
            out.max_output_tokens = chat.max_completion_tokens ?? chat.max_tokens;
        for (const key of ['temperature', 'top_p', 'parallel_tool_calls'] as any)
            if ((chat as any)[key] !== undefined)
                (out as any)[key] = (chat as any)[key];
        if (chat.tools)
            out.tools = chat.tools.map((t?: any): any => ({ type: 'function', ...t.function }));
        if (chat.tool_choice)
            out.tool_choice = typeof chat.tool_choice === 'string' ? chat.tool_choice : { type: 'function', name: chat.tool_choice.function.name };
        return out;
    }
    throw new (ProtocolError as any)(`Unsupported upstream protocol ${target}`, 501);
}
export function normalizeUsage(usage: any = {}, protocol: any = 'chat'): any {
    const rawInput: any = usage.input_tokens ?? usage.prompt_tokens ?? 0;
    const output: any = usage.output_tokens ?? usage.completion_tokens ?? 0;
    const cached: any = usage.cache_read_input_tokens ?? usage.input_tokens_details?.cached_tokens ?? usage.prompt_tokens_details?.cached_tokens ?? 0;
    const created: any = usage.cache_creation_input_tokens ?? 0;
    const input: any = rawInput + (protocol === 'anthropic' ? cached + created : 0);
    const normalized: any = { input, output, cached, created, total: usage.total_tokens ?? input + output };
    if (Object.values(normalized).some((value?: any): any => !Number.isSafeInteger(value) || value < 0))
        throw new (ProtocolError as any)('Upstream returned invalid token usage', 502);
    return normalized;
}
export function responseToCanonical(body?: any, protocol?: any): any {
    const result: any = { id: body.id, model: body.model, text: '', tools: [], usage: normalizeUsage(body.usage, protocol), finish: 'stop' };
    if (protocol === 'chat') {
        const choice: any = body.choices?.[0];
        if (body.choices?.length > 1)
            throw new (ProtocolError as any)('Cannot translate multiple response choices', 502);
        if (!choice?.message)
            throw new (ProtocolError as any)('Upstream Chat response has no message', 502);
        if (Array.isArray(choice.message.content) && choice.message.content.some((p?: any): any => p.type !== 'text' || p.annotations?.length))
            throw new (ProtocolError as any)('Cannot translate non-text response content or annotations', 502);
        result.text = text(choice.message.content);
        result.tools = copy(choice.message.tool_calls ?? []);
        result.finish = choice.finish_reason ?? 'stop';
        if (!['stop', 'length', 'tool_calls'].includes(result.finish))
            throw new (ProtocolError as any)(`Cannot translate finish reason ${result.finish}`, 502);
        if (choice.message.refusal)
            throw new (ProtocolError as any)('Refusal cannot be translated to this dialect', 502);
    }
    else if (protocol === 'anthropic') {
        if (!Array.isArray(body.content))
            throw new (ProtocolError as any)('Upstream Messages response has no content', 502);
        for (const p of body.content as any) {
            if (p.type === 'text') {
                if (p.citations?.length)
                    throw new (ProtocolError as any)('Cannot translate response citations', 502);
                result.text += p.text;
            }
            else if (p.type === 'tool_use')
                result.tools.push({ id: p.id, type: 'function', function: { name: p.name, arguments: JSON.stringify(p.input) } });
            else
                throw new (ProtocolError as any)(`Cannot translate response block ${p.type}`, 502);
        }
        result.finish = ({ end_turn: 'stop', stop_sequence: 'stop', max_tokens: 'length', tool_use: 'tool_calls' } as any)[body.stop_reason];
        if (!result.finish)
            throw new (ProtocolError as any)(`Cannot translate stop reason ${body.stop_reason}`, 502);
        result.stopSequence = body.stop_sequence ?? null;
    }
    else if (protocol === 'responses') {
        if (body.error || body.status && !['completed', 'incomplete'].includes(body.status))
            throw new (ProtocolError as any)('Upstream Responses operation did not complete successfully', 502);
        if (!Array.isArray(body.output))
            throw new (ProtocolError as any)('Upstream Responses response has no output', 502);
        for (const item of body.output as any) {
            if (item.type === 'message')
                for (const p of item.content ?? [] as any) {
                    if (p.type !== 'output_text')
                        throw new (ProtocolError as any)(`Cannot translate response part ${p.type}`, 502);
                    if (p.annotations?.length)
                        throw new (ProtocolError as any)('Cannot translate response annotations', 502);
                    result.text += p.text;
                }
            else if (item.type === 'function_call')
                result.tools.push({ id: item.call_id, type: 'function', function: { name: item.name, arguments: item.arguments } });
            else
                throw new (ProtocolError as any)(`Cannot translate response item ${item.type}`, 502);
        }
        result.finish = body.status === 'incomplete' ? 'length' : result.tools.length ? 'tool_calls' : 'stop';
    }
    return result;
}
export function canonicalResponse(r?: any, protocol?: any, model: any = r.model, now: any = Date.now()): any {
    const created: any = Math.floor(now / 1000), id: any = r.id ?? `native_${created}`;
    const u: any = r.usage;
    if (protocol === 'chat')
        return { id, object: 'chat.completion', created, model, choices: [{ index: 0, message: { role: 'assistant', content: r.text || (r.tools.length ? null : ''), ...(r.tools.length ? { tool_calls: r.tools } : {}) }, finish_reason: r.finish }], usage: { prompt_tokens: u.input, completion_tokens: u.output, total_tokens: u.total, prompt_tokens_details: { cached_tokens: u.cached } } };
    if (protocol === 'anthropic')
        return { id, type: 'message', role: 'assistant', model, content: [...(r.text ? [{ type: 'text', text: r.text }] : []), ...r.tools.map((t?: any): any => ({ type: 'tool_use', id: t.id, name: t.function.name, input: parseArguments(t.function.arguments) }))], stop_reason: r.finish === 'tool_calls' ? 'tool_use' : r.finish === 'length' ? 'max_tokens' : r.stopSequence ? 'stop_sequence' : 'end_turn', stop_sequence: r.stopSequence ?? null, usage: { input_tokens: Math.max(0, u.input - u.cached - u.created), output_tokens: u.output, cache_read_input_tokens: u.cached, cache_creation_input_tokens: u.created } };
    return { id: id.startsWith('resp_') ? id : `resp_${id}`, object: 'response', created_at: created, model, status: r.finish === 'length' ? 'incomplete' : 'completed', error: null, incomplete_details: r.finish === 'length' ? { reason: 'max_output_tokens' } : null, output: [...(r.text ? [{ id: `msg_${id}`, type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: r.text, annotations: [] }] }] : []), ...r.tools.map((t?: any): any => ({ id: `fc_${t.id}`, type: 'function_call', status: 'completed', call_id: t.id, name: t.function.name, arguments: t.function.arguments }))], usage: { input_tokens: u.input, output_tokens: u.output, total_tokens: u.total, input_tokens_details: { cached_tokens: u.cached }, output_tokens_details: { reasoning_tokens: 0 } } };
}
export function translateResponse(body?: any, source?: any, target?: any, model?: any, now?: any): any {
    try {
        return source === target ? { ...copy(body), model } : canonicalResponse(responseToCanonical(body, source), target, model, now);
    }
    catch (error: any) {
        if (error instanceof ProtocolError)
            error.status = 502;
        throw error;
    }
}
export function projectModels(entries?: any, protocol: any = 'chat', query: any = new (URLSearchParams as any)()): any {
    const data: any = entries.map((model?: any): any => protocol === 'anthropic' ? Object.fromEntries(Object.entries({ id: model.id, type: 'model', display_name: model.display_name, created_at: model.created_at, max_input_tokens: model.max_input_tokens, max_tokens: model.max_tokens, capabilities: model.capabilities, router_available: model.router_available, router_unavailable_reason: model.router_unavailable_reason }).filter(([, value]: any): any => value !== undefined)) : Object.fromEntries(Object.entries({ id: model.id, object: 'model', created: model.created, owned_by: model.owned_by, router_available: model.router_available, router_unavailable_reason: model.router_unavailable_reason }).filter(([, value]: any): any => value !== undefined)));
    if (protocol !== 'anthropic')
        return { object: 'list', data };
    for (const key of ['limit', 'before_id', 'after_id'] as any)
        if (query.getAll(key).length > 1)
            throw new (ProtocolError as any)(`${key} may be supplied only once`);
    if (query.has('before_id') && query.has('after_id'))
        throw new (ProtocolError as any)('before_id and after_id cannot be used together');
    if (query.has('limit') && !/^\d+$/.test(query.get('limit')))
        throw new (ProtocolError as any)('limit must be between 1 and 1000');
    const limit: any = query.has('limit') ? Number(query.get('limit')) : 20;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000)
        throw new (ProtocolError as any)('limit must be between 1 and 1000');
    let start: any = 0, end: any, has_more: any;
    if (query.has('before_id')) {
        end = data.findIndex((m?: any): any => m.id === query.get('before_id'));
        if (end < 0)
            throw new (ProtocolError as any)('before_id cursor not found');
        start = Math.max(0, end - limit);
        has_more = start > 0;
    }
    else {
        if (query.has('after_id')) {
            const index: any = data.findIndex((m?: any): any => m.id === query.get('after_id'));
            if (index < 0)
                throw new (ProtocolError as any)('after_id cursor not found');
            start = index + 1;
        }
        end = Math.min(data.length, start + limit);
        has_more = end < data.length;
    }
    const page: any = data.slice(start, end);
    return { data: page, first_id: (page as any)[0]?.id ?? null, last_id: page.at(-1)?.id ?? null, has_more };
}
