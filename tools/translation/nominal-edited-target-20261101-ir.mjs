// Closed ordinary checked-IR selector/emitter. All arguments/output are DATA;
// only the full fresh-source facade may qualify an emitted candidate.
import {types,isDeepStrictEqual} from 'node:util';
import {rustTokens} from './rust-structure.mjs';
import {accountPrimitiveVectorIteratorBulkData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw new TypeError('Nominal edited native IR: '+message);};
const keywords=new Set('as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while abstract become box do final macro override priv typeof unsized virtual yield try union gen'.split(' '));
const ident=value=>typeof value==='string'&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(value)&&value!=='_'&&!keywords.has(value);
function owned(type,owner){return type?.kind==='data'&&type.name===owner&&!type.rustReference&&!type.rustOwnership&&!type.patternOwnershipRefusal&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved;}
function name(value){if(typeof value!=='string'||!value.split('.').every(ident))fail('actual simple fully qualified nominal name required');return value;}
function typeShape(type,depth=0){
 if(!type||depth>32||!['array','data','bool'].includes(type.kind))fail('bounded complete domain type/ownership shape required');
 const shape={kind:type.kind,reference:type.rustReference?{kind:type.rustReference.kind,pointee:typeShape(type.rustReference.pointee,depth+1)}:null,ownership:type.rustOwnership?{kind:type.rustOwnership.kind,source:type.rustOwnership.source}:null,patternOwnershipRefusal:type.patternOwnershipRefusal??null,genericIdentityUnresolved:type.rustGenericIdentityUnresolved??false,borrowingUnresolved:type.rustBorrowingUnresolved??false,lifetime:type.rustBorrowLifetime?{kind:type.rustBorrowLifetime.kind,source:type.rustBorrowLifetime.source}:null};
 if(type.kind==='data')shape.name=type.name;if(type.kind==='array')shape.element=typeShape(type.element,depth+1);return shape;
}
function returnLeaf(node,owner,variants,result){
 if(result==='bool'){if(node?.k!=='lit'||node.type?.kind!=='bool'||typeof node.value!=='boolean')fail('owned match may return only genuine Boolean literals');return {kind:'bool',value:node.value};}
 if(node?.k!=='ctor'||node.data!==owner||!owned(node.type,owner)||!Array.isArray(node.args)||node.args.length||!variants.includes(node.ctor))fail('only a checked zero-field constructor of the actual fixed owner may be returned');return {kind:'variant',variant:node.ctor};
}
function callback(node,owner,variants,result){
 if(node?.k!=='routerLambda'||node.arity!==1||node.type?.kind!=='routerCallback')fail('one complete ordinary checked callback required');
 const binding=node.binding;if(binding?.k!=='let'||!ident(binding.name)||binding.value?.k!=='routerLambdaInput'||binding.value.position!==0||!owned(binding.value.type,owner))fail('one owned source nominal callback binding required');
 const body=binding.body;if(body?.k!=='match')return {kind:'constant',binder:binding.name,leaf:returnLeaf(body,owner,variants,result)};
 if(body.scrutinee?.k!=='var'||body.scrutinee.name!==binding.name||!owned(body.scrutinee.type,owner)||!Array.isArray(body.cases)||body.cases.length!==variants.length)fail('complete exhaustive owned unit match required; shared/filter/guard matches remain refused');
 const seen=new Set(),cases=body.cases.map(row=>{const pattern=row.pattern;if(pattern?.k!=='ctor'||pattern.data!==owner||!variants.includes(pattern.ctor)||seen.has(pattern.ctor)||!Array.isArray(pattern.binds)||pattern.binds.length)fail('each actual unit constructor must occur exactly once without bindings');seen.add(pattern.ctor);return {variant:pattern.ctor,leaf:returnLeaf(row.body,owner,variants,result)};});
 return {kind:'owned-match',binder:binding.name,cases};
}
export function selectNominalEditedFunction(sourceSnapshot,targetSnapshot,ownerReceipts){
 accountPrimitiveVectorIteratorBulkData({sourceSnapshot,targetSnapshot,ownerReceipts});
 const entry=sourceSnapshot?.declaration;
 if(sourceSnapshot?.schema!=='original-checked-executable-source-v1'||entry?.k!=='fn'||entry.constant||entry.constFunction||entry.async||entry.generated||entry.params?.length!==1||!ident(entry.params[0].name)||entry.fullName!==sourceSnapshot.qualifiedName||targetSnapshot?.schema!=='original-checked-project-target-binding-v1'||targetSnapshot.qualifiedName!==entry.fullName||targetSnapshot.source!==sourceSnapshot.source||!ident(targetSnapshot.javascriptName))fail('fresh complete original function/source/target snapshots required');
 const param=entry.params[0],input=param.type,element=input?.element,owner=name(element?.name),reference=input?.rustReference;
 if(input.kind!=='array'||input.rustFixedArray||input.rustOwnership?.kind!=='borrowed'||input.rustOwnership.source!=='slice'||reference?.kind!=='shared'||reference.pointee?.kind!=='array'||reference.pointee.rustReference||!owned(element,owner)||!owned(reference.pointee.element,owner))fail('one genuine shared source slice of owned unit elements required');
 const owners=ownerReceipts.filter(row=>row.typePath?.slice(1).join('.')===owner);
 if(owners.length!==1||owners[0].source!==sourceSnapshot.source||!Array.isArray(owners[0].variants)||!owners[0].variants.length||owners[0].variants.length>32||owners[0].variants.some(value=>!ident(value))||new Set(owners[0].variants).size!==owners[0].variants.length)fail('one freshly reissued complete same-source unit owner census required');
 const variants=[...owners[0].variants],ret=entry.ret;
 if(ret?.kind!=='array'||ret.rustReference||ret.rustFixedArray||ret.rustOwnership?.kind!=='owned'||ret.rustOwnership.source!=='Vec')fail('one actual owned Vec return required');
 const result=ret.element?.kind==='bool'&&!ret.element.rustReference&&!ret.element.rustOwnership?'bool':owned(ret.element,owner)?'variant':null;if(!result)fail('the fixed output domain must be bool or the same actual nominal owner');
 const collect=entry.body,map=collect?.object,iter=map?.object;
 if(collect?.k!=='routerIteratorOperation'||collect.op!=='collect'||collect.args?.length!==0||map?.k!=='routerIteratorOperation'||map.op!=='map'||map.args?.length!==1||iter?.k!=='routerIteratorOperation'||iter.op!=='iter'||iter.args?.length!==0||iter.object?.k!=='var'||iter.object.name!==param.name||iter.sourceIteratorProof?.operation!=='iter'||iter.sourceIteratorProof.borrowed!==true||iter.sourceIteratorCopy?.operation!=='copied'||iter.sourceIteratorCopy.profile!=='rust-1.89-scalar-iterator-items'||!owned(iter.type?.element,owner)||!owned(iter.sourceIteratorCopy.itemType?.rustReference?.pointee,owner))fail('the ENTIRE original body must be one slice.iter().copied().map(...).collect() pipeline');
 const shape={schema:'closed-owned-unit-map-native-shape-v1',qualifiedName:entry.fullName,owner,variants,input:{name:param.name,kind:'shared-unit-slice'},types:{parameter:typeShape(input),result:typeShape(ret),copiedItem:typeShape(iter.type.element),mappedItem:typeShape(map.type.element),collected:typeShape(collect.type)},output:result,callback:callback(map.args[0],owner,variants,result)};
 if(map.type?.kind!=='routerIterator'||collect.type?.kind!=='array'||(result==='bool'?map.type.element?.kind!=='bool'||collect.type.element?.kind!=='bool':!owned(map.type.element,owner)||!owned(collect.type.element,owner)))fail('actual checked operation result domains differ');
 accountPrimitiveVectorIteratorBulkData(shape);return {...shape,source:sourceSnapshot.source,span:{...sourceSnapshot.span},target:targetSnapshot.javascriptName};
}
export function editedNominalShape(plan,leaves){
 accountPrimitiveVectorIteratorBulkData({plan,leaves});const expected=plan.callback.kind==='constant'?1:plan.callback.cases.length;
 if(!Array.isArray(leaves)||leaves.length!==expected)fail('complete edited leaf census required');
 const checked=leaves.map(leaf=>{if(plan.output==='bool'){if(leaf?.kind!=='bool'||typeof leaf.value!=='boolean'||Object.keys(leaf).sort().join(',')!=='kind,value')fail('actual Boolean leaf required');return {kind:'bool',value:leaf.value};}if(leaf?.kind!=='variant'||!plan.variants.includes(leaf.variant)||Object.keys(leaf).sort().join(',')!=='kind,variant')fail('actual fixed-owner unit variant candidate required');return {kind:'variant',variant:leaf.variant};});
 return {...plan,callback:plan.callback.kind==='constant'?{...plan.callback,leaf:checked[0]}:{...plan.callback,cases:plan.callback.cases.map((row,index)=>({...row,leaf:checked[index]}))};
}
export function emitNominalEditedRustBody(plan){
 accountPrimitiveVectorIteratorBulkData(plan);name(plan.owner);if(plan.schema!=='closed-owned-unit-map-native-shape-v1'||!['bool','variant'].includes(plan.output)||!['constant','owned-match'].includes(plan.callback?.kind)||!Array.isArray(plan.variants)||!plan.variants.length||plan.variants.length>32||plan.variants.some(value=>!ident(value))||new Set(plan.variants).size!==plan.variants.length||!ident(plan.input?.name)||!ident(plan.callback.binder))fail('complete bounded native binding/owner/leaf candidate shape required');
 if(plan.callback.kind==='owned-match'&&(!Array.isArray(plan.callback.cases)||plan.callback.cases.length!==plan.variants.length||new Set(plan.callback.cases.map(row=>row.variant)).size!==plan.variants.length||plan.callback.cases.some(row=>!plan.variants.includes(row.variant))))fail('complete bounded exhaustive native match candidates required');
 plan=editedNominalShape(plan,plan.callback.kind==='constant'?[plan.callback.leaf]:plan.callback.cases.map(row=>row.leaf));
 const owner='crate::'+plan.owner.split('.').join('::'),parts=[];let units=0,bytes=0;const add=value=>{units+=value.length;bytes+=Buffer.byteLength(value);if(units>2097152||bytes>8388608)fail('complete emitted native body source bound');parts.push(value);};
 const leaf=value=>{if(value.kind==='bool')add(value.value?'true':'false');else{add(owner);add('::');add(value.variant);}};
 add('{\n    ');add(plan.input.name);add('.iter().copied().map(|');add(plan.callback.binder);add('| ');
 if(plan.callback.kind==='constant')leaf(plan.callback.leaf);else{add('match ');add(plan.callback.binder);add(' { ');for(const row of plan.callback.cases){add(owner);add('::');add(row.variant);add(' => ');leaf(row.leaf);add(', ');}add('}');}
 add(').collect::<Vec<');add(plan.output==='bool'?'bool':owner);add('>>()\n}');return parts.join('');
}

export function nominalEditedNativeBodyRange(source,plan){
 if(typeof source!=='string'||source.length>2097152||Buffer.byteLength(source)>8388608||!Number.isSafeInteger(plan.span?.start)||!Number.isSafeInteger(plan.span?.end)||plan.span.start<0||plan.span.end>source.length||plan.span.start>=plan.span.end)fail('one complete bounded actual native declaration/source span required');
 const tokens=rustTokens(source).filter(token=>token.start>=plan.span.start&&token.end<=plan.span.end&&token.type!=='comment').map(token=>({...token,value:token.text,kind:token.type})),fn=tokens.findIndex(token=>token.value==='fn');
 if(fn<0||tokens[fn+1]?.value!==plan.qualifiedName.split('.').at(-1))fail('actual source function identity/span differs');
 let open=-1,round=0,square=0;for(let index=fn+2;index<tokens.length;index++){const token=tokens[index];if(token.value==='(')round++;if(token.value===')')round--;if(token.value==='[')square++;if(token.value===']')square--;if(token.value==='{'&&round===0&&square===0){open=index;break;}if(round<0||square<0)fail('complete native signature token bounds differ');}
 if(open<0)fail('actual original function body required');let depth=0,close=-1;for(let index=open;index<tokens.length;index++){if(tokens[index].value==='{')depth++;if(tokens[index].value==='}'&&--depth===0){close=index;break;}}
 if(close<0||tokens.slice(close+1).some(token=>token.kind!=='eof'))fail('entire original declaration must close at this body');
 const start=tokens[open].start,end=tokens[close].end;return {start,end};
}
export function substituteNominalEditedRustBody(source,plan){
 const span=nominalEditedNativeBodyRange(source,plan),body=emitNominalEditedRustBody(plan);if(source.length-(span.end-span.start)+body.length>2097152||Buffer.byteLength(source)-Buffer.byteLength(source.slice(span.start,span.end))+Buffer.byteLength(body)>8388608)fail('complete changed native source bound');return {before:source,after:source.slice(0,span.start)+body+source.slice(span.end),body,span};
}
export function sameNominalEditedShape(left,right){
 accountPrimitiveVectorIteratorBulkData({left,right});const project=plan=>({owner:plan.owner,variants:plan.variants,input:plan.input,types:plan.types,output:plan.output,callback:plan.callback,qualifiedName:plan.qualifiedName});return isDeepStrictEqual(project(left),project(right));
}
