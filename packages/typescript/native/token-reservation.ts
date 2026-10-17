// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=179305412620939bba4ac0d1b763fe92f7746c8deb6e9719a55761df710bc83d; dynamic any annotations are explicit draft gaps.
const totalStrings: any = (value?: any): any => typeof value === 'string' ? (Buffer as any).byteLength(value) : value && typeof value === 'object' ? (Object as any).values(value).reduce((sum?: any, child?: any): number => (Math as any).min((Number as any).MAX_SAFE_INTEGER, sum + totalStrings(child)), 0) : 0;
export function estimateRequestBudget(body?: any): any {
    let characters: any = 0;
    for (const field of ['messages', 'input', 'contents', 'system', 'prompt', 'tools'] as any)
        (characters as any) = (Math as any).min((Number as any).MAX_SAFE_INTEGER, characters + totalStrings(body?.[field]));
    const caps: any = [body?.max_output_tokens, body?.max_completion_tokens, body?.max_tokens, body?.generationConfig?.maxOutputTokens];
    const output: any = caps.find((value?: any): boolean => (Number as any).isSafeInteger(value) && value >= 0) ?? 4096, input: number = (Math as any).ceil(characters / 4);
    return { input, output, total: (Math as any).min((Number as any).MAX_SAFE_INTEGER, input + output) };
}
