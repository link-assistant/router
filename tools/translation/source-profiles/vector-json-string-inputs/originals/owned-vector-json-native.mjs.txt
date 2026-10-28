// DATA checks reached only from a fresh actual checkedSource()/lower() join.
// Neither this helper nor a serialized copy is a native type/owner issuer.
import {JSON_DATA} from '../extensions/json-contracts.mjs';
import {sameType} from '../checked-types.mjs';
const fail=message=>{throw new TypeError('Owned reverse JSON vector native ABI: '+message);};
const flattened=name=>'rp_'+Buffer.from(name).toString('hex');
const clean=type=>type&&!type.rustReference&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved;
export function originalJsonVectorDomain(own,lowered){
 if(own.ret?.element?.kind!=='data')return null;
 const program=lowered?.program,actual=lowered?.own;
 if(!(program?.declarations instanceof Map)||actual?.k!=='fn'||actual.params.length!==own.params.length||actual.ret?.kind!=='array'||actual.ret.element?.kind!=='data')fail('fresh complete actual lowerer program required');
 const owners=new Map(),wanted=new Map(JSON_DATA[0].items.filter(row=>row.k==='data').map(row=>[row.name,row]));let cells=0;
 function type(a,b,depth=0){
  if(++cells>4096||depth>32||!clean(a)||!clean(b))fail('bounded resolved canonical layout required');
  if(a.kind==='named'){const name=a.path.filter((part,index)=>index!==0||part!=='crate').join('.');if(!program.declarations.has(name))fail('unresolved lowered canonical field');a={...a,kind:'data',name};delete a.path;}
  if(b.kind==='named'){
   const path=b.path.filter((part,index)=>index!==0||part!=='crate'),name=path.at(-1);
   if(path.length!==2||path[0]!=='serde_json'||a.kind!=='data'||a.rustOwnership||a.patternOwnershipRefusal||!wanted.has(name))fail('actual canonical JSON owner required');
   owner(a.name,name,depth+1);return;
  }
  if(a.kind!==b.kind||b.kind!=='array'&&!sameType(a,b))fail('canonical primitive/storage layout differs');
  for(const key of ['rustOwnership','patternOwnershipRefusal','rustPrimitiveName','rustSourceType','rustStandardSignature','rustFixedArray'])if(JSON.stringify(a[key])!==JSON.stringify(b[key]))fail('canonical source primitive/ownership identity differs');
  if(b.kind==='array')type(a.element,b.element,depth+1);
 }
 function owner(name,expected,depth){
  const entry=program.declarations.get(name),original=wanted.get(expected);
  if(!entry||entry.k!=='data'||entry.hostTypePath?.join('::')!=='serde_json::'+expected||!Array.isArray(entry.ctors)||entry.ctors.length!==original.ctors.length)fail('complete canonical host owner differs');
  if(owners.has(name)){if(owners.get(name)!==expected)fail('conflicting canonical recursive owner');return;}
  if(owners.size>=4)fail('canonical recursive owner bound');owners.set(name,expected);
  for(let i=0;i<original.ctors.length;i++){
   const a=entry.ctors[i],b=original.ctors[i];if(a.name!==b.name||a.fields.length!==b.fields.length)fail('canonical constructor differs');
   for(let j=0;j<b.fields.length;j++){if(a.fields[j].name!==b.fields[j].name)fail('canonical field differs');type(a.fields[j].type,b.fields[j].type,depth+1);}
  }
 }
 const originalElement=own.ret.element,element=actual.ret.element;
 if(!clean(originalElement)||originalElement.rustOwnership||originalElement.patternOwnershipRefusal||flattened(originalElement.name)!==element.name)fail('actual original-to-lowered JSON return differs');
 owner(element.name,'Value',0);
 const parameters=own.params.map((param,index)=>{
  const source=param.type,target=actual.params[index].type;
  if(source.kind==='bool'&&clean(source)&&!source.rustOwnership&&!source.patternOwnershipRefusal&&sameType(source,target))return {name:'bool',kind:'bool'};
  if(source.kind==='fixed'&&['u64','i64'].includes(source.rustPrimitiveName)&&source.bits===64&&source.signed===(source.rustPrimitiveName==='i64')&&clean(source)&&!source.rustReference&&!source.rustOwnership&&!source.patternOwnershipRefusal&&target?.kind==='fixed'&&clean(target)&&!target.rustReference&&!target.rustOwnership&&!target.patternOwnershipRefusal&&sameType(source,target)&&['bits','signed','rustPrimitiveName','rustSourceType'].every(key=>source[key]===target[key]))return {name:source.rustPrimitiveName,kind:'integer'};
  const borrowed=source.rustReference?.kind==='shared',pointee=borrowed?source.rustReference.pointee:source,targetPointee=borrowed?target.rustReference?.pointee:target;
  if(source.rustReference&&!borrowed||source.rustBorrowingUnresolved||source.rustGenericIdentityUnresolved||!clean(pointee)||pointee.kind!=='data'||pointee.rustOwnership||pointee.patternOwnershipRefusal||pointee.name!==originalElement.name||targetPointee?.name!==element.name||!!target.rustReference!==borrowed||borrowed&&target.rustReference.kind!=='shared')fail('only actual by-value/shared Json, bool and exact u64/i64 input domains are drafted');
  if(borrowed&&source.patternOwnershipRefusal!=='shared source reference'||!borrowed&&(source.rustOwnership||source.patternOwnershipRefusal))fail('original JSON input ownership differs');
  return {name:borrowed?'json-ref':'json',kind:'json'};
 });
 return {kind:'json-vector',parameters,type:'json-list-owned',element:{kind:'json',name:'json'}};
}

