// Narrow complete typed-source DATA selector/emitter. Submitted DATA cannot
// qualify itself: the facade recompiles both source universes before replay.
import {isDeepStrictEqual} from 'node:util';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {sameType} from './checked-types.mjs';
export {nominalEditedNativeBodyRange as aggregateNativeBodyRange} from './nominal-edited-target-20261101-ir.mjs';
const fail=message=>{throw new TypeError('Copied record source IR: '+message);};
const keywords=new Set('as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while abstract become box do final macro override priv typeof unsized virtual yield try union gen'.split(' '));
const ident=value=>typeof value==='string'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(value)&&value!=='_'&&!keywords.has(value);
const owned=type=>type&&!type.rustReference&&!type.rustOwnership&&!type.patternOwnershipRefusal&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved;
function typeShape(type,depth=0){
 if(!type||depth>160||!['array','data','fixed','bool'].includes(type.kind))fail('complete bounded parameter/result/field type required');
 const shape={kind:type.kind,reference:type.rustReference?{kind:type.rustReference.kind,pointee:typeShape(type.rustReference.pointee,depth+1)}:null,ownership:type.rustOwnership?{kind:type.rustOwnership.kind,source:type.rustOwnership.source}:null,patternOwnershipRefusal:type.patternOwnershipRefusal??null,genericIdentityUnresolved:type.rustGenericIdentityUnresolved??false,borrowingUnresolved:type.rustBorrowingUnresolved??false,lifetime:type.rustBorrowLifetime?{kind:type.rustBorrowLifetime.kind,source:type.rustBorrowLifetime.source}:null};
 if(type.kind==='data')shape.name=type.name;if(type.kind==='array')shape.element=typeShape(type.element,depth+1);if(type.kind==='fixed')Object.assign(shape,{bits:type.bits,signed:type.signed,rustPrimitiveName:type.rustPrimitiveName});return shape;
}
export function selectAggregateCopyFunction(sourceSnapshot,targetSnapshot,receipts){
 accountData({sourceSnapshot,targetSnapshot,receipts});const entry=sourceSnapshot?.declaration;
 if(sourceSnapshot?.schema!=='original-checked-executable-source-v1'||entry?.k!=='fn'||entry.constant||entry.constFunction||entry.async||entry.generated||entry.params?.length!==1||!ident(entry.params[0].name)||entry.fullName!==sourceSnapshot.qualifiedName||targetSnapshot?.schema!=='original-checked-project-target-binding-v1'||targetSnapshot.qualifiedName!==entry.fullName||targetSnapshot.source!==sourceSnapshot.source||!ident(targetSnapshot.javascriptName)||receipts?.checkedProgramPasses<1)fail('fresh complete original function/source/target and genuine program observations required');
 const param=entry.params[0],input=param.type,element=input?.element,reference=input?.rustReference;
 if(input?.kind!=='array'||input.rustFixedArray||input.rustOwnership?.kind!=='borrowed'||input.rustOwnership.source!=='slice'||reference?.kind!=='shared'||reference.pointee?.kind!=='array'||reference.pointee.rustReference||element?.kind!=='data'||!owned(element)||!sameType(reference.pointee.element,element))fail('one actual shared slice of owned original record values required');
 const owners=receipts.owners.filter(row=>row.name===element.name&&row.record===true);if(owners.length!==1||owners[0].constructors.length!==1)fail('one genuine recursive original Copy record layout observation required');const owner=owners[0];
 const ret=entry.ret;if(ret?.kind!=='array'||ret.rustReference||ret.rustFixedArray||ret.rustOwnership?.kind!=='owned'||ret.rustOwnership.source!=='Vec'||!owned(ret.element))fail('one actual owned Vec return required');
 const collect=entry.body;if(collect?.k!=='routerIteratorOperation'||collect.op!=='collect'||collect.args?.length!==0)fail('ENTIRE original body must be the selected slice iterator collection');
 const map=collect.object?.op==='map'?collect.object:null,iter=map?map.object:collect.object;
 if(iter?.k!=='routerIteratorOperation'||iter.op!=='iter'||iter.args?.length!==0||iter.object?.k!=='var'||iter.object.name!==param.name||iter.sourceIteratorProof?.operation!=='iter'||iter.sourceIteratorProof.borrowed!==true||iter.sourceIteratorCopy?.operation!=='copied'||iter.sourceIteratorCopy.profile!=='rust-1.89-scalar-iterator-items'||!sameType(iter.type?.element,element)||!sameType(iter.sourceIteratorCopy.itemType?.rustReference?.pointee,element))fail('one complete original slice.iter().copied() receiver required; cloned/borrowed moves stay refused');
 let callback=null,kind='identity';if(map){
  const transform=map.args?.[0],binding=transform?.binding,field=binding?.body;
  if(map.k!=='routerIteratorOperation'||map.args.length!==1||transform?.k!=='routerLambda'||transform.arity!==1||transform.type?.kind!=='routerCallback'||binding?.k!=='let'||!ident(binding.name)||binding.value?.k!=='routerLambdaInput'||binding.value.position!==0||!sameType(binding.value.type,element)||field?.k!=='routerField'||field.sharedProjectionProof||field.object?.k!=='var'||field.object.name!==binding.name||!sameType(field.object.type,element)||!ident(field.field)||!sameType(field.type,map.type?.element)||!sameType(field.type,ret.element))fail('ENTIRE capture-free callback must be one owned checked actual field projection');
  const actual=owner.constructors[0].fields.find(row=>row.name===field.field);if(!actual||!sameType(actual.type,field.type))fail('owned field result disagrees with original qualified layout');kind='field';callback={binder:binding.name,field:field.field,result:typeShape(field.type)};
 }else if(!sameType(ret.element,element))fail('copied identity must collect the same exact record owner');
 const fields=owner.constructors[0].fields.map(row=>({name:row.name,type:typeShape(row.type)}));if(fields.some(row=>!ident(row.name)))fail('raw/foreign field spellings require a separate source profile');
 const result={schema:'whole-original-copied-record-source-shape-v1',qualifiedName:entry.fullName,source:sourceSnapshot.source,span:{...sourceSnapshot.span},target:targetSnapshot.javascriptName,owner:element.name,originalOwner:owner.originalName,kind,input:{name:param.name},fields,callback,types:{parameter:typeShape(input),result:typeShape(ret),copiedItem:typeShape(iter.type.element),mappedItem:typeShape(map?map.type.element:element),collected:typeShape(collect.type)},recursiveOwners:receipts.owners,sourceAuthority:false,semanticAuthority:false};accountData(result);return result;
}
export function editAggregateField(plan,field){
 accountData({plan,field});if(plan.kind!=='field'||!ident(field)||field===plan.callback.field)fail('a real actual owned field-name change is required');const actual=plan.fields.find(row=>row.name===field);if(!actual||!isDeepStrictEqual(actual.type,plan.callback.result))fail('edited field must have the same complete checked type/ownership/primitive identity');return {...structuredClone(plan),callback:{...structuredClone(plan.callback),field}};
}
export function emitAggregateNativeBody(plan){
 accountData(plan);if(!ident(plan.input?.name)||!['identity','field'].includes(plan.kind))fail('closed original pipeline shape required');let source='{\n    '+plan.input.name+'.iter().copied()';if(plan.kind==='field'){if(!ident(plan.callback?.binder)||!ident(plan.callback.field)||!plan.fields.some(row=>row.name===plan.callback.field))fail('actual owned field source spelling required');source+='.map(|'+plan.callback.binder+'| '+plan.callback.binder+'.'+plan.callback.field+')';}return source+'.collect()\n}';
}
export function sameAggregateShape(left,right){
 accountData({left,right});const shape=plan=>({qualifiedName:plan.qualifiedName,owner:plan.owner,originalOwner:plan.originalOwner,kind:plan.kind,input:plan.input,fields:plan.fields,callback:plan.callback,types:plan.types,recursiveOwners:plan.recursiveOwners});return isDeepStrictEqual(shape(left),shape(right));
}
