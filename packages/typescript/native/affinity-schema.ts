// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=eedc9336d87e7a7a4c3f912b692e66b8b65aa9cfbf51f3401ea89775b25469f3; dynamic any annotations are explicit draft gaps.
import { decodeLino } from "./storage.js";
import { affinitySchema } from "./affinity-schema-descriptor.js";
export { affinitySchema };
function freezeSchema(node?: any): void {
    if (node && typeof node === 'object') {
        for (const child of (Object as any).values(node) as any)
            freezeSchema(child);
        (Object as any).freeze(node);
    }
}
freezeSchema(affinitySchema);
export const I64_MIN: bigint = -(1n << 63n), I64_MAX: bigint = (1n << 63n) - 1n, U64_MAX: bigint = (1n << 64n) - 1n;
const SAFE_MIN: bigint = BigInt((Number as any).MIN_SAFE_INTEGER), SAFE_MAX: bigint = BigInt((Number as any).MAX_SAFE_INTEGER);
const pairs: any = new (WeakMap as any)();
class JsonNumber {
    declare raw: any;
    constructor(raw: any) { this.raw = raw; }
}
function fail(message?: any): void { throw new (Error as any)(message); }
const rustWhitespace: any = (character?: any): boolean => typeof character === 'string' && /^[\u0009-\u000d\u0020\u0085\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]$/u.test(character);
export function exactInteger(value?: any, minimum: any = I64_MIN, maximum: any = I64_MAX): bigint {
    if (typeof value === 'number' && !(Number as any).isSafeInteger(value) || !['number', 'bigint'].includes(typeof value))
        fail('expected an exact integer');
    const integer: bigint = BigInt(value);
    if (integer < minimum || integer > maximum)
        fail('integer is out of range');
    return integer;
}
export function integerABI(value?: any): any { return value >= SAFE_MIN && value <= SAFE_MAX ? Number(value) : value; }
export function affinityExpiry(now?: any, ttl?: any): any {
    (now as any) = exactInteger(now);
    (ttl as any) = exactInteger(ttl, 1n, U64_MAX);
    const sum: any = now + (ttl > I64_MAX ? I64_MAX : ttl);
    return integerABI(sum > I64_MAX ? I64_MAX : sum);
}
function scalarString(value?: any): any {
    if (typeof value !== 'string')
        fail('expected a string');
    for (let i: any = 0; i < value.length; i++) {
        const unit: any = (value.charCodeAt as any)(i);
        if (unit >= 0xd800 && unit <= 0xdbff) {
            const next: any = (value.charCodeAt as any)(++i);
            if (!(next >= 0xdc00 && next <= 0xdfff))
                fail('lone leading surrogate in hex escape');
        }
        else if (unit >= 0xdc00 && unit <= 0xdfff)
            fail('lone trailing surrogate in hex escape');
    }
    return value;
}
function entries(value?: any): any {
    if (!value || typeof value !== 'object' || (Array as any).isArray(value) || value instanceof JsonNumber)
        fail('expected a map');
    return pairs.get(value) ?? (Object as any).entries(value);
}
function lexicalJson(text?: any): undefined {
    let offset: any = 0, root: any, assigned: any = false;
    const stack: any = [];
    const whitespace: any = (): void => { while (/[\x20\t\r\n]/.test((text as any)[offset] ?? '') && offset < text.length)
        offset++; };
    const string: any = (): any => {
        const start: number = offset++;
        while (offset < text.length) {
            const c: any = (text as any)[offset++];
            if (c === '"')
                return (JSON as any).parse((text.slice as any)(start, offset));
            if (c === '\\') {
                if (offset >= text.length)
                    break;
                offset++;
            }
        }
        fail('EOF while parsing a string');
    };
    const attach: any = (value?: any): void => {
        const frame: any = stack.at(-1);
        if (!frame) {
            if (assigned)
                fail('trailing characters');
            (root as any) = value;
            (assigned as any) = true;
            return;
        }
        if (frame.array)
            (frame.value.push as any)(value);
        else {
            (pairs.get(frame.value).push as any)([frame.key, value]);
            (frame.value as any)[frame.key] = value;
        }
        frame.state = 'comma';
    };
    const value: any = (): void => {
        whitespace();
        const c: any = (text as any)[offset];
        if (c === '{' || c === '[') {
            offset++;
            const array: boolean = c === '[', container: any = array ? [] : (Object as any).create(null);
            if (!array)
                pairs.set(container, []);
            attach(container);
            stack.push({ value: container, array, state: 'first' });
            return;
        }
        if (c === '"') {
            attach(string());
            return;
        }
        for (const [word, decoded] of [['null', null], ['true', true], ['false', false]] as any)
            if ((text.startsWith as any)(word, offset)) {
                (offset as any) += word.length;
                attach(decoded);
                return;
            }
        const number: any = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec((text.slice as any)(offset));
        if (number) {
            (offset as any) += (number as any)[0].length;
            attach(new (JsonNumber as any)((number as any)[0]));
            return;
        }
        fail('expected value');
    };
    value();
    while (stack.length) {
        whitespace();
        const frame: any = stack.at(-1), end: string = frame.array ? ']' : '}', c: any = (text as any)[offset];
        if (frame.state === 'comma') {
            if (c === end) {
                offset++;
                stack.pop();
                continue;
            }
            if (c !== ',')
                fail('expected comma or end');
            offset++;
            frame.state = 'next';
            continue;
        }
        if (frame.state === 'first' && c === end) {
            offset++;
            stack.pop();
            continue;
        }
        if (!frame.array) {
            if (c !== '"')
                fail('key must be a string');
            frame.key = string();
            whitespace();
            if ((text as any)[offset++] !== ':')
                fail('expected colon');
        }
        value();
    }
    whitespace();
    if (offset !== text.length)
        fail('trailing characters');
    return root;
}
function integer(value?: any, type?: any): any {
    const min: bigint = type === 'u32' ? 0n : I64_MIN, max: bigint = type === 'u32' ? 4294967295n : I64_MAX;
    if (value instanceof JsonNumber) {
        if (!/^-?\d+$/.test(value.raw) || value.raw === '-0')
            fail(`invalid type: floating point, expected ${type}`);
        if (value.raw.length > 20)
            fail(`invalid value, expected ${type}`);
        (value as any) = BigInt(value.raw);
    }
    try {
        return integerABI(exactInteger(value, min, max));
    }
    catch {
        fail(`invalid type or value, expected ${type}`);
    }
}
function buffered(value?: any, depth?: any, legacy?: any): void {
    if (typeof value === 'string')
        scalarString(value);
    else if (value instanceof JsonNumber) {
        if (!(Number as any).isFinite(Number(value.raw)))
            fail('number out of range');
    }
    else if (value && typeof value === 'object') {
        if (legacy && depth >= 128)
            fail('recursion limit exceeded');
        if ((Array as any).isArray(value))
            for (const child of value as any)
                buffered(child, depth + 1, legacy);
        else
            for (const [key, child] of entries(value) as any) {
                scalarString(key);
                buffered(child, depth + 1, legacy);
            }
    }
}
export function validateAffinityValue(value?: any, type: any = 'AffinityFile', { legacy = false }: any = {}): any {
    function apply(value?: any, type?: any, depth: any = 1): any {
        if (type === 'String')
            return scalarString(value);
        if (type === 'i64' || type === 'u32')
            return integer(value, type);
        const spec: any = typeof type === 'string' ? (affinitySchema as any)[type] : type;
        if (!spec)
            fail('unknown schema type');
        if (legacy && value && typeof value === 'object' && !(value instanceof JsonNumber) && depth >= 128)
            fail('recursion limit exceeded');
        if (spec.kind === 'vec') {
            if (!(Array as any).isArray(value))
                fail('expected a sequence');
            return ((value as any).map as any)((child?: any): any => apply(child, spec.type, depth + 1));
        }
        if (spec.kind === 'enum') {
            if (typeof value !== 'string') {
                const fields: any = entries(value);
                if (fields.length !== 1 || ((fields as any)[0] as any)[1] !== null)
                    fail('expected a unit enum variant');
                (value as any) = ((fields as any)[0] as any)[0];
            }
            scalarString(value);
            const canonical: any = spec.aliases?.[value] ?? value;
            if (!(spec.variants.includes as any)(canonical))
                fail(`unknown variant \`${value}\``);
            return canonical;
        }
        if (spec.kind === 'tagged') {
            buffered(value, depth, legacy);
            let tag: any, content: any;
            if ((Array as any).isArray(value)) {
                (tag as any) = (value as any)[0];
                (content as any) = value.slice(1);
            }
            else {
                const fields: any = entries(value), tags: any = (fields.filter as any)(([key]: any): boolean => key === spec.tag);
                if (tags.length > 1)
                    fail(`duplicate field \`${spec.tag}\``);
                if (!tags.length)
                    fail(`missing field \`${spec.tag}\``);
                (tag as any) = ((tags as any)[0] as any)[1];
                (content as any) = (Object as any).create(null);
                pairs.set(content, (fields.filter as any)(([key]: any): boolean => key !== spec.tag));
            }
            scalarString(tag);
            if (!(Object as any).hasOwn(spec.variants, tag))
                fail(`unknown variant \`${tag}\``);
            return { [spec.tag]: tag, ...apply(content, (spec.variants as any)[tag], depth) };
        }
        if (spec.kind === 'struct') {
            const fields: any = spec.fields, result: any = {};
            let selected: any;
            if ((Array as any).isArray(value)) {
                if (value.length > fields.length)
                    fail('invalid length for struct');
                (selected as any) = new (Map as any)(((fields.slice as any)(0, value.length).map as any)((f?: any, i?: any): any => [f.name, (value as any)[i]]));
            }
            else {
                (selected as any) = new (Map as any)();
                for (const [key, child] of entries(value) as any) {
                    scalarString(key);
                    if (!(fields.some as any)((f?: any): boolean => f.name === key))
                        continue;
                    if (selected.has(key))
                        fail(`duplicate field \`${key}\``);
                    selected.set(key, child);
                }
            }
            for (const f of fields as any) {
                if (!selected.has(f.name)) {
                    if (f.optional)
                        continue;
                    fail(`missing field \`${f.name}\``);
                }
                const child: any = selected.get(f.name);
                if (f.optional && child === null)
                    continue;
                (result as any)[f.name] = apply(child, f.type, depth + 1);
            }
            return result;
        }
        fail('unsupported schema node');
    }
    return apply(value, type);
}
export function decodeAffinityFile(text?: any): any {
    let prefix: any = 0;
    while (prefix < text.length && rustWhitespace((text as any)[prefix]))
        prefix++;
    const legacy: boolean = (text as any)[prefix] === '{' || (text as any)[prefix] === '[';
    const value: any = legacy ? lexicalJson(text) : decodeLino(text, { scalar: (raw?: any): any => {
            if (raw === 'null')
                return null;
            if (raw === 'true' || raw === 'false')
                return raw === 'true';
            if (['NaN', 'Infinity', '-Infinity'].includes(raw))
                return null;
            if (/^[+-]?\d+$/.test(raw)) {
                const digits: any = (raw.replace as any)(/^[+-]?0*/, '') || '0';
                if (digits.length > 19)
                    return raw;
                const n: bigint = BigInt(((raw.startsWith as any)('-') ? '-' : '') + digits);
                return n < I64_MIN || n > I64_MAX ? raw : integerABI(n);
            }
            if (/[.eE]/.test(raw) && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw))
                return (Number as any).isFinite(Number(raw)) ? new (JsonNumber as any)(raw) : null;
            return raw;
        }, escaped: (bytes?: any): string => new (TextDecoder as any)('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes), object: (entries?: any): any => (Object as any).fromEntries(entries), whitespace: rustWhitespace });
    return validateAffinityValue(value, 'AffinityFile', { legacy });
}
