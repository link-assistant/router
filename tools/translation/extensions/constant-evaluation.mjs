import {checkedNominalNoDrop} from './option-nominal-proof.mjs';
// Concrete, bounded evaluation of checked Rust constants. This module never
// executes emitted JavaScript, metadata functions, or host runtime adapters.
import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
import {copyMetadata,snapshotMap,ownData,checkedSourceEvidence,metadataDigest,ordinal} from './source-links.mjs';
import {requirePrimitiveOperator} from './primitive-operators.mjs';

export const CONSTANT_EVALUATION_PROFILE=Object.freeze({schemaVersion:1,rustVersion:'1.89.0',pointerBits:64,
  arithmetic:'checked fixed integers',casts:'value-preserving fixed ranges and checked primitive two-complement as',shifts:'checked actual primitive shifts with count overflow',
  wrappingSourceProfileSha256:FIXED_WRAPPING_SOURCE_PROFILE.manifestSha256,wrappingMethods:Object.freeze(['wrapping_add','wrapping_sub']),
  arithmeticSource:'https://github.com/rust-lang/rust/blob/1.89.0/library/core/src/ops/arith.rs',
  arithmeticSha256:'3a4a38939d509b4df7b5942a5e7fc7e1bd60e7d122b0ee48eda3b650b462d09b',
  timeSource:'https://github.com/rust-lang/rust/blob/1.89.0/library/core/src/time.rs',
  timeSha256:'66088e332e93cdda1517f313b63eacc673d5a5042ba2a734ee2b31c707ee2173'});
