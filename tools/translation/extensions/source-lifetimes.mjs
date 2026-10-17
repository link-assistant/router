import {canonicalResult} from './result-iterators.mjs';
import {JSON_DATA} from './json-contracts.mjs';
import {sharedReferenceCopyIdentity} from '../shared-reference-copy-source.mjs';
import {hasOriginalRouterCoreJsonProjection,hasOriginalJsonStringErrorContext} from '../router-core-json-updates.mjs';
import {hasOriginalMappedOrigin} from './standard-mapped-body.mjs';
import {sameType} from '../checked-types.mjs';
import {originalCloneReceiverOrigin} from './clone-source-body.mjs';
import {hasOriginalSourceFrame,hasOriginalCallbackLoan} from './standard-source-frame.mjs';
import {hasPinnedSharedOrigin,hasOriginalSharedDomainGuard} from './standard-borrowed-body.mjs';
import {hasStaticElementOrigin} from './static-array-element.mjs';
// Function elision and return origins are proof obligations, not value-domain
// equivalence. This bounded adapter does not manufacture reference lifetimes.
import {unsupported,typeError} from '../vendor/meta-language/translation/diagnostics.js';
import {rustFixedType} from '../checked-types.mjs';
import {metadataDigest,ownData,copyMetadata} from './source-links.mjs';

const UNKNOWN='unproved-borrow-origin';
const key=path=>JSON.stringify(path);
function leafOrigins(leaves) {
  const result=new Set([...leaves.values()].flatMap(origins=>[...origins]));result.leaves=leaves;return result;
}
function union(...sets) {
  const result=new Set(sets.flatMap(set=>[...set]));
  if(sets.some(set=>set.size&&!set.leaves))return result;
  const leaves=new Map();
  for(const set of sets)for(const [path,origins] of set.leaves??[])leaves.set(path,new Set([...(leaves.get(path)??[]),...origins]));
  result.leaves=leaves;return result;
}
const staticOrigin=()=>leafOrigins(new Map([['[]',new Set(['static'])]]));
const at=(origins,path)=>origins.leaves?.get(key(path))??origins;
function prefix(origins,path) {
  if(!origins.leaves)return origins;
  return Object.assign(leafOrigins(new Map([...origins.leaves].map(([leaf,values])=>[key([...path,...JSON.parse(leaf)]),values]))),origins.emptyBorrow?{emptyBorrow:true}:{});
}
function project(origins,path) {
  if(!origins.leaves)return origins;
  const leaves=new Map();
  for(const [leaf,values] of origins.leaves){const segments=JSON.parse(leaf);if(path.every((part,index)=>segments[index]===part))leaves.set(key(segments.slice(path.length)),values);}
  return leaves.size?leafOrigins(leaves):origins;
}
function uniformOrigins(type,origins,context) {return leafOrigins(new Map(sourceBorrowRegions(type,context).map(region=>[key(region.path),origins])));}
function referenceLifetime(type) {
  const values=type.rustReference?.tokens?.map(token=>token.value);
  if(values?.[0]!=='&')return null;
  // A nested pointee's 'static token cannot qualify the outer reference.
  return values[1]!=="'"?'elided':values[2]==='static'?'static':values[2]?`named:${values[2]}`:null;
}
// Paths distinguish separate nested references in a single source parameter.
export function sourceBorrowRegions(type,{declarations,resolveType=type=>type}={},path=[],active=new Set()) {
  if(!type)return [];
  const result=[];
  if(type.rustReference) {
    const lifetime=referenceLifetime(type);
    if(type.rustReference.kind!=='shared'||!type.rustReference.pointee)throw unsupported('source borrow lifetime','requires a checked shared pointee',type.rustReference.span);
    result.push({path,kind:lifetime??'unknown',span:type.rustReference.span});
    return [...result,...sourceBorrowRegions(type.rustReference.pointee,{declarations,resolveType},[...path,'pointee'],active)];
  }
  if(type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str') {
    const lifetime=type.rustBorrowLifetime;
    result.push({path,kind:lifetime?.kind??'unknown',span:lifetime?.span});
  }
  if(type.kind==='array')result.push(...sourceBorrowRegions(type.element,{declarations,resolveType},[...path,'element'],active));
  const entry=type.kind==='data'?declarations?.get(type.name):null;
  const generic=type.rustStandardGeneric;
  if(type.rustTupleLifetimeFields)for(const [index,field] of type.rustTupleLifetimeFields.entries())result.push(...sourceBorrowRegions(field,{declarations,resolveType},[...path,'tuple',index],active));
  else if(generic)for(const [index,argument] of generic.arguments.entries())result.push(...sourceBorrowRegions(argument,{declarations,resolveType},[...path,'argument',index],active));
  // Nominal fields are not written input lifetimes. For example S containing
  // &'static str supplies no elision input lifetime to fn f(s:S)->&str.
  // Their static obligations are checked at actual constructor field writes.
  else if(entry?.tuple&&!active.has(type.name)) {
    active.add(type.name);
    for(const ctor of entry.ctors)for(const field of ctor.fields)result.push(...sourceBorrowRegions(resolveType(field.type,entry.modulePath,entry.span),{declarations,resolveType},[...path,'constructor',ctor.name,'field',field.name],active));
    active.delete(type.name);
  }
  return result;
}

