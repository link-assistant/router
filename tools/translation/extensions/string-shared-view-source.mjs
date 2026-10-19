// Complete existing alloc source is the input; no trait/body template is added.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { sourceItems } from '../rust-structure.mjs';
const hash = value => createHash('sha256').update(value).digest('hex'), significant = item => item.tokens.filter(token => token.type !== 'comment');
const freeze = value => { if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
} return value; };
let cached;
export function originalStringSharedViewSource() {
    if (cached)
        return cached;
    const archive = readFileSync(new URL('../source-profiles/utf16-fixed-f64/alloc-string.rs.gz', import.meta.url));
    if (hash(archive) !== '3f9bb719280924aa34b9f3693879b5a65e45eecc78f4fa8dea84219bf1105523')
        throw new TypeError('Original String source archive changed');
    const raw = gunzipSync(archive, { maxOutputLength: 150000 });
    if (raw.length !== 111988 || hash(raw) !== '46dadb69bbe909b50146366020dc23d4fa88f53b93435b7e0f70c6692d0ba629')
        throw new TypeError('Original String source bytes changed');
    const source = raw.toString('utf8'), owners = sourceItems(source), owner = header => { const rows = owners.filter(item => { const tokens = significant(item), begin = tokens.findIndex(token => token.text === 'impl'), open = tokens.findIndex((token, index) => index > begin && token.text === '{'); return item.term === 'impl' && tokens.slice(begin, open).map(token => token.text).join('') === header; }); if (rows.length !== 1)
        throw new TypeError('Original String shared-view implementation is ambiguous'); return rows[0]; };
    const method = (implementation, name) => { const tokens = significant(implementation), open = tokens.find(token => token.text === '{'), close = tokens.at(-1), members = sourceItems(source.slice(open.end, close.start)).filter(item => item.term === 'fn' && item.name === name); if (members.length !== 1)
        throw new TypeError('Original String shared-view method is ambiguous'); const member = members[0], written = significant(member), start = written.findIndex(token => token.text === 'fn'), body = written.findIndex((token, index) => index > start && token.text === '{'); return { signature: written.slice(start, body).map(token => token.text).join(''), body: written.slice(body).map(token => token.text).join(''), span: { start: open.end + member.start, end: open.end + member.end }, source: source.slice(open.end + member.start, open.end + member.end) }; };
    const derefOwner = owner('implops::DerefforString'), deref = method(derefOwner, 'deref'), view = method(owner('implString'), 'as_str');
    if (!significant(derefOwner).map(token => token.text).join('').includes('typeTarget=str;') || deref.signature !== 'fnderef(&self)->&str' || deref.body !== '{self.as_str()}' || view.signature !== 'fnas_str(&self)->&str' || view.body !== '{unsafe{str::from_utf8_unchecked(self.vec.as_slice())}}')
        throw new TypeError('Original String Deref/as_str source contract changed');
    cached = freeze({ profile: 'rust-1.89-original-string-deref-shared-view-v1', source: { path: 'library/alloc/src/string.rs', url: 'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/alloc/src/string.rs', bytes: raw.length, sha256: hash(raw) }, deref: Object.freeze(deref), asStr: Object.freeze(view), receiver: 'actual existing shared standard String place', domain: 'existing checked Unicode scalar String ABI models valid Rust UTF-8 contents', allocationAuthority: false, mutationAuthority: false, pointerIdentityAuthority: false, dropAuthority: false, namespaceAuthority: false, traitDispatchComplete: false });
    return cached;
}
