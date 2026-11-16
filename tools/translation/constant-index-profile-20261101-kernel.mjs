// Original checked const-array formatter operands. SOURCE ONLY / UNRUN.
// Typed caller ownership, CTFE value evidence and final program acceptance are
// separate phases. No public proof flags, spelling table or saved meta issues
// any phase. Existing compiler/profile modules are NOT changed by this helper.
import {types,isDeepStrictEqual} from 'node:util';
import {fixedArrayCopyCells} from './extensions/fixed-arrays.mjs';
import {fixedArrayLength,rustFixedType} from './checked-types.mjs';
import {decodeRustInteger} from './extensions/rust-number.mjs';
import {evaluateCheckedConstant,CONSTANT_EVALUATION_PROFILE} from './extensions/constant-evaluation.mjs';
import {originalParsedDeclarationEvidence,originalParsedDeclarationSource,originalParsedSyntaxNode,checkedSourceContext,bindCheckedSourceLinks,checkedSourceEvidence,copyMetadata,metadataDigest} from './extensions/source-links.mjs';
import {capturedRustTokenSource} from './extensions/lexical.mjs';
import {withCurrentStandardCopySourceOperation} from './current-standard-copy-source.mjs';
import {withFixedWrappingSourceOperation} from './extensions/fixed-wrapping-source.mjs';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from './source-failure-operations.mjs';
import {serializeProgram} from './semantic-meta.mjs';
import {accountPrimitiveVectorIteratorBulkData as account} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {unsupported} from './vendor/meta-language/translation/diagnostics.js';
export function createOriginalConstantIndexFormatKernel(access){
const {originalProgram,requireChecker:requireOriginalPrimitiveTryFromChecker,collectProgram:checkCollectedDeclarationTypes,requireEmitter}=access;
let ACTIVE=null;
const need=(yes,message)=>{if(!yes)throw TypeError('Constant index formatter source: '+message);};
const reject=(message,node)=>{throw unsupported('constant indexed formatter',message,node?.span);};
const same=(a,b)=>metadataDigest(a)===metadataDigest(b),span=(a,b)=>a?.start===b?.start&&a?.end===b?.end;
const validate=run=>withSourceInputValidation(run);
function sourceData(value,budget={cells:100000},active=new Set(),depth=0){
 if(value===null||typeof value!=='object'){need(typeof value!=='function'&&typeof value!=='symbol','ordinary original source DATA required');return;}
 need(!types.isProxy(value)&&--budget.cells>=0&&depth<=160&&!active.has(value),'ordinary bounded acyclic original source DATA required');const prototype=Object.getPrototypeOf(value),fields=Object.getOwnPropertyDescriptors(value);
 need(Array.isArray(value)?prototype===Array.prototype:prototype===Object.prototype||prototype===null||prototype===Map.prototype,'ordinary original source DATA prototype required');
 if(prototype===Map.prototype){need(Reflect.ownKeys(fields).length===0,'original source Map cannot carry custom properties');active.add(value);try{Map.prototype.forEach.call(value,(child,key)=>{sourceData(key,budget,active,depth+1);sourceData(child,budget,active,depth+1);});}finally{active.delete(value);}return;}
 if(Array.isArray(value)){const length=fields.length;need(length&&Object.hasOwn(length,'value')&&Number.isSafeInteger(length.value)&&length.value>=0&&Reflect.ownKeys(fields).length===length.value+1,'dense original source array required');for(let index=0;index<length.value;index++)need(Object.hasOwn(fields,index),'dense original source array slots required');}
 active.add(value);try{for(const key of Reflect.ownKeys(fields)){need(typeof key==='string'&&Object.hasOwn(fields[key],'value'),'own original source DATA without accessors required');if(Array.isArray(value)&&key==='length')continue;sourceData(fields[key].value,budget,active,depth+1);}}finally{active.delete(value);}
}
function sourceItems(surface){need(surface&&typeof surface==='object'&&!types.isProxy(surface)&&[Object.prototype,null].includes(Object.getPrototypeOf(surface)),'ordinary original source surface required');sourceData(surface);const field=Object.getOwnPropertyDescriptor(surface,'items');need(field&&Object.hasOwn(field,'value')&&Array.isArray(field.value),'own original source item array required');return field.value;}
const skipped=new Set(['type','span','contract','formatProvenance','compatibilityCore','dynamicOwnedFormat','sourceDisplayScope','constantEvaluationProof','pinnedStandardBodyProof','sourceMethodProof','sourceParameterPatterns','sourceParameterPattern']);
function walk(node,visit,budget={cells:100000},depth=0){
 if(!node||typeof node!=='object')return;if(--budget.cells<0||depth>160)reject('original expression occurrence bound',node);
 visit(node);for(const [key,value] of Object.entries(node))if(!skipped.has(key))for(const child of Array.isArray(value)?value:[value])walk(child,visit,budget,depth+1);
}
function stateFor(checker){const state=ACTIVE?.current;need(state&&state.checker===checker&&state.checking,'actual owned checker invocation required');requireOriginalPrimitiveTryFromChecker(checker);return state;}
function borrowed(type){return type?.kind==='string'&&!type.rustReference&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved&&!type.patternOwnershipRefusal&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str';}
function arrayType(type,node){const length=fixedArrayLength(type);if(type?.kind!=='array'||length===null||type.rustReference||type.rustOwnership?.kind!=='value'||type.rustOwnership.source!=='array'||!borrowed(type.element))reject('actual Copy value array of source borrowed str required',node);fixedArrayCopyCells(type,node.span);return length;}
function usize(type,node){if(type?.kind!=='fixed'||type.bits!==64||type.signed!==false||type.rustPrimitiveName!=='usize'||type.rustOwnership||type.rustReference||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)reject('actual source usize identity required',node);}
function origin(owner,node){
 return validate(()=>{const evidence=originalParsedDeclarationEvidence(owner),link=originalParsedSyntaxNode(owner,node);need(evidence&&link?.actual===node&&same(node,link.relocated),'genuine unchanged parser parent/node required');const text=capturedRustTokenSource(link.parser.cursor.tokens)?.source;need(typeof text==='string'&&link.original.span?.start>=0&&link.original.span.end<=text.length,'complete original token source required');return {owner,evidence,link,text,snapshot:copyMetadata(node)};});
}
function currentOrigin(record){validate(()=>{const fresh=origin(record.owner,record.link.actual);need(fresh.link.parser===record.link.parser&&fresh.text===record.text&&same(fresh.evidence,record.evidence)&&same(fresh.snapshot,record.snapshot),'original complete declaration/expression changed');});}
function capture(surface){
 const owners=new Map(),constants=new Map(),candidates=new Map(),images=new Map();let cells=100000;
 function items(rows,path=[]){for(const item of rows){if(--cells<0)reject('complete original declaration bound',item);if(item.k==='module')items(item.items,[...path,item.name]);else if(item.k==='fn'&&originalParsedDeclarationEvidence(item)){const name=[...path,item.name].join('.'),source=originalParsedDeclarationSource(item);need(typeof source==='string','whole original declaration source required');owners.set(name,{item,path,source,evidence:originalParsedDeclarationEvidence(item),snapshot:copyMetadata(item)});if(item.constant||item.constFunction)constants.set(name,owners.get(name));}}}
 items(sourceItems(surface));
 for(const owner of owners.values()){const evidence=owner.evidence,image={sourceSha256:evidence.sourceSha256,sourceBytes:evidence.sourceBytes},prior=images.get(evidence.sourcePath);need(!prior||same(prior,image),'one genuine original source image per source path required');images.set(evidence.sourcePath,image);}
 // This worklist is DATA discovery, never a source/type permission. Only
 // lexically reachable genuine original const value-array declarations are
 // candidates. The actual checked callee/type/source joins below still decide
 // admission; unrelated local/parameter/runtime indexing stays with the old
 // checker. Import-alias candidate discovery is not added by this helper.
 function constCandidate(node,path){if(node?.k!=='name'||!Array.isArray(node.path))return null;const written=node.path[0]==='crate'?node.path.slice(1):node.path;
  const names=node.path[0]==='crate'?[written.join('.')]:Array.from({length:path.length+1},(_,index)=>[...path.slice(0,path.length-index),...written].join('.'));
  for(const name of names){const owner=owners.get(name);if(!owner)continue;return owner.item.constant&&owner.item.ret?.kind==='array'&&fixedArrayLength(owner.item.ret)!==null&&borrowed(owner.item.ret.element)?owner:null;}return null;
 }
 for(const [name,owner] of owners)walk(owner.item.body,node=>{
  if(node.k!=='routerFormat')return;let format=null;
  for(const argument of node.args){const index=argument.value;if(index?.k!=='routerIndex'||!constCandidate(index.object,owner.path))continue;if(!['num','name'].includes(index.index?.k))reject('selected original constant array requires a literal/constant index initially',index);
   format??=origin(owner.item,node);const source=origin(owner.item,index);candidates.set(index,{name,owner,format,source,raw:index});
  }
 });
 return {owners,constants,candidates};
}
function constant(state,name,node){const entry=state.checker.items.get(name),original=state.constants.get(name);if(!entry?.constant||entry.params?.length||!original)reject('actual zero-argument original const declaration required',node);validate(()=>{need(originalParsedDeclarationEvidence(original.item)&&same(original.item,original.snapshot)&&originalParsedDeclarationSource(original.item)===original.source,'constant original declaration changed');});return entry;}
function typedRead(state,candidate,checked){
 const checker=state.checker;currentOrigin(candidate.source);currentOrigin(candidate.format);
 if(checked?.k!=='index'||checked.array?.k!=='call'||checked.array.args.length)reject('actual checked fixed-array const read required',candidate.raw);
 const entry=constant(state,checked.array.fn,candidate.raw),length=arrayType(entry.ret,candidate.raw);if(!same(checked.array.type,entry.ret)||!borrowed(checked.type)||!same(checked.type,entry.ret.element))reject('constant array/read type join differs',candidate.raw);
 const wanted={...rustFixedType('usize'),rustSourceType:true},raw=candidate.raw.index;
 if(checked.index?.type?.kind!=='fixed'||checked.index.type.bits!==64||checked.index.type.signed!==false||checked.index.type.rustReference||checked.index.type.rustOwnership||![undefined,'usize'].includes(checked.index.type.rustPrimitiveName))reject('checked index has a different primitive representation',raw);
 if(raw.k==='num'){
  const source=candidate.source.link.original.index.span,token=decodeRustInteger(candidate.source.text.slice(source.start,source.end),source);if(token.suffix&&token.suffix!=='usize')reject('index literal has a different original primitive suffix',raw);
 }
 const index=checker.expr(raw,new Map(),candidate.owner.path,wanted);usize(index.type,raw);checker.expectedPrimitiveIdentity(index.type,wanted,candidate.owner.path,raw.span);
 if(index.k==='lit'){if(checked.index?.k!=='lit'||index.value!==checked.index.value)reject('literal source/index value differs',raw);}
 else if(index.k==='call'&&!index.args.length){const selected=constant(state,index.fn,raw);usize(selected.ret,raw);if(checked.index?.k!=='call'||checked.index.fn!==index.fn||checked.index.args.length)reject('index constant identity differs',raw);}
 else reject('runtime/local/computed index remains outside this profile',raw);
 return {candidate,node:checked,array:entry,index,length,snapshot:copyMetadata(checked)};
}
/** Future Host expression hook; returns null outside the owned invocation. */
function checkConstantIndexFormatOperand(checker,node,env,path,expected){
 const state=ACTIVE?.current,candidate=state?.candidates.get(node);if(!state?.checking||state.checker!==checker||!candidate)return null;
 requireOriginalPrimitiveTryFromChecker(checker);const array=checker.expr(node.object,env,path),index=checker.expr(node.index,env,path,{...rustFixedType('usize'),rustSourceType:true});
 const value={k:'index',array,index,type:array.type.element,span:node.span};checker.expectedOwnership(value.type,expected,path,node.span);checker.expectedPrimitiveIdentity(value.type,expected,path,node.span);state.records.set(value,typedRead(state,candidate,value));return value;
}
/** Syntax observation ONLY; never a value, emission or program permission. */
function hasCapturedConstantIndexFormatSyntax(checker,node){const state=ACTIVE?.current;return !!state?.checking&&state.checker===checker&&state.candidates.has(node);}
/** Formatter expression typing may inspect this fully checked ownership read;
 * it does not obtain a CTFE value or permission to publish a program. */
function hasTypedConstantIndexFormatRead(checker,node){if(!ACTIVE?.current?.checking||ACTIVE.current.checker!==checker)return false;const state=stateFor(checker),record=state.records.get(node);if(!record)return false;const current=typedRead(state,record.candidate,node);return same(current.snapshot,record.snapshot);}
/** Complete caller ownership footprint: no caller arguments, moves or loans.
 * Constant initialization/CTFE eligibility is a later mandatory obligation.
 * A flow consumer must still require borrowed-str Copy result and preserve the
 * surrounding expression order; this is not a 'pending => skip flow' switch. */
function constantIndexFormatOwnershipFootprint(checker,node,entry){
 const state=consumerState(checker);if(!state)return null;const record=state.records.get(node);if(!record)return null;
 if(checker.items.get(entry.fullName)!==entry||entry.fullName!==record.candidate.name||!span(entry.span,record.candidate.owner.item.span))reject('actual complete function owner differs',node);
 let present=false;walk(entry.body,child=>{if(child===node)present=true;});if(!present)reject('typed read must occur in the actual complete caller body',node);
 const current=typedRead(state,record.candidate,node);if(!same(current.snapshot,record.snapshot))reject('checked source index changed',node);
 state.flowObserved=true;return Object.freeze({kind:'copy-borrowed-str',callerArguments:Object.freeze([]),callerMoves:0,callerLoans:0,valueAvailable:false,semanticAuthority:false});
}
function scalarType(type){if(!type||type.rustReference||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)return false;if(type.kind==='array')return fixedArrayLength(type)!==null&&type.rustOwnership?.kind==='value'&&type.rustOwnership.source==='array'&&scalarType(type.element);if(type.kind==='string')return borrowed(type);return ['fixed','bool','unit'].includes(type.kind)&&!type.rustOwnership;}
function evaluate(state,program,links,name,cache){
 if(cache.has(name))return cache.get(name);const entry=program.declarations.get(name);if(!entry||!scalarType(entry.ret))reject('constant needs later nominal/reference/owned proofs',entry);
 const result=evaluateCheckedConstant(program,name,{sourceLinks:links});if(result.status!=='value')reject(result.diagnostic?.reason??'fresh const evaluation refused',entry);
 for(const resolution of result.proof.resolution){const actual=program.declarations.get(resolution.name),original=state.constants.get(resolution.name);if(!actual||!original||!scalarType(actual.ret)||actual.params.some(param=>!scalarType(param.type)))reject('constant dependency has no original scalar/Copy value source',actual??entry);validate(()=>{need(checkedSourceEvidence(links,actual)&&originalParsedDeclarationEvidence(original.item)&&same(original.item,original.snapshot),'genuine unchanged constant dependency source link required');});walk(actual.body,node=>{if(['routerHostCall','routerSharedArrayLiteral','routerStaticArrayElement','ctor'].includes(node.k))reject('host/data/shared-array dependencies need separate completed proofs',node);});}
 cache.set(name,result);return result;
}
function collectChecked(state,program){
 for(const candidate of state.candidates.values()){
  const owner=program.declarations.get(candidate.name);if(!owner?.body)reject('original formatter owner is not a complete checked function',candidate.raw);const found=[];
  walk(owner.body,node=>{if(node.k==='index'&&span(node.span,candidate.raw.span))found.push(node);});if(found.length!==1)reject('one exact checked index occurrence required',candidate.raw);
  const node=found[0],record=typedRead(state,candidate,node),prior=state.records.get(node);for(const [original,observed] of state.records)if(observed.candidate===candidate&&original!==node)reject('body-time typed index was replaced before complete program admission',node);if(prior&&!same(prior.snapshot,record.snapshot))reject('body-time typed index changed',node);state.records.set(node,record);
 }
}
function joinedDeclaration(state,program,links,name){
 const original=state.owners.get(name),actual=program.declarations.get(name);need(original&&actual&&actual.k==='fn'&&actual.fullName===name&&actual.name===original.item.name&&same(actual.modulePath,original.path),'complete actual original declaration name/module join required');
 const fresh=originalParsedDeclarationEvidence(original.item),checked=checkedSourceEvidence(links,actual);need(fresh&&checked&&same(fresh,original.evidence)&&same(original.item,original.snapshot)&&originalParsedDeclarationSource(original.item)===original.source,'complete original declaration syntax/source changed');
 const fields=Object.create(null);for(const key of Reflect.ownKeys(original.evidence)){need(typeof key==='string','original source evidence field must be named');const field=Object.getOwnPropertyDescriptor(checked,key);need(field&&Object.hasOwn(field,'value'),'complete checked original source evidence field missing');fields[key]=field.value;}
 need(same(fields,original.evidence),'complete original and checked declaration source/profile/span evidence differs');return actual;
}
function sourceLinks(state,program){return validate(()=>{requireOriginalPrimitiveTryFromChecker(state.checker);need(program.declarations===state.checker.items&&checkedSourceContext(program),'actual complete privately checked program required');const links=bindCheckedSourceLinks(program,checkedSourceContext(program),{targetProfile:CONSTANT_EVALUATION_PROFILE});for(const name of state.owners.keys())joinedDeclaration(state,program,links,name);return links;});}
function values(state,program){
 const links=sourceLinks(state,program),cache=new Map(),result=new Map();collectChecked(state,program);
 for(const [node,record] of state.records){const array=evaluate(state,program,links,record.array.fullName,cache);let index;if(record.index.k==='lit')index=BigInt(record.index.value);else{const value=evaluate(state,program,links,record.index.fn,cache);usize(program.declarations.get(record.index.fn).ret,node);index=BigInt(value.value.$integer);}
  if(!Array.isArray(array.value)||array.value.length!==record.length||index<0n||index>=BigInt(record.length))reject('constant array index is outside the checked fixed length',node);
  const value=array.value[Number(index)];if(typeof value!=='string'||/[\ud800-\udfff]/u.test(value))reject('constant cell is not checked scalar UTF8 text',node);
  result.set(node,{value,index:index.toString(),constant:record.array.fullName,length:record.length});
 }return result;
}
/** Proposed exact Host775 hook: before Root779, after super.program/context. */
function prepareConstantIndexFormatProgram(checker,program){
 if(!ACTIVE?.current?.checking||ACTIVE.current.checker!==checker)return program;
 const state=stateFor(checker);if(state.program&&state.program!==program)reject('one actual program per owned invocation',program);state.program=program;state.early=values(state,program);return program;
}
function bodySnapshot(program){return metadataDigest({schemaVersion:program.schemaVersion,sourceLanguage:program.sourceLanguage,items:program.items,main:program.main,declarations:[...program.declarations].map(([name,entry])=>[name,{k:entry.k,name:entry.name,fullName:entry.fullName,modulePath:entry.modulePath,span:entry.span,params:entry.params,ret:entry.ret,ctors:entry.ctors,body:entry.body,constant:entry.constant??false,constFunction:entry.constFunction??false}])});}
/** Proposed post798 hook; independent fresh value/source close, no IR edit. */
function sealConstantIndexFormatProgram(checker,program){
 if(!ACTIVE?.current?.checking||ACTIVE.current.checker!==checker)return program;
 const state=stateFor(checker);need(state.program===program&&state.early,'mandatory complete early source/CTFE rejoin required');const current=values(state,program);need(current.size===state.early.size,'complete checked index census changed');
 for(const [node,value] of current)need(same(value,state.early.get(node)),'fresh late constant cell differs');state.late=current;state.snapshot=bodySnapshot(program);ACTIVE.programs.set(program,state);return program;
}
function ownedCheck(checker,surface,collected,options){
 if(!ACTIVE)return collected?checkCollectedDeclarationTypes(checker,surface,options):Reflect.apply(originalProgram,checker,[surface]);
 need(!ACTIVE.current,'one owned checker invocation at a time');const captured=validate(()=>{need(checker&&!types.isProxy(checker),'ordinary actual original checker required');need(!Object.getOwnPropertyDescriptor(checker,'program'),'own checker.program override refused');requireOriginalPrimitiveTryFromChecker(checker);need(checker.program===originalProgram,'actual original guarded Host program method required');const field=Object.getOwnPropertyDescriptor(checker,'items');need(field&&Object.hasOwn(field,'value')&&field.value instanceof Map&&!types.isProxy(field.value)&&Object.getPrototypeOf(field.value)===Map.prototype&&field.value.size===0,'fresh original checker declaration map required');return capture(surface);}),state={...captured,checker,checking:true,program:null,records:new Map(),early:null,late:null,flowObserved:false,snapshot:null};ACTIVE.current=state;
 try{return withCurrentStandardCopySourceOperation(()=>withFixedWrappingSourceOperation(()=>{
  const program=collected?checkCollectedDeclarationTypes(checker,surface,options):Reflect.apply(originalProgram,checker,[surface]);
   need(state.program===program&&state.early&&state.late,'mandatory actual Host early and late seal hooks required before any return');ACTIVE.completed.add(state);return program;
 }));}finally{state.checking=false;ACTIVE.current=null;}
}
function checkConstantIndexFormatProgram(checker,surface){return ownedCheck(checker,surface,false,null);}
function checkConstantIndexFormatProjectProgram(checker,surface,options={}){return ownedCheck(checker,surface,true,options);}
function currentProgram(program){return validate(()=>{const state=ACTIVE?.programs.get(program);need(state?.late&&bodySnapshot(program)===state.snapshot,'actual unchanged late-sealed program required');if(!state.checking)need(state.completeSnapshot&&isDeepStrictEqual(wire(program),state.completeSnapshot),'complete configured Host program handoff required');sourceLinks(state,program);for(const candidate of state.candidates.values())currentOrigin(candidate.source);return state;});}
function requireConstantIndexFormatValue(node,program){return validate(()=>{const state=currentProgram(program),value=state.late.get(node);need(value&&same(node,state.records.get(node)?.snapshot),'actual sealed checked index node required');return value.value;});}
function describeConstantIndexFormatProgram(program){const state=currentProgram(program),cells=[];for(const [node,value] of state.late){const record=state.records.get(node);cells.push({...value,owner:record.candidate.name,sourcePath:record.candidate.source.evidence.sourcePath,indexSpan:copyMetadata(record.candidate.source.link.original.span),constantSource:state.constants.get(value.constant).source,wholeOriginalSource:record.candidate.source.text});}const result={schema:'constant-index-formatter-data-v1',cells,sourceAuthority:false,semanticAuthority:false,executionEvidence:'UNRUN'};account(result);return Object.freeze(result);}
function withConstantIndexFormatOperation(run){
 requireSynchronousSourceCallback(run);need(!ACTIVE,'one synchronous constant-index source operation required');const frame={current:null,programs:new WeakMap(),projections:new WeakMap(),completed:new Set(),projectOutputs:[],emitters:new Map()};
 return withSourceFailureOperation(()=>{ACTIVE=frame;try{return withCompleteSourceClosingFence(run,[()=>{let failed=false,primary;for(const state of frame.completed)try{currentProgram(state.program);const current=values(state,state.program);for(const [node,value] of current)need(same(value,state.late.get(node)),'constant value changed during final close');}catch(error){if(!failed){failed=true;primary=error;}}for(const [emitter,row]of frame.emitters)try{validate(()=>{requireEmitter(emitter);currentProjection(row.program);});}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;}]);}finally{frame.current=null;frame.completed.clear();frame.emitters.clear();frame.projectOutputs.length=0;ACTIVE=null;}});
}
function configured(program){if(!ACTIVE)return program;const state=ACTIVE.programs.get(program);need(state&&state.late&&!state.checking,'actual late-sealed Host handoff required');state.completeSnapshot=wire(program);account(state.completeSnapshot);return program;}
function consumerState(checker){const state=ACTIVE?.current;if(state?.checker===checker)return state;if(ACTIVE)for(const completed of ACTIVE.completed)if(completed.checker===checker)return completed;return null;}
function originalRead(checker,format,node){
 const state=consumerState(checker);if(!state)return false;requireOriginalPrimitiveTryFromChecker(checker);
 for(const candidate of state.candidates.values())if(candidate.source.link.original===node&&(candidate.format.link.original===format||candidate.format.link.original===format?.value)){currentOrigin(candidate.source);currentOrigin(candidate.format);return true;}return false;
}
function checkedRead(checker,node){const state=consumerState(checker),record=state?.records.get(node);if(!record)return false;requireOriginalPrimitiveTryFromChecker(checker);need(same(typedRead(state,record.candidate,node).snapshot,record.snapshot),'actual complete typed index changed');return true;}
function earlyRead(checker,node,entry){const state=consumerState(checker);if(!state?.records.has(node))return false;need(constantIndexFormatOwnershipFootprint(checker,node,entry),'actual whole constant ownership producer required');need(state.early?.has(node),'actual complete early CTFE/value witness required');sourceLinks(state,state.program);return true;}
function usesEntry(checker,entry){const state=consumerState(checker);if(!state)return false;let used=false;walk(entry.body,node=>{if(state.records.has(node)){need(constantIndexFormatOwnershipFootprint(checker,node,entry),'actual complete source index required');used=true;}});return used;}
function requireEntrySeal(checker,entry){const state=consumerState(checker);if(!usesEntry(checker,entry))return false;need(state?.late&&ACTIVE.programs.get(state.program)===state,'mandatory actual late source seal required');currentProgram(state.program);return true;}
const sourceEvidence=key=>['copyCertificate','sourceParameterPatterns','sourceParameterPattern','sourcePattern','constantEvaluationProof','deriveNamespaceProof','toolAttributeProof','jsonMacroProof','sourceMatchesProof','pinnedStandardBodyProof','sourceMethodProof','sourceDisplayScope','sourceBoolFromScope','defaultSourceProof','sourceConversionProof','sourceSharedPatternProof','sourcePatternProjectionProof','sourceSharedStringViewProof','cloneSourceProof','sourceConversionScope'].includes(key);
const wire=program=>JSON.parse(serializeProgram(program));
function currentProjection(program){return validate(()=>{const state=ACTIVE?.programs.get(program);if(state){currentProgram(program);return {state,native:program,names:new Map([...program.declarations.keys()].map(name=>[name,name])),values:state.late};}const row=ACTIVE?.projections.get(program);need(row&&isDeepStrictEqual(wire(program),row.snapshot),'actual complete current source projection required');currentProgram(row.native);return row;});}
function joinProjection(origin,projection,expected,transform,names){
 if(!ACTIVE)return projection;return validate(()=>{const prior=currentProjection(origin);need(isDeepStrictEqual(wire(projection),wire(expected)),'complete actual semantic source projection equation differs');const values=new Map();
  for(const [name,entry]of projection.declarations){const originalName=[...names].find(([,target])=>target===name)?.[0],nativeEntry=originalName&&prior.native.declarations.get(originalName);if(!nativeEntry)continue;const selected=[...prior.state.late].filter(([node])=>prior.state.records.get(node).candidate.name===originalName);for(const [node,value]of selected){const sourceNodes=[];walk(origin.declarations.get(prior.names.get(originalName))?.body,child=>{if(prior.values.get(child)===value&&span(child.span,node.span))sourceNodes.push(child);});need(sourceNodes.length===1,'exact current source index relation required');const matches=[];walk(entry.body,child=>{if(child.k==='index'&&span(child.span,node.span)&&same(child,transform(sourceNodes[0])))matches.push(child);});need(matches.length===1,'one complete actual projected index per original source occurrence required');values.set(matches[0],value);}}
  const row={state:prior.state,native:prior.native,names,values,snapshot:wire(projection)};account({snapshot:row.snapshot});ACTIVE.projections.set(projection,row);return projection;
 });
}
function joinConstantIndexFormatRoundTrip(origin,projection){if(!ACTIVE)return projection;const prior=currentProjection(origin);return joinProjection(origin,projection,origin,node=>node,new Map(prior.names));}
function flattenVisit(node,names,budget={cells:200000},depth=0){need(--budget.cells>=0&&depth<=160,'complete bounded project flatten equation required');if(Array.isArray(node))return node.map(value=>flattenVisit(value,names,budget,depth+1));if(!node||typeof node!=='object')return node;const result=Object.fromEntries(Object.entries(node).map(([key,value])=>[key,sourceEvidence(key)?value:flattenVisit(value,names,budget,depth+1)]));if(node.kind==='data'&&names.has(node.name))result.name=names.get(node.name);if(node.kind==='named'&&Array.isArray(node.path)){const owner=node.path.filter((part,index)=>index!==0||part!=='crate').join('.');if(names.has(owner))result.path=['crate',names.get(owner)];}if(['call','routerFutureCall'].includes(node.k))result.fn=names.get(node.fn)??node.fn;if(['ctor','routerPatternTag'].includes(node.k))result.data=names.get(node.data)??node.data;return result;}
function joinProjectFlatten(origin,projection){if(!ACTIVE)return projection;const prior=currentProjection(origin),names=new Map([...origin.declarations.keys()].map(name=>[name,'rp_'+Buffer.from(name).toString('hex')])),visit=node=>flattenVisit(node,names),declarations=new Map([...origin.declarations].map(([name,entry])=>{const target=names.get(name);return [target,{...visit(entry),name:target,fullName:target,modulePath:[],generated:'router-project-flattened'}];})),expected={...origin,declarations,items:[...declarations.values()]},joined=new Map([...prior.names].map(([native,current])=>[native,names.get(current)]));return joinProjection(origin,projection,expected,visit,joined);}
function joinDeclarationProgram(origin,root,projection){if(!ACTIVE)return projection;const prior=currentProjection(origin),needed=new Set();let cells=200000;function visit(node,depth=0){if(!node||typeof node!=='object')return;need(--cells>=0&&depth<=160,'complete bounded project dependency equation required');const link=['call','routerFutureCall'].includes(node.k)?'fn':node.k==='ctor'?'data':node.kind==='data'?'name':null;if(link)include(node[link]);for(const [key,value]of Object.entries(node))if(!sourceEvidence(key))for(const child of Array.isArray(value)?value:[value])visit(child,depth+1);}function include(name){if(needed.has(name))return;const entry=origin.declarations.get(name);need(entry,'complete original declaration dependency missing');needed.add(name);visit(entry);}include(root);const declarations=new Map([...origin.declarations].filter(([name])=>needed.has(name))),expected={...origin,declarations,items:[...declarations.values()],main:null},names=new Map([...prior.names].filter(([,name])=>needed.has(name)));return joinProjection(origin,projection,expected,node=>node,names);}
function requireProjectedConstantIndexFormatValue(node,program){return validate(()=>{const projection=currentProjection(program),value=projection.values.get(node);need(value,'actual live source-projected constant index required');return value.value;});}
function emissionSignature(emitter,entry,original){if(!ACTIVE)return false;const row=currentProjection(emitter.program);need(emitter.program.declarations.get(entry.fullName)===entry,'actual emitter declaration owner required');const native=[...row.names].find(([,name])=>name===entry.fullName)?.[0];if(!native||row.native.declarations.get(native)!==original)return false;return requireEntrySeal(row.state.checker,original);}
function captureEmitter(emitter,program){if(!ACTIVE)return;validate(()=>{currentProjection(program);requireEmitter(emitter);need(emitter.program===program&&!ACTIVE.emitters.has(emitter),'one actual original Host emitter birth required');ACTIVE.emitters.set(emitter,{program,result:null});});}
function captureEmissionResult(emitter,result){if(!ACTIVE)return;validate(()=>{const row=ACTIVE.emitters.get(emitter);need(row&&row.program===emitter.program,'actual private Host emitter instance required');requireEmitter(emitter);currentProjection(row.program);row.result=copyMetadata({text:result.text,mappings:result.mappings});account(row.result);});}
function withEmission(emitter,entry,run){requireSynchronousSourceCallback(run);if(!ACTIVE)return run();const capture=ACTIVE.emitters.get(emitter);need(capture&&capture.program===emitter.program,'actual private Host emission invocation required');requireEmitter(emitter);const row=currentProjection(emitter.program);need(emitter.program.declarations.get(entry.fullName)===entry,'actual emission entry required');const snapshot=wire(emitter.program);return withCompleteSourceClosingFence(run,[()=>validate(()=>{requireEmitter(emitter);currentProjection(emitter.program);need(isDeepStrictEqual(wire(emitter.program),snapshot),'complete source projection changed during emission');})]);}

function literalCells(constant){const body=constant.item.body;if(body?.k!=='array'||!body.sourceFixedArrayLiteral)return [];const result=[],offset=constant.evidence.sourceOffset;need(Number.isSafeInteger(offset)&&offset>=0,'actual original file/module source offset required');for(const [ordinal,item]of body.items.entries()){const raw=item.value;if(item.spread||raw?.k!=='str')return [];const source=origin(constant.item,raw),range=source.link.original.span;result.push({ordinal,value:raw.value,span:{start:raw.span.start-offset,end:raw.span.end-offset},source:source.text.slice(range.start,range.end)});}return result;}
function captureProjectOutput(program,emitted,javascript,typescript){if(!ACTIVE)return;const row=currentProjection(program),births=[...ACTIVE.emitters].filter(([emitter,record])=>record.program===program&&record.result&&record.result.text===emitted.text&&isDeepStrictEqual(record.result.mappings,emitted.mappings));need(births.length===1,'actual completed private Host emitter/source mapping required');requireEmitter(births[0][0]);const cells=[];for(const [node,value]of row.state.late){const record=row.state.records.get(node),constant=row.state.constants.get(value.constant),entry=row.native.declarations.get(value.constant),targetName=row.names.get(value.constant),binding=emitted.mappings.filter(mapping=>mapping.source===targetName),ownerBinding=emitted.mappings.filter(mapping=>mapping.source===row.names.get(record.candidate.name));need(binding.length===1&&ownerBinding.length===1&&typeof binding[0].target==='string'&&typeof ownerBinding[0].target==='string','actual complete constant/caller emitter mappings required');const offset=record.candidate.source.evidence.sourceOffset;need(Number.isSafeInteger(offset)&&offset>=0,'actual original use-site source offset required');cells.push({...value,owner:record.candidate.name,constName:value.constant,source:constant.evidence.sourcePath,sourceEvidence:copyMetadata(constant.evidence),constantDeclaration:constant.source,constantSyntax:copyMetadata(constant.item),constantChecked:copyMetadata(entry),nativeCells:literalCells(constant),targetFunction:binding[0].target,ownerTargetFunction:ownerBinding[0].target,literalIndex:record.candidate.raw.index.k==='num',indexSource:record.candidate.source.text.slice(record.candidate.source.link.original.index.span.start,record.candidate.source.link.original.index.span.end),indexNativeSpan:{start:record.candidate.raw.index.span.start-offset,end:record.candidate.raw.index.span.end-offset},indexSpan:copyMetadata(record.candidate.source.link.original.index.span),indexOriginalSourcePath:record.candidate.source.evidence.sourcePath,sourceAuthority:false,semanticAuthority:false});}const result={schema:'actual-sealed-constant-index-project-data-v1',cells,javascript,typescript,sourceAuthority:false,semanticAuthority:false};account(result);ACTIVE.projectOutputs.push({program,record:row,result});}
function projectOutputData(javascript,typescript){need(ACTIVE,'actual constant source operation required');const rows=ACTIVE.projectOutputs.filter(row=>row.result.javascript===javascript&&row.result.typescript===typescript);need(rows.length===1,'one actual complete project output required');currentProjection(rows[0].program);account(rows[0].result);return copyMetadata(rows[0].result);}
return Object.freeze({configured,captureEmitter,captureEmissionResult,withOperation:withConstantIndexFormatOperation,checkProgram:checkConstantIndexFormatProgram,checkProjectProgram:checkConstantIndexFormatProjectProgram,checkOperand:checkConstantIndexFormatOperand,originalRead,checkedRead,ownershipFootprint:constantIndexFormatOwnershipFootprint,earlyRead,usesEntry,requireEntrySeal,prepare:prepareConstantIndexFormatProgram,seal:sealConstantIndexFormatProgram,roundTrip:joinConstantIndexFormatRoundTrip,flatten:joinProjectFlatten,declaration:joinDeclarationProgram,projectedValue:requireProjectedConstantIndexFormatValue,emissionSignature,withEmission,captureProjectOutput,projectOutputData,describe:describeConstantIndexFormatProgram});
}
