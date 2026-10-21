// GENERATED: node scripts/regenerate-js-first.mjs
// JavaScript -> portable-router-v1 Links IR -> target; IR sha256=d0021328c8826b7998cd0581491779aeb3e03352980c211ee0cdef36921b2938
export function tokenBudgetPermits(used: number, reserved: number, reserve: number, max: number): boolean {
    return ((max < 0) || (((used + reserved) < max) && (((used + reserved) + reserve) <= max)));
}

export function cooldownActive(until: number, now: number): boolean {
    return (until > now);
}

export function providerModelId(provider: string, model: string): string {
    return ((provider + "/") + model);
}

export function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(Math.max(value, minimum), maximum);
}

export function longestCooldown(previous: number, next: number): number {
    return Math.max(previous, next);
}

export function retryAfterDeadline(seconds: number, now: number, maximum: number): number {
    if (((!Number.isFinite(seconds)) || (seconds < 0))) {
        return now;
    }
    return (now + clamp(seconds, 0, maximum));
}

export function tokenCost(input: number, output: number, inputPerMillion: number, outputPerMillion: number): number {
    return (((input * inputPerMillion) + (output * outputPerMillion)) / 1000000);
}

export function validTokenCount(value: number): boolean {
    return ((Number.isFinite(value) && (value >= 0)) && (Math.floor(value) === value));
}

export function settledTokenUsage(total: number, reserved: number, actual: number): number {
    return (Math.max(0, (total - reserved)) + actual);
}

export function remainingTokenBudget(used: number, reserved: number, max: number): number {
    if ((max < 0)) {
        return (-1);
    }
    return Math.max(0, ((max - used) - reserved));
}

export function completionTokenLimit(requested: number, available: number, limit: number): number {
    return Math.max(0, Math.floor(Math.min(requested, Math.min(available, limit))));
}

export function retryBackoff(failures: number, base: number, maximum: number): number {
    let delay = base;
    let remaining = Math.max(0, Math.floor(failures));
    while (((remaining > 0) && (delay < maximum))) {
        delay = Math.min((delay * 2), maximum);
        remaining = (remaining - 1);
    }
    return Math.min(delay, maximum);
}

export function retryableStatus(status: number): boolean {
    return (((status === 408) || (status === 429)) || ((status >= 500) && (status <= 599)));
}

export function successStatus(status: number): boolean {
    return ((status >= 200) && (status <= 299));
}

export function weightedCapacity(weight: number, load: number): number {
    if ((((weight <= 0) || (!Number.isFinite(weight))) || (load < 0))) {
        return 0;
    }
    return (weight / (load + 1));
}

export function tokenExpired(now: number, expires: number, skew: number): boolean {
    return (now >= (expires + skew));
}

export function isQualifiedModel(model: string): boolean {
    return model.includes("/");
}

export function credentialPrefixMatches(value: string, prefix: string): boolean {
    return value.startsWith(prefix);
}

export function utf16Length(value: string): number {
    return value.length;
}

export function modelNameLengthPermits(value: string, maximum: number): boolean {
    return ((utf16Length(value) > 0) && (utf16Length(value) <= maximum));
}
