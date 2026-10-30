// Independent receiving/source-failure case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import * as original from '../prepare-native-substitution-copy.mjs';
import * as originalMixed from '../prepare-mixed-native-substitution-copy.mjs';
import * as current from '../failure-aware-native-substitution-copy.mjs';
import * as mixed from '../failure-aware-mixed-native-substitution-copy.mjs';
import * as originalFences from '../native-source-input-fences.mjs';
import * as fences from '../failure-aware-native-source-input-fences.mjs';
import {withSourceFailureOperation} from '../source-failure-operations.mjs';
import {prepareNativePreparerFailureSources} from '../prepare-native-preparer-failure-sources.mjs';
const limits={timeout:60000},hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(t,rust=false){
 const root=mkdtempSync(join(tmpdir(),'router-native-preparer-failure-'));t.after(()=>rmSync(root,{recursive:true,force:true}));mkdirSync(join(root,'profiles'));
 const path=rust?'value.rs':'value.mjs',before=rust?'pub fn value()->bool{false}\n':'export function value(){return false;}\n',after=rust?'pub fn value()->bool{true}\n':'export function value(){return true;}\n',id='independent-source-failure',archive='profiles/source.json.gz';
 const row={path,source:before,bytes:Buffer.byteLength(before),sha256:hash(before),languageEdits:[{start:0,end:before.length,expected:before,replacement:after,owner:{kind:'source-file',name:'complete-source'}}],repositoryEdits:[]},packed=gzipSync(JSON.stringify({schema:'native-substitution-source-copy-v1',id,files:[row]}));
 const write=(name,value)=>writeFileSync(join(root,name),value);write(path,after);write(archive,packed);return {root,path,before,after,packed,write,options:{root,archive,pin:hash(packed),id}};
}
test('valid original/new JS source preparations retain the same complete result and legacy API behavior',limits,t=>{
 const api=fixture(t),before=original.prepareNativeSubstitutionCopy(api.options),after=current.prepareNativeSubstitutionCopy(api.options);assert.deepEqual(after,before);assert.equal(after.sourceAuthority,false);assert.equal(after.semanticAuthority,false);assert.equal(after.receivingExecuted,false);assert.equal(current.nativeSubstitutionCopyHasChanges(after),false);assert.deepEqual(original.prepareNativeSubstitutionCopy(api.options),before);
});
test('valid original/new Rust preparations keep the separate CST scope and false native compilation flags',limits,t=>{
 const api=fixture(t,true),before=originalMixed.prepareMixedNativeSubstitutionCopy(api.options),after=mixed.prepareMixedNativeSubstitutionCopy(api.options);assert.deepEqual(after,before);assert.equal(after.receivingExecuted,false);assert.equal(after.files[0].nativeBindings.rustCompilationExecuted,false);assert.equal(after.files[0].nativeBindings.nativeSemanticScopeChecked,false);assert.equal(after.files[0].nativeBindings.rustCstSourceChecked,true);assert.equal(after.files[0].inverse,api.before);
 assert.throws(()=>original.prepareNativeSubstitutionCopy(api.options));assert.throws(()=>current.prepareNativeSubstitutionCopy(api.options));assert.deepEqual(mixed.prepareMixedNativeSubstitutionCopy(api.options),before);
});
for(const family of ['plain','mixed'])test(family+' caught changed source and restored bytes cannot revive an active source operation',limits,t=>{
 const api=fixture(t),operation=family==='plain'?current.withNativeSubstitutionOperation:mixed.withMixedNativeSubstitutionOperation,prepare=family==='plain'?current.prepareNativeSubstitutionCopy:mixed.prepareMixedNativeSubstitutionCopy;
 assert.throws(()=>operation(()=>{prepare(api.options);api.write(api.path,'export function value(){return 9;}\n');assert.throws(()=>prepare(api.options),/physical|source/u);api.write(api.path,api.after);return 42;}),/invalidated/u);
 assert.equal(prepare(api.options).files[0].current,api.after);
});
test('caught archive and pin failures invalidate source operations across both copied families',limits,t=>{
 const api=fixture(t);
 assert.throws(()=>current.withNativeSubstitutionOperation(()=>{current.prepareNativeSubstitutionCopy(api.options);api.write(api.options.archive,Buffer.from('broken'));assert.throws(()=>mixed.prepareMixedNativeSubstitutionCopy(api.options));api.write(api.options.archive,api.packed);}),/invalidated/u);
 assert.throws(()=>mixed.withMixedNativeSubstitutionOperation(()=>{assert.throws(()=>current.prepareNativeSubstitutionCopy({...api.options,pin:'0'.repeat(64)}));}),/invalidated/u);
 assert.doesNotThrow(()=>current.prepareNativeSubstitutionCopy(api.options));
});
test('legacy capture keeps its old caught-conflict behavior while the new fence revokes only its active scopes',limits,t=>{
 const api=fixture(t),path=join(api.root,api.path);
 assert.equal(originalFences.withNativeSourceInputFences(()=>{originalFences.retainNativeSourceInputFence(path,api.after);assert.throws(()=>originalFences.retainNativeSourceInputFence(path,api.before));return 7;}),7);
 assert.throws(()=>fences.withNativeSourceInputFences(()=>{fences.retainNativeSourceInputFence(path,api.after);assert.throws(()=>fences.retainNativeSourceInputFence(path,api.before));return 7;}),/invalidated/u);
 assert.equal(fences.withNativeSourceInputFences(()=>{fences.retainNativeSourceInputFence(path,api.after);return 7;}),7);
});
test('caught closing I/O failures remain observed even after later restoration',limits,t=>{
 const api=fixture(t),path=join(api.root,api.path);
 assert.throws(()=>withSourceFailureOperation(()=>{try{fences.withNativeSourceInputFences(()=>{fences.retainNativeSourceInputFence(path,api.after);rmSync(path);});assert.fail('missing closing input must throw');}catch(error){assert.equal(error.code,'ENOENT');}api.write(api.path,api.after);}),/invalidated/u);
 assert.equal(fences.withNativeSourceInputFences(()=>{fences.retainNativeSourceInputFence(path,api.after);return true;}),true);
});
test('source closing still preserves every arbitrary application primary including null and undefined',limits,t=>{
 const api=fixture(t),path=join(api.root,api.path);
 for(const primary of [null,undefined,Symbol('primary'),new Error('primary')]){
  let caught=false;try{fences.withNativeSourceInputFences(()=>{fences.retainNativeSourceInputFence(path,api.after);api.write(api.path,api.before);throw primary;});}catch(error){caught=true;assert.strictEqual(error,primary);}finally{api.write(api.path,api.after);}assert.equal(caught,true);
 }
});
test('ordinary application exceptions caught by their caller do not become source-input failures',limits,t=>{
 const api=fixture(t),primary=Symbol('ordinary application exception');
 const value=current.withNativeSubstitutionOperation(()=>{try{mixed.withMixedNativeSubstitutionOperation(()=>{throw primary;});}catch(error){assert.strictEqual(error,primary);}return current.prepareNativeSubstitutionCopy(api.options);});assert.equal(value.files[0].current,api.after);
});
test('source validation failures hidden behind an application primary still invalidate the containing operation',limits,t=>{
 const api=fixture(t),path=join(api.root,api.path),primary=new Error('application primary');
 assert.throws(()=>withSourceFailureOperation(()=>{try{fences.withNativeSourceInputFences(()=>{fences.retainNativeSourceInputFence(path,api.after);rmSync(path);throw primary;});}catch(error){assert.strictEqual(error,primary);}api.write(api.path,api.after);}),/invalidated/u);
 assert.doesNotThrow(()=>current.prepareNativeSubstitutionCopy(api.options));
});
test('unsupported callback/result forms fail without invoking async proxy or then accessors',limits,()=>{
 let calls=0;assert.throws(()=>current.withNativeSubstitutionOperation(async()=>{calls++;}));assert.throws(()=>mixed.withMixedNativeSubstitutionOperation(new Proxy(()=>{calls++;},{})));
 const result={get then(){calls++;return ()=>{};}};assert.throws(()=>current.withNativeSubstitutionOperation(()=>result));assert.equal(calls,0);
});
test('nine full source equations preserve originals old APIs declaration binding and all closing loops',limits,()=>{
 const plan=prepareNativePreparerFailureSources();assert.equal(plan.files.length,9);assert.equal(plan.receivingExecuted,false);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}
 const source=readFileSync(new URL('../failure-aware-native-source-input-fences.mjs',import.meta.url),'utf8');assert.ok(source.includes('for(const [path,row] of frame.files)'));assert.ok(source.includes('if(!failed&&fenceFailed)throw firstError;'));
});
