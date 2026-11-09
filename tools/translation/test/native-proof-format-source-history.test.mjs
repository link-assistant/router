import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deriveNativeProofFormatSourceHistory,readNativeProofFormatSourceHistory} from './native-proof-format-source-history.mjs';
import {transportConcreteNamedSourcePhases} from '../concrete-source-origin-phases.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const url=new URL('./fixtures/native-proof-json-format.mjs',import.meta.url);
test('the current complete native proof fixture retains its original receiving bytes and full CST inverse',
 {timeout:60000},()=>{
 const source=readFileSync(url,'utf8'),row=deriveNativeProofFormatSourceHistory(source);
 assert.equal(row.adopted,true);assert.equal(row.after,source);assert.equal(row.inverse,row.before);
 const [equation]=transportConcreteNamedSourcePhases([{before:row.before,middle:row.before,
  after:source,language:'JavaScript',rules:['javascript:retain-complete-original-proof-fixture',
   'router:join-private-Clone-source-history','javascript:restore-complete-original-proof-fixture',
   'router:restore-complete-original-proof-fixture']}]);
 assert.equal(equation.before,row.before);assert.equal(equation.after,source);
 assert.equal(equation.inverse,row.before);
 for(const stage of equation.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
 }
 assert.equal(readNativeProofFormatSourceHistory(url,'utf8'),row.before);
 assert.deepEqual(readNativeProofFormatSourceHistory(url),readFileSync(url));
 for(const key of ['sourceAuthority','semanticAuthority','runtimeAuthority'])assert.equal(row[key],false);
 assert.equal(readFileSync(url,'utf8'),source);
});

test('complete native proof fixture history rejects foreign bytes paths and changed Clone calls',()=>{
 const source=readFileSync(url,'utf8');
 for(const changed of [source+'\n',source.replace('clone-enclosing-extension','foreign-extension'),
  source.replace('restoreReceivingSourceHistory(source,\'clone-enclosing-extension\',retain)',
   'restoreReceivingSourceHistory(source,\'clone-enclosing-extension\')')])
  assert.throws(()=>deriveNativeProofFormatSourceHistory(changed),/complete physical fixture pin/u);
 const other=new URL('./native-proof-format-source-history.mjs',import.meta.url);
 assert.equal(readNativeProofFormatSourceHistory(other,'utf8'),readFileSync(other,'utf8'));
 assert.throws(()=>readNativeProofFormatSourceHistory(new URL('./missing-proof-source.mjs',import.meta.url),'utf8'),{code:'ENOENT'});
});