const namedKind=kind=>typeof kind==='string'&&kind.startsWith('named:');
function namedIdentity(entry,kind,span) {
  const source=entry.sourceLifetimeParameters;
  if(source?.profile!=='source-named-shared-lifetimes-v1'||!source.names.includes(kind.slice(6)))throw unsupported('named lifetime identity','requires its actual source function binder',span??entry.span);
  return `function:${entry.fullName}:${kind}`;
}
export function functionLifetimeSignature(entry,context={}) {
  const generated=originalCloneReceiverOrigin(entry),receiverType=entry.params[0]?.type;
  if(generated&&(receiverType?.kind!=='data'||receiverType.rustReference?.kind!=='shared'||receiverType.rustReference.pointee?.kind!=='data'||receiverType.name!==receiverType.rustReference.pointee.name||entry.ret?.kind!=='data'||entry.ret.name!==receiverType.name||entry.ret.rustReference))throw unsupported('compiler Clone receiver lifetime','requires the actual shared nominal receiver and owned primitive-record result',entry.span);
  const params=entry.params.map((param,index)=>sourceBorrowRegions(param.type,context).map(region=>{
    if(generated&&index===0&&region.path.length===0&&region.kind==='unknown')region={...region,kind:'elided',origin:'original compiler SelfKind::Region(None, ast::Mutability::Not)'};
    return {...region,param:index,identity:region.kind==='static'?'static':namedKind(region.kind)?namedIdentity(entry,region.kind,region.span):`input:${index}:${JSON.stringify(region.path)}`};
  }));
  const outputs=sourceBorrowRegions(entry.ret,context);
  if(params.flat().some(region=>region.kind==='unknown'))throw unsupported('input lifetime syntax','requires retained actual source lifetime syntax',entry.span);
  const identities=new Set(params.flat().map(region=>region.identity));
  const receiver=entry.impl?.sharedReceiverSource;
  let receiverRegion=null;
  if(receiver) {
    if(receiver.kind!=='shared'||receiver.tokens?.[0]?.value!=='&')throw unsupported('receiver lifetime evidence','requires the original shared receiver source tokens',receiver.span??entry.span);
    receiverRegion=params[0]?.find(region=>region.path.length===0)?.identity;
    if(!receiverRegion)throw unsupported('receiver lifetime evidence','requires the checked shared receiver reference',receiver.span??entry.span);
  }
  for(const output of outputs) {
    if(output.kind==='unknown')throw unsupported('borrowed result lifetime','requires retained actual source lifetime syntax',output.span??entry.span);
    if(output.kind==='elided') {
      if(entry.constant)output.identity='static';
      else if(receiverRegion)output.identity=receiverRegion;
      else if(identities.size===1)output.identity=[...identities][0];
      else throw typeError('Borrowed result lifetime cannot be elided: the function needs exactly one input lifetime or a proven shared receiver',output.span??entry.span);
    } else output.identity=namedKind(output.kind)?namedIdentity(entry,output.kind,output.span):'static';
  }
  return {schemaVersion:1,profile:'source-shared-elision-v1',params,outputs,span:entry.span};
}

function hasBorrow(type,context) {return sourceBorrowRegions(type,context).length>0;}
function checkStaticArguments(signature,args,range) {
  for(let index=0;index<signature.params.length;index++)for(const region of signature.params[index])if(region.kind==='static') {
    if(args[index]?.emptyBorrow)continue;
    const origins=args[index]?at(args[index],region.path):new Set();
    if(!origins.size||[...origins].some(origin=>origin!=='static'))throw typeError('A static source parameter requires a proven static borrow origin at its written leaf',range);
  }
}

// These locals rebind copied shared references; they do not mutate pointees or
// move an owned aggregate. The ordinary checker still proves every assignment.
function copiedBorrowLocal(type) {
  if(!type||!['string','fixed','bool'].includes(type.kind))return false;
  let leaf=type,depth=0;
  while(leaf.rustReference) {
    const reference=leaf.rustReference;
    if(++depth>32||reference.kind!=='shared'||!reference.pointee||reference.pointee.kind!==leaf.kind||leaf.rustGenericIdentityUnresolved||leaf.rustBorrowingUnresolved)return false;
    leaf=reference.pointee;
  }
  if(leaf.rustGenericIdentityUnresolved||leaf.rustBorrowingUnresolved)return false;
  if(leaf.kind==='fixed'){const actual=rustFixedType(leaf.rustPrimitiveName);return depth>0&&actual?.bits===leaf.bits&&actual.signed===leaf.signed;}
  if(leaf.kind==='bool')return depth>0&&leaf.rustSourceType===true;
  const owner=leaf.rustOwnership;
  return Boolean(owner&&(owner.kind==='borrowed'&&owner.source==='str'||depth>0&&owner.kind==='owned'&&owner.source==='String'));
}

function checkLocalBorrow(value,type,context,span) {
  if(!type)return;
  const regions=sourceBorrowRegions(type,context);
  checkStaticArguments({params:[regions]},[value],span);
  for(const region of regions)if(namedKind(region.kind)) {
    const identity=namedIdentity(context.entry,region.kind,region.span),actual=at(value,region.path);
    if(!actual.size||[...actual].some(origin=>origin!=='static'&&origin!==identity))throw typeError('A named local borrow requires its actual function lifetime origin on every write',span);
  }
}

function propagateLocals(target,source,context,excluded=null) {
  for(const name of context.mutableBorrowLocals.keys())if(name!==excluded&&source.has(name))target.set(name,source.get(name));
}
function joinLocals(target,states,context) {
  for(const name of context.mutableBorrowLocals.keys())target.set(name,union(...states.map(state=>state.get(name)??new Set([UNKNOWN]))));
}
function sameOrigins(left,right) {
  if(left.size!==right.size||[...left].some(origin=>!right.has(origin)))return false;
  if(Boolean(left.leaves)!==Boolean(right.leaves))return false;
  if(left.leaves) {
    if(left.leaves.size!==right.leaves.size)return false;
    for(const [path,values] of left.leaves){const other=right.leaves.get(path);if(!other||values.size!==other.size||[...values].some(origin=>!other.has(origin)))return false;}
  }
  return true;
}
function sameLocals(left,right,context) {
  return [...context.mutableBorrowLocals.keys()].every(name=>sameOrigins(left.get(name)??new Set([UNKNOWN]),right.get(name)??new Set([UNKNOWN])));
}

// Checked IR is interpreted only as origin evidence. Values and bodies are
// neither evaluated nor rewritten. Unknown operations retain a refusal.
function sharedPrimitiveMatchBinding(type,owner,ctor,pattern,index,context,span) {
  const refuse=()=>{throw unsupported('borrowed match field origins','requires separate actual shared field projection evidence',span);};
  const reference=type.rustReference,proof=copyMetadata(ownData(pattern,'sharedBindingProof')),pointee=reference?.pointee;
  if(type.kind!=='data'||reference?.kind!=='shared'||pointee?.kind!=='data'||pointee.name!==type.name||pointee.rustReference||pointee.rustGenericIdentityUnresolved||pointee.rustBorrowingUnresolved||owner.tuple||owner.standardGeneric||proof?.kind!=='shared-match-ergonomics'||metadataDigest(proof.pointee)!==metadataDigest(pointee))refuse();
  const expectedBinds=pattern.binds.filter(name=>name&&name!=='_');
  if(!Array.isArray(proof.bindings)||proof.bindings.length!==expectedBinds.length||new Set(proof.bindings.map(binding=>binding.name)).size!==proof.bindings.length)refuse();
  const name=pattern.binds[index],field=ctor.fields[index],matches=proof.bindings.filter(binding=>binding.name===name&&binding.field===field.name);
  if(matches.length!==1)refuse();
  const binding=matches[0],declared=context.resolveType(field.type,owner.modulePath,span),primitive=rustFixedType(declared.rustPrimitiveName),borrowed=binding.type,borrow=borrowed?.rustReference;
  const syntax=copyMetadata(ownData(field,'rustTypeSyntax'));
  if(!Array.isArray(syntax)||!syntax.length||syntax.some(token=>typeof token!=='string'))refuse();
  if(declared.kind!=='fixed'||!primitive||declared.bits!==primitive.bits||declared.signed!==primitive.signed||declared.rustReference||declared.rustOwnership||declared.patternOwnershipRefusal||declared.rustGenericIdentityUnresolved||declared.rustBorrowingUnresolved)refuse();
  if(borrowed?.kind!=='fixed'||borrowed.bits!==declared.bits||borrowed.signed!==declared.signed||borrowed.rustPrimitiveName!==declared.rustPrimitiveName||borrowed.rustSourceType!==true||borrowed.patternOwnershipRefusal!=='shared source reference'||borrowed.rustOwnership||borrowed.rustGenericIdentityUnresolved||borrowed.rustBorrowingUnresolved||borrowed.rustBorrowLifetime||borrow?.kind!=='shared'||borrow.source!=='shared-field-projection'||borrow.pointee?.rustReference||metadataDigest(borrow.pointee)!==metadataDigest(declared)||metadataDigest(borrow.sourceReceiverSpan)!==metadataDigest(reference.span)||metadataDigest(borrow.span)!==metadataDigest(proof.span))refuse();
  return borrowed;
}

