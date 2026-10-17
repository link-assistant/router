// GENERATED JavaScript -> structured syntax AST -> TypeScript draft.
// Meta sha256=6d596c0b8b9dd1ab74d5cd040a1dafaa48d7eb62914350a2a61a791e82b894e0; dynamic any annotations are explicit draft gaps.
import { open } from 'node:fs/promises';
import { decodeTokenRecords, encodeLino } from "./storage.js";
const schema: Array<Array<string>> = [['StorageFormat', 'router-token-doublets-v1'], ['Type', 'TokenRecord'], ['TokenRecord', 'SubType'], ['SubType', 'Value']];
const utf8: any = new (TextDecoder as any)('utf8', { fatal: true });
const stringCompare: any = (left?: any, right?: any): number => (Buffer as any).compare((Buffer as any).from(left), (Buffer as any).from(right));
const base64: any = (value?: any): string => (Buffer as any).from(value).toString('base64').replace(/=+$/, '');
const valueNode: any = (parent?: any, raw?: any): string => `${parent}/Value/${base64(raw)}`;
const decode64: any = (value?: any): string => {
    if (!/^[A-Za-z0-9+/]*$/.test(value) || value.length % 4 === 1)
        throw new (Error as any)('Invalid token doublets base64');
    const bytes: any = (Buffer as any).from(value, 'base64');
    if (base64(bytes) !== value)
        throw new (Error as any)('Noncanonical token doublets base64');
    return utf8.decode(bytes);
};
export function tokenSemanticLinks(records?: any): Array<Array<string>> {
    const links: Array<Array<string>> = schema.map((pair?: any): Array<string> => pair.slice());
    for (const record of records as any) {
        const root: string = `Record/${base64(record.id)}`, subtype: string = `${root}/SubType`, value: string = `${root}/Value`;
        links.push([root, 'Type'], [root, subtype], [subtype, valueNode(subtype, record.id)], [root, value]);
        for (const [field, raw] of (Object as any).entries(record) as any) {
            if (raw == null)
                continue;
            const path: string = `${value}/Field/${field}`;
            const text: any = field === 'github_repos' ? (raw.join as any)(',') : field === 'model_policy' ? (JSON as any).stringify(raw) : String(raw);
            links.push([value, path], [path, valueNode(path, text)]);
        }
    }
    const unique: Map<string, Array<string>> = new (Map as any)(links.map((pair?: any): any => [(JSON as any).stringify(pair), pair]));
    return [...unique.values()].sort((left?: any, right?: any): number => stringCompare((left as any)[0], (right as any)[0]) || stringCompare((left as any)[1], (right as any)[1]));
}
export function semanticTokenRecords(links?: any): any {
    const pairs: any = new (Set as any)((links.map as any)((pair?: any): string => (JSON as any).stringify(pair))), targets: any = new (Map as any)();
    for (const pair of schema as any)
        if (!pairs.has((JSON as any).stringify(pair)))
            throw new (Error as any)('Token doublets schema is incomplete');
    for (const [source, target] of links as any) {
        if (!targets.has(source))
            targets.set(source, new (Set as any)());
        (targets.get(source).add as any)(target);
    }
    const one: any = (source?: any): any => { const values: any = [...(targets.get(source) ?? [])]; if (values.length !== 1)
        throw new (Error as any)('Token doublets value is missing or ambiguous'); return (values as any)[0]; };
    const decodeValue: any = (parent?: any, value?: any): string => { const prefix: string = `${parent}/Value/`; if (!(value.startsWith as any)(prefix))
        throw new (Error as any)('Invalid doublets value relation'); return decode64((value.slice as any)(prefix.length)); };
    const records: any = [];
    for (const [root, target] of links as any)
        if (target === 'Type' && (root.startsWith as any)('Record/')) {
            const id: string = decode64((root.slice as any)(7)), subtype: string = `${root}/SubType`, value: string = `${root}/Value`;
            if (!pairs.has((JSON as any).stringify([root, subtype])) || !pairs.has((JSON as any).stringify([root, value])) || decodeValue(subtype, one(subtype)) !== id)
                throw new (Error as any)('Token doublets identity relations disagree');
            const fields: any = {};
            for (const fieldPath of targets.get(value) ?? [] as any)
                if ((fieldPath.startsWith as any)(`${value}/Field/`))
                    (fields as any)[(fieldPath.slice as any)(value.length + 7)] = decodeValue(fieldPath, one(fieldPath));
            if (fields.id !== id)
                throw new (Error as any)('Token doublets record id mismatch');
            for (const name of ['issued_at', 'expires_at'] as any) {
                if (!/^-?\d+$/.test((fields as any)[name] ?? ''))
                    throw new (Error as any)('Invalid token timestamp');
                (fields as any)[name] = Number((fields as any)[name]);
            }
            for (const name of ['revoked', 'ephemeral'] as any) {
                if (name === 'ephemeral' && (fields as any)[name] == null) {
                    (fields as any)[name] = false;
                    continue;
                }
                if (!['true', 'false'].includes((fields as any)[name]))
                    throw new (Error as any)('Invalid token boolean');
                (fields as any)[name] = (fields as any)[name] === 'true';
            }
            fields.used_tokens ??= '0';
            fields.reserved_tokens ??= '0';
            fields.rate_window_started_at ??= '0';
            fields.rate_window_requests ??= '0';
            fields.account ??= null;
            fields.client_kind ??= null;
            fields.principal_id ??= null;
            fields.run_lease_expires_at ??= null;
            fields.max_tokens ??= null;
            fields.max_requests ??= null;
            fields.rate_limit_per_minute ??= null;
            fields.sliding_window_seconds ??= null;
            records.push(fields);
        }
    const document: any = { type: 'RouterState', subtype: 'TokenStore', value: records.map((record?: any): any => ({ type: 'TokenRecord', subtype: record.id, value: record })) };
    return decodeTokenRecords(encodeLino(document));
}
export function encodeDoublets(links?: any, { wordBytes = 8, maxLinks = 1000000 }: any = {}): any {
    if (![4, 8].includes(wordBytes))
        throw new (Error as any)('Unsupported doublets word width');
    const parts: any = [Array(8).fill(0)], lookup: any = new (Map as any)();
    const pair: any = (source?: any, target?: any): any => {
        const key: string = `${source},${target}`;
        if (lookup.has(key))
            return lookup.get(key);
        if (parts.length > maxLinks)
            throw new (Error as any)('Token links network exceeds capacity');
        const index: number = parts.length;
        parts.push([source, target, 0, 0, 1, 0, 0, 1]);
        lookup.set(key, index);
        return index;
    };
    for (let point: any = 1; point <= 259; point++)
        if (pair(point, point) !== point)
            throw new (Error as any)('Doublets point initialization failed');
    const strings: any = new (Map as any)();
    const intern: any = (value?: any): any => {
        if (strings.has(value))
            return strings.get(value);
        let tail: any = 3;
        const bytes: any = (Buffer as any).from(value);
        for (let at: any = bytes.length - 1; at >= 0; at--)
            (tail as any) = pair(4 + (bytes as any)[at], tail);
        const node: any = pair(1, tail);
        strings.set(value, node);
        return node;
    };
    for (const [source, target] of links as any)
        pair(2, pair(intern(source), intern(target)));
    const count: number = parts.length - 1;
    const build: any = (order?: any, left?: any, right?: any, offset?: any): any => {
        if (left >= right)
            return 0;
        const middle: number = (Math as any).floor((left + right) / 2), index: any = (order as any)[middle];
        ((parts as any)[index] as any)[offset] = build(order, left, middle, offset);
        ((parts as any)[index] as any)[offset + 1] = build(order, middle + 1, right, offset);
        ((parts as any)[index] as any)[offset + 2] = right - left;
        return index;
    };
    const order: Array<number> = (Array as any).from({ length: count }, (_?: any, index?: any): number => index + 1);
    const sources: Array<number> = order.slice().sort((left?: any, right?: any): number => ((parts as any)[left] as any)[0] - ((parts as any)[right] as any)[0] || ((parts as any)[left] as any)[1] - ((parts as any)[right] as any)[1]);
    const targets: Array<number> = order.slice().sort((left?: any, right?: any): number => ((parts as any)[left] as any)[1] - ((parts as any)[right] as any)[1] || ((parts as any)[left] as any)[0] - ((parts as any)[right] as any)[0]);
    (parts as any)[0] = [count, count, 0, 0, build(sources, 0, count, 2), build(targets, 0, count, 5), 0, 0];
    const result: any = (Buffer as any).alloc(parts.length * wordBytes * 8);
    for (let index: any = 0; index < parts.length; index++)
        for (let field: any = 0; field < 8; field++) {
            const offset: number = (index * 8 + field) * wordBytes;
            if (wordBytes === 8)
                result.writeBigUInt64LE(BigInt(((parts as any)[index] as any)[field]), offset);
            else
                result.writeUInt32LE(((parts as any)[index] as any)[field], offset);
        }
    return result;
}
export function decodeDoublets(bytes?: any, { wordBytes = 8, maxLinks = 1000000 }: any = {}): any {
    const stride: number = wordBytes * 8;
    const read: any = (index?: any, field?: any): any => {
        const offset: number = index * stride + field * wordBytes;
        if (offset + wordBytes > bytes.length)
            throw new (Error as any)('Truncated token doublets store');
        const value: any = wordBytes === 8 ? Number((bytes.readBigUInt64LE as any)(offset)) : (bytes.readUInt32LE as any)(offset);
        if (!(Number as any).isSafeInteger(value))
            throw new (Error as any)('Unsafe token doublets link reference');
        return value;
    };
    const allocated: any = read(0, 0);
    if (allocated < 259 || allocated > maxLinks || (allocated + 1) * stride > bytes.length || read(0, 1) < allocated || read(0, 2) > allocated)
        throw new (Error as any)('Invalid token doublets header');
    const exists: any = (index?: any): boolean => index > 0 && index <= allocated && read(index, 4) !== 0;
    for (let index: any = 1; index <= 259; index++)
        if (!exists(index) || read(index, 0) !== index || read(index, 1) !== index)
            throw new (Error as any)('Invalid token doublets schema point');
    const cache: any = new (Map as any)();
    const decode: any = (node?: any): any => {
        if (cache.has(node))
            return cache.get(node);
        if (!exists(node) || read(node, 0) !== 1)
            throw new (Error as any)('Invalid token doublets string');
        const data: any = [], visited: any = new (Set as any)();
        let tail: any = read(node, 1);
        while (tail !== 3) {
            if (!exists(tail) || visited.has(tail))
                throw new (Error as any)('Incomplete or cyclic token doublets string');
            visited.add(tail);
            const byte: number = read(tail, 0) - 4;
            if (byte < 0 || byte > 255)
                throw new (Error as any)('Invalid token doublets byte');
            data.push(byte);
            (tail as any) = read(tail, 1);
        }
        const text: string = utf8.decode(new (Uint8Array as any)(data));
        cache.set(node, text);
        return text;
    };
    const links: any = new (Map as any)();
    for (let index: any = 260; index <= allocated; index++)
        if (exists(index) && read(index, 0) === 2) {
            const pair: any = read(index, 1);
            if (!exists(pair))
                throw new (Error as any)('Token doublets edge refers to missing pair');
            const relation: any = [decode(read(pair, 0)), decode(read(pair, 1))];
            links.set((JSON as any).stringify(relation), relation);
        }
    return [...links.values()].sort((left?: any, right?: any): number => stringCompare((left as any)[0], (right as any)[0]) || stringCompare((left as any)[1], (right as any)[1]));
}
export function encodeBinaryTokenRecords(records?: any): any { return encodeDoublets(tokenSemanticLinks(records)); }
export function decodeBinaryTokenRecords(bytes?: any): any { return semanticTokenRecords(decodeDoublets(bytes)); }
export async function readBinaryTokenRecords(path?: any): Promise<any> {
    let file: any;
    try {
        (file as any) = await open(path, 'r');
    }
    catch (error: any) {
        if (error.code === 'ENOENT')
            return [];
        throw error;
    }
    try {
        const header: any = (Buffer as any).alloc(64);
        const read: any = await file.read(header, 0, 64, 0);
        if (read.bytesRead === 0)
            return [];
        if (header.subarray(0, 8).equals((Buffer as any).from('LARTOK01'))) {
            const size: number = (await file.stat()).size;
            if (size > 64 * 1024 * 1024)
                throw new (Error as any)('Legacy token projection exceeds capacity');
            const bytes: any = (Buffer as any).alloc(size);
            let offset: any = 0;
            while (offset < size) {
                const part: any = await file.read(bytes, offset, size - offset, offset);
                if (!part.bytesRead)
                    throw new (Error as any)('Truncated legacy token store');
                (offset as any) += part.bytesRead;
            }
            const records: any = [];
            for (let cursor: any = 8; cursor + 4 <= bytes.length;) {
                const length: number = bytes.readUInt32LE(cursor);
                (cursor as any) += 4;
                if (cursor + length > bytes.length)
                    throw new (Error as any)('Truncated legacy token record');
                records.push((JSON as any).parse(utf8.decode(bytes.subarray(cursor, cursor + length))));
                (cursor as any) += length;
            }
            const { encodeTokenRecords }: any = await import("./storage.js");
            return decodeTokenRecords(encodeTokenRecords(records));
        }
        const allocated: number = Number(header.readBigUInt64LE(0));
        if (!(Number as any).isSafeInteger(allocated) || allocated > 1000000 || allocated < 259)
            throw new (Error as any)('Invalid token doublets allocation');
        const bytes: any = (Buffer as any).alloc((allocated + 1) * 64);
        let offset: any = 0;
        while (offset < bytes.length) {
            const part: any = await file.read(bytes, offset, bytes.length - offset, offset);
            if (!part.bytesRead)
                throw new (Error as any)('Truncated token doublets store');
            (offset as any) += part.bytesRead;
        }
        return decodeBinaryTokenRecords(bytes);
    }
    finally {
        await file.close();
    }
}