const DEFAULT_LIMITS=Object.freeze({steps:100000,callDepth:32,nodeDepth:128,valueCells:16000,serializedBytes:262144,sourceBytes:1048576,normalizationCells:65536,normalizationBytes:1048576});
const TIME_OPERATIONS=new Map([['std_time_duration_from_secs','from_secs'],['std_time_duration_new','new'],['std_time_duration_from_millis','from_millis']]);
const sha256=value=>createHash('sha256').update(value).digest('hex');
class Refusal extends Error {
  constructor(status,reason,node){super(reason);this.status=status;this.span=node?.span;}
}
const refuse=(reason,node)=>{throw new Refusal('unsupported',reason,node);};
const panic=(reason,node)=>{throw new Refusal('const-panic',reason,node);};
function frozen(value){if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
// Explicitly encoded integers make the value/proof JSON serializable.
function canonical(value,depth=0,active=new Set(),budget={nodes:DEFAULT_LIMITS.valueCells,bytes:DEFAULT_LIMITS.serializedBytes}) {
  if(depth===0)value=copyMetadata(value,{cells:budget.nodes,bytes:budget.bytes});
  if(--budget.nodes<0)throw new Refusal('budget-exhausted','constant metadata cell budget exhausted');
  if(depth>128)refuse('constant metadata nesting exceeds the checked profile');
  if(typeof value==='bigint')return {$integer:value.toString()};
  if(typeof value==='string'){budget.bytes-=Buffer.byteLength(value);if(budget.bytes<0)throw new Refusal('budget-exhausted','constant metadata byte budget exhausted');return value;}
  if(value===null||typeof value==='boolean')return value;
  if(typeof value==='number'&&Number.isSafeInteger(value))return value;
  if(value===undefined)return null;
  if(!value||typeof value!=='object'||utilTypes.isProxy(value)||active.has(value)||![Object.prototype,Array.prototype,null].includes(Object.getPrototypeOf(value)))refuse('constant metadata must be acyclic plain checked data');
  active.add(value);
  const read=key=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);if(!descriptor||!('value'in descriptor))refuse('constant metadata accessors are unsupported');return canonical(descriptor.value,depth+1,active,budget);};
  let result;
  if(Array.isArray(value)){result=[];for(let index=0;index<value.length;index++)result.push(read(String(index)));}
  else {result=Object.create(null);for(const key of Object.keys(value).sort())result[key]=read(key);}
  active.delete(value);return result;
}
function bounds(type) {
  if(type?.kind!=='fixed'||![8,16,32,64,128].includes(type.bits)||typeof type.signed!=='boolean'||type.rustGenericIdentityUnresolved)refuse('constant integer requires an actual supported fixed type');
  const name=type.rustPrimitiveName;
  if(name){const expected=(type.signed?'i':'u')+type.bits;if(name!==expected&&name!==(type.signed?'isize':'usize'))refuse('constant integer source identity disagrees with its fixed domain');if(name.endsWith('size')&&type.bits!==64)refuse('constant pointer integer requires the explicit 64-bit profile');}
  const bits=BigInt(type.bits);return type.signed?{min:-(1n<<(bits-1n)),max:(1n<<(bits-1n))-1n}:{min:0n,max:(1n<<bits)-1n};
}
function sameType(actual,expected) {
  if(!actual||!expected||actual.kind!==expected.kind)return false;
  if(actual.rustPrimitiveName&&expected.rustPrimitiveName&&actual.rustPrimitiveName!==expected.rustPrimitiveName)return false;
  if(Boolean(actual.rustReference)!==Boolean(expected.rustReference))return false;
  if(actual.rustReference&&(!sameType(actual.rustReference.pointee,expected.rustReference.pointee)||actual.rustReference.kind!==expected.rustReference.kind))return false;
  if(actual.rustOwnership&&expected.rustOwnership&&(actual.rustOwnership.kind!==expected.rustOwnership.kind||actual.rustOwnership.source!==expected.rustOwnership.source))return false;
  if(actual.rustGenericIdentityUnresolved||expected.rustGenericIdentityUnresolved)return false;
  if(actual.rustStandardGeneric&&expected.rustStandardGeneric){const left=actual.rustStandardGeneric,right=expected.rustStandardGeneric;if(left.kind!==right.kind||left.arguments.length!==right.arguments.length||left.arguments.some((type,index)=>!sameType(type,right.arguments[index])))return false;}
  if(actual.kind==='fixed')return actual.bits===expected.bits&&actual.signed===expected.signed;
  if(actual.kind==='array')return actual.rustFixedArray?.length===expected.rustFixedArray?.length&&sameType(actual.element,expected.element);
  if(actual.kind==='data')return actual.name===expected.name;
  return ['bool','string','unit'].includes(actual.kind);
}
// Child selection is semantic, never a generic walk through proof/source
// objects: original pattern evidence can itself have k:'ctor' without data.
function children(node) {
  switch(node?.k){
    case 'lit':case 'unit':case 'var':case 'abort':return [];
    case 'let':return [node.value,node.body];
    case 'if':return [node.cond,node.then,node.else];
    case 'binary':return [node.left,node.right];
    case 'routerPrimitiveIntegerShift':case 'routerPrimitiveScalarBitwise':return [node.left,node.right];
    case 'routerPrimitiveIntegerCast':case 'routerPrimitiveIntegerNot':return [node.value];
    case 'unary':case 'cast':return [node.arg];
    case 'ctor':case 'call':case 'routerHostCall':return node.args;
    case 'array':return node.items;
    case 'match':if(!Array.isArray(node.cases))refuse('constant match requires checked cases',node);return [node.scrutinee,...node.cases.map(arm=>arm.body)];
    case 'routerSharedArrayLiteral':return [node.value];
    case 'routerSourceUnitEnumCast':return [node.body];
    default:refuse('constant operation has no checked evaluation semantics: '+node?.k,node);
  }
}
class Evaluator {
  constructor(program,options) {
    if(ownData(program,'sourceLanguage')!=='Rust'||ownData(program,'schemaVersion')!==1)refuse('constant evaluation requires a resolved checked Rust program');
    const option=key=>Object.hasOwn(options,key)?ownData(options,key):undefined;
    if(!options||utilTypes.isProxy(options)||Object.getPrototypeOf(options)!==Object.prototype)refuse('constant options require plain non-proxy data');
    const target=option('targetProfile')?copyMetadata(option('targetProfile')):null;
    if(target&&(target.pointerBits!==64||target.rustVersion!=='1.89.0'))refuse('constant evaluation target differs from the explicitly pinned Rust 1.89 64-bit profile');
    this.sourceProgram=program;this.program={declarations:snapshotMap(ownData(program,'declarations'))};this.safeEntries=new Set();
    this.sources=snapshotMap(option('sources')??new Map());this.contracts=snapshotMap(option('contracts')??new Map());this.sourceLinks=option('sourceLinks');
    this.limits={...DEFAULT_LIMITS,...copyMetadata(option('limits')??{})};
    for(const [name,value] of Object.entries(this.limits))if(!(name in DEFAULT_LIMITS)||!Number.isSafeInteger(value)||value<1||value>DEFAULT_LIMITS[name])refuse('constant evaluation limits must be positive bounded profile values');
    this.normalizationCells=0;
    this.steps=0;this.cells=0;this.stack=[];this.eligible=new Set();this.eligibilityActive=new Set();this.resolution=new Map();this.layouts=new Map();this.trace=[];
  }
  step(node){if(++this.steps>this.limits.steps)throw new Refusal('budget-exhausted','constant evaluation step budget exhausted',node);}
  cell(type,value,node){
    if(++this.cells>this.limits.valueCells)throw new Refusal('budget-exhausted','constant evaluation value budget exhausted',node);
    if(type?.kind==='fixed')this.exactInteger(value,type,node);
    else if(type?.kind==='bool'&&typeof value!=='boolean'||type?.kind==='string'&&(typeof value!=='string'||/[\ud800-\udfff]/u.test(value))||type?.kind==='unit'&&value!==null)refuse('constant value differs from its checked scalar domain',node);
    return {type,value};
  }
  exactInteger(value,type,node,operation=false){const {min,max}=bounds(type);if(typeof value!=='bigint')refuse('checked constant integer is not an exact BigInt',node);if(value<min||value>max)(operation?panic:refuse)('constant integer outside '+(type.rustPrimitiveName??(type.signed?'i':'u')+type.bits),node);return value;}
  source(entry) {
    const linked=checkedSourceEvidence(this.sourceLinks,entry);
    if(linked){if(linked.targetProfileSha256!==metadataDigest(CONSTANT_EVALUATION_PROFILE))refuse('constant source links have a different target profile',entry);if(linked.sourceBytes>this.limits.sourceBytes)throw new Refusal('budget-exhausted','constant original source exceeds the source budget',entry);return {...linked,sourceAssociation:'private-parser-source-links-v1'};}
    const evidence=this.sources.get(entry.fullName);
    const safe=evidence?copyMetadata(evidence,{cells:this.limits.normalizationCells,bytes:Math.min(this.limits.sourceBytes,this.limits.normalizationBytes)}):null;
    const valid=range=>range&&Number.isSafeInteger(range.start)&&Number.isSafeInteger(range.end)&&range.start>=0&&range.end>=range.start&&range.end<=safe.source.length;
    if(!safe||typeof safe.source!=='string'||typeof safe.sourcePath!=='string'||!valid(safe.declarationSpan)||!valid(safe.bodySpan))refuse('constant evaluation requires original declaration and body source spans',entry);
    if(Buffer.byteLength(safe.source)>this.limits.sourceBytes)throw new Refusal('budget-exhausted','constant source evidence exceeds the source budget',entry);
    if(!entry.span||entry.span.start!==safe.declarationSpan.start||entry.span.end!==safe.declarationSpan.end||safe.bodySpan.start<entry.span.start||safe.bodySpan.end>entry.span.end)refuse('constant source spans disagree with the checked declaration',entry);
    return {sourceAssociation:'unlinked checked-IR unit input',sourcePath:safe.sourcePath,sourceSha256:sha256(safe.source),declarationSpan:safe.declarationSpan,declarationSha256:sha256(safe.source.slice(entry.span.start,entry.span.end)),bodySpan:safe.bodySpan,bodySha256:sha256(safe.source.slice(safe.bodySpan.start,safe.bodySpan.end))};
  }
  safeEntry(name) {
    if(!this.safeEntries.has(name)){const entry=this.program.declarations.get(name);if(entry){const budget={cells:this.limits.normalizationCells,bytes:this.limits.normalizationBytes};this.program.declarations.set(name,copyMetadata(entry,{},0,new Set(),budget));this.normalizationCells=Math.max(this.normalizationCells,this.limits.normalizationCells-budget.cells);}this.safeEntries.add(name);}return this.program.declarations.get(name);
  }
  declaration(name) {
    const entry=this.safeEntry(name);
    if(entry)this.serialize(entry,true);
    if(!entry||entry.k!=='fn'||entry.fullName!==name||!entry.body||entry.async||(!entry.constant&&!entry.constFunction))refuse('constant call needs the actual resolved constant implementation: '+name,entry);
    return entry;
  }
  actualType(type,path=[]) {
    if(type?.kind==='array')return {...type,element:this.actualType(type.element,path)};
    if(type?.kind!=='named')return type;
    const segments=type.path[0]==='crate'?type.path.slice(1):type.path;
    const entry=this.safeEntry([...path,...segments].join('.'))??this.safeEntry(segments.join('.'));
    if(entry?.k!=='data')refuse('constant generic metadata has an unresolved named type');const {path:writtenPath,...metadata}=type;return {...metadata,kind:'data',name:entry.fullName};
  }
  layout(name) {
    const entry=this.safeEntry(name);
    if(entry)this.serialize(entry,true);
    if(entry?.k!=='data'||entry.fullName!==name||!Array.isArray(entry.ctors)||entry.ctors.some(ctor=>!Array.isArray(ctor.fields)||ctor.fields.some(field=>typeof field.name!=='string'||!field.type)))refuse('constant constructor requires a resolved checked data layout',entry);
    if(!this.layouts.has(name)){
      const standard=entry.standardGeneric;
      if(standard){
        const variants=standard.kind==='Option'?[['None',null],['Some',0]]:standard.kind==='Result'?[['Ok',0],['Err',1]]:null;
        if(!variants||standard.arguments?.length!==(standard.kind==='Option'?1:2)||entry.ctors.length!==2||variants.some(([variant,index])=>{const ctor=entry.ctors.find(ctor=>ctor.name===variant);return !ctor||ctor.fields.length!==(index===null?0:1)||index!==null&&(ctor.fields[0].name!=='field0'||!sameType(ctor.fields[0].type,this.actualType(standard.arguments[index],entry.modulePath)));}))refuse('constant standard generic needs exact registered argument and constructor layouts',entry);
      }
      if(entry.generated&&!standard&&!(entry.tuple&&entry.generated==='router-tuple-type')&&!(name==='std.time.Duration'&&entry.generated==='router-time-contract'))refuse('constant generated data has no pinned layout profile',entry);
      this.layouts.set(name,{name,checkedLayoutSha256:sha256(this.serialize({ctors:entry.ctors,standardGeneric:standard??null,tuple:entry.tuple??false},true)),...(entry.generated?{generated:entry.generated}:{source:this.source(entry)})});
    }
    return entry;
  }
  eligibleDeclaration(name) {
    if(this.eligible.has(name)||this.eligibilityActive.has(name))return;
    const entry=this.declaration(name);this.eligibilityActive.add(name);
    this.resolution.set(name,{name,source:this.source(entry),checkedBodySha256:sha256(this.serialize(entry.body,true))});
    if(!Array.isArray(entry.params)||entry.params.some(param=>param.guard||param.default||param.mutable))refuse('constant function parameters need plain immutable bindings',entry);
    this.eligibleNode(entry.body,0);this.eligibilityActive.delete(name);this.eligible.add(name);
  }
  eligibleNode(node,depth) {
    this.step(node);if(!node||depth>this.limits.nodeDepth)throw new Refusal('budget-exhausted','constant IR depth budget exhausted',node);
    if(node.constEligible===false||node.mutable||node.patternControl)refuse('constant control or operation is outside the bounded checked profile',node);
    if(node.k==='call')this.eligibleDeclaration(node.fn);
    if(node.k==='routerHostCall')this.hostContract(node);
    if(node.k==='binary'&&!['add','sub','mul','div','rem','eq','ne','lt','le','gt','ge','and','or'].includes(node.op))refuse('constant binary operator has no pinned evaluation profile',node);
    if(node.k==='binary'&&['eq','ne','lt','le','gt','ge'].includes(node.op)&&!['fixed','bool'].includes(node.left?.type?.kind))refuse('constant comparisons require primitive const permission; string/aggregate traits are unproved',node);
    if(node.k==='unary'&&!['not','neg'].includes(node.op))refuse('constant unary operator has no pinned evaluation profile',node);
    if(node.k==='ctor')this.layout(node.data);
    if(node.k==='array'&&node.type?.rustOwnership?.kind==='owned')refuse('constant owned collection allocation is outside the checked profile',node);
    if(node.k==='match')for(const arm of node.cases??[]){
      if(arm.guard||arm.guards||!['ctor','wild','bind'].includes(arm.pattern?.k))refuse('constant match requires normalized, unguarded checked constructor patterns',node);
      if(arm.pattern.k==='ctor'){this.layout(arm.pattern.data);if(node.scrutinee?.type?.name!==arm.pattern.data)refuse('constant match constructor owner differs from its checked subject',node);}
    }
    if(node.k==='routerSharedArrayLiteral'&&!node.arrayBorrowProof?.verified)refuse('constant array reference requires its separate source borrow proof',node);
    if(['routerPrimitiveIntegerCast','routerPrimitiveIntegerShift','routerPrimitiveScalarBitwise','routerPrimitiveIntegerNot'].includes(node.k))requirePrimitiveOperator(node);
    const operands=children(node);if(!Array.isArray(operands))refuse('constant operands must be a checked array',node);
    for(const operand of operands)this.eligibleNode(operand,depth+1);
  }
  serialize(value,normalization=false){const cells=this.limits.normalizationCells,bytes=normalization?this.limits.normalizationBytes:this.limits.serializedBytes,budget={nodes:cells,bytes},text=JSON.stringify(canonical(value,0,new Set(),budget));this.normalizationCells=Math.max(this.normalizationCells,cells-budget.nodes);if(Buffer.byteLength(text)>bytes)throw new Refusal('budget-exhausted',normalization?'constant checked-IR normalization byte budget exhausted':'constant serialized evidence budget exhausted');return text;}
  noDrop(type,active=new Set()) {
    if(type?.rustReference?.kind==='shared'&&type.rustReference.pointee)return true;
    if(type?.rustOwnership?.kind==='owned')return false;
    if(['fixed','bool','unit'].includes(type?.kind))return true;
    if(type?.kind==='string')return type.rustOwnership?.kind==='borrowed'&&type.rustOwnership.source==='str';
    if(type?.kind==='array')return this.noDrop(type.element,active);
    if(type?.kind==='data'&&checkedNominalNoDrop(this.sourceProgram,type))return true;
    const entry=type?.kind==='data'?this.layout(type.name):null;
    if(!entry||active.has(type.name)||(!entry.tuple&&!['Option','Result'].includes(entry.standardGeneric?.kind)))return false;
    active.add(type.name);const result=entry.ctors.every(ctor=>ctor.fields.every(field=>this.noDrop(field.type,active)));active.delete(type.name);return result;
  }
  call(name,args,node) {
    const entry=this.declaration(name);
    if(args.length!==entry.params.length)refuse('constant call argument count differs from its checked implementation',node);
    if(this.stack.includes(name))throw new Refusal('budget-exhausted','recursive constant calls are outside the initial bounded profile',node);
    if(this.stack.length>=this.limits.callDepth)throw new Refusal('budget-exhausted','constant call-depth budget exhausted',node);
    for(let index=0;index<args.length;index++)if(!sameType(args[index].type,entry.params[index].type)||!this.noDrop(entry.params[index].type))refuse('constant argument type, move or destructor is unproved',node);
    this.stack.push(name);this.trace.push({kind:'call',name,span:node?.span??entry.span});
    try{const value=this.evaluate(entry.body,new Map(entry.params.map((param,index)=>[param.name,args[index]])),0);if(!sameType(value.type,entry.ret))refuse('constant evaluated return differs from the checked signature',entry);return value;}
    finally{this.stack.pop();}
  }
  evaluate(node,env,depth) {
    this.step(node);if(depth>this.limits.nodeDepth)throw new Refusal('budget-exhausted','constant evaluation expression-depth budget exhausted',node);
    const result=value=>this.cell(node.type,value,node);
    switch(node.k){
      case 'unit':return result(null);
      case 'lit':{
        if(node.type?.kind==='fixed'){if(node.type.rustReference)refuse('constant integer literal has no checked borrow construction',node);if(typeof node.value!=='string'||!/^[-]?(0|[1-9][0-9]*)$/u.test(node.value))refuse('checked fixed constant literal needs canonical decimal text',node);return result(this.exactInteger(BigInt(node.value),node.type,node));}
        if(node.type?.kind==='bool'&&typeof node.value==='boolean'||node.type?.kind==='string'&&typeof node.value==='string')return result(node.value);
        if(node.type?.kind==='unit'&&node.value===null)return result(null);refuse('constant literal domain is unsupported',node);break;
      }
      case 'routerSourceUnitEnumCast':return this.evaluate(node.body,env,depth+1);
      case 'var':{const value=env.get(node.name);if(!value||!sameType(value.type,node.type))refuse('constant local is not bound to its checked type',node);return value;}
      case 'let':{
        const value=this.evaluate(node.value,env,depth+1);if(!this.noDrop(value.type))refuse('constant local destructor/move is not proved',node);
        return this.evaluate(node.body,new Map(env).set(node.name,value),depth+1);
      }
      case 'if':{
        const condition=this.evaluate(node.cond,env,depth+1);if(condition.type.kind!=='bool'||typeof condition.value!=='boolean')refuse('constant if condition is not checked bool',node);
        this.trace.push({kind:'branch',selected:condition.value?'then':'else',span:node.span});return this.evaluate(condition.value?node.then:node.else,env,depth+1);
      }
      case 'unary':{
        const arg=this.evaluate(node.arg,env,depth+1);
        if(node.op==='not'&&arg.type.kind==='bool')return result(!arg.value);
        if(node.op==='neg'&&node.semantics==='checked'&&arg.type.kind==='fixed'&&arg.type.signed&&!arg.type.rustReference)return result(this.exactInteger(-arg.value,node.type,node,true));
        refuse('constant unary operation has no checked scalar semantics',node);break;
      }
      case 'binary':return this.binary(node,env,depth);
      case 'routerPrimitiveScalarBitwise':{
        const proof=requirePrimitiveOperator(node),left=this.evaluate(node.left,env,depth+1),right=this.evaluate(node.right,env,depth+1);
        if(proof.domain==='bool')return result(proof.operation==='&'?left.value&&right.value:proof.operation==='|'?left.value||right.value:left.value!==right.value);
        return result(this.exactInteger(proof.operation==='&'?left.value&right.value:proof.operation==='|'?left.value|right.value:left.value^right.value,node.type,node));
      }
      case 'routerPrimitiveIntegerNot':{
        requirePrimitiveOperator(node);const value=this.evaluate(node.value,env,depth+1),bits=~value.value;return result(node.type.signed?BigInt.asIntN(node.type.bits,bits):BigInt.asUintN(node.type.bits,bits));
      }
      case 'routerPrimitiveIntegerCast':{
        requirePrimitiveOperator(node);const value=this.evaluate(node.value,env,depth+1);
        return result(node.type.signed?BigInt.asIntN(node.type.bits,value.value):BigInt.asUintN(node.type.bits,value.value));
      }
      case 'routerPrimitiveIntegerShift':{
        const proof=requirePrimitiveOperator(node),left=this.evaluate(node.left,env,depth+1),right=this.evaluate(node.right,env,depth+1);
        if(right.value<0n||right.value>=BigInt(node.type.bits))panic('constant primitive shift count overflow',node);
        const value=proof.operation==='<<'?left.value<<right.value:left.value>>right.value;
        return result(node.type.signed?BigInt.asIntN(node.type.bits,value):BigInt.asUintN(node.type.bits,value));
      }
      case 'cast':{
        const arg=this.evaluate(node.arg,env,depth+1),from=bounds(arg.type),to=bounds(node.to);
        if(node.flavor!=='exact'||from.min<to.min||from.max>to.max||arg.type.rustReference||node.to.rustReference)refuse('constant cast needs proven value-preserving fixed ranges',node);
        return result(this.exactInteger(arg.value,node.to,node));
      }
      case 'array':{
        if(node.type?.kind!=='array')refuse('constant array has no checked element type',node);
        if(node.type.rustFixedArray&&(!Number.isSafeInteger(node.type.rustFixedArray.length)||node.type.rustFixedArray.length<0||node.type.rustFixedArray.length>4096||node.type.rustFixedArray.length!==node.items.length||node.type.rustOwnership?.kind!=='value'||node.type.rustOwnership.source!=='array'))refuse('constant fixed array has no exact source length and value ownership',node);
        return result(Object.freeze(node.items.map(item=>{const value=this.evaluate(item,env,depth+1);if(!sameType(value.type,node.type.element))refuse('constant array element type mismatch',node);return value.value;})));
      }
      case 'routerSharedArrayLiteral':{const value=this.evaluate(node.value,env,depth+1);return result(value.value);}
      case 'ctor':{
        const entry=this.layout(node.data),ctor=entry.ctors.find(ctor=>ctor.name===node.ctor);
        if(entry?.k!=='data'||node.type?.kind!=='data'||node.type.name!==node.data||!ctor||ctor.fields.length!==node.args.length)refuse('constant constructor requires its actual checked data layout',node);
        const fields=[['$',ctor.name]];for(let index=0;index<node.args.length;index++){const arg=this.evaluate(node.args[index],env,depth+1);if(!sameType(arg.type,ctor.fields[index].type))refuse('constant constructor field type mismatch',node);fields.push([ctor.fields[index].name,arg.value]);}return result(frozen(Object.fromEntries(fields)));
      }
      case 'match':{
        const subject=this.evaluate(node.scrutinee,env,depth+1);
        for(let index=0;index<node.cases.length;index++){
          const arm=node.cases[index],pattern=arm.pattern,inner=new Map(env);
          if(pattern.k==='bind')inner.set(pattern.name,subject);
          else if(pattern.k==='ctor'){
            if(subject.type.kind!=='data'||subject.type.name!==pattern.data)refuse('constant constructor pattern owner mismatch',node);
            const ctor=this.program.declarations.get(pattern.data)?.ctors?.find(ctor=>ctor.name===pattern.ctor);
            if(!ctor||ctor.fields.length!==pattern.binds?.length)refuse('constant constructor pattern requires actual checked fields',node);
            if(subject.value.$!==pattern.ctor)continue;
            pattern.binds.forEach((name,field)=>{if(name)inner.set(name,this.cell(ctor.fields[field].type,subject.value[ctor.fields[field].name],node));});
          }
          this.trace.push({kind:'match',selected:index,span:node.span});return this.evaluate(arm.body,inner,depth+1);
        }
        refuse('constant match has no selected checked arm',node);break;
      }
      case 'call':return this.call(node.fn,node.args.map(arg=>this.evaluate(arg,env,depth+1)),node);
      case 'routerHostCall':return this.host(node,node.args.map(arg=>this.evaluate(arg,env,depth+1)));
      case 'abort':panic('selected constant panic: '+node.message,node);break;
      default:refuse('constant operation is unsupported: '+node.k,node);
    }
  }
  binary(node,env,depth) {
    const left=this.evaluate(node.left,env,depth+1),result=value=>this.cell(node.type,value,node);
    if(['and','or'].includes(node.op)){
      if(left.type.kind!=='bool')refuse('constant short circuit requires bool',node);
      if(node.op==='and'&&!left.value||node.op==='or'&&left.value)return result(left.value);
      const right=this.evaluate(node.right,env,depth+1);if(right.type.kind!=='bool')refuse('constant short circuit rhs requires bool',node);return result(right.value);
    }
    const right=this.evaluate(node.right,env,depth+1);if(!sameType(left.type,right.type)||left.type.rustReference)refuse('constant binary operands require identical checked scalar types',node);
    if(['eq','ne','lt','le','gt','ge'].includes(node.op)){
      if(!['fixed','bool'].includes(left.type.kind))refuse('constant comparisons do not infer string/aggregate const trait implementations',node);
      const a=left.value,b=right.value;return result(({eq:a===b,ne:a!==b,lt:a<b,le:a<=b,gt:a>b,ge:a>=b})[node.op]);
    }
    if(left.type.kind!=='fixed'||node.semantics!=='checked'||!sameType(left.type,node.type))refuse('constant arithmetic requires explicit checked fixed semantics',node);
    const a=left.value,b=right.value;
    if(['div','rem'].includes(node.op)){
      if(node.rounding!=='trunc'||node.byZero!=='abort')refuse('constant division profile is not Rust truncating/panicking division',node);
      if(b===0n)panic('constant division by zero',node);
      this.exactInteger(a/b,node.type,node,true);return result(node.op==='div'?a/b:a%b);
    }
    const value=node.op==='add'?a+b:node.op==='sub'?a-b:node.op==='mul'?a*b:null;
    if(value===null)refuse('constant fixed operator has no pinned implementation: '+node.op,node);
    return result(this.exactInteger(value,node.type,node,true));
  }
  hostContract(node) {
    const raw=node.contract??this.contracts.get(node.id),contract=raw?copyMetadata(raw):null;
    if(contract?.family!=='fixed')return {kind:'time',...this.timeContract(node)};
    this.serialize(contract,true);const operation=contract.rustPath?.at(-1),type=contract.instantiation;
    const actual=actual=>actual?.kind==='fixed'&&actual.bits===type?.bits&&actual.signed===type?.signed&&actual.rustPrimitiveName===type?.rustPrimitiveName&&!actual.rustReference&&!actual.rustOwnership&&!actual.rustGenericIdentityUnresolved&&!actual.rustBorrowingUnresolved&&!actual.patternOwnershipRefusal;
    if(!['wrapping_add','wrapping_sub'].includes(operation)||type?.kind!=='fixed'||!/^[iu](8|16|32|64|128)$/u.test(type.rustPrimitiveName??'')||!actual(type))refuse('constant fixed host operation requires its actual by-value original wrapping primitive',node);
    bounds(type);
    if(contract.id!==node.id||contract.id!=='rust_fixed_'+operation+'_'+encodeMonomorphicType(type)||contract.jsExport!=='rust_fixed_'+operation||contract.kind!=='method'||contract.constEligible!==true||contract.constSince!=='1.32.0'||contract.async!==false||contract.pure!==true||contract.rustPath.length!==2||contract.rustPath[0]!==type.rustPrimitiveName||!actual(contract.receiver)||!actual(contract.ret)||!actual(node.type)||contract.params?.length!==2||!contract.params.every(actual)||node.args?.length!==2||!node.args.every(arg=>actual(arg.type))||contract.runtimeInstantiation?.factory!=='createFixedIntegerRuntime'||contract.runtimeInstantiation.type?.kind!=='fixed'||contract.runtimeInstantiation.type.bits!==type.bits||contract.runtimeInstantiation.type.signed!==type.signed)refuse('constant wrapping contract, operands or source const identity differ',node);
    let source;try{source=requireFixedWrappingMetadata(contract.sourceWrappingProof,type,operation);}catch(error){if(error instanceof TypeError&&error.message.startsWith('Wrapping metadata differs'))refuse(error.message,node);throw error;}
    if(contract.constSince!==source.constSince)refuse('constant wrapping stability differs from its actual original member',node);
    return {kind:'wrapping',contract,operation,source};
  }
  host(node,args) {
    const selected=this.hostContract(node);if(selected.kind==='time')return this.time(node,args);const {contract,operation,source}=selected;
    if(args.length!==2||args.some((arg,index)=>!sameType(arg.type,contract.params[index])))refuse('constant wrapping evaluated arguments differ from actual checked parameters',node);
    for(const arg of args)this.exactInteger(arg.value,arg.type,node);const value=operation==='wrapping_add'?args[0].value+args[1].value:args[0].value-args[1].value;
    const result=node.type.signed?BigInt.asIntN(node.type.bits,value):BigInt.asUintN(node.type.bits,value);
    this.trace.push({kind:'host',id:node.id,operation,sourceProfileSha256:source.profileSha256,sourceSha256:source.originalMember.sourceSha256,memberSha256:source.originalMember.sha256,intrinsicSha256:source.intrinsic.sha256,span:node.span});return this.cell(node.type,result,node);
  }
  timeContract(node) {
    const raw=this.contracts.get(node.id),contract=raw?copyMetadata(raw):null,operation=TIME_OPERATIONS.get(node.id),parameters=operation==='new'?['u64','u32']:['u64'];
    if(contract)this.serialize(contract,true);
    if(!operation||contract?.id!==node.id||contract.constEligible!==true||contract.async!==false||contract.pure!==true||contract.kind!=='function'||contract.rustPath?.join('.')!=='std.time.Duration.'+operation||contract.params?.length!==parameters.length||!contract.params.every((type,index)=>type.kind==='fixed'&&type.rustPrimitiveName===parameters[index]&&type.signed===false&&type.bits===(index===0?64:32))||!sameType(this.actualType(contract.ret),node.type))refuse('constant host operation needs the explicitly pinned Duration constructor contract',node);
    const entry=this.layout(node.type?.name),fields=entry.ctors[0]?.fields;
    if(node.type?.kind!=='data'||node.type.name!=='std.time.Duration'||entry.generated!=='router-time-contract'||entry.ctors.length!==1||entry.ctors[0].name!=='Duration'||fields?.length!==2||fields[0].name!=='secs'||fields[0].type.rustPrimitiveName!=='u64'||fields[0].type.bits!==64||fields[0].type.signed!==false||fields[1].name!=='nanos'||fields[1].type.rustPrimitiveName!=='u32'||fields[1].type.bits!==32||fields[1].type.signed!==false)refuse('constant Duration requires the actual registered normalized ABI layout',node);
    return {contract,operation};
  }
  time(node,args) {
    const {contract,operation}=this.timeContract(node);if(args.length!==contract.params.length||args.some((arg,index)=>!sameType(arg.type,contract.params[index])))refuse('constant Duration constructor argument identity mismatch',node);
    // Rust 1.89 core/time.rs:244 divides before scaling, so u64::MAX
    // milliseconds is representable without an overflowing u64 intermediate.
    const nanos=operation==='new'?args[1].value:operation==='from_millis'?args[0].value%1000n*1000000n:0n;
    const secs=(operation==='from_millis'?args[0].value/1000n:args[0].value)+nanos/1000000000n;
    this.exactInteger(secs,contract.params[0],node,true);
    this.trace.push({kind:'host',id:node.id,sourceSha256:CONSTANT_EVALUATION_PROFILE.timeSha256,span:node.span});
    return this.cell(node.type,frozen({$:'Duration',secs,nanos:nanos%1000000000n}),node);
  }
  run(name) {
    const entry=this.declaration(name);if(!entry.constant||entry.params?.length)refuse('constant evaluation entry must be an actual zero-argument constant',entry);
    this.eligibleDeclaration(name);const value=this.call(name,[],entry),resolution=[...this.resolution.values()].sort((a,b)=>ordinal(a.name,b.name));
    const serializedValue=canonical(value.value,0,new Set(),{nodes:this.limits.valueCells,bytes:this.limits.serializedBytes}),proof={schemaVersion:1,verified:true,scope:'this concrete checked constant root',entry:name,
      sourceLinksVerified:resolution.every(item=>item.source.sourceAssociation==='private-parser-source-links-v1')&&[...this.layouts.values()].every(item=>!item.source||item.source.sourceAssociation==='private-parser-source-links-v1'),
      profile:CONSTANT_EVALUATION_PROFILE,profileSha256:sha256(this.serialize(CONSTANT_EVALUATION_PROFILE)),resolution,resolvedLayouts:[...this.layouts.values()].sort((a,b)=>ordinal(a.name,b.name)),
      checkedIRSha256:sha256(this.serialize(resolution.map(item=>({name:item.name,body:this.program.declarations.get(item.name).body})),true)),
      valueSha256:sha256(this.serialize(serializedValue)),trace:this.trace,cost:{steps:this.steps,valueCells:this.cells,normalizationCells:this.normalizationCells},limits:this.limits};
    this.serialize(proof);return frozen({status:'value',type:canonical(value.type),value:serializedValue,proof});
  }
}
export function evaluateCheckedConstant(program,name,options={}) {
  return withFixedWrappingSourceOperation(()=>{try{return new Evaluator(program,options).run(name);}
  catch(error){if(error instanceof TypeError&&error.message.startsWith('source links:'))return frozen({status:error.message.includes('budget exhausted')?'budget-exhausted':'unsupported',diagnostic:{reason:error.message}});if(!(error instanceof Refusal))throw error;return frozen({status:error.status,diagnostic:{reason:error.message,...(error.span?{span:error.span}:{})}});}});
}

import {requireFixedWrappingMetadata,withFixedWrappingSourceOperation,FIXED_WRAPPING_SOURCE_PROFILE} from './fixed-wrapping-source.mjs';
import {encodeMonomorphicType} from '../monomorphic.mjs';