function origins(node,env,context,returns,depth=0) {
  if(!node)return new Set();
  if(depth>256)throw unsupported('borrow origin traversal','requires a bounded checked expression graph',context.entry.span);
  if(++context.borrowFlowBudget.steps>100000)throw unsupported('borrow origin flow budget','requires a bounded finite copied-reference analysis',node.span??context.entry.span);
  const read=(value,scope=env)=>origins(value,scope,context,returns,depth+1);
  const readCallback=(value,lambdaInputs)=>origins(value,new Map(env),{...context,lambdaInputs,callbackCapturedBorrowLocals:new Set(context.mutableBorrowLocals.values())},returns,depth+1);
  const borrowed=hasBorrow(node.type,context);
  if(node.k==='routerTemporaryStringCallBorrow') {
    read(node.object);
    if(node.temporaryStringBorrowProof?.verified!==true||node.temporaryStringBorrowProof.profile!=='rust-1.89-utf16-fixed-f64'||node.temporaryStringBorrowProof.origin!=='call-local-temporary')throw unsupported('temporary String borrow origin','requires the checked nonescaping scalar-call argument',node.span);
    return borrowed?uniformOrigins(node.type,new Set([UNKNOWN]),context):new Set();
  }
  if(node.sourceOwnershipOperation?.operation==='as_str') {
    const proof=node.sourceOwnershipOperation,receiver=node.sourceOwnershipReceiver;
    if(proof.profile!=='checked-standard-string-ownership-v1'||proof.verified!==true||!receiver?.type)throw unsupported('String::as_str borrow origin','requires its checked source receiver and registered ownership proof',node.span);
    const value=read(receiver);
    return borrowed?uniformOrigins(node.type,at(value,[]),context):new Set();
  }
  if(node.k==='var') {
    if(borrowed&&context.callbackCapturedBorrowLocals?.has(context.mutableBorrowLocals.get(node.name)))throw unsupported('mutable borrowed callback capture read','requires its execution interval and original capture borrow flow',node.span??context.entry.span);
    return borrowed?(env.get(node.name)??new Set([UNKNOWN])):new Set();
  }
  if(node.k==='routerStandardSharedReceiver')return borrowed?project(read(node.object),['pointee']):new Set();
  if(node.k==='routerReverseSplitFind'){
    if(node.reverseStringProof?.profile!=='rust-1.89-reverse-scalar-character-split'||node.reverseStringProof.verified!==true)throw unsupported('reverse Split borrow origin','requires its actual checked double-ended profile',node.span);
    const values=read(node.object);readCallback(node.predicate.binding,[values]);
    return borrowed?prefix(values,['argument',0]):new Set();
  }
  if(node.k==='routerOptionAsDeref'){
    if(node.optionDerefProof?.profile!=='rust-1.89-shared-option-string-as-deref'||node.optionDerefProof.verified!==true||node.optionDerefProof.receiver!=='existing-shared-place'||node.object.type?.rustReference?.kind!=='shared')throw unsupported('Option String Deref borrow origin','requires its existing checked shared source receiver',node.span);
    return borrowed?uniformOrigins(node.type,at(read(node.object),[]),context):new Set();
  }
  if(['routerResultMapErr','routerResultCollect'].includes(node.k)){
    const proof=node.resultIteratorProof;
    if(proof?.profile!=='rust-1.89-checked-result-collection'||proof.verified!==true)throw unsupported('Result iterator borrow origin','requires the actual checked standard Result pipeline',node.span);
    const value=read(node.object);
    if(node.k==='routerResultMapErr'){
      const called=readCallback(node.callback.binding,[project(value,['argument',1])]);
      return borrowed?union(prefix(project(value,['argument',0]),['argument',0]),prefix(called,['argument',1])):new Set();
    }
    return borrowed?union(prefix(project(value,['argument',0]),['argument',0,'element']),prefix(project(value,['argument',1]),['argument',1])):new Set();
  }
  if(['routerStringSplit','routerStringSplitNext','routerAllocatingStringItem'].includes(node.k)){
    if(node.csvStringProof?.profile!=='rust-1.89-literal-char-split-string-items'||node.csvStringProof.verified!==true)throw unsupported('CSV string borrow origin','requires its actual checked standard source profile',node.span);
    const value=read(node.object);
    if(node.k==='routerStringSplit')return uniformOrigins(node.type.element,at(value,[]),context);
    return node.k==='routerStringSplitNext'&&borrowed?uniformOrigins(node.type,at(value,[]),context):new Set();
  }
  if(['routerStringLines','routerStringWords','routerStringNext','routerStringJoin'].includes(node.k)) {
    if(node.stringIteratorProof?.profile!=='rust-1.89-borrowed-string-iterators'||node.stringIteratorProof.verified!==true)throw unsupported('string iterator borrow origin','requires its checked standard operation proof',node.span);
    if(node.k==='routerStringWords'&&(node.whitespaceIteratorProfile?.id!=='rust-1.89-split-whitespace-v1'||node.whitespaceIteratorProfile.sourceInputsVerified!==true))throw unsupported('whitespace iterator borrow origin','requires its original checked standard source profile',node.span);
    const value=read(node.object);
    if(['routerStringLines','routerStringWords'].includes(node.k))return uniformOrigins(node.type.element,at(value,[]),context);
    if(node.k==='routerStringNext')return borrowed?uniformOrigins(node.type,at(value,[]),context):new Set();
    read(node.separator);return new Set(); // join allocates an owned String.
  }
  if(node.k==='routerCoreJsonCollection'){
    if(!hasOriginalRouterCoreJsonProjection(node)||node.args.length!==2||node.args[1].k!=='routerLambda'||node.args[1].arity!==1)throw unsupported('owned collection borrow origin','requires its actual private checked function/call context',node.span);
    const input=read(node.args[0]),item=node.args[0].type.rustReference?.pointee?.element;
    if(!item||node.type.kind!=='array'||node.type.rustOwnership?.kind!=='owned'||node.type.rustOwnership.source!=='Vec')throw unsupported('owned collection source type','requires actual shared input and owned output',node.span);
    readCallback(node.args[1].binding,[uniformOrigins({...item,rustReference:{kind:'shared',pointee:item}},at(input,[]),context)]);
    return new Set(); // Every successful callback returns owned canonical Json.
  }
  if(node.k==='routerLambdaInput')return borrowed?(context.lambdaInputs?.[node.position]??new Set([UNKNOWN])):new Set();
  if(node.k==='routerLoopInput') {
    let value=context.loopInputOrigins??new Set([UNKNOWN]);
    if(node.sourceReferencePattern) {
      if(node.sourceReferencePattern.kind!=='checked-shared-reference-pattern-copy'||node.sourceReferencePattern.itemType?.rustReference?.kind!=='shared')throw unsupported('loop item borrow projection','requires the actual checked shared reference pattern',node.span??context.entry.span);
      value=project(value,['pointee']);
    }
    return borrowed?value:new Set();
  }
  if(node.k==='routerPrimitiveDereference'&&node.dereferenceProof?.kind==='shared-str-reference-copy')return borrowed?project(read(node.value),['pointee']):new Set();
  if(node.k==='routerIteratorOperation') {
    const values=read(node.object),operation=node.op;
    const element=node.type.kind==='routerIterator'?node.type.element:null;
    if(operation==='iter') {
      const proof=node.sourceIteratorProof,receiver=node.object.type,copy=node.sourceIteratorCopy,item=copy?.itemType??element;
      if(!element||receiver?.kind!=='array'||proof?.profile!=='rust-1.89-scalar-iterator-items'||!['iter','into_iter'].includes(proof.operation))throw unsupported('iterator item borrow origins','requires its actual checked source iterator profile',node.span);
      let result;
      if(proof.borrowed) {
        if(item?.rustReference?.kind!=='shared'||!item.rustReference.pointee)throw unsupported('iterator item borrow origins','requires its inserted actual shared reference',node.span);
        const stored=receiver.rustReference?['pointee','element']:['element'];
        result=leafOrigins(new Map(sourceBorrowRegions(item,context).map(region=>[key(region.path),region.path.length===0?(receiver.rustReference?at(values,[]):new Set([UNKNOWN])):region.path[0]==='pointee'?at(values,[...stored,...region.path.slice(1)]):new Set([UNKNOWN])])));
      } else result=project(values,['element']);
      if(copy) {
        if(copy.profile!=='rust-1.89-scalar-iterator-items'||!['copied','cloned'].includes(copy.operation)||copy.itemType?.rustReference?.kind!=='shared')throw unsupported('copied iterator borrow origins','requires its actual shared Item copy profile',node.span);
        result=project(result,['pointee']);
      }
      return result;
    }
    if(['map','filter','find_map','filter_map','find','any','all'].includes(operation)) {
      const callback=node.args[0],called=readCallback(callback.binding,[values]);
      if(operation==='find_map')return borrowed?called:new Set();
      if(operation==='find')return borrowed?prefix(values,['argument',0]):new Set();
      if(operation==='filter_map')return project(called,['argument',0]);
      if(operation==='map')return called;
      return operation==='filter'?values:new Set();
    }
    if(operation==='flatten')return element?uniformOrigins(element,new Set(values),context):new Set();
    if(operation==='fold') {
      const initial=read(node.args[0]),callback=node.args[1];
      if(!borrowed)return readCallback(callback.binding,[initial,values]);
      const cells=sourceBorrowRegions(node.type,context).length,limit=1+cells*context.borrowOriginUniverse.size;
      let accumulated=initial;
      for(let step=0;step<limit;step++) {
        const next=union(initial,accumulated,readCallback(callback.binding,[accumulated,values]));
        if([...next].some(origin=>!context.borrowOriginUniverse.has(origin)))throw unsupported('borrowed fold origin domain','requires actual finite input or static identities',node.span);
        if(sameOrigins(next,accumulated)){context.borrowFlowBudget.fixedPoints++;return next;}
        accumulated=next;
      }
      throw unsupported('borrowed fold fixed point','requires convergence of the actual checked accumulator leaves',node.span);
    }
    for(const value of node.args)read(value);
    return ['copied','cloned','take','collect'].includes(operation)?values:new Set();
  }
  if(node.k==='routerSharedArrayLiteral') {
    if(!node.arrayBorrowProof?.verified)throw unsupported('shared array lifetime origin','requires the checked source promotion or constant-extension proof',node.span);
    return uniformOrigins(node.type,new Set(['static']),context);
  }
  if(node.k==='array'&&node.type?.rustFixedArray&&node.fixedArrayProof?.verified) {
    const values=node.items.map(value=>read(value));
    // Rust checks a repeat operand against the expected element type even
    // when zero elements are stored. Retain that lifetime obligation.
    if(node.items.length===0&&node.fixedArrayProof.syntax==='repeat')values.push(read(node.repeatSeed));
    return borrowed?union(...values.map(value=>prefix(value,['element']))):new Set();
  }
  if(node.k==='routerSharedMethodReceiver') {
    const proof=node.receiverProof;
    const existing=proof?.kind==='existing-shared-receiver'&&proof.source?.kind==='shared'&&proof.source.tokens?.[0]?.value==='&'&&node.object.type?.rustReference?.kind==='shared';
    return existing?read(node.object):borrowed?new Set([UNKNOWN]):new Set();
  }
  if(node.k==='routerTry') {
    const value=read(node.value);
    // Option's None residual contains no borrow; Some passes its actual leaf
    // origins. Result residual lifetimes need separate error-origin lowering.
    if(!node.option&&(borrowed||hasBorrow(node.value.type,context))&&!closedStringErrorTry(node,context))throw unsupported('borrowed Result propagation','requires checked residual error lifetime origins',node.span);
    return borrowed?project(value,['argument',0]):new Set();
  }
  if(node.k==='routerStaticArrayElement'&&hasStaticElementOrigin(node))return uniformOrigins(node.type,new Set(['static']),context);
  if(node.k==='lit'&&typeof node.value==='string'&&node.type?.rustBorrowLifetime?.source==='string-literal'&&node.type.rustBorrowLifetime.kind==='static')return staticOrigin();
  if(node.k==='let') {
    const value=read(node.value),inner=new Map(env);
    if(node.sourceBindingLifetimeType&&!emptyBorrowValue(node.value,context))checkLocalBorrow(value,node.sourceBindingLifetimeType,context,node.span??context.entry.span);
    const mutableBorrowLocals=new Map(context.mutableBorrowLocals);
    mutableBorrowLocals.delete(node.name); // A shadow never writes its outer local.
    if(node.mutable&&hasBorrow(node.value.type,context)) {
      if(!copiedBorrowLocal(node.value.type))throw unsupported('mutable borrowed local','requires a checked copied shared scalar reference or borrowed str binding',node.span??context.entry.span);
      mutableBorrowLocals.set(node.name,{type:node.value.type,writtenType:node.sourceBindingLifetimeType??null});
      context.borrowFlowBudget.mutableBindings++;
    }
    inner.set(node.name,value);
    const exitStart=context.loopExitStates?.length??0;
    const result=origins(node.body,inner,{...context,mutableBorrowLocals},returns,depth+1);
    // An exit captures outer bindings, never a same-named lexical shadow.
    for(const state of context.loopExitStates?.slice(exitStart)??[])if(env.has(node.name))state.set(node.name,env.get(node.name));else state.delete(node.name);
    propagateLocals(env,inner,context,node.name);return result;
  }
  if(node.k==='routerOriginalCallbackLoan'){if(!hasOriginalCallbackLoan(node))throw unsupported('original callback loan','requires its privately checked original source',node.span);const value=read(node.value);return leafOrigins(new Map(sourceBorrowRegions(node.type,context).map(region=>[key(region.path),region.path[0]==='pointee'?at(value,region.path.slice(1)):new Set(['standard-method-local-loan'])])));}
  if(node.k==='routerOriginalStandardFrame'){if(!hasOriginalSourceFrame(node))throw unsupported('original standard return frame','requires its privately checked original method body',node.span);const localReturns=[],value=origins(node.body,new Map(env),{...context,loopExitStates:[]},localReturns,depth+1);return union(value,...localReturns.map(returned=>returned.value));}
  if(node.k==='routerSourcePatternStringView'){if(context.sourceSharedPatternReader?.(node)!=='string-view')throw unsupported('original shared String view','requires a privately checked original pattern field coercion',node.span);return uniformOrigins(node.type,at(read(node.receiver),[]),context);}
  if(node.k==='routerOriginalSharedPatternMatch'){if(context.sourceSharedPatternReader?.(node)!=='frame')throw unsupported('original shared pattern origins','requires its privately checked original caller match',node.span);return read(node.body);}
  if(node.k==='routerSourcePatternProjection'){if(context.sourceSharedPatternReader?.(node)!=='projection')throw unsupported('original shared field origins','requires its privately checked selected source field',node.span);const value=read(node.object),proof=node.sourcePatternProjectionProof,entry=context.declarations.get(proof.data),field=entry?.ctors.find(ctor=>ctor.name===proof.ctor)?.fields.find(field=>field.name===proof.field);if(!field||!sameType(field.type,proof.declaredType))throw unsupported('original shared field origins','source constructor payload identity changed',node.span);if(!borrowed)return new Set();const fieldPath=entry.standardGeneric?['argument',entry.standardGeneric.kind==='Result'&&proof.ctor==='Err'?1:0]:['constructor',proof.ctor,'field',proof.field],stored=proof.borrowed?['pointee',...fieldPath]:fieldPath;return leafOrigins(new Map(sourceBorrowRegions(node.type,context).map(region=>[key(region.path),proof.borrowed&&region.path.length===0?at(value,[]):at(value,[...stored,...(proof.borrowed&&region.path[0]==='pointee'?region.path.slice(1):region.path)])])));}
  if(node.k==='routerOriginalSharedDomainGuard'){if(!hasOriginalSharedDomainGuard(node))throw unsupported('shared immutable value guard','requires its actual privately checked source specialization',node.span);return read(node.value);}
  if(node.k==='routerPinnedSharedBody'){if(!hasPinnedSharedOrigin(node)||node.body?.k!=='let'||node.body.value.type?.rustReference?.kind!=='shared')throw unsupported('original shared body origins','requires the actual privately checked source receiver and specialization',node.span);const value=read(node.body.value);return leafOrigins(new Map(sourceBorrowRegions(node.type,context).map(region=>{const [argument,index,place,...inner]=region.path;if(argument!=='argument'||!Number.isInteger(index))throw unsupported('shared body result origins','requires its actual canonical shared generic argument',node.span);const source=place==='pointee'?['pointee','argument',index,...inner]:[];return [key(region.path),at(value,source)];})));}
  if(node.k==='routerOriginalMappedBody'){if(!hasOriginalMappedOrigin(node))throw unsupported('mapped standard borrow origins','requires its privately checked original source frame',node.span);return read(node.body);}
  if(['routerPinnedStandardBody','routerPinnedOptionCallbackBody'].includes(node.k))return read(node.body);
  if(node.k==='routerOrderedArm'){if(node.guard)read(node.guard);return read(node.body);}
  if(node.k==='routerOrderedMatchArms') {
    const states=[],values=node.branches.map(branch=>{const inner=new Map(env);read(branch.cond,inner);const value=read(branch.body,inner);states.push(inner);return value;});
    joinLocals(env,states,context);return union(...values);
  }
  if(['routerPanic','abort'].includes(node.k)){for(const value of node.args??[])read(value);return new Set();}
  if(node.k==='routerSet') {
    const value=read(node.value),target=node.target;
    if(target?.k!=='var')throw unsupported('borrow assignment target','requires an actual checked local variable',node.span??context.entry.span);
    if(hasBorrow(target.type,context)) {
      const binding=context.mutableBorrowLocals.get(target.name);
      if(!binding||!copiedBorrowLocal(target.type))throw unsupported('mutable borrowed assignment','requires its checked copied-reference local binding',node.span??context.entry.span);
      if(context.callbackCapturedBorrowLocals?.has(binding))throw unsupported('mutable borrowed callback capture','requires separate lazy callback execution and capture lifetime flow',node.span??context.entry.span);
      checkLocalBorrow(value,binding.writtenType,context,node.span??context.entry.span);
      env.set(target.name,value);
    }
    return read(node.body);
  }
  if(['if','routerIf'].includes(node.k)) {
    read(node.cond);const then=new Map(env),otherwise=new Map(env);
    const branches=union(read(node.then,then),read(node.else,otherwise));joinLocals(env,[then,otherwise],context);
    return node.k==='routerIf'?union(branches,read(node.body)):branches;
  }
  if(['routerWhile','routerFor'].includes(node.k)) {
    const loopInputOrigins=node.k==='routerFor'?read(node.object):null;
    const initial=new Map(env),state=new Map(env);
    const cells=[...context.mutableBorrowLocals.values()].reduce((sum,binding)=>sum+sourceBorrowRegions(binding.type,context).length,0);
    const limit=1+cells*context.borrowOriginUniverse.size;
    let converged=false;
    for(let step=0;step<limit;step++) {
      const iteration=new Map(state),loopExitStates=[],loopContext={...context,loopInputOrigins,loopExitStates};
      if(node.k==='routerWhile'){origins(node.cond,iteration,loopContext,returns,depth+1);loopExitStates.push(new Map(iteration));origins(node.loopBody,iteration,loopContext,returns,depth+1);}
      else origins(node.loopBody,iteration,loopContext,returns,depth+1);
      const next=new Map(state);joinLocals(next,[initial,state,iteration,...loopExitStates],context);
      for(const name of context.mutableBorrowLocals.keys())if([...(next.get(name)??[])].some(origin=>!context.borrowOriginUniverse.has(origin)))throw unsupported('borrow loop origin domain','requires a finite actual signature origin or static source identity',node.span??context.entry.span);
      if(sameLocals(state,next,context)){converged=true;propagateLocals(env,next,context);break;}
      propagateLocals(state,next,context);
    }
    if(!converged)throw unsupported('borrow loop fixed point','requires convergence of the finite copied-reference origin domain',node.span??context.entry.span);
    context.borrowFlowBudget.fixedPoints++;
    return read(node.body);
  }
  if(node.k==='match') {
    const subject=read(node.scrutinee),states=[];
    const values=node.cases.map(arm=>{
      const inner=new Map(env),mutableBorrowLocals=new Map(context.mutableBorrowLocals),pattern=arm.pattern;
      const shadows=[],exitStart=context.loopExitStates?.length??0;
      const bind=(name,value)=>{if(name&&name!=='_'){shadows.push(name);inner.set(name,value);mutableBorrowLocals.delete(name);}};
      if(pattern.k==='bind'||pattern.k==='natSucc')bind(pattern.name,subject);
      else if(pattern.k==='ctor') {
        const type=node.scrutinee.type,owner=context.declarations.get(type.name),ctor=owner?.ctors.find(value=>value.name===pattern.ctor);
        if(type.kind!=='data'||pattern.data!==type.name||!ctor||pattern.binds.length!==ctor.fields.length)throw unsupported('match borrow field origins','requires its actual checked constructor owner and arity',node.span);
        pattern.binds.forEach((name,index)=>{
          if(!name||name==='_')return;
          if(type.rustReference) {
            const bindingType=sharedPrimitiveMatchBinding(type,owner,ctor,pattern,index,context,node.span);
            // Borrowing the primitive field retains the receiver's outer
            // region. Operator dereference still has a nonborrowed result;
            // this creates no static, Copy-layout or aggregate authority.
            bind(name,uniformOrigins(bindingType,new Set(at(subject,[])),context));return;
          }
          if(owner.tuple)bind(name,project(subject,['tuple',index]));
          else if(owner.standardGeneric?.kind==='Option')bind(name,project(subject,['argument',0]));
          else if(owner.standardGeneric?.kind==='Result')bind(name,project(subject,['argument',pattern.ctor==='Err'?1:0]));
          else {
            const field=context.resolveType(ctor.fields[index].type,owner.modulePath,node.span),regions=sourceBorrowRegions(field,context);
            bind(name,regions.length&&regions.every(region=>region.kind==='static')?uniformOrigins(field,new Set(['static']),context):regions.length?uniformOrigins(field,new Set([UNKNOWN]),context):new Set());
          }
        });
      }
      const value=origins(arm.body,inner,{...context,mutableBorrowLocals},returns,depth+1),state=new Map(env);
      for(const exit of context.loopExitStates?.slice(exitStart)??[])for(const name of shadows)if(env.has(name))exit.set(name,env.get(name));else exit.delete(name);
      propagateLocals(state,inner,{...context,mutableBorrowLocals});states.push(state);return value;
    });
    joinLocals(env,states,context);return union(...values);
  }
  if(node.k==='routerReturn') {
    const value=read(node.value),existing=returns.find(returned=>returned.node===node.value);
    if(existing)existing.value=union(existing.value,value);else returns.push({value,node:node.value});
    if(node.body)origins(node.body,new Map(env),{...context,loopExitStates:[]},[],depth+1);
    return new Set();
  }
  if(node.k==='routerBreak'||node.k==='routerContinue') {
    context.loopExitStates?.push(new Map(env));
    if(node.body)origins(node.body,new Map(env),{...context,loopExitStates:[]},[],depth+1);
    return new Set();
  }
  if(node.k==='binary'&&['and','or'].includes(node.op)) {
    read(node.left);const skipped=new Map(env),taken=new Map(env);read(node.right,taken);
    joinLocals(env,[skipped,taken],context);return new Set();
  }
  if(node.k==='call') {
    const arguments_=node.args.map(value=>read(value)),signature=context.signatures.get(node.fn);
    if(!signature) return borrowed?new Set([UNKNOWN]):new Set();
    checkStaticArguments(signature,arguments_,node.span??context.entry.span);
    return leafOrigins(new Map(signature.outputs.map(region=>{
      const inputs=signature.params.flat().filter(input=>input.identity===region.identity);
      // An instantiated named lifetime is constrained by every contributing
      // input. Choosing just its first input could allow the second to escape.
      const origin=region.identity==='static'?new Set(['static']):inputs.length?new Set(inputs.flatMap(input=>[...(arguments_[input.param]?at(arguments_[input.param],input.path):new Set([UNKNOWN]))])):new Set([UNKNOWN]);
      return [key(region.path),origin];
    })));
  }
  if(node.k==='routerHostCall') {
    const arguments_=node.args.map(value=>read(value));
    if(borrowed&&hasOriginalRouterCoreJsonProjection(node))return uniformOrigins(node.type,at(arguments_[0]??new Set([UNKNOWN]),[]),context);
    // Registered shared receiver methods borrow from that receiver; no
    // lifetime permission is inferred for free functions or owned receivers.
    const contract=node.contract??context.hostContracts?.find(contract=>contract.id===node.id);
    const receiver=node.args[0]?.type;
    if(borrowed&&contract?.kind==='method'&&(receiver?.rustReference||receiver?.rustOwnership?.kind==='borrowed'))return uniformOrigins(node.type,at(arguments_[0]??new Set([UNKNOWN]),[]),context);
    return borrowed?new Set([UNKNOWN]):new Set();
  }
  if(['routerOptionCallback','routerStandardMethod'].includes(node.k)) {
    const subject=read(node.value);
    if(node.operation==='bool_then_some'){
      const argument=read(node.argument);
      return borrowed?prefix(argument,['argument',0]):new Set();
    }
    const payload=project(subject,['argument',0]),fallback=node.defaultValue?read(node.defaultValue):new Set();
    const callback=node.callback;
    const called=callback?readCallback(callback.binding,Array.from({length:callback.arity},()=>payload)):new Set();
    if(!borrowed)return new Set();
    if(node.operation==='result_ok')return prefix(payload,['argument',0]);
    if(['option_map','bool_then'].includes(node.operation))return prefix(called,['argument',0]);
    return union(called,fallback,...(node.op==='or_else'?[subject]:[]));
  }
  if(node.k==='routerAlgebraicOperation') {const values=union(project(read(node.value),['argument',0]),...node.args.map(value=>read(value)));return borrowed?values:new Set();}
  if(node.k==='routerTextPattern') {
    const value=read(node.value);for(const argument of node.args)read(argument);
    return borrowed&&node.sourceProfile==='checked-str-pattern-v1'&&node.value.type.rustOwnership?.kind==='borrowed'?uniformOrigins(node.type,at(value,[]),context):borrowed?new Set([UNKNOWN]):new Set();
  }
  if(['routerStringOperation','routerStrip'].includes(node.k)) {
    const value=read(node.string);for(const arg of node.args??[])read(arg);if(node.search)read(node.search);
    return borrowed&&node.string?.type.rustOwnership?.kind==='borrowed'?uniformOrigins(node.type,at(value,[]),context):borrowed?new Set([UNKNOWN]):new Set();
  }
  if(node.k==='routerField') {
    const object=read(node.object),proof=node.sharedProjectionProof;
    const entry=proof?.pointee?.kind==='data'?context.declarations.get(proof.pointee.name):null;
    const field=entry?.ctors.flatMap(ctor=>ctor.fields).find(field=>field.name===node.field);
    // A copied source reference can retain the lifetime written on its actual
    // declared field. Nominal field lifetimes still supply no signature elision.
    if(field&&['source-shared-reference-copy','source-borrowed-str-copy'].includes(proof.copy?.kind)) {
      const regions=sourceBorrowRegions(context.resolveType(field.type,entry.modulePath,node.span),context);
      if(regions.length&&regions.every(region=>region.kind==='static'))return uniformOrigins(node.type,new Set(['static']),context);
    }
    return borrowed?object:new Set();
  }
  if(node.k==='routerTupleField') {
    const value=read(node.object),type=node.object.type,entry=type.kind==='data'?context.declarations.get(type.name):null;
    if(!entry?.tuple||entry.generated!=='router-tuple-type'||entry.ctors.length!==1||!Number.isSafeInteger(node.index)||node.index<0||!entry.ctors[0].fields[node.index])throw unsupported('tuple borrow field origins','requires its actual checked anonymous constructor and field index',node.span);
    if(type.rustReference)throw unsupported('borrowed tuple field origins','requires separate actual shared aggregate field projection evidence',node.span);
    return borrowed?project(value,['tuple',node.index]):new Set();
  }
  if(['routerPatternProjection','routerTupleProjection','routerDataField'].includes(node.k)) {
    const value=read(node.object),entry=node.object.type.kind==='data'?context.declarations.get(node.object.type.name):null;
    if(!borrowed)return new Set();
    const index=Number(/^field(\d+)$/u.exec(node.field)?.[1]);
    if(entry?.tuple&&Number.isInteger(index))return project(value,['tuple',index]);
    if(entry?.standardGeneric?.kind==='Option'&&node.field==='field0')return project(value,['argument',0]);
    if(entry?.standardGeneric?.kind==='Result')return new Set([UNKNOWN]);
    return value;
  }
  if(node.k==='ctor') {
    const values=node.args.map(value=>read(value));
    const declaration=context.declarations.get(node.data),ctor=declaration?.ctors.find(ctor=>ctor.name===node.ctor);
    if(ctor)checkStaticArguments({params:ctor.fields.map((field,index)=>sourceBorrowRegions(node.type?.rustTupleLifetimeFields?.[index]??context.resolveType(field.type,declaration.modulePath,node.span),context))},values,node.span??context.entry.span);
    const result=declaration?.tuple?union(...values.map((value,index)=>prefix(value,['tuple',index]))):declaration?.standardGeneric?union(...values.map(value=>prefix(value,['argument',node.ctor==='Err'?1:0]))):union(...values);
    if(ctor&&ctor.fields.every((field,index)=>!hasBorrow(context.resolveType(field.type,declaration.modulePath,node.span),context)||values[index]?.emptyBorrow))result.emptyBorrow=true;
    return result;
  }
  if(node.k==='routerDiscard') {read(node.value);return read(node.body);}
  if(node.k==='routerControlInitializer')return read(node.value);
  // All child expressions are still visited, including static-parameter calls
  // whose own return type contains no references.
  for(const [key,value] of Object.entries(node)) {
    if(['type','span','contract','patternControl','nestedMatchAlternatives','dereferenceProof'].includes(key))continue;
    if(value?.k)read(value);else if(Array.isArray(value))for(const item of value)if(item?.k)read(item);
  }
  return borrowed?new Set([UNKNOWN]):new Set();
}

