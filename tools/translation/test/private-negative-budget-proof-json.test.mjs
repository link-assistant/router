import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash,Hash} from 'node:crypto';
import {prepareNegativeBudgetProofJson,negativeBudgetConsumerImport} from '../prepare-negative-budget-proof-json.mjs';
import {restoreNegativeBudgetProofConsumerSource} from './fixtures/native-proof-json-format.mjs';
import {createPrivateFrozenJsonComposer} from '../private-frozen-json.mjs';
import {createScopedPrivateNativeProofJsonSerializer,withRetainedPrivateNativeProofCostScope} from '../private-native-proof-json.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),URL=new globalThis.URL('../private-negative-budget-proof-json.mjs',import.meta.url),json=JSON.stringify,get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,CELLS=200000,DEPTH=160,UNITS=8388608;
function once(source,before,after){assert.equal(source.split(before).length,2,before);return source.replace(before,()=>after);}
function capture(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}}
async function fixture(t){
 const folder=mkdtempSync(join(tmpdir(),'router-negative-proof-budget-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));const original=readFileSync(URL,'utf8');let source=original;
 const edits=[['if(witness.failed)return JSON.stringify(value);','if(witness.failed){receiving.witnesses++;return JSON.stringify(value);}'],['  return uncertainFallback(value);\n };','  receiving.uncertain++;return uncertainFallback(value);\n };'],['  if(selected)return apply(stringifyField.value,jsonOwner,[value]);','  if(selected){receiving.native++;return apply(stringifyField.value,jsonOwner,[value]);}'],['  if(!costs)return legacyOutsideScope(value);','  if(!costs){receiving.outside++;return legacyOutsideScope(value);}'],['  costs.entries=frame.budget.admissions;','  costs.entries=frame.budget.admissions;receiving.last={selected,mandatory:witness.failed,admissions:costs.entries};']];
 for(const [before,after]of edits)source=once(source,before,after);let inverse=source;for(const [before,after]of [...edits].reverse())inverse=once(inverse,after,before);assert.equal(inverse,original);
 const imports=[];source=source.replace(/(from\s+)(['"])(\.\.?\/[^'"\n]+)\2/g,(whole,prefix,quote,path)=>{const after=prefix+quote+new globalThis.URL(path,URL).href+quote;imports.push([whole,after]);return after;});let restored=source;for(const [before,after]of [...imports].reverse())restored=once(restored,after,before);let beforeInstrumentation=restored;for(const [before,after]of [...edits].reverse())beforeInstrumentation=once(beforeInstrumentation,after,before);assert.equal(beforeInstrumentation,original);
 source+='\nconst receiving={witnesses:0,uncertain:0,native:0,outside:0,last:null};export function facts(){return {...receiving,ready:nativeReady()};}\n';const path=join(folder,'actual-receiving.mjs');writeFileSync(path,source);assert.equal(readFileSync(path,'utf8'),source);return {api:await import(pathToFileURL(path).href),original,source,edits,imports};
}
const scope=run=>withRetainedPrivateNativeProofCostScope(run);
function large(tail){return {front:Array(CELLS-1).fill(null),tail};}
function chain(depth,value=null){for(let at=0;at<depth;at++)value={child:value};return value;}
function freeze(value){if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;}

test('negative budget source proposal copies actual whole census, matches actual composer bounds and preserves complete source inverses',{timeout:60000},()=>{
 const plan=prepareNegativeBudgetProofJson();assert.equal(plan.typescriptVersion,'5.9.3');assert.deepEqual(plan.proof.limits,{cells:CELLS,depth:DEPTH,units:UNITS});assert.equal(plan.proof.unitFailureIsNotAWitness,true);assert.equal(plan.proof.unseenTailIsNotCertified,true);assert.equal(plan.files.length,3);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.original);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(row.sequence.languageRules.length,1);assert.equal(row.sequence.repositoryRules.length,1);}
 const consumer=plan.files.find(row=>row.path.endsWith('builtin-derive-bang-footprints.mjs'));assert.equal(restoreNegativeBudgetProofConsumerSource(consumer.after),consumer.original);assert.equal(consumer.after,consumer.original.replace(negativeBudgetConsumerImport.before,()=>negativeBudgetConsumerImport.after).replace(negativeBudgetConsumerImport.factoryBefore,()=>negativeBudgetConsumerImport.factoryAfter));
 assert.equal(plan.originalHelperAPIsAndBytesUnchanged,true);assert.equal(plan.newAcrossInvocationCache,false);assert.equal(plan.semanticAdmission,false);
});

test('changed original complete sources or limits refuse preparation rather than infer a budget equivalence',{timeout:60000},t=>{
 const folder=mkdtempSync(join(tmpdir(),'router-negative-budget-source-'));t.after(()=>rmSync(folder,{recursive:true,force:true}));const paths=['private-native-proof-json.mjs','private-frozen-json.mjs','builtin-derive-bang-footprints.mjs','test/fixtures/native-proof-json-format.mjs'];for(const name of paths){const path=join(folder,'tools/translation',name);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,readFileSync(resolve(ROOT,'tools/translation',name),'utf8'));}
 for(const name of paths.slice(0,2)){const path=join(folder,'tools/translation',name),source=readFileSync(path,'utf8');for(const changed of [source+'\n',source.replace('DEPTH=160','DEPTH=161')]){assert.notEqual(changed,source);writeFileSync(path,changed);assert.throws(()=>prepareNegativeBudgetProofJson({root:folder}),/complete original budget source pin differs/);}writeFileSync(path,source);}
});

test('logical cells, depth and repeated frozen subtree costs select only a mandatory negative composer result',{timeout:60000},async t=>{
 const {api}=await fixture(t),serial=api.createNegativeBudgetPrivateProofJsonSerializer();assert.equal(api.facts().ready,true);
 scope(()=>{for(const value of [large(null),chain(DEPTH+1)]){const prior=api.facts();assert.equal(serial(value),json(value));assert.equal(api.facts().witnesses,prior.witnesses+1);assert.equal(api.facts().last.mandatory,true);}});
 const leaf=freeze(Array(100000).fill(null));scope(()=>{assert.equal(serial(leaf),json(leaf));const prior=api.facts();assert.ok(prior.last.admissions>0);const value={left:leaf,right:leaf};assert.equal(serial(value),json(value));assert.equal(api.facts().witnesses,prior.witnesses+1);});
 const shallow=freeze({values:Array(64).fill(null)});scope(()=>{serial(shallow);const first=api.facts().last.admissions;serial(shallow);assert.equal(api.facts().last.admissions,first);});scope(()=>{serial(shallow);assert.equal(api.facts().last.admissions,2);});
});

test('an unseen getter, proxy, toJSON, lazy stack or thrown error remains in the full original dynamic JSON tail',{timeout:60000},async t=>{
 const {api}=await fixture(t),serial=api.createNegativeBudgetPrivateProofJsonSerializer();
 const builders=[tape=>define({},'value',{enumerable:true,get(){tape.push('getter');return 7;}}),tape=>({toJSON(key){tape.push(['toJSON',key]);return {original:true};}}),tape=>new Proxy({value:3},{get(target,key,receiver){tape.push(['get',String(key)]);return Reflect.get(target,key,receiver);},ownKeys(target){tape.push(['keys']);return Reflect.ownKeys(target);},getOwnPropertyDescriptor(target,key){tape.push(['descriptor',String(key)]);return get(target,key);}}),tape=>define({},'value',{enumerable:true,get(){tape.push('throw');throw new RangeError('original callback exception');}})];
 for(const build of builders){const run=serialize=>{const tape=[],value=large(build(tape));return {result:capture(()=>serialize(value)),tape};},before=run(value=>JSON.stringify(value)),prior=api.facts(),after=scope(()=>run(serial));assert.deepEqual(after,before);assert.equal(api.facts().witnesses,prior.witnesses+1);assert.ok(after.tape.length>0);}
 if(typeof Error.captureStackTrace==='function'){
  const field=get(Error,'prepareStackTrace');
  const run=serialize=>{
   const tape=[],tail={};let result,stackAfter,ownAfter;
   try{
    define(Error,'prepareStackTrace',{configurable:true,value(error,frames){
     const actualFrames=frames.map(frame=>frame.toString()),formatted=actualFrames.join('\n');
     tape.push({operation:'format-stack',errorIsTail:error===tail,frames:actualFrames,result:formatted});return formatted;
    }});
    Error.captureStackTrace(tail);define(tail,'stack',{enumerable:true});
    result=capture(()=>serialize(large(tail)));stackAfter=tail.stack;const own=get(tail,'stack');
    ownAfter={kind:Object.hasOwn(own,'value')?'data':'accessor',enumerable:own.enumerable,configurable:own.configurable,...(Object.hasOwn(own,'value')?{value:own.value,writable:own.writable}:{get:typeof own.get,set:typeof own.set})};
   }finally{if(field)define(Error,'prepareStackTrace',field);else delete Error.prepareStackTrace;}
   return {result,tape,stackAfter,ownAfter};
  };
  // Both engines capture genuine frames at this one run/capture call site,
  // with identical retained-scope nesting for both complete serializers.
  const rows=[],prior=api.facts().witnesses;
  for(const serialize of [value=>JSON.stringify(value),serial])rows.push(scope(()=>run(serialize)));
  assert.deepStrictEqual(rows[1],rows[0]);assert.equal(api.facts().witnesses,prior+1);
  for(const row of rows){
   assert.equal(typeof row.result.value,'string');assert.equal(typeof row.stackAfter,'string');assert.ok(row.stackAfter.includes('private-negative-budget-proof-json.test.mjs'));assert.equal(JSON.parse(row.result.value).tail.stack,row.stackAfter);assert.equal(row.ownAfter.enumerable,true);
   if(row.tape.length){for(const call of row.tape){assert.equal(call.operation,'format-stack');assert.equal(call.errorIsTail,true);assert.ok(call.frames.length>0);assert.equal(call.result,call.frames.join('\n'));assert.equal(call.result,row.stackAfter);}}
   // Bun may expose eager captured DATA without invoking the formatter.
   else{assert.equal(row.ownAfter.kind,'data');assert.equal(row.ownAfter.value,row.stackAfter);}
  }
 }
});

test('mandatory failure retains the live global JSON lookup and actual Hash payload without caching bytes or results',{timeout:60000},async t=>{
 const {api}=await fixture(t),serial=api.createNegativeBudgetPrivateProofJsonSerializer(),value=large({value:1}),globalField=get(globalThis,'JSON'),nativeJSON=JSON,lookup=[];let actual;
 try{define(globalThis,'JSON',{configurable:true,enumerable:globalField.enumerable,get(){lookup.push('JSON');return nativeJSON;}});actual=scope(()=>serial(value));}finally{define(globalThis,'JSON',globalField);}assert.equal(actual,json(value));assert.deepEqual(lookup,['JSON']);
 const update=get(Hash.prototype,'update'),payloads=[];try{define(Hash.prototype,'update',{...update,value:function(...args){payloads.push(args);return apply(update.value,this,args);}});scope(()=>{for(const text of [serial(value),serial(value)])assert.equal(createHash('sha256').update(text).digest('hex'),createHash('sha256').update(json(value)).digest('hex'));});}finally{define(Hash.prototype,'update',update);}assert.equal(payloads.length,4);for(const args of payloads)assert.deepEqual(args,[json(value)]);
});

test('unit-only estimates, unknown shapes, changed intrinsics and closed frames retain their original fallbacks',{timeout:60000},async t=>{
 const {api}=await fixture(t),serial=api.createNegativeBudgetPrivateProofJsonSerializer();for(const value of [{source:'x'.repeat(UNITS)},new Date(0),[,1]]){const prior=api.facts();assert.deepEqual(capture(()=>scope(()=>serial(value))),capture(()=>createPrivateFrozenJsonComposer()(value)));assert.equal(api.facts().witnesses,prior.witnesses);assert.ok(api.facts().uncertain>prior.uncertain);}assert.equal(scope(()=>serial({missing:undefined})),json({missing:undefined}));
 const field=get(Map.prototype,'get'),value=large(null),prior=api.facts();try{define(Map.prototype,'get',{...field,value:function(...args){return apply(field.value,this,args);}});assert.equal(scope(()=>serial(value)),json(value));}finally{define(Map.prototype,'get',field);}assert.equal(api.facts().witnesses,prior.witnesses);
 const calls=[],original=createScopedPrivateNativeProofJsonSerializer(),wrapped=api.createNegativeBudgetPrivateProofJsonSerializer(value=>{calls.push(value);return original(value);}),outside=large(null);assert.equal(wrapped(outside),json(outside));const escaped=scope(()=>()=>wrapped(outside));assert.equal(escaped(),json(outside));assert.deepEqual(calls,[outside,outside]);assert.equal(api.facts().outside,2);assert.throws(()=>api.createNegativeBudgetPrivateProofJsonSerializer(null),TypeError);
});

test('the actual additive eligibility export restores every byte of the complete historical native helper',{timeout:60000},()=>{
 const plan=prepareNegativeBudgetProofJson(),row=plan.proof.nativeInputEvolution,sha=text=>createHash('sha256').update(text).digest('hex');
 assert.equal(row.actualSha256,'f23c8f96cddf92af07495e67622fd98d8b9bcf04b9ed62a78693ee7455ba027b');assert.equal(row.historicalSha256,'b02892e676b928339f15d2a529d0467dfd60efedbe8e991df0910400289db338');assert.equal(sha(row.after),row.actualSha256);assert.equal(sha(row.original),row.historicalSha256);assert.equal(row.current,row.after);assert.equal(row.inverse,row.original);
 const added=row.addedDeclaration;assert.equal(added.kind,'FunctionDeclaration');assert.equal(added.name,'privateNativeProofJsonDataWithinBudget');assert.equal(row.after.slice(...added.span),added.source);assert.equal(row.after.slice(0,added.span[0])+row.after.slice(added.span[1]),row.original);assert.equal(row.allOriginalBytesAndAPIsPreserved,true);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);
});
