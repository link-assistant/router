// Finite allocation hypothesis only; does not install a compiler change.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';

const hash = value => createHash('sha256').update(value).digest('hex');
const variant = process.argv[2], frozen = process.argv[3] === 'frozen';
assert.ok(['original','literal'].includes(variant));
assert.ok(['plain','frozen'].includes(process.argv[3]));
assert.equal(typeof globalThis.gc, 'function', 'run with --expose-gc');
const root = resolve('.');
const original = readFileSync('tools/translation/rust-structure.mjs','utf8');
assert.equal(hash(original), 'ea09bde0452ff0e8021454e2c0040b6bdd8493163b0ab48cea496353e6b92261');
const before = "token => ({ ...token, text: source.slice(token.start, token.end) })";
const after = "token => ({ type: token.type, text: source.slice(token.start, token.end), start: token.start, end: token.end })";
assert.equal(original.split(before).length, 2);
let experimental = variant === 'literal' ? original.replace(before,after) : original;
const edits = variant === 'literal' ? [{before,after}] : [];
for (const name of ['vendor/formal-ai/lexer.mjs','rust-item-boundaries.mjs']) {
  const before = "'./" + name + "'";
  const after = JSON.stringify(pathToFileURL(join(root,'tools/translation',name)).href);
  assert.equal(experimental.split(before).length, 2);
  experimental = experimental.replace(before,after);
  edits.push({before,after});
}
let inverse = experimental;
for (const edit of [...edits].reverse()) {
  assert.equal(inverse.split(edit.after).length, 2);
  inverse = inverse.replace(edit.after, edit.before);
}
assert.equal(inverse, original);
const api = await import('data:text/javascript;base64,' + Buffer.from(experimental).toString('base64'));
function files(directory) {
  return readdirSync(directory,{withFileTypes:true}).flatMap(entry => {
    const path = join(directory,entry.name);
    return entry.isDirectory() ? files(path) : entry.isFile() && path.endsWith('.rs') ? [path] : [];
  });
}
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
const selected = files('rust/src').map(path => ({path,bytes:statSync(path).size}))
  .sort((a,b) => b.bytes-a.bytes || a.path.localeCompare(b.path)).slice(0,8);
assert.equal(selected.length, 8);
assert.ok(selected.reduce((total,row) => total+row.bytes,0) <= 1_000_000);
globalThis.gc(); globalThis.gc();
const initial = process.memoryUsage(), started = performance.now(), retained = [], rows = [];
let tokens = 0;
for (const file of selected) {
  const source = readFileSync(file.path,'utf8'), items = api.sourceItems(source);
  for (const item of items) for (const token of item.tokens) {
    tokens++;
    assert.equal(Object.getPrototypeOf(token),Object.prototype);
    assert.deepEqual(Reflect.ownKeys(token),['type','text','start','end']);
    for (const key of Reflect.ownKeys(token)) {
      const field = Object.getOwnPropertyDescriptor(token,key);
      assert.ok(Object.hasOwn(field,'value') && field.enumerable && field.configurable && field.writable);
    }
  }
  assert.ok(tokens <= 500_000);
  rows.push({...file,sourceSha256:hash(source),items:items.length,
    resultSha256:hash(JSON.stringify(items))});
  retained.push(frozen ? freeze(items) : items);
}
globalThis.gc(); globalThis.gc();
const final = process.memoryUsage();
console.log(JSON.stringify({variant,frozen,node:process.version,originalSha256:hash(original),
  experimentalSha256:hash(experimental),wholeInverse:true,files:rows,tokens,
  retainedFiles:retained.length,elapsedMilliseconds:performance.now()-started,
  initial,final,retainedHeapDelta:final.heapUsed-initial.heapUsed,
  scope:'Eight finite actual files; fresh independent process, 256 MiB heap, explicit GC. An unguarded hypothesis, not production behavior, source authority, whole-compiler performance or a passing gate.'}));