function emptyBorrowValue(node,context,depth=0) {
  if(!node||depth>256)return false;
  const empty=value=>emptyBorrowValue(value,context,depth+1);
  if(node.k==='array'&&node.type?.rustFixedArray?.length===0&&node.items.length===0&&node.fixedArrayProof?.verified&&node.fixedArrayProof.syntax!=='repeat')return true;
  if(['routerReturn','routerBreak','routerContinue','routerPanic','abort'].includes(node.k))return true;
  if(['let','routerDiscard','routerSet','routerWhile','routerFor','routerIf'].includes(node.k))return empty(node.body);
  if(node.k==='if')return empty(node.then)&&empty(node.else);
  if(node.k==='match')return node.cases.every(arm=>empty(arm.body));
  if(node.k==='ctor') {
    const entry=context.declarations.get(node.data),ctor=entry?.ctors.find(ctor=>ctor.name===node.ctor);
    // Ok(None) contains no reference even though its declared success type
    // does. Follow only the actual checked constructor's exact arguments;
    // inhabited borrowed fields must still supply their normal leaf origins.
    return Boolean(ctor&&Array.isArray(node.args)&&node.args.length===ctor.fields.length&&ctor.fields.every((field,index)=>{
      const type=context.resolveType(field.type,entry.modulePath,node.span),value=node.args[index];
      return Boolean(value?.type&&sameType(value.type,type)&&(!hasBorrow(type,context)?!hasBorrow(value.type,context):empty(value)));
    }));
  }
  return false;
}

