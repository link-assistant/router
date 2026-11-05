// Original target syntax/scope diagnostics only. No import resolution, native
// symbol/body permission, evaluation, generation or executable coverage.
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {collectDraftScopeTargetObservations} from './draft-scope-20261102-target-collector.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Original target binding gap plan: '+message);};
function freeze(value,seen=new Set()){
 if(value&&typeof value==='object'&&!seen.has(value)){seen.add(value);for(const child of Object.values(value))freeze(child,seen);Object.freeze(value);}return value;
}
function input(value){
 if(!value||types.isProxy(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('own complete target source options required');
 const fields=Object.getOwnPropertyDescriptors(value),keys=Reflect.ownKeys(fields);
 if(keys.length!==1||keys[0]!=='files'||!Object.hasOwn(fields.files,'value'))fail('only original own files may enter; no compiler/AST/flags');
 const files=fields.files.value;
 if(!Array.isArray(files)||types.isProxy(files))fail('original own-data file array required');
 const slots=Object.getOwnPropertyDescriptors(files),count=slots.length?.value;
 if(!Number.isSafeInteger(count)||count<0||count>4096||Reflect.ownKeys(slots).length!==count+1)fail('complete bounded file array required');
 function own(object,names){
  if(!object||typeof object!=='object'||types.isProxy(object))fail('own primitive source metadata required');const fields=Object.getOwnPropertyDescriptors(object);
  if(Reflect.ownKeys(fields).length!==names.length||names.some(name=>!Object.hasOwn(fields,name)||!Object.hasOwn(fields[name],'value')))fail('exact own source/origin fields required');return Object.fromEntries(names.map(name=>[name,fields[name].value]));
 }
 for(let at=0;at<count;at++){
  const slot=slots[at];if(!slot||!Object.hasOwn(slot,'value')||!slot.enumerable)fail('own file rows required');
  const row=own(slot.value,['source','origin']),origin=own(row.origin,['revision','path','blob','mode','bytes']);
  if(typeof row.source!=='string'||['revision','path','blob','mode'].some(key=>typeof origin[key]!=='string')||!Number.isSafeInteger(origin.bytes)||origin.bytes<0)fail('primitive original bytes/origins required without coercion');
 }
 return {files};
}
function derive(native){
 const sources=native.sources.map(row=>({origin:row.origin,language:row.language,nativeScope:row.nativeScope,originScope:row.originScope,unresolved:row.unresolved}));
 const censusKey=hash(JSON.stringify(sources.map(row=>row.origin))),compilerKey=hash(JSON.stringify(native.compilerOrigin)),rows=[];
 function add(kind,origin,evidence){
  const ordinal=rows.length,id=hash(JSON.stringify({kind,ordinal,origin,evidence,censusKey,compilerKey}));
  rows.push({id,kind,origin,evidence,requirements:['L02','B05'],reviewStatus:'OPEN',unresolved:['actual-target-import-export-symbol-and-receiving-closure-unproved'],sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false});
 }
 for(const source of sources)add('original-target-source-binding-review',source.origin,source);
 for(const diagnostic of native.diagnostics)add('original-target-native-diagnostic',diagnostic.origin,diagnostic);
 for(const observation of native.observations)if(['import','export','decorator-producer','module','type-alias','interface'].includes(observation.kind))add('original-target-binding-or-producer-review',observation.origin,observation);
 return {schema:'router-original-target-binding-gap-plan-20261103-v1',revision:native.revision,sources,sourceCensusSha256:censusKey,compilerOriginSha256:compilerKey,nativeExportClosure:native.nativeExportClosure,rows,gaps:rows.length,
  originalDiagnostics:native.diagnostics,nativeObservationCount:native.observations.length,
  sourceCheckerBoundary:'original single-file noResolve lexical check; import graph and strict typing remain unproved',
  productionFunctionDenominator:null,translationCoverage:null,draftedRequirements:null,scopeReviewComplete:false,
  sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,verification:'UNRUN'};
}
/** Actual original collector called exactly once. A frame is DATA ownership,
 * not a parser/compiler token. Native failures propagate immediately. Only
 * complete DATA-output accounting is deferred to describe(), so the immutable
 * driver can keep its existing refused-batch protocol and original domains. */
export function openTargetBindingGapObservation20261103(options){
 let native=collectDraftScopeTargetObservations(input(options)),active=true,refused=false,refusal;
 try{accountData(native);}catch(error){refused=true;refusal=error;}
 if(!refused)freeze(native);
 return Object.freeze({native,describe(){
  if(!active)fail('target observation frame expired');if(refused)throw refusal;
  const answer=derive(native);accountData(answer);return freeze(answer);
 },close(){active=false;native=null;refusal=undefined;}});
}
/** Standalone original-source entrypoint; callers cannot provide observations. */
export function collectTargetBindingGapPlan20261103(options){
 let frame;
 return withCompleteSourceClosingFence(()=>{
  const result=createRulePipeline([
   {phase:'language',rules:[{id:'language:actual-original-target-CST-native-grammar-and-scope',apply:()=>{frame=openTargetBindingGapObservation20261103(options);return frame.native;}}]},
   {phase:'repository',rules:[{id:'repository:retain-target-binding-refusals-and-open-L02-B05-work',apply:()=>frame.describe()}]},
  ]).run(null),answer={...result.value,trace:result.trace};accountData(answer);return freeze(answer);
 },[()=>frame?.close()]);
}
