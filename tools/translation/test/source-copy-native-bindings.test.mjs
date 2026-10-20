import test from 'node:test';
import assert from 'node:assert/strict';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from '../source-copy-native-bindings.mjs';
test('native source-copy scope validation joins actual import bindings and rejects omitted imports', {timeout:60_000},()=>{
 const ts=ownershipCompiler(),source="import {posix} from 'node:path';export const value=posix.normalize('src/app.rs');";
 assert.deepEqual(verifyNativeCopiedSourceBindings(ts,'/private/tmp/copied-formatting-source.mjs',source).unboundIdentifiers,[]);
 assert.throws(()=>verifyNativeCopiedSourceBindings(ts,'/private/tmp/copied-formatting-source.mjs',source.replace("import {posix} from 'node:path';",'')),/unbound identifier.*posix/);
 assert.throws(()=>verifyNativeCopiedSourceBindings(ts,'/private/tmp/copied-formatting-source.mjs','export const value={missing};'),/unbound identifier/);
 assert.equal(verifyNativeCopiedSourceBindings(ts,'/private/tmp/copied-formatting-source.mjs','export const value=process.pid+Buffer.byteLength("ok");').strictTypecheck,false);
});
