// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=b7fe7ad04db63bae50ab54f370051fcf051c070ec7d432906943115418c1a23b; dynamic any annotations are explicit draft gaps.
export function tokenBudgetPermits(used: number, reserved: number, reserve: number, max: number): boolean {
    return max < 0 || used + reserved < max && used + reserved + reserve <= max;
}
export function cooldownActive(until: number, now: number): boolean {
    return until > now;
}
export function providerModelId(provider: string, model: string): string {
    return provider + '/' + model;
}
export function clamp(value: number, minimum: number, maximum: number): number {
    return (Math as any).min((Math as any).max(value, minimum), maximum);
}
export function longestCooldown(previous: number, next: number): number {
    return (Math as any).max(previous, next);
}
export function retryAfterDeadline(seconds: number, now: number, maximum: number): number {
    if (!(Number as any).isFinite(seconds) || seconds < 0) {
        return now;
    }
    return now + clamp(seconds, 0, maximum);
}
export function tokenCost(input: number, output: number, inputPerMillion: number, outputPerMillion: number): number {
    return (input * inputPerMillion + output * outputPerMillion) / 1000000;
}
export function validTokenCount(value: number): boolean {
    return (Number as any).isFinite(value) && value >= 0 && (Math as any).floor(value) === value;
}
export function settledTokenUsage(total: number, reserved: number, actual: number): number {
    return (Math as any).max(0, total - reserved) + actual;
}
export function remainingTokenBudget(used: number, reserved: number, max: number): number {
    if (max < 0) {
        return -1;
    }
    return (Math as any).max(0, max - used - reserved);
}
export function completionTokenLimit(requested: number, available: number, limit: number): number {
    return (Math as any).max(0, (Math as any).floor((Math as any).min(requested, (Math as any).min(available, limit))));
}
export function retryBackoff(failures: number, base: number, maximum: number): number {
    let delay: any = base;
    let remaining: any = (Math as any).max(0, (Math as any).floor(failures));
    while (remaining > 0 && delay < maximum) {
        (delay as any) = (Math as any).min(delay * 2, maximum);
        (remaining as any) = remaining - 1;
    }
    return (Math as any).min(delay, maximum);
}
export function retryableStatus(status: number): boolean {
    return status === 408 || status === 429 || status >= 500 && status <= 599;
}
export function successStatus(status: number): boolean {
    return status >= 200 && status <= 299;
}
export function weightedCapacity(weight: number, load: number): number {
    if (weight <= 0 || !(Number as any).isFinite(weight) || load < 0) {
        return 0;
    }
    return weight / (load + 1);
}
export function tokenExpired(now: number, expires: number, skew: number): boolean {
    return now >= expires + skew;
}
export function isQualifiedModel(model: string): boolean {
    return model.includes('/');
}
export function credentialPrefixMatches(value: string, prefix: string): boolean {
    return value.startsWith(prefix);
}
export function utf16Length(value: string): number {
    return value.length;
}
export function modelNameLengthPermits(value: string, maximum: number): boolean {
    return utf16Length(value) > 0 && utf16Length(value) <= maximum;
}
