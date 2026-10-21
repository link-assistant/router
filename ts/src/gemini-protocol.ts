// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=fb8a21b8ca1501f2a2c1a180dbcb7c7a8bf33f8af7b271c48539afed54ba852b; dynamic any annotations are explicit draft gaps.
import { ProtocolError } from "./protocols.js";
const copy: any = structuredClone;
const object: any = (value?: any, path?: any): any => { if (!value || typeof value !== 'object' || (Array as any).isArray(value))
    throw new (ProtocolError as any)(`${path} must be an object`); return value; };
const fields: any = (value?: any, allowed?: any, path?: any): void => { object(value, path); for (const key of (Object as any).keys(value) as any)
    if (!(allowed.includes as any)(key))
        throw new (ProtocolError as any)(`${path}.${key} cannot be represented by this bridge`); };
const string: any = (value?: any, path?: any): string => { if (typeof value !== 'string')
    throw new (ProtocolError as any)(`${path} must be a string`); return value; };
const parseObject: any = (value?: any, path?: any): any => { let parsed: any; try {
    (parsed as any) = typeof value === 'string' ? (JSON as any).parse(value) : value;
}
catch {
    throw new (ProtocolError as any)(`${path} must encode a JSON object`);
} return object(parsed, path); };
const alias: any = (value?: any, a?: any, b?: any): any => (value as any)[a] ?? (value as any)[b];
const levels: any = { minimal: 512, low: 1024, medium: 8192, high: 24576, xhigh: 32768, max: 128000 };
function effort(value?: any): undefined | string { if (value == null)
    return; if (typeof value !== 'string')
    throw new (ProtocolError as any)('thinking effort must be a string'); const normalized: string = value.toLowerCase(); if (normalized === '-1')
    return 'auto'; if (!['none', 'auto', ...(Object as any).keys(levels)].includes(normalized))
    throw new (ProtocolError as any)(`unsupported thinking effort: ${value}`); return normalized; }
function chatThinking(body?: any): any {
    if (body.reasoning != null)
        object(body.reasoning, 'reasoning');
    const value: any = effort(body.reasoning?.effort ?? body.reasoning_effort);
    if (value === undefined)
        return;
    const visible: any = typeof body.reasoning?.summary === 'string' ? body.reasoning.summary !== 'none' : typeof body.reasoning_effort === 'string' ? body.reasoning_effort !== 'none' : undefined;
    return { thinkingBudget: value === 'none' ? 0 : value === 'auto' ? -1 : (levels as any)[value], ...(visible === undefined ? {} : { includeThoughts: visible }) };
}
function geminiThinking(config?: any): undefined | string {
    if (!config)
        return;
    fields(config, ['includeThoughts', 'include_thoughts', 'thinkingBudget', 'thinking_budget', 'thinkingLevel', 'thinking_level'], 'thinkingConfig');
    for (const key of ['includeThoughts', 'include_thoughts'] as any)
        if ((config as any)[key] !== undefined && typeof (config as any)[key] !== 'boolean')
            throw new (ProtocolError as any)(`thinkingConfig.${key} must be a boolean`);
    const level: any = effort(alias(config, 'thinkingLevel', 'thinking_level'));
    if (level !== undefined)
        return level;
    const budget: any = alias(config, 'thinkingBudget', 'thinking_budget');
    if (budget == null)
        return;
    if (!(Number as any).isSafeInteger(budget) || budget < -1 || budget > 4294967295)
        throw new (ProtocolError as any)('thinking budget must be -1 or a nonnegative u32 integer');
    return budget === -1 ? 'auto' : budget === 0 ? 'none' : budget <= 512 ? 'minimal' : budget <= 1024 ? 'low' : budget <= 8192 ? 'medium' : budget <= 24576 ? 'high' : 'xhigh';
}
function imageMedia(value?: any): any { if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(value))
    throw new (ProtocolError as any)('Image media type is unsupported'); return value; }
function imageBase64(value?: any): string { if (typeof value !== 'string' || !value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.replace(/=+$/, '').length % 4 === 1 || value.includes('=') && value.length % 4 !== 0 || (Buffer as any).from(value, 'base64').toString('base64').replace(/=+$/, '') !== value.replace(/=+$/, ''))
    throw new (ProtocolError as any)('Image data must be valid base64'); return value; }