// DATA layout join, reached only after originalJsonVectorDomain on the same
// fresh checkedSource()/lower() pair. No supplied type/layout issues authority.
export function originalJsonVectorOptionPayload(own,lowered,input){
 const program=lowered?.program;if(!(program?.declarations instanceof Map)||!input||input.kind!=='data')return null;
 const key=program.declarations.has(input.name)?input.name:flattened(input.name),owner=program.declarations.get(key);if(owner?.standardGeneric?.kind!=='Option')return null;
 if(input.rustReference||input.rustOwnership||input.patternOwnershipRefusal||input.rustGenericIdentityUnresolved||input.rustBorrowingUnresolved||owner.k!=='data'||owner.name!==key||owner.standardGeneric.arguments?.length!==1||owner.ctors?.length!==2)fail('actual clean standard Option layout required');
 const some=owner.ctors.filter(row=>row.name==='Some'),none=owner.ctors.filter(row=>row.name==='None');if(some.length!==1||none.length!==1||some[0].fields?.length!==1||some[0].fields[0].name!=='field0'||none[0].fields?.length)fail('actual standard Option constructors differ');
 let work=0;
 function resolve(type){if(++work>64||!type)fail('bounded actual Option payload type required');if(type.kind!=='named')return type;const name=type.path.filter((part,index)=>index!==0||part!=='crate').join('.'),key=program.declarations.has(name)?name:flattened(name);if(!program.declarations.has(key))fail('actual lowered Option field owner missing');const value={...type,kind:'data',name:key};delete value.path;return value;}
 function payload(type){
  type=resolve(type);if(type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)return null;
  if(type.rustReference){if(type.rustReference.kind!=='shared')return null;const point=resolve(type.rustReference.pointee),name=program.declarations.has(point.name)?point.name:flattened(point.name);return point.kind==='data'&&name===flattened(own.ret.element.name)&&!point.rustReference&&!point.rustOwnership&&!point.patternOwnershipRefusal&&!point.rustGenericIdentityUnresolved&&!point.rustBorrowingUnresolved?'json-ref':null;}
  if(type.patternOwnershipRefusal)return null;if(type.kind==='string'&&type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str')return 'str';if(type.rustOwnership)return null;if(type.kind==='bool')return 'bool';if(type.kind==='fixed'&&type.bits===64&&['u64','i64'].includes(type.rustPrimitiveName)&&type.signed===(type.rustPrimitiveName==='i64'))return type.rustPrimitiveName;return null;
 }
 const role=payload(some[0].fields[0].type),declared=payload(owner.standardGeneric.arguments[0]);if(!role||role!==declared)fail('only actual shared Json/str and bool/u64/i64 standard Option payloads are drafted');
 if(input.rustStandardGeneric){if(input.rustStandardGeneric.kind!=='Option'||input.rustStandardGeneric.arguments?.length!==1||payload(input.rustStandardGeneric.arguments[0])!==role)fail('original and lowered standard Option arguments differ');}return role;
}
