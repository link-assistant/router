// Source-adoption proposal DATA only. Whole original source is retained across
// all rules; concrete transport never supplies semantic or install authority.
import {types} from 'node:util';
import {createRuleRegistry} from './rule-registry.mjs';
import {draftInventoryPath} from './draft-inventory-reconciliation.mjs';
import {composeConcreteSourceEditTemplates} from './concrete-source-edit-templates.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const fail=message=>{throw TypeError('Concrete source rule registry: '+message);};
const names=new Set(['id','phase','plan','discover','requires','before','after','conflicts','exclusive']);
function own(object,key){const field=Object.getOwnPropertyDescriptor(object,key);if(!field||!Object.hasOwn(field,'value'))fail('own rule data field required');return field.value;}
function dense(value,max){
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('ordinary dense bounded array required');
 const size=own(value,'length');if(!Number.isSafeInteger(size)||size<0||size>max||Reflect.ownKeys(value).length!==size+1)fail('complete array census required');return Array.from({length:size},(_,at)=>own(value,String(at)));
}
function exact(value,keys){
 if(!value||typeof value!=='object'||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('ordinary own source proposal fields required');
 const fields=Reflect.ownKeys(value);if(fields.length!==keys.length||fields.some(key=>!keys.includes(key)))fail('complete source proposal fields required');return Object.fromEntries(keys.map(key=>[key,own(value,key)]));
}
function freeze(value,seen=new Set()){if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);for(const child of Object.values(value))freeze(child,seen);Object.freeze(value);}return value;}
function sources(input){
 accountData(input);const seen=new Set();return freeze(dense(input,128).map(raw=>{
  const row=exact(raw,['path','language','source']);draftInventoryPath(row.path);
  if(seen.has(row.path)||!['Rust','JavaScript','TypeScript'].includes(row.language)||typeof row.source!=='string'||row.source.length>2097152||Buffer.byteLength(row.source)>2097152)fail('unique complete source inside the original template domain required');
  seen.add(row.path);return row;
 }));
}
/** Definition callbacks propose templates over immutable original spans. They
 * cannot overwrite or remove another rule's original evidence or private proof. */
export function createConcreteSourceRuleRegistry(input){
 const registrations=dense(input,4096).map(raw=>{
  if(!raw||types.isProxy(raw)||![Object.prototype,null].includes(Object.getPrototypeOf(raw)))fail('ordinary source rule declaration required');
  const keys=Reflect.ownKeys(raw);for(const key of keys)if(typeof key!=='string'||!names.has(key))fail('unknown source rule declaration');
  const declaration=Object.fromEntries(keys.map(key=>[key,own(raw,key)])),plan=declaration.plan;requireSynchronousSourceCallback(plan);delete declaration.plan;
  const {id,phase}=declaration;
  return {...declaration,apply(state,context){
   const proposed=withCompleteSourceClosingFence(()=>plan(state.sources,context,state.proposals),[]);accountData(proposed);
   const copied=structuredClone(dense(proposed,8192)),rows=copied.map(value=>{
    const row=exact(value,['path','templates']);if(!state.sources.some(source=>source.path===row.path))fail('rule proposal must use a complete selected original file');dense(row.templates,8192);
    return {rule:id,phase,path:row.path,templates:row.templates};
   });
   const proposals=freeze([...state.proposals,...rows]);if(proposals.length>8192)fail('aggregate original-span proposal count bound');accountData(proposals);
   return Object.freeze({sources:state.sources,proposals});
  }};
 });
 const registry=createRuleRegistry(registrations);
 function plan(inputSources,selection,context,discover){
   const original=sources(inputSources);if(!original.length)fail('at least one complete original file required');
   const pipeline=discover?registry.discover(original,context):registry.compile(selection),result=pipeline.run(Object.freeze({sources:original,proposals:Object.freeze([])}),context);
   const files=original.map(row=>{
    const templates=result.value.proposals.filter(proposal=>proposal.path===row.path).flatMap(proposal=>proposal.templates),composition=composeConcreteSourceEditTemplates(row.source,templates);
    const before=transportConcreteSyntaxSource(row.source,{language:row.language});
    if(before.source!==row.source||transportConcreteSyntaxMeta(before.meta).source!==row.source)fail('whole original CST serialization/reparse differs');
    const run=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'language:compose-registered-original-span-templates',edits:composition.edits}],repositoryRules:[]});
    const after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(run.value)).source,history=transportConcreteSourceEquations([{before:row.source,after,language:row.language}])[0];
    if(history.inverse!==row.source||transportConcreteSyntaxMeta(history.beforeMeta).source!==row.source||transportConcreteSyntaxMeta(history.afterMeta).source!==after)fail('complete composed source/CST/inverse differs');
    return {path:row.path,language:row.language,before:row.source,after,inverse:row.source,composition,history,concreteTrace:run.trace};
   });
   const answer={schema:'registered-concrete-source-rule-plan-v1',files,proposals:result.value.proposals,description:pipeline.description,discovery:pipeline.discovery,trace:result.trace,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,installationAuthority:false};accountData(answer);return freeze(answer);
 }
 return Object.freeze({description:registry.description,plan(inputSources,selection,context){return plan(inputSources,selection,context,false);},planDiscovered(inputSources,context){return plan(inputSources,undefined,context,true);}});
}
/** Pure in-memory whole-cohort replay. A plan is editable proposal DATA, never
 * an original owner/checker token. Every replay reissues complete CST/inverses. */