const chatContent: any = (parts?: any): any => parts.length === 1 && (parts as any)[0].type === 'text' ? (parts as any)[0].text : parts;
function chatParts(content?: any): any {
    if (content == null)
        return [];
    if (typeof content === 'string')
        return content ? [{ text: content }] : [];
    if (!(Array as any).isArray(content))
        throw new (ProtocolError as any)('Message content must be a string or array');
    return content.map((part?: any): any => {
        if (part.type === 'text') {
            fields(part, ['type', 'text'], 'content');
            return { text: string(part.text, 'content.text') };
        }
        if (part.type === 'image_url') {
            fields(part, ['type', 'image_url'], 'content');
            fields(part.image_url, ['url', 'detail'], 'image_url');
            if (part.image_url.detail != null && part.image_url.detail !== 'auto')
                throw new (ProtocolError as any)('image detail cannot be represented by Gemini');
            const url: string = string(part.image_url.url, 'image_url.url'), match: any = /^data:(image\/(?:jpeg|png|gif|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(url);
            if (match)
                return { inlineData: { mimeType: (match as any)[1], data: imageBase64((match as any)[2]) } };
            let parsed: any;
            try {
                (parsed as any) = new (URL as any)(url);
            }
            catch {
                throw new (ProtocolError as any)('Image URI must be an absolute HTTP(S) URI');
            }
            if (!['http:', 'https:'].includes(parsed.protocol))
                throw new (ProtocolError as any)('Image URI must use HTTP(S)');
            return { fileData: { fileUri: url } };
        }
        throw new (ProtocolError as any)(`Cannot translate content part ${part.type} to Gemini`);
    });
}
export function chatToGemini(body?: any): any {
    fields(body, ['model', 'messages', 'stream', 'max_tokens', 'max_completion_tokens', 'temperature', 'top_p', 'top_k', 'stop', 'tools', 'tool_choice', 'parallel_tool_calls', 'n', 'stream_options', 'user', 'safety_identifier', 'response_format', 'seed', 'frequency_penalty', 'presence_penalty', 'logit_bias', 'modalities', 'audio', 'logprobs', 'top_logprobs', 'reasoning', 'reasoning_effort'], 'request');
    if (!(Array as any).isArray(body.messages))
        throw new (ProtocolError as any)('messages must be an array');
    if (body.max_tokens != null && body.max_completion_tokens != null)
        throw new (ProtocolError as any)('max_completion_tokens and max_tokens cannot both be set');
    if (body.n != null && body.n !== 1)
        throw new (ProtocolError as any)('Gemini bridge supports only n=1');
    for (const field of ['audio', 'user', 'safety_identifier', 'stream_options'] as any)
        if ((body as any)[field] != null)
            throw new (ProtocolError as any)(`${field} cannot be represented by Gemini`);
    if (body.logprobs != null && body.logprobs !== false || body.top_logprobs != null && body.top_logprobs !== 0)
        throw new (ProtocolError as any)('Log probabilities cannot be represented by Gemini');
    if (body.logit_bias != null && (typeof body.logit_bias !== 'object' || (Array as any).isArray(body.logit_bias) || (Object as any).keys(body.logit_bias).length))
        throw new (ProtocolError as any)('logit_bias cannot be represented by Gemini');
    for (const field of ['frequency_penalty', 'presence_penalty'] as any)
        if ((body as any)[field] != null && (typeof (body as any)[field] !== 'number' || !(Number as any).isFinite((body as any)[field]) || (body as any)[field] < -2 || (body as any)[field] > 2))
            throw new (ProtocolError as any)(`${field} must be between -2 and 2`);
    if (body.seed != null && !(Number as any).isSafeInteger(body.seed))
        throw new (ProtocolError as any)('seed must be an integer');
    if (body.top_k != null && (!(Number as any).isSafeInteger(body.top_k) || body.top_k < 0))
        throw new (ProtocolError as any)('top_k must be a non-negative integer');
    if (body.parallel_tool_calls != null && typeof body.parallel_tool_calls !== 'boolean')
        throw new (ProtocolError as any)('parallel_tool_calls must be a boolean');
    if (body.parallel_tool_calls === false)
        throw new (ProtocolError as any)('Disabling parallel calls cannot be represented by Gemini');
    if (body.modalities && (JSON as any).stringify(body.modalities) !== '["text"]')
        throw new (ProtocolError as any)('Non-text modalities cannot be represented by Gemini');
    const out: any = { contents: [] }, system: any = [], pending: any = new (Map as any)();
    for (const message of body.messages as any) {
        fields(message, message.role === 'assistant' ? ['role', 'content', 'name', 'tool_calls'] : message.role === 'tool' ? ['role', 'content', 'tool_call_id'] : ['role', 'content', 'name'], 'message');
        if (message.name)
            throw new (ProtocolError as any)('Message name cannot be represented by Gemini');
        if (['system', 'developer'].includes(message.role)) {
            system.push(...chatParts(message.content));
            continue;
        }
        if (message.role === 'tool') {
            const name: any = pending.get(message.tool_call_id);
            if (!name)
                throw new (ProtocolError as any)('Tool result has no preceding matching call');
            pending.delete(message.tool_call_id);
            const text: any = typeof message.content === 'string' ? message.content : (((message.content ?? []).map as any)((p?: any): any => { if (p.type !== 'text')
                throw new (ProtocolError as any)('Tool output must be text'); return p.text; }).join as any)('');
            let response: any;
            try {
                (response as any) = (JSON as any).parse(text);
            }
            catch {
                (response as any) = { output: text };
            }
            if (!response || typeof response !== 'object' || (Array as any).isArray(response))
                (response as any) = { output: text };
            out.contents.push({ role: 'user', parts: [{ functionResponse: { id: message.tool_call_id, name, response } }] });
            continue;
        }
        if (!['user', 'assistant'].includes(message.role))
            throw new (ProtocolError as any)('Message role cannot be represented by Gemini');
        const parts: any = chatParts(message.content);
        for (const call of message.tool_calls ?? [] as any) {
            if (call.type !== 'function' || !call.id || !call.function?.name || pending.has(call.id))
                throw new (ProtocolError as any)('Function call identity is invalid or duplicated');
            pending.set(call.id, call.function.name);
            parts.push({ functionCall: { id: call.id, name: call.function.name, args: parseObject(call.function.arguments, 'function.arguments') } });
        }
        out.contents.push({ role: message.role === 'assistant' ? 'model' : 'user', parts });
    }
    if (system.length)
        out.systemInstruction = { parts: system };
    const generation: any = {};
    for (const [from, to] of [['temperature', 'temperature'], ['top_p', 'topP'], ['top_k', 'topK'], ['frequency_penalty', 'frequencyPenalty'], ['presence_penalty', 'presencePenalty'], ['seed', 'seed']] as any)
        if ((body as any)[from] !== undefined)
            (generation as any)[to] = (body as any)[from];
    if (body.max_completion_tokens ?? body.max_tokens)
        generation.maxOutputTokens = body.max_completion_tokens ?? body.max_tokens;
    if (body.stop)
        generation.stopSequences = (Array as any).isArray(body.stop) ? copy(body.stop) : [body.stop];
    if (body.response_format) {
        if (body.response_format.type === 'json_object') {
            generation.responseMimeType = 'application/json';
            generation.responseJsonSchema = { type: 'object', additionalProperties: true };
        }
        else if (body.response_format.type === 'json_schema') {
            const definition: any = object(body.response_format.json_schema, 'response_format.json_schema');
            if (typeof definition.name !== 'string' || !definition.name || definition.strict !== undefined && typeof definition.strict !== 'boolean')
                throw new (ProtocolError as any)('JSON schema requires a nonempty name and boolean strict');
            generation.responseMimeType = 'application/json';
            generation.responseJsonSchema = copy(object(definition.schema, 'schema'));
        }
        else if (body.response_format.type !== 'text')
            throw new (ProtocolError as any)('Unsupported response_format');
    }
    const thinking: any = chatThinking(body);
    if (thinking)
        generation.thinkingConfig = thinking;
    if ((Object as any).keys(generation).length)
        out.generationConfig = generation;
    if (body.tools)
        out.tools = [{ functionDeclarations: (body.tools.map as any)((tool?: any): any => { fields(tool, ['type', 'function'], 'tool'); if (tool.type !== 'function')
                    throw new (ProtocolError as any)('Gemini only supports function tools'); fields(tool.function, ['name', 'description', 'parameters', 'strict'], 'function'); if (tool.function.strict != null && tool.function.strict !== false)
                    throw new (ProtocolError as any)('Function strict cannot be represented by Gemini'); if (typeof tool.function.name !== 'string' || !tool.function.name)
                    throw new (ProtocolError as any)('Function name must not be empty'); return { name: tool.function.name, ...(tool.function.description ? { description: tool.function.description } : {}), parameters: copy(object(tool.function.parameters ?? { type: 'object', properties: {} }, 'parameters')) }; }) }];
    if (body.tool_choice) {
        const mode: any = typeof body.tool_choice === 'string' ? ({ auto: 'AUTO', none: 'NONE', required: 'ANY' } as any)[body.tool_choice] : 'ANY';
        if (!mode)
            throw new (ProtocolError as any)('Unsupported tool_choice');
        out.toolConfig = { functionCallingConfig: { mode, ...(typeof body.tool_choice === 'object' ? { allowedFunctionNames: [body.tool_choice.function.name] } : {}) } };
    }
    return out;
}
export function geminiToChat(body?: any): any {
    fields(body, ['model', 'stream', 'contents', 'systemInstruction', 'system_instruction', 'generationConfig', 'generation_config', 'tools', 'toolConfig', 'tool_config'], 'request');
    if (!(Array as any).isArray(body.contents))
        throw new (ProtocolError as any)('contents must be an array');
    const out: any = { model: body.model, messages: [], stream: body.stream ?? false }, pending: any = [];
    let sequence: any = 0;
    const convert: any = (part?: any): any => {
        if ((Object as any).hasOwn(part, 'text')) {
            fields(part, ['text'], 'part');
            return { type: 'text', text: string(part.text, 'part.text') };
        }
        const inline: any = alias(part, 'inlineData', 'inline_data');
        if (inline) {
            fields(part, ['inlineData', 'inline_data'], 'part');
            fields(inline, ['mimeType', 'mime_type', 'data'], 'inlineData');
            const mime: any = imageMedia(alias(inline, 'mimeType', 'mime_type'));
            imageBase64(inline.data);
            return { type: 'image_url', image_url: { url: `data:${mime};base64,${inline.data}` } };
        }
        const file: any = alias(part, 'fileData', 'file_data');
        if (file) {
            fields(part, ['fileData', 'file_data'], 'part');
            fields(file, ['mimeType', 'mime_type', 'fileUri', 'file_uri'], 'fileData');
            const media: any = alias(file, 'mimeType', 'mime_type');
            if (media != null)
                imageMedia(media);
            const uri: any = alias(file, 'fileUri', 'file_uri');
            let url: any;
            try {
                (url as any) = new (URL as any)(uri);
            }
            catch {
                throw new (ProtocolError as any)('Image URI is invalid');
            }
            if (!['http:', 'https:'].includes(url.protocol))
                throw new (ProtocolError as any)('Image URI must use HTTP(S)');
            return { type: 'image_url', image_url: { url: uri } };
        }
        throw new (ProtocolError as any)('Gemini part cannot be represented by this bridge');
    };
    const system: any = alias(body, 'systemInstruction', 'system_instruction');
    if (system) {
        fields(system, ['role', 'parts'], 'systemInstruction');
        out.messages.push({ role: 'system', content: chatContent((system.parts.map as any)(convert)) });
    }
    for (const content of body.contents as any) {
        fields(content, ['role', 'parts'], 'content');
        const role: any = content.role ?? 'user';
        if (!['user', 'model'].includes(role) || !(Array as any).isArray(content.parts))
            throw new (ProtocolError as any)('Gemini content role/parts is invalid');
        const ordinary: any = [], calls: any = [], results: any = [];
        for (const part of content.parts as any) {
            const call: any = alias(part, 'functionCall', 'function_call'), result: any = alias(part, 'functionResponse', 'function_response');
            if (call) {
                fields(part, ['functionCall', 'function_call'], 'part');
                fields(call, ['id', 'name', 'args'], 'functionCall');
                if (role !== 'model' || !call.name)
                    throw new (ProtocolError as any)('Function call must be in a model turn');
                const id: any = call.id ?? `call_${sequence++}`;
                if (pending.some((p?: any): boolean => p.id === id))
                    throw new (ProtocolError as any)('Function call id is duplicated');
                pending.push({ id, name: call.name });
                calls.push({ id, type: 'function', function: { name: call.name, arguments: (JSON as any).stringify(object(call.args ?? {}, 'args')) } });
            }
            else if (result) {
                fields(part, ['functionResponse', 'function_response'], 'part');
                fields(result, ['id', 'name', 'response'], 'functionResponse');
                if (role !== 'user')
                    throw new (ProtocolError as any)('Function response must be in a user turn');
                const matches: any = pending.filter((c?: any): boolean => c.name === result.name && (!result.id || c.id === result.id));
                if (matches.length !== 1)
                    throw new (ProtocolError as any)('Function response is missing or ambiguous; include call id');
                const matched: any = (matches as any)[0];
                pending.splice(pending.indexOf(matched), 1);
                results.push({ role: 'tool', tool_call_id: matched.id, content: (JSON as any).stringify(object(result.response, 'response')) });
            }
            else
                ordinary.push(convert(part));
        }
        out.messages.push(...results);
        if (ordinary.length || calls.length)
            out.messages.push({ role: role === 'model' ? 'assistant' : 'user', content: chatContent(ordinary), ...(calls.length ? { tool_calls: calls } : {}) });
    }
    const generation: any = alias(body, 'generationConfig', 'generation_config');
    if (generation) {
        fields(generation, ['temperature', 'topP', 'topK', 'maxOutputTokens', 'stopSequences', 'thinkingConfig'], 'generationConfig');
        for (const [from, to] of [['temperature', 'temperature'], ['topP', 'top_p'], ['maxOutputTokens', 'max_tokens'], ['stopSequences', 'stop']] as any)
            if ((generation as any)[from] !== undefined)
                (out as any)[to] = copy((generation as any)[from]);
        if (generation.topK !== undefined && generation.topK !== 64)
            throw new (ProtocolError as any)('generationConfig.topK has no exact cross-provider representation');
        const thinking: any = geminiThinking(generation.thinkingConfig);
        if (thinking !== undefined)
            out.reasoning_effort = thinking;
    }
    if (body.tools)
        out.tools = (body.tools.flatMap as any)((tool?: any): any => { fields(tool, ['functionDeclarations', 'function_declarations'], 'tools'); const declarations: any = alias(tool, 'functionDeclarations', 'function_declarations'); if (!(Array as any).isArray(declarations))
            throw new (ProtocolError as any)('Function declarations must be an array'); return declarations.map((fn?: any): any => { fields(fn, ['name', 'description', 'parameters', 'parametersJsonSchema'], 'declaration'); return { type: 'function', function: { ...copy(fn), ...(fn.parametersJsonSchema === undefined ? {} : { parameters: copy(fn.parametersJsonSchema) }) } }; }).map((tool?: any): any => { delete tool.function.parametersJsonSchema; return tool; }); });
    const config: any = alias(body, 'toolConfig', 'tool_config');
    if (config) {
        const calling: any = alias(config, 'functionCallingConfig', 'function_calling_config');
        fields(calling, ['mode', 'allowedFunctionNames', 'allowed_function_names'], 'functionCallingConfig');
        const allowed: any = alias(calling, 'allowedFunctionNames', 'allowed_function_names'), mode: any = calling.mode?.toUpperCase();
        if (allowed) {
            if (mode !== 'ANY' || allowed.length !== 1)
                throw new (ProtocolError as any)('Function policy cannot be represented exactly');
            out.tool_choice = { type: 'function', function: { name: (allowed as any)[0] } };
        }
        else {
            out.tool_choice = ({ AUTO: 'auto', NONE: 'none', ANY: 'required' } as any)[mode];
            if (!out.tool_choice)
                throw new (ProtocolError as any)('Function policy mode is invalid');
        }
    }
    return out;
}
export function geminiCanonical(body?: any, normalizeUsage?: any): any {
    const value: any = body.response ?? body, candidate: any = value.candidates?.[0], reason: any = candidate?.finishReason ?? value.promptFeedback?.blockReason;
    if (value.candidates?.length > 1 || !candidate?.content && !reason)
        throw new (ProtocolError as any)('Gemini response must contain one candidate or a terminal prompt block', 502);
    const r: any = { id: value.responseId, model: value.modelVersion, text: '', tools: [], usage: (normalizeUsage as any)(value.usageMetadata, 'gemini'), finish: reason === 'MAX_TOKENS' ? 'length' : reason == null || reason === 'STOP' ? 'stop' : 'content_filter' };
    for (const part of candidate?.content?.parts ?? [] as any) {
        if (part.text !== undefined) {
            r.text += part.text;
        }
        else if (part.functionCall) {
            const c: any = part.functionCall;
            r.tools.push({ id: c.id ?? `call_${r.tools.length}`, type: 'function', function: { name: c.name, arguments: (JSON as any).stringify(c.args ?? {}) } });
        }
        else
            throw new (ProtocolError as any)('Gemini output part cannot be represented', 502);
    }
    if (r.tools.length && r.finish === 'stop')
        r.finish = 'tool_calls';
    return r;
}
export function canonicalGemini(r?: any, model?: any): any {
    return { candidates: [{ index: 0, content: { role: 'model', parts: [...(r.text ? [{ text: r.text }] : []), ...(r.tools.map as any)((t?: any): any => ({ functionCall: { id: t.id, name: t.function.name, args: parseObject(t.function.arguments, 'arguments') } }))] }, finishReason: r.finish === 'length' ? 'MAX_TOKENS' : 'STOP' }], usageMetadata: { promptTokenCount: r.usage.input, candidatesTokenCount: r.usage.output, totalTokenCount: r.usage.total, cachedContentTokenCount: r.usage.cached }, modelVersion: model };
}