// Result's Err residual is nonborrowed here; this does not infer origins for
// arbitrary errors or stored aggregate loans. Existing return/static checks
// still consume the actual success leaf origins below.
function closedStringErrorTry(node,context){
 const checker=context.checker;if(!checker||!hasOriginalJsonStringErrorContext(checker,context.entry))return false;
 const input=canonicalResult(checker,node.value.type,context.entry.modulePath,node.span,false),output=canonicalResult(checker,context.entry.ret,context.entry.modulePath,node.span,false);
 if(!input||!output)return false;
 const string=type=>type.kind==='string'&&type.rustSourceType===true&&!type.rustReference&&!type.rustBorrowingUnresolved&&!type.rustGenericIdentityUnresolved&&type.rustOwnership?.kind==='owned'&&type.rustOwnership.source==='String'&&[undefined,'ownership-bearing String type','owned String source type','owned String formatting'].includes(type.patternOwnershipRefusal);
 if(!string(input.error)||!string(output.error)||!sameType(input.error,output.error)||hasBorrow(input.error,context)||hasBorrow(output.error,context)||!sameType(input.success,node.type))return false;
 checker.expectedOwnership(input.error,output.error,context.entry.modulePath,node.span);checker.expectedPrimitiveIdentity(input.error,output.error,context.entry.modulePath,node.span);checker.expectedOwnership(node.type,input.success,context.entry.modulePath,node.span);
 const success=input.success;
 if(success.kind==='string'&&!success.rustReference&&!success.patternOwnershipRefusal&&success.rustSourceType===true&&success.rustOwnership?.kind==='borrowed'&&success.rustOwnership.source==='str')return true;
 const pointee=success.rustReference?.pointee,owner=pointee?.kind==='data'?context.declarations.get(pointee.name):null,name=owner?.hostTypePath?.join('::'),original=JSON_DATA[0].items.find(item=>'serde_json::'+item.name===name);
 if(!sharedReferenceCopyIdentity(success)||success.rustReference?.kind!=='shared'||pointee?.rustReference||pointee?.rustOwnership||pointee?.patternOwnershipRefusal||!original||!['serde_json::Value','serde_json::Map_String_Value'].includes(name)||owner.generated!=='router-json-contract'||owner.ctors.length!==original.ctors.length)return false;
 for(const [at,expected]of original.ctors.entries()){
  const actual=owner.ctors[at];if(actual.name!==expected.name||actual.fields.length!==expected.fields.length)return false;
  for(const [index,field]of expected.fields.entries())if(actual.fields[index].name!==field.name||!sameType(checker.resolveType(actual.fields[index].type,owner.modulePath,node.span),checker.hostType(field.type,owner.modulePath,node.span)))return false;
 }
 return true;
}