function replay(inputSources,plan,reverse){
 accountData(plan);if(plan?.schema!=='registered-concrete-source-rule-plan-v1')fail('complete source proposal schema required');
 const current=sources(inputSources),files=dense(plan.files,128);if(current.length!==files.length||!files.length)fail('complete original source cohort required');
 const byPath=new Map(current.map(row=>[row.path,row]));let allBefore=true,allAfter=true,changed=false;const seen=new Set();
 for(const row of files){
  if(!row||typeof row.path!=='string'||seen.has(row.path)||!['Rust','JavaScript','TypeScript'].includes(row.language)||typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before)fail('complete unique source equation/inverse required');seen.add(row.path);
  const actual=byPath.get(row.path);if(!actual||actual.language!==row.language)fail('source proposal path/language differs');
  allBefore&&=actual.source===row.before;allAfter&&=actual.source===row.after;changed||=row.before!==row.after;
 }
 if(!allBefore&&!allAfter)fail('stale or mixed original/final source cohort');
 const result=files.map(row=>{
  if(!row.history||row.history.inverse!==row.before)fail('retained original source history required');
  const retainedBefore=transportConcreteSyntaxMeta(row.history.beforeMeta),retainedAfter=transportConcreteSyntaxMeta(row.history.afterMeta);
  if(retainedBefore.source!==row.before||retainedAfter.source!==row.after||retainedBefore.document.language!==row.language||retainedAfter.document.language!==row.language)fail('retained complete source history differs');
  const actual=byPath.get(row.path),source=reverse?row.before:row.after,planHistory=transportConcreteSourceEquations([{before:row.before,after:row.after,language:row.language}])[0];
  const history=transportConcreteSourceEquations([{before:actual.source,after:source,language:row.language}])[0];
  if(planHistory.inverse!==row.before||history.inverse!==actual.source||transportConcreteSyntaxMeta(planHistory.beforeMeta).source!==row.before||transportConcreteSyntaxMeta(planHistory.afterMeta).source!==row.after||transportConcreteSyntaxMeta(history.afterMeta).source!==source)fail('complete replay original/current CST or inverse differs');
  return {path:row.path,language:row.language,source,planOriginalInverse:row.before,planForwardSource:row.after,planHistory,history};
 });
 const answer={schema:'registered-concrete-source-rule-replay-v1',direction:reverse?'inverse':'forward',files:result,applied:changed&&(reverse?allAfter&&!allBefore:allBefore&&!allAfter),alreadyApplied:reverse?allBefore:allAfter,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,installationAuthority:false};accountData(answer);return freeze(answer);
}
export function applyConcreteSourceRulePlan(inputSources,plan){return replay(inputSources,plan,false);}
export function restoreConcreteSourceRulePlan(inputSources,plan){return replay(inputSources,plan,true);}
