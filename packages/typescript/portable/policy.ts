// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=b0e59a5a1fc25fed71a851db657c87a9fa49e85aa07fda12af3f7365eb64e5b5; dynamic any annotations are explicit draft gaps.
export function tokenBudgetPermits(used: number, reserved: number, reserve: number, max: number): any {
    return max < 0 || used + reserved < max && used + reserved + reserve <= max;
}
export function cooldownActive(until: number, now: number): any {
    return until > now;
}
export function providerModelId(provider: string, model: string): any {
    return provider + '/' + model;
}
export function clamp(value: number, minimum: number, maximum: number): any {
    return Math.min(Math.max(value, minimum), maximum);
}
export function longestCooldown(previous: number, next: number): any {
    return Math.max(previous, next);
}
export function retryAfterDeadline(seconds: number, now: number, maximum: number): any {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return now;
    }
    return now + clamp(seconds, 0, maximum);
}
export function tokenCost(input: number, output: number, inputPerMillion: number, outputPerMillion: number): any {
    return (input * inputPerMillion + output * outputPerMillion) / 1000000;
}
export function validTokenCount(value: number): any {
    return Number.isFinite(value) && value >= 0 && Math.floor(value) === value;
}
export function settledTokenUsage(total: number, reserved: number, actual: number): any {
    return Math.max(0, total - reserved) + actual;
}
export function remainingTokenBudget(used: number, reserved: number, max: number): any {
    if (max < 0) {
        return -1;
    }
    return Math.max(0, max - used - reserved);
}
export function completionTokenLimit(requested: number, available: number, limit: number): any {
    return Math.max(0, Math.floor(Math.min(requested, Math.min(available, limit))));
}
export function retryBackoff(failures: number, base: number, maximum: number): any {
    let delay: any = base;
    let remaining: any = Math.max(0, Math.floor(failures));
    while (remaining > 0 && delay < maximum) {
        delay = Math.min(delay * 2, maximum);
        remaining = remaining - 1;
    }
    return Math.min(delay, maximum);
}
export function retryableStatus(status: number): any {
    return status === 408 || status === 429 || status >= 500 && status <= 599;
}
export function successStatus(status: number): any {
    return status >= 200 && status <= 299;
}
export function weightedCapacity(weight: number, load: number): any {
    if (weight <= 0 || !Number.isFinite(weight) || load < 0) {
        return 0;
    }
    return weight / (load + 1);
}
export function tokenExpired(now: number, expires: number, skew: number): any {
    return now >= expires + skew;
}
export function isQualifiedModel(model: string): any {
    return model.includes('/');
}
export function credentialPrefixMatches(value: string, prefix: string): any {
    return value.startsWith(prefix);
}
export function utf16Length(value: string): any {
    return value.length;
}
export function modelNameLengthPermits(value: string, maximum: number): any {
    return utf16Length(value) > 0 && utf16Length(value) <= maximum;
}
