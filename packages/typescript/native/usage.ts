// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=dc644e7a3d47fef9f8744709a17a5d2ec86b69c8b3c49f3893751518eba4e1a6; dynamic any annotations are explicit draft gaps.
const integer: any = (value?: any): any => (Number as any).isSafeInteger(value) && value >= 0 ? value : undefined;
const first: any = (value?: any, keys?: any): any => ((keys.map as any)((key?: any): any => integer(value?.[key])).find as any)((value?: any): boolean => value !== undefined);
function parts(value?: any): any {
    const usage: any = value?.usage;
    if (usage) {
        const total: any = integer(usage.total_tokens);
        if (total !== undefined)
            return { total };
        const raw: any = first(usage, ['input_tokens', 'prompt_tokens']), output: any = first(usage, ['output_tokens', 'completion_tokens']);
        const input: any = raw === undefined ? undefined : raw + (integer(usage.cache_creation_input_tokens) ?? 0) + (integer(usage.cache_read_input_tokens) ?? 0);
        if (input !== undefined || output !== undefined)
            return { input, output };
    }
    const gemini: any = value?.usageMetadata;
    if (gemini) {
        const total: any = integer(gemini.totalTokenCount);
        if (total !== undefined)
            return { total };
        const input: any = integer(gemini.promptTokenCount), output: any = integer(gemini.candidatesTokenCount);
        if (input !== undefined || output !== undefined)
            return { input, output };
    }
    return value?.response ? parts(value.response) : value?.message ? parts(value.message) : undefined;
}
const chars: any = (value?: any): number => typeof value === 'string' ? [...value].length : 0;
function outputChars(value?: any): any {
    if (value?.type === 'content_block_delta')
        return ['text', 'thinking', 'partial_json'].reduce((n?: any, key?: any): number => n + chars(value.delta?.[key]), 0);
    if (value?.type?.startsWith('response.') && (value.type.endsWith as any)('.delta'))
        return chars(value.delta);
    if (value?.type)
        return 0;
    const chat: any = ((value?.choices ?? []).reduce as any)((n?: any, choice?: any): any => n + ['content', 'reasoning_content', 'reasoning'].reduce((m?: any, key?: any): number => m + chars(choice.delta?.[key]), 0) + ((choice.delta?.tool_calls ?? []).reduce as any)((m?: any, call?: any): any => m + chars(call.function?.arguments), 0), 0);
    const gemini: any = (value?.response ?? value)?.candidates?.reduce((n?: any, candidate?: any): any => n + ((candidate.content?.parts ?? []).reduce as any)((m?: any, part?: any): any => m + chars(part.text), 0), 0) ?? 0;
    return chat + gemini;
}
function finalUsage(value?: any): any {
    if (value.type === 'message_delta')
        return value.usage && typeof value.usage === 'object';
    if (['response.completed', 'response.incomplete', 'response.failed'].includes(value.type))
        return true;
    if (value.type)
        return false;
    if (value.usage && typeof value.usage === 'object')
        return true;
    const native: any = value.response ?? value;
    return native.usageMetadata && native.candidates?.some((c?: any): any => c.finishReason);
}
export class UsageTracker {
    declare buffer: any;
    declare final: any;
    declare finished: any;
    declare input: any;
    declare json: any;
    declare jsonBytes: any;
    declare maxBytes: any;
    declare output: any;
    declare sse: any;
    declare streamedChars: any;
    declare total: any;
    constructor({ maxBytes = 32 * 1024 * 1024 }: any = {}) { this.maxBytes = maxBytes; this.buffer = (Buffer as any).alloc(0); this.json = []; this.jsonBytes = 0; this.sse = false; this.total = 0; this.input = 0; this.output = 0; this.streamedChars = 0; this.final = false; this.finished = false; }
    add(raw?: any): void {
        let value: any;
        try {
            (value as any) = (JSON as any).parse((Buffer as any).from(raw).toString('utf8'));
        }
        catch {
            return;
        }
        if (this.sse) {
            this.streamedChars += outputChars(value);
            this.final ||= Boolean(finalUsage(value));
        }
        else
            this.final = true;
        const usage: any = parts(value);
        if (usage) {
            this.total = (Math as any).max(this.total, usage.total ?? 0);
            this.input = (Math as any).max(this.input, usage.input ?? 0);
            this.output = (Math as any).max(this.output, usage.output ?? 0);
        }
    }
    feed(bytes?: any): void {
        if (this.finished)
            return;
        if (!this.sse && this.jsonBytes + bytes.byteLength <= this.maxBytes) {
            this.json.push((Buffer as any).from(bytes));
            this.jsonBytes += bytes.byteLength;
        }
        this.buffer = (Buffer as any).concat([this.buffer, bytes]);
        let end: any;
        while (((end as any) = this.buffer.indexOf(10)) >= 0) {
            const line: string = this.buffer.subarray(0, end).toString('utf8').replace(/\r$/, '');
            this.buffer = this.buffer.subarray(end + 1);
            if (!line.startsWith('data:'))
                continue;
            this.sse = true;
            this.json = [];
            this.jsonBytes = 0;
            this.add(line.slice(5).replace(/^ /, ''));
        }
        if (this.buffer.length > this.maxBytes)
            this.buffer = (Buffer as any).alloc(0);
    }
    settlement(): any {
        const estimate: number = this.sse && !this.final ? (Math as any).ceil(this.streamedChars / 4) : 0, estimated: boolean = estimate > this.output, output: number = (Math as any).max(this.output, estimate);
        return { tokens: (Math as any).max(this.total, this.input + output), estimated };
    }
    finish(): any {
        if (!this.finished) {
            if (!this.sse)
                this.add((Buffer as any).concat(this.json, this.jsonBytes));
            else if (this.buffer.toString('utf8').startsWith('data: '))
                this.add(this.buffer.subarray(6));
            this.finished = true;
            this.json = [];
            this.buffer = (Buffer as any).alloc(0);
        }
        return this.settlement();
    }
}