export function withSourceLifetimeChecker(Base) {
  return class extends Base {
    expr(node,env,path,expected,allowLiteral=false) {
      const value=super.expr(node,env,path,expected,allowLiteral);
      if(this.language!=='Rust'||node.k!=='let'||!node.type)return value;
      const declared=this.resolveType(node.type,path,node.span);
      const context={declarations:this.items,resolveType:(type,scope,span)=>this.resolveType(type,scope,span)};
      if(!sourceBorrowRegions(declared,context).some(region=>region.kind==='static'||namedKind(region.kind)))return value;
      if(value.k!=='let')throw unsupported('local static borrow constraint','requires the original checked local binding',node.span);
      return {...value,sourceBindingLifetimeType:declared};
    }
    program(surface) {
      const mutableParameters=new Map();
      const collect=(items,path=[])=>{for(const item of items)if(item.k==='module')collect(item.items,[...path,item.name]);else if(item.k==='fn')mutableParameters.set([...path,item.name].join('.'),item.params.filter(param=>param.mutable).map(param=>param.name));};
      collect(surface.items);
      const program=super.program(surface),context={checker:this,sourceSharedPatternReader:node=>this.sourceSharedPatternProofOrigin?.(node),declarations:program.declarations,resolveType:(type,path,span)=>this.resolveType(type,path,span)};
      const signatures=new Map();
      for(const entry of program.declarations.values())if(entry.k==='fn')signatures.set(entry.fullName,functionLifetimeSignature(entry,context));
      for(const entry of program.declarations.values())if(entry.k==='fn') {
        if(entry.params.some(param=>mutableParameters.get(entry.fullName)?.includes(param.name)&&hasBorrow(param.type,context)))throw unsupported('mutable borrowed parameter','the lifetime profile requires immutable borrow bindings',entry.span);
        const signature=signatures.get(entry.fullName),env=new Map(entry.params.map((param,index)=>[param.name,leafOrigins(new Map(signature.params[index].map(region=>[key(region.path),new Set([region.identity])]))) ]));
        const borrowFlowBudget={steps:0,mutableBindings:0,fixedPoints:0},borrowOriginUniverse=new Set(['static',UNKNOWN,...signature.params.flat().map(region=>region.identity)]);
        const returns=[],result=origins(entry.body,env,{...context,entry,signatures,hostContracts:this.sourceLifetimeHostContracts,mutableBorrowLocals:new Map(),borrowOriginUniverse,borrowFlowBudget},returns);
        if(signature.outputs.length)for(const {value:actual,node} of [...returns,{value:result,node:entry.body}]) {
          if(!actual.size&&!emptyBorrowValue(node,context))throw unsupported('escaping source borrow','the checked returned value has no proven borrow origin or empty borrowed variant',entry.span);
          for(const output of signature.outputs)for(const origin of at(actual,output.path))if(origin!=='static'&&origin!==output.identity)throw unsupported('escaping source borrow','the checked returned leaf lacks a proven input or static lifetime origin',entry.span);
        }
        const leaves=value=>[...(value.leaves??[])].map(([path,origins])=>({path:JSON.parse(path),origins:[...origins].sort()}));
        entry.sourceLifetimeProof={...signature,returnOrigins:[...union(result,...returns.map(returned=>returned.value))].sort(),returnLeaves:leaves(result),explicitReturnLeaves:returns.map(returned=>({span:returned.node.span??entry.span,leaves:leaves(returned.value)})),...(borrowFlowBudget.mutableBindings?{copiedLocalFlow:{profile:'finite-copied-shared-local-origins-v1',steps:borrowFlowBudget.steps,fixedPoints:borrowFlowBudget.fixedPoints,originDomain:[...borrowOriginUniverse].sort(),mutablePointeeAccess:false,mutableParameterSupport:false}}:{})};
      }
      return program;
    }
  };
}
