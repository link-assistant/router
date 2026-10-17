// Original enum declarations provide layout facts, never caller namespace authority.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { sourceItems } from '../rust-structure.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const freeze = value => { if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
} return value; };
const pins = {
    Option: { path: 'option-deref/core-option.rs.gz', compressedSha256: '2f8986530d23db3ed08f32fbe8b0c82b7ffb1c3abe6b407b38ff989998739cb1', bytes: 86718, sha256: '4c172731ebf0ef2ae6fc3e9b5127096d3c5c400c3757cfe5e38223de91bc3efd', parameters: '<T>', body: 'None,Some(T),', derive: '#[derive(Copy,Eq,Debug,Hash)]' },
    Result: { path: 'result-iterators/core-result.rs.gz', compressedSha256: '30d240da09888014cec8e916965cf9631a9552f5995250ca44a4c198ea40953d', bytes: 69180, sha256: '9166f16035d67e4b42b9439b3f2400a07866a8ff111d7d544584c593d39e2ecc', parameters: '<T,E>', body: 'Ok(T),Err(E),', derive: '#[derive(Copy,PartialEq,PartialOrd,Eq,Ord,Debug,Hash)]' },
};
const cached = new Map();
export function originalStandardSharedPatternLayout(kind) {
    if (cached.has(kind))
        return cached.get(kind);
    const pin = pins[kind];
    if (!pin)
        throw new TypeError('Shared standard pattern has no original enum layout');
    const archive = readFileSync(new URL('../source-profiles/' + pin.path, import.meta.url));
    if (hash(archive) !== pin.compressedSha256) throw new TypeError('Shared standard pattern original archive checksum mismatch');
    const raw = gunzipSync(archive, { maxOutputLength: 100000 });
    if (raw.length !== pin.bytes || hash(raw) !== pin.sha256)
        throw new TypeError('Shared standard pattern original source bytes changed');
    const source = raw.toString('utf8'), owners = sourceItems(source).filter(item => item.term === 'enum' && item.name === kind);
    if (owners.length !== 1)
        throw new TypeError('Shared standard pattern original enum owner is ambiguous');
    const item = owners[0], tokens = item.tokens.filter(token => token.type !== 'comment'), written = tokens.map(token => token.text).join('');
    // Attributes are retained in the input proof. Only variant/field syntax is
    // compared without them; no cfg or arbitrary enum declaration is admitted.
    const plain = [];
    for (let index = 0; index < tokens.length; index++) {
        if (tokens[index].text === '#' && tokens[index + 1]?.text === '[') {
            let depth = 1;
            index += 2;
            for (; index < tokens.length && depth; index++) {
                if (tokens[index].text === '[')
                    depth++;
                if (tokens[index].text === ']')
                    depth--;
            }
            if (depth)
                throw new TypeError('Original enum attribute is unterminated');
            index--;
            continue;
        }
        plain.push(tokens[index].text);
    }
    if (plain.join('') !== 'pubenum' + kind + pin.parameters + '{' + pin.body + '}' || !written.includes(pin.derive))
        throw new TypeError('Shared standard pattern original discriminator/Copy declaration changed');
    const proof = freeze({ profile: 'rust-1.89-original-shared-standard-pattern-layout-v1', owner: 'core::' + kind.toLowerCase() + '::' + kind, sourceSha256: hash(raw), compressedSha256: hash(archive), declarationSha256: hash(source.slice(item.start, item.end)), span: { start: item.start, end: item.end }, declaration: source.slice(item.start, item.end), copyDerive: pin.derive, payloadCopyRequired: true, namespaceAuthority: false, pointeeCopyAuthority: false, pointeeDropAuthority: false });
    cached.set(kind, proof);
    return proof;
}
