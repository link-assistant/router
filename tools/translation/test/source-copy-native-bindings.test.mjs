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
test('native source-copy validation rejects the actual URL initialization shadow and preserves deferred bindings', {timeout:60_000},()=>{
 const ts=ownershipCompiler(),path='/private/tmp/copied-formatting-source.mjs';
 const source="import {fileURLToPath} from 'node:url';const ROOT=fileURLToPath(new URL('../',import.meta.url)),URL=new globalThis.URL('./subject.mjs',import.meta.url);export {ROOT,URL};";
 assert.throws(()=>verifyNativeCopiedSourceBindings(ts,path,source),/initialization.*URL.*before its declaration/);
 const repaired=source.replace(',URL=new globalThis.URL',',subjectURL=new globalThis.URL').replace('{ROOT,URL}','{ROOT,subjectURL}');
 assert.equal(verifyNativeCopiedSourceBindings(ts,path,repaired).nativeSemanticScopeChecked,true);
 for(const legal of [
  'export const deferred=()=>later;const later=1;',
  'export function deferred(){return later;}const later=1;',
  'export const value=hoisted();function hoisted(){return 1;}',
 ])assert.equal(verifyNativeCopiedSourceBindings(ts,path,legal).strictTypecheck,false);
});
