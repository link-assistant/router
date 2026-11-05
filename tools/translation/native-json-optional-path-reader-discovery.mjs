// Automatic lexical source-adoption proposals only. Counts are not coverage.
import {types} from 'node:util';
import {posix} from 'node:path';
import {sourceItems} from './rust-structure.mjs';
import {proposeNativeJsonOptionalPathReader} from './native-json-optional-path-reader-proposals.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {originalLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';

const fail=message=>{throw new TypeError('Native optional reader discovery: '+message);};
function guard(){if(!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged()||!originalLexingIntrinsicsUnchanged())fail('original source host changed');}
function inputs(value){
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('ordinary dense source batch required');
 const length=Object.getOwnPropertyDescriptor(value,'length');if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<1||length.value>32||Reflect.ownKeys(value).length!==length.value+1)fail('one through 32 complete modules required');
 const rows=[],seen=new Set();let bytes=0;
 for(let index=0;index<length.value;index++){
  const field=Object.getOwnPropertyDescriptor(value,String(index));if(!field||!Object.hasOwn(field,'value')||!field.enumerable)fail('source batch holes/accessors forbidden');const row=field.value;
  if(!row||typeof row!=='object'||types.isProxy(row)||Object.getPrototypeOf(row)!==Object.prototype)fail('ordinary complete source row required');const keys=Reflect.ownKeys(row);if(keys.length!==2||!keys.includes('path')||!keys.includes('source'))fail('exact source path/source fields required');
  const fields=Object.getOwnPropertyDescriptors(row);for(const name of ['path','source'])if(!Object.hasOwn(fields[name],'value')||!fields[name].enumerable)fail('source row accessors forbidden');const path=fields.path.value,source=fields.source.value;
  if(typeof path!=='string'||path.length>4096||!path.endsWith('.rs')||posix.isAbsolute(path)||path.includes('\\')||/[\x00-\x1f:]/u.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..')||seen.has(path))fail('unique canonical native source path required');
  if(typeof source!=='string'||source.length>2097152||Buffer.byteLength(source)>2097152||source.split('\n').length-(source.endsWith('\n')?1:0)>=1000)fail('complete source byte/line bound');bytes+=Buffer.byteLength(source);if(bytes>8388608)fail('aggregate original source byte bound');seen.add(path);rows.push({path,before:source,after:source});
 }return rows;
}
function units(value,limit){const pending=[{value,depth:0}];let cells=0,text=0;while(pending.length){const row=pending.pop();if(++cells>200000||row.depth>192)fail('retained source metadata cell/depth bound');if(typeof row.value==='string'){text+=row.value.length;if(text>limit)fail('retained source metadata text bound');}else if(row.value&&typeof row.value==='object')for(const child of Object.values(row.value))pending.push({value:child,depth:row.depth+1});}return text;}
function refusal(error){
 // Only the two constructors' explicit unsupported-source errors are reportable.
 // CST/parser/host/resource failures remain fatal instead of disappearing into
 // a reassuring unsupported count. No caller-supplied proposer is invoked.
 if(!(error instanceof TypeError))throw error;const message=Object.getOwnPropertyDescriptor(error,'message');if(!message||!Object.hasOwn(message,'value')||typeof message.value!=='string')throw error;const text=message.value;
 if(!['Native optional JSON reader: ','Native literal JSON paths: '].some(prefix=>text.startsWith(prefix))||/host changed|budget|bound|exceeds|metadata|inverse differs|census differs|prefix changed/u.test(text))throw error;
 return text;
}
function candidate(item){
 if(item.term!=='fn'||typeof item.name!=='string'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(item.name))return false;
 const tokens=item.tokens.filter(token=>token.type!=='comment'),member=name=>tokens.some((token,index)=>token.text===name&&tokens[index-1]?.text==='.'&&tokens[index+1]?.text==='(');
 return member('find_map')&&member('try_fold')&&tokens.some((token,index)=>token.text==='from_str'&&tokens[index-1]?.text==='::'&&tokens[index-2]?.text==='serde_json');
}

/** Discover and compose complete modules in original module/function order.
 * Original-item coordinates and current-step coordinates are retained apart.
 * This produces no semantic permit and never writes a source file.
 */
export function proposeNativeJsonOptionalPathReaderDiscovery(input){
 guard();const files=inputs(input),steps=[],observations=[];let inventory=0,attempts=0,retained=0;
 const run=createRulePipeline([{phase:'language',rules:[{id:'language:discover-ordinary-optional-json-reader-source-shapes-and-compose-supported-rule-pipelines',apply:()=>{
  for(const file of files){const items=sourceItems(file.before);inventory+=items.length;if(inventory>4096)fail('complete original item inventory bound');for(const item of items){if(!candidate(item))continue;if(++attempts>128)fail('selected reader candidate bound');const observation={sourcePath:file.path,function:item.name,originalSpan:[item.start,item.end],coordinates:'original-supplied-module',status:'unsupported-source',sourceAuthority:false,semanticAuthority:false};let proposal;
   try{proposal=proposeNativeJsonOptionalPathReader(file.after,{sourcePath:file.path,function:item.name});}catch(error){const message=refusal(error);observations.push({...observation,message});continue;}
   retained+=proposal.metadataTextUnits;if(retained>33554432)fail('aggregate composed source metadata bound');const currentItem=sourceItems(file.after).filter(row=>row.term==='fn'&&row.name===item.name);if(currentItem.length!==1)fail('current selected original item changed');
   observations.push({...observation,status:'source-proposed',step:steps.length,currentSpan:[currentItem[0].start,currentItem[0].end],currentCoordinates:'complete-step-input-module'});steps.push(proposal);file.after=proposal.files[0].after;
  }}return null;
 }}]},{phase:'repository',rules:[{id:'router:retain-complete-batch-originals-inverses-refusals-and-unqualified-installation-status',apply:()=>{
  const rows=files.map(file=>{const history=transportConcreteSourceEquations([{before:file.before,after:file.after,language:'Rust'}])[0];if(history.inverse!==file.before)fail('complete discovery source inverse differs');const row={...file,inverse:file.before,history};retained+=units(row,16777216);if(retained>33554432)fail('aggregate final complete source metadata bound');return row;});
  retained+=units(observations,16777216);if(retained>33554432)fail('aggregate observations/source metadata bound');guard();return {schema:'native-optional-json-path-reader-discovery-v1',files:rows,steps,observations,originalItems:inventory,lexicalCandidates:attempts,sourceProposals:steps.length,unsupportedCandidates:observations.filter(row=>row.status==='unsupported-source').length,changedFiles:rows.filter(row=>row.before!==row.after).length,metadataTextUnits:retained,sourceAuthority:false,semanticAuthority:false,namespaceAuthority:false,runtimeAuthority:false,requiresWholeOriginalSemanticReissue:true,originalBodyEquivalenceQualified:false,productionSelected:false,sourceInstalled:false,nativeInstalled:false,receivingQualified:false,runtimeParity:false,wholeRouterSynchronization:false,runtimeExecuted:false,rustExecuted:false,crossInvocationCache:false};
 }}]}]).run(null);return {...run.value,ruleTrace:run.trace};
}
