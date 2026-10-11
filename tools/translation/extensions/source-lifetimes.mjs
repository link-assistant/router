// Function elision and return origins are proof obligations, not value-domain
// equivalence. This bounded adapter does not manufacture reference lifetimes.
import {unsupported,typeError} from '../vendor/meta-language/translation/diagnostics.js';

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
  return values[1]!=="'"?'elided':values[2]==='static'?'static':null;
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

export function functionLifetimeSignature(entry,context={}) {
  const params=entry.params.map((param,index)=>sourceBorrowRegions(param.type,context).map(region=>({...region,param:index,identity:region.kind==='static'?'static':`input:${index}:${JSON.stringify(region.path)}`})));
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
    } else output.identity='static';
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

// Checked IR is interpreted only as origin evidence. Values and bodies are
// neither evaluated nor rewritten. Unknown operations retain a refusal.
function origins(node,env,context,returns,depth=0) {
  if(!node)return new Set();
  if(depth>256)throw unsupported('borrow origin traversal','requires a bounded checked expression graph',context.entry.span);
  const read=(value,scope=env)=>origins(value,scope,context,returns,depth+1);
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
  if(node.k==='var')return borrowed?(env.get(node.name)??new Set([UNKNOWN])):new Set();
  if(node.k==='routerStandardSharedReceiver')return borrowed?project(read(node.object),['pointee']):new Set();
  if(node.k==='routerReverseSplitFind'){
    if(node.reverseStringProof?.profile!=='rust-1.89-reverse-scalar-character-split'||node.reverseStringProof.verified!==true)throw unsupported('reverse Split borrow origin','requires its actual checked double-ended profile',node.span);
    const values=read(node.object);origins(node.predicate.binding,env,{...context,lambdaInputs:[values]},returns,depth+1);
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
      const called=origins(node.callback.binding,env,{...context,lambdaInputs:[project(value,['argument',1])]},returns,depth+1);
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
  if(node.k==='routerLambdaInput')return borrowed?(context.lambdaInputs?.[node.position]??new Set([UNKNOWN])):new Set();
  if(node.k==='routerPrimitiveDereference'&&node.dereferenceProof?.kind==='shared-str-reference-copy')return borrowed?project(read(node.value),['pointee']):new Set();
  if(node.k==='routerIteratorOperation') {
    const values=read(node.object),operation=node.op;
    const element=node.type.kind==='routerIterator'?node.type.element:null;
    if(operation==='iter')return element?uniformOrigins(element,at(values,[]),context):new Set();
    if(['map','filter','find_map','filter_map','find','any','all'].includes(operation)) {
      const callback=node.args[0],called=origins(callback.binding,env,{...context,lambdaInputs:[values]},returns,depth+1);
      if(operation==='find_map')return borrowed?called:new Set();
      if(operation==='find')return borrowed?prefix(values,['argument',0]):new Set();
      if(operation==='filter_map')return project(called,['argument',0]);
      if(operation==='map')return called;
      return operation==='filter'?values:new Set();
    }
    if(operation==='flatten')return element?uniformOrigins(element,new Set(values),context):new Set();
    if(operation==='fold') {
      const initial=read(node.args[0]),callback=node.args[1];
      return origins(callback.binding,env,{...context,lambdaInputs:[initial,values]},returns,depth+1);
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
    if(!node.option&&(borrowed||hasBorrow(node.value.type,context)))throw unsupported('borrowed Result propagation','requires checked residual error lifetime origins',node.span);
    return borrowed?project(value,['argument',0]):new Set();
  }
  if(node.k==='lit'&&typeof node.value==='string'&&node.type?.rustBorrowLifetime?.source==='string-literal'&&node.type.rustBorrowLifetime.kind==='static')return staticOrigin();
  if(node.k==='let') {
    if(node.mutable&&hasBorrow(node.value.type,context))throw unsupported('mutable borrowed local','the lifetime profile requires immutable borrow bindings',node.span??context.entry.span);
    const value=read(node.value),inner=new Map(env);
    if(node.sourceBindingLifetimeType&&!emptyBorrowValue(node.value,context))checkStaticArguments({params:[sourceBorrowRegions(node.sourceBindingLifetimeType,context)]},[value],node.span??context.entry.span);
    inner.set(node.name,value);return read(node.body,inner);
  }
  if(node.k==='routerOrderedArm'){if(node.guard)read(node.guard);return read(node.body);}
  if(node.k==='routerOrderedMatchArms')return union(...node.branches.map(branch=>{read(branch.cond);return read(branch.body);}));
  if(['routerPanic','abort'].includes(node.k)){for(const value of node.args??[])read(value);return new Set();}
  if(['if','routerIf'].includes(node.k)){read(node.cond);const branches=union(read(node.then),read(node.else));return node.k==='routerIf'?union(branches,read(node.body)):branches;}
  if(node.k==='match') {
    const subject=read(node.scrutinee);
    return union(...node.cases.map(arm=>{const inner=new Map(env);for(const name of arm.pattern.binds??[])if(name)inner.set(name,subject);return read(arm.body,inner);}));
  }
  if(node.k==='routerReturn') {const value=read(node.value);returns.push({value,node:node.value});return new Set();}
  if(node.k==='call') {
    const arguments_=node.args.map(value=>read(value)),signature=context.signatures.get(node.fn);
    if(!signature) return borrowed?new Set([UNKNOWN]):new Set();
    checkStaticArguments(signature,arguments_,node.span??context.entry.span);
    return leafOrigins(new Map(signature.outputs.map(region=>{
      const input=signature.params.flat().find(input=>input.identity===region.identity);
      const origin=region.identity==='static'?new Set(['static']):input&&arguments_[input.param]?at(arguments_[input.param],input.path):new Set([UNKNOWN]);
      return [key(region.path),origin];
    })));
  }
  if(node.k==='routerHostCall') {
    const arguments_=node.args.map(value=>read(value));
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
    const called=callback?origins(callback.binding,env,{...context,lambdaInputs:Array.from({length:callback.arity},()=>payload)},returns,depth+1):new Set();
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

function emptyBorrowValue(node,context) {
  if(!node)return false;
  if(node.k==='array'&&node.type?.rustFixedArray?.length===0&&node.items.length===0&&node.fixedArrayProof?.verified&&node.fixedArrayProof.syntax!=='repeat')return true;
  if(['routerReturn','routerPanic','abort'].includes(node.k))return true;
  if(node.k==='let'||node.k==='routerDiscard')return emptyBorrowValue(node.body,context);
  if(node.k==='if')return emptyBorrowValue(node.then,context)&&emptyBorrowValue(node.else,context);
  if(node.k==='match')return node.cases.every(arm=>emptyBorrowValue(arm.body,context));
  if(node.k==='ctor') {
    const entry=context.declarations.get(node.data),ctor=entry?.ctors.find(ctor=>ctor.name===node.ctor);
    return Boolean(ctor&&ctor.fields.every(field=>!hasBorrow(context.resolveType(field.type,entry.modulePath,node.span),context)));
  }
  return false;
}

export function withSourceLifetimeChecker(Base) {
  return class extends Base {
    expr(node,env,path,expected,allowLiteral=false) {
      const value=super.expr(node,env,path,expected,allowLiteral);
      if(this.language!=='Rust'||node.k!=='let'||!node.type)return value;
      const declared=this.resolveType(node.type,path,node.span);
      const context={declarations:this.items,resolveType:(type,scope,span)=>this.resolveType(type,scope,span)};
      if(!sourceBorrowRegions(declared,context).some(region=>region.kind==='static'))return value;
      if(value.k!=='let')throw unsupported('local static borrow constraint','requires the original checked local binding',node.span);
      return {...value,sourceBindingLifetimeType:declared};
    }
    program(surface) {
      const mutableParameters=new Map();
      const collect=(items,path=[])=>{for(const item of items)if(item.k==='module')collect(item.items,[...path,item.name]);else if(item.k==='fn')mutableParameters.set([...path,item.name].join('.'),item.params.filter(param=>param.mutable).map(param=>param.name));};
      collect(surface.items);
      const program=super.program(surface),context={declarations:program.declarations,resolveType:(type,path,span)=>this.resolveType(type,path,span)};
      const signatures=new Map();
      for(const entry of program.declarations.values())if(entry.k==='fn')signatures.set(entry.fullName,functionLifetimeSignature(entry,context));
      for(const entry of program.declarations.values())if(entry.k==='fn') {
        if(entry.params.some(param=>mutableParameters.get(entry.fullName)?.includes(param.name)&&hasBorrow(param.type,context)))throw unsupported('mutable borrowed parameter','the lifetime profile requires immutable borrow bindings',entry.span);
        const signature=signatures.get(entry.fullName),env=new Map(entry.params.map((param,index)=>[param.name,leafOrigins(new Map(signature.params[index].map(region=>[key(region.path),new Set([region.identity])]))) ]));
        const returns=[],result=origins(entry.body,env,{...context,entry,signatures,hostContracts:this.sourceLifetimeHostContracts},returns);
        if(signature.outputs.length)for(const {value:actual,node} of [...returns,{value:result,node:entry.body}]) {
          if(!actual.size&&!emptyBorrowValue(node,context))throw unsupported('escaping source borrow','the checked returned value has no proven borrow origin or empty borrowed variant',entry.span);
          for(const output of signature.outputs)for(const origin of at(actual,output.path))if(origin!=='static'&&origin!==output.identity)throw unsupported('escaping source borrow','the checked returned leaf lacks a proven input or static lifetime origin',entry.span);
        }
        const leaves=value=>[...(value.leaves??[])].map(([path,origins])=>({path:JSON.parse(path),origins:[...origins].sort()}));
        entry.sourceLifetimeProof={...signature,returnOrigins:[...union(result,...returns.map(returned=>returned.value))].sort(),returnLeaves:leaves(result),explicitReturnLeaves:returns.map(returned=>({span:returned.node.span??entry.span,leaves:leaves(returned.value)}))};
      }
      return program;
    }
  };
}
