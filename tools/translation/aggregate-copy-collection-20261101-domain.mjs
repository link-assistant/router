// Copied-only finite original record domain. All checker/owner/program joins
// are private and invocation-local; returned receipt DATA issues no authority.
import {types} from 'node:util';
import {checkedOptionNominal,checkedNominalNoDrop} from './extensions/option-nominal-proof.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {metadataDigest} from './extensions/source-links.mjs';
import {sameType,rustFixedType} from './checked-types.mjs';
import {TranslationError,unsupported} from './vendor/meta-language/translation/diagnostics.js';
import {withCompleteSourceClosingFence,requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw new TypeError('Copied record collection domain: '+message);};
let active=null;
const owned=type=>type&&!type.rustReference&&!type.rustOwnership&&!type.patternOwnershipRefusal&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved;
function notify(frame,error){if(frame.sourceFailure)try{frame.sourceFailure(error);}catch{}}
function poison(frame,error){if(!(error instanceof TranslationError)){if(!frame.poisonFailed){frame.poisonFailed=true;frame.poison=error;}notify(frame,error);}}
export function withAggregateCopyCollectionOperation(run,sourceFailure=null){
 requireSynchronousSourceCallback(run);if(active||sourceFailure!==null&&(typeof sourceFailure!=='function'||types.isProxy(sourceFailure)||types.isAsyncFunction(sourceFailure)))fail('one synchronous operation and ordinary failure observer required');
 const frame={closers:[],checkers:new Map(),owners:new Map(),programs:new Set(),sourceFailure,poisonFailed:false,poison:undefined};active=frame;
 return withCompleteSourceClosingFence(()=>{try{const result=run();if(frame.poisonFailed)throw frame.poison;return result;}catch(error){poison(frame,error);throw error;}},[()=>{
  let failed=false,first;for(const check of frame.closers)try{check();}catch(error){if(!failed){failed=true;first=error;}}
  if(frame.poisonFailed)throw frame.poison;if(failed)throw first;
 },()=>{frame.closers.length=0;frame.checkers.clear();frame.owners.clear();frame.programs.clear();active=null;}]);
}
function join(checker,type,span){
 requireOriginalPrimitiveTryFromChecker(checker);const seen=new Set(),visiting=new Set(),layouts=[];let cells=0;
 function visit(current,depth){
  if(++cells>4096||depth>128||!owned(current))throw unsupported('record Copy field','requires bounded original by-value finite fields without references/ownership/generic uncertainty',span);
  if(current.kind==='bool')return;
  if(current.kind==='fixed'){const original=rustFixedType(current.rustPrimitiveName);if(!original||original.bits!==current.bits||original.signed!==current.signed)throw unsupported('record primitive Copy identity','requires the original actual primitive width/name',span);return;}
  if(current.kind!=='data')throw unsupported('record Copy field','only actual bool/fixed/unit-enum/record fields are admitted; String, arrays and generics remain refused',span);
  if(visiting.has(current.name))throw unsupported('record recursive layout','requires a finite original field graph',span);if(seen.has(current.name))return;
  const token=checkedOptionNominal(checker,current,span),entry=checker.items.get(current.name),layout=token.proof.layout;
  if(entry.standardGeneric||entry.generated&&entry.generated!=='router-project-flattened'||layout.standardGeneric||layout.tuple||!Array.isArray(layout.ctors)||!layout.ctors.length||layout.ctors.length>32)throw unsupported('record original nominal owner','requires ordinary nongeneric original record/unit owners',span);
  const record=layout.record===true&&layout.ctors.length===1,unit=!layout.record&&layout.ctors.every(ctor=>ctor.fields.length===0);
  if(!record&&!unit)throw unsupported('record nested nominal layout','payload enums and tuple records remain refused',span);
  visiting.add(current.name);try{for(const ctor of entry.ctors)for(const field of ctor.fields){if(!Array.isArray(field.rustTypeSyntax)||!field.rustTypeSyntax.length||field.rustTypeSyntax.some(part=>['&','*','[',']','<','>','dyn','impl'].includes(part)))throw unsupported('record original field source','requires exact nongeneric owned field syntax',span);visit(field.type,depth+1);}}finally{visiting.delete(current.name);}
  seen.add(current.name);layouts.push({name:current.name,originalName:layout.fullName,record,constructors:entry.ctors.map(ctor=>({name:ctor.name,fields:ctor.fields.map(field=>({name:field.name,type:structuredClone(field.type),rustTypeSyntax:[...field.rustTypeSyntax]}))})),sourceDerivedCopyClone:true,noDropCoherencePrivatelyRechecked:true,sourceAuthority:false,semanticAuthority:false});
 }
 if(type?.kind!=='data'||!checker.items.get(type.name)?.record)throw unsupported('record copied item','requires an actual checked record owner',span);visit(type,0);return layouts;
}
function retain(checker,type,span,extra=null){
 const frame=active;if(!frame)throw unsupported('record copied profile','requires the complete installed opt-in operation',span);
 const saved=structuredClone(type),extraDigest=extra?metadataDigest(extra):null;
 const check=()=>{try{if(extra&&metadataDigest(extra)!==extraDigest)fail('checked owned field callback changed');const rows=join(checker,saved,span);return rows;}catch(error){poison(frame,error);throw error;}};
 const rows=check();if(frame.closers.length>=4096)fail('bounded original record closing proof census required');frame.closers.push(check);
 if(!frame.checkers.has(checker))frame.checkers.set(checker,new Map());frame.checkers.get(checker).set(saved.name,{type:saved,check});
 for(const row of rows)frame.owners.set(row.name,row);return rows;
}
// New virtual iterator hook is selected by the actual checked record layout.
// The predecessor unit .copied/.cloned branch is left byte-exact.
export function copiedRecordIteratorItem(checker,element,span,operation){
 if(operation!=='copied')throw unsupported('record Iterator::cloned','a genuine Copy certificate does not issue executable derived Clone-body authority',span);
 const reference=element?.rustReference,pointee=reference?.pointee;
 if(reference?.kind!=='shared'||pointee?.kind!=='data'||!owned(pointee))throw unsupported('record copied item','requires actual shared reference items and their exact owned record pointee',span);
 retain(checker,pointee,span);return structuredClone(pointee);
}
export function checkedOwnedRecordFieldMap(checker,input,result,transform,span){
 if(!active||input?.kind!=='data'||!checker.items.get(input.name)?.record)return false;
 if(!owned(input)||!owned(result))throw unsupported('owned record field map','requires one genuine owned record and an owned field result',span);
 const binding=transform?.binding,field=binding?.body;
 if(transform?.k!=='routerLambda'||transform.arity!==1||transform.type?.kind!=='routerCallback'||binding?.k!=='let'||binding.value?.k!=='routerLambdaInput'||binding.value.position!==0||!sameType(binding.value.type,input)||field?.k!=='routerField'||field.object?.k!=='var'||field.object.name!==binding.name||!sameType(field.object.type,input)||field.sharedProjectionProof)throw unsupported('owned record field map','requires the entire capture-free callback to be one checked owned field projection',span);
 const entry=checker.items.get(input.name),actual=entry.ctors[0].fields.find(row=>row.name===field.field);
 if(!actual||!sameType(actual.type,result)||!sameType(field.type,result))throw unsupported('owned record field result','requires the exact original checked field type',span);
 checker.expectedOwnership(actual.type,result,[],span);checker.expectedPrimitiveIdentity(actual.type,result,[],span);retain(checker,input,span,transform);return true;
}
function validateWholeRecordPipeline(checker,entry,owners){
 let cells=0;const contains=(node,depth=0)=>{if(!node||typeof node!=='object')return false;if(++cells>100000||depth>160)fail('bounded complete copied-record function occurrence census required');if(node.sourceIteratorCopy?.itemType?.rustReference?.pointee?.kind==='data'&&owners.has(node.sourceIteratorCopy.itemType.rustReference.pointee.name))return true;return Object.entries(node).some(([key,value])=>!['type','sourceIteratorProof','sourceIteratorCopy'].includes(key)&&(Array.isArray(value)?value.some(child=>contains(child,depth+1)):contains(value,depth+1)));};
 if(!contains(entry.body))return;
 const param=entry.params?.[0],input=param?.type,collect=entry.body,map=collect?.object?.op==='map'?collect.object:null,iter=map?map.object:collect?.object;
 if(entry.k!=='fn'||entry.generated||entry.async||entry.constant||entry.constFunction||entry.params?.length!==1||input?.kind!=='array'||input.rustFixedArray||input.rustOwnership?.kind!=='borrowed'||input.rustOwnership.source!=='slice'||input.rustReference?.kind!=='shared'||input.rustReference.pointee?.kind!=='array'||!sameType(input.rustReference.pointee.element,input.element)||!owners.has(input.element?.name)||collect?.k!=='routerIteratorOperation'||collect.op!=='collect'||collect.args?.length!==0||iter?.k!=='routerIteratorOperation'||iter.op!=='iter'||iter.object?.k!=='var'||iter.object.name!==param.name||iter.args?.length!==0||iter.sourceIteratorProof?.operation!=='iter'||iter.sourceIteratorProof.borrowed!==true||iter.sourceIteratorCopy?.operation!=='copied'||!sameType(iter.type?.element,input.element)||entry.ret?.kind!=='array'||entry.ret.rustOwnership?.kind!=='owned'||entry.ret.rustOwnership.source!=='Vec'||entry.ret.rustReference||entry.ret.rustFixedArray)throw unsupported('whole record collection','only one complete shared-slice copied identity/owned-field collection function is supported',entry.span);
 if(map){if(map.k!=='routerIteratorOperation'||map.args?.length!==1||!checkedOwnedRecordFieldMap(checker,input.element,map.type.element,map.args[0],map.span)||!sameType(map.type.element,entry.ret.element))throw unsupported('whole owned record field collection','requires one complete actual owned-field callback',entry.span);}
 else if(!sameType(input.element,entry.ret.element))throw unsupported('whole copied record identity','requires exactly the original record result owner',entry.span);
}
export function finalizeAggregateCopyCollectionProgram(checker,program){
 if(!active)return;const entries=active.checkers.get(checker);if(!entries)return;
 for(const entry of program.declarations.values())if(entry.k==='fn')validateWholeRecordPipeline(checker,entry,entries);
 for(const row of entries.values()){row.check();if(!checkedNominalNoDrop(program,row.type))fail('fresh program lacks the genuine original recursive Copy/no-Drop record binding');}active.programs.add(program);
}
export function aggregateCopyCollectionReceipts(){
 if(!active)fail('receipt DATA is available only inside its synchronous source operation');const result={schema:'original-recursive-copy-record-observations-v1',owners:[...active.owners.values()],checkedProgramPasses:active.programs.size,sourceAuthority:false,semanticAuthority:false,recordClonedSupported:false,executableRecordCloneAdded:false};accountData(result);return structuredClone(result);
}
