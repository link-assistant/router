import {isDeepStrictEqual} from 'node:util';
import {createRulePipeline} from './rule-pipeline.mjs';
import {withNominalEditedOperation} from './nominal-edited-target-20261101-domain.mjs';
// Actual edited target -> complete checked changed native source -> exact
// target replay. SOURCE DRAFT; no public metadata is an admission permit.
import {accountPrimitiveVectorIteratorBulkData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {incrementalNominalCopyCollectionOutput} from './nominal-copy-collection-20261101.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {selectNominalEditedFunction,editedNominalShape,emitNominalEditedRustBody,nominalEditedNativeBodyRange,sameNominalEditedShape} from './nominal-edited-target-20261101-ir.mjs';
import {selectAuthoritativeNominalEdits} from './nominal-edited-target-20261101-syntax.mjs';
import {compileNominalEditedProject,withNominalEditedInstalledSources,noteNominalEditedSourceFailure} from './nominal-edited-target-20261101-profile.mjs';
const fail=message=>{throw new TypeError('Edited nominal collection: '+message);};
const envelope=Object.freeze({maxValues:4096,inputEnvelopeChanged:true,resourceEnvelopeChanged:true,originalUnboundedInputEquivalent:false,originalBodyEquivalentOutsideBoundedDomain:false,nativeCarrierBoundEnforced:false,targetCarrierBoundEnforced:true,boundedReceivingDomainOnly:true,newNativeAbi:false});
function safe(path,suffix){return typeof path==='string'&&path.endsWith(suffix)&&path.length<=4096&&!/[:\\\0\r\n]/u.test(path)&&!path.startsWith('/')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..');}
function requestData(value){
 accountPrimitiveVectorIteratorBulkData(value);const request=structuredClone(value);if(!request||Object.keys(request).sort().join(',')!=='entry,files,lock,manifest'||typeof request.manifest!=='string'||typeof request.lock!=='string'||!Array.isArray(request.files)||!request.files.length||request.files.length>2048||!safe(request.entry,'.rs'))fail('exact complete bounded original native project source request required');
 const paths=new Set();for(const row of request.files){if(!row||Object.keys(row).sort().join(',')!=='path,source'||!safe(row.path,'.rs')||typeof row.source!=='string'||paths.has(row.path.toLowerCase()))fail('unique safe complete native source rows required');paths.add(row.path.toLowerCase());}if(!request.files.some(row=>row.path===request.entry))fail('actual complete native entry source required');return request;
}
function selectionData(value,entry){
 accountPrimitiveVectorIteratorBulkData(value);const edit=structuredClone(value);if(!edit||Object.keys(edit).sort().join(',')!=='language,qualifiedNames,source,sourcePath'||!['JavaScript','TypeScript'].includes(edit.language)||!Array.isArray(edit.qualifiedNames)||!edit.qualifiedNames.length||edit.qualifiedNames.length>128||edit.qualifiedNames.some(value=>typeof value!=='string')||new Set(edit.qualifiedNames).size!==edit.qualifiedNames.length||typeof edit.source!=='string'||edit.sourcePath!==entry.slice(0,-3)+(edit.language==='JavaScript'?'.mjs':'.mts'))fail('one complete authoritative emitted target and exact source selections required');return edit;
}
function freshSnapshots(result){
 if(!Array.isArray(result.executableDeclarations))fail('combined successor must retain only fresh checkedSource/targetBinding snapshot readers');
 return result.executableDeclarations.map(row=>{if(typeof row.checkedSource!=='function'||typeof row.targetBinding!=='function'||Object.hasOwn(row,'lower'))fail('fresh snapshot-only original declaration readers required');const source=row.checkedSource(),target=row.targetBinding();accountPrimitiveVectorIteratorBulkData({source,target});return {source,target};});
}
function plansFor(result,names){
 const snapshots=freshSnapshots(result),owners=result.nominalCopyCollections?.owners;if(!Array.isArray(owners))fail('fresh original unit Copy owner census missing');
 return names.map(name=>{const rows=snapshots.filter(row=>row.source.qualifiedName===name);if(rows.length!==1)fail('selected whole original native function was refused or not uniquely checked: '+name);return selectNominalEditedFunction(rows[0].source,rows[0].target,owners);});
}
function substitutedRequest(request,beforePlans,afterPlans){
 const edits=new Map();let bodyUnits=0,bodyBytes=0;for(let index=0;index<beforePlans.length;index++){const original=beforePlans[index],rows=request.files.filter(row=>row.path===original.source);if(rows.length!==1)fail('actual original source universe row missing');const proposal={span:nominalEditedNativeBodyRange(rows[0].source,original),body:emitNominalEditedRustBody(afterPlans[index])};bodyUnits+=proposal.body.length;bodyBytes+=Buffer.byteLength(proposal.body);if(bodyUnits>16777216||bodyBytes>16777216)fail('complete emitted native body corpus budget');if(!edits.has(original.source))edits.set(original.source,[]);edits.get(original.source).push(proposal);}
 const candidate={...request,files:[]},retained=incrementalNominalCopyCollectionOutput(candidate);
 for(const row of request.files){const proposals=edits.get(row.path);if(!proposals){retained.append(candidate.files,{...row});continue;}const parts=[];let units=0,bytes=0,last=0;const append=value=>{units+=value.length;bytes+=Buffer.byteLength(value);if(units>2097152||bytes>8388608)fail('complete changed native file source bound');parts.push(value);};for(const edit of proposals.sort((left,right)=>left.span.start-right.span.start)){if(edit.span.start<last)fail('whole original native body edits overlap');append(row.source.slice(last,edit.span.start));append(edit.body);last=edit.span.end;}append(row.source.slice(last));retained.append(candidate.files,{...row,source:parts.join('')});}return candidate;
}
export function translateEditedNominalTarget(value,configuration){
 const request=requestData(value),edit=selectionData(configuration,request.entry);
 return withNominalEditedInstalledSources(()=>withNominalEditedOperation(()=>{
  let before,beforePlans,afterPlans,candidate,after,checkedPlans,canonical;const run=createRulePipeline([{phase:'language',rules:[{id:'nominal-edit:whole-original-source-owner-and-authoritative-native-TS-leaf-binding',apply:()=>{
  before=compileNominalEditedProject(request);beforePlans=plansFor(before,edit.qualifiedNames);const expected=edit.language==='JavaScript'?before.javascript:before.typescript;
  const syntax=selectAuthoritativeNominalEdits({...edit,expected,plans:beforePlans});afterPlans=beforePlans.map(plan=>{const rows=syntax.functions.filter(row=>row.qualifiedName===plan.qualifiedName);if(rows.length!==1)fail('complete edited function census differs');return editedNominalShape(plan,rows[0].leaves);});
  if(beforePlans.every((plan,index)=>sameNominalEditedShape(plan,afterPlans[index])))fail('a real checked native semantic value/branch change is required');
  candidate=substitutedRequest(request,beforePlans,afterPlans);return candidate;
 }},{id:'nominal-edit:complete-changed-native-private-type-owner-IR-and-exact-target-reissue',apply:()=>{
  after=compileNominalEditedProject(candidate);checkedPlans=plansFor(after,edit.qualifiedNames);
  for(let index=0;index<afterPlans.length;index++)if(!sameNominalEditedShape(afterPlans[index],checkedPlans[index]))fail('complete newly parsed native owner/type/operation/ownership shape differs');
  // Emit AGAIN from the freshly checked changed native function snapshots.
  // Candidate tags never become output-native authority by themselves.
  canonical=substitutedRequest(request,beforePlans,checkedPlans);if(!isDeepStrictEqual(canonical,candidate))fail('canonical native body emitted from fresh checked IR differs from the complete candidate universe');
  const authoritative=edit.language==='JavaScript'?after.javascript:after.typescript;if(authoritative!==edit.source)fail('complete authoritative edited target bytes were not exactly regenerated');
  return canonical;
 }}]},{phase:'repository',rules:[{id:'router:complete-changed-native-and-both-target-CST-equations-and-receiving-artifacts',apply:()=>{
  const result={schema:'actual-edited-nominal-target-checked-native-v1',entry:request.entry,language:edit.language,sourcePath:edit.sourcePath,source:edit.source,originalNativeSources:request.files,canonicalNativeSources:[],beforeMeta:before.meta,afterMeta:after.meta,javascript:after.javascript,typescript:after.typescript,beforePlans,checkedPlans,histories:[],...envelope,nativeSemanticBodyChanged:true,canonicalNativeFromFreshCheckedIR:true,authoritativeTargetExactlyReproduced:true,exactOriginalRestorationOnly:false,borrowedFilterSupported:false,sourceInstalled:true,nativeInstalled:false,sourceAuthority:false,semanticAuthority:false,productionPolicyAdmitted:false,runtimeExecuted:false,nativeExecuted:false,runtimeParity:false,wholeRouterSynchronization:false};
  const retained=incrementalNominalCopyCollectionOutput(result);
  for(let index=0;index<canonical.files.length;index++){const prior=request.files[index],row=canonical.files[index],history=transportConcreteSourceEquations([{before:prior.source,after:row.source,language:'Rust'}])[0];if(transportConcreteSyntaxMeta(history.afterMeta).source!==row.source||history.inverse!==prior.source)fail('complete changed native CST/source inverse differs');retained.append(result.canonicalNativeSources,{...row,concreteSyntax:history.afterMeta});retained.append(result.histories,{path:row.path,...history});}
  for(const language of ['JavaScript','TypeScript']){const prior=language==='JavaScript'?before.javascript:before.typescript,next=language==='JavaScript'?after.javascript:after.typescript,history=transportConcreteSourceEquations([{before:prior,after:next,language}])[0];if(history.inverse!==prior||transportConcreteSyntaxMeta(history.afterMeta).source!==next)fail('complete changed target CST/source inverse differs');retained.append(result.histories,{path:request.entry.slice(0,-3)+(language==='JavaScript'?'.mjs':'.mts'),...history});}
  accountPrimitiveVectorIteratorBulkData(result);return result;
 }}]}]).run(null);const output={...run.value,ruleTrace:run.trace};accountPrimitiveVectorIteratorBulkData(output);return output;
 },noteNominalEditedSourceFailure));
}
export function prepareNominalEditedTarget(value,qualifiedNames){
 const request=requestData(value);accountPrimitiveVectorIteratorBulkData(qualifiedNames);if(!Array.isArray(qualifiedNames)||!qualifiedNames.length||qualifiedNames.length>128||qualifiedNames.some(name=>typeof name!=='string')||new Set(qualifiedNames).size!==qualifiedNames.length)fail('bounded unique whole original function selections required');
 return withNominalEditedInstalledSources(()=>withNominalEditedOperation(()=>{const result=compileNominalEditedProject(request),plans=plansFor(result,qualifiedNames),output={schema:'fresh-owned-nominal-map-forward-target-v1',entry:request.entry,originalNativeSources:request.files,meta:result.meta,javascript:result.javascript,typescript:result.typescript,plans,...envelope,sourceInstalled:true,nativeInstalled:false,sourceAuthority:false,semanticAuthority:false,productionPolicyAdmitted:false,runtimeExecuted:false,nativeExecuted:false,runtimeParity:false};accountPrimitiveVectorIteratorBulkData(output);return output;},noteNominalEditedSourceFailure));
}
export function readEditedNominalTargetMeta(value,configuration,meta){accountPrimitiveVectorIteratorBulkData(meta);const fresh=translateEditedNominalTarget(value,configuration);if(!isDeepStrictEqual(fresh.afterMeta,meta))fail('submitted edited nominal meta differs from complete fresh native source reissue');return fresh;}
