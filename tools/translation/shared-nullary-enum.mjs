// Discriminant-only match ergonomics for an actual original &self. This is
// not a Copy, aggregate-move, field projection or arbitrary-reference profile.
import {copyMetadata,metadataDigest,ownData,originalParsedDeclarationEvidence} from './extensions/source-links.mjs';
import {originalMethodSemanticFacts} from './source-method-admission.mjs';
import {originalMethodTransformFacts} from './source-method-transforms.mjs';
import {typeError} from './vendor/meta-language/translation/diagnostics.js';
import {types} from 'node:util';
import {HostRustParser,originalHostParserIdentitySnapshot} from './extensions/host-contracts.mjs';
import {TokenCursor} from './vendor/meta-language/translation/lexer.js';
import {tokenizeRust} from './extensions/lexical.mjs';
import {originalTextCursorGuard} from './extensions/text.mjs';
import {assertOriginalParserIdentity} from './original-parser-identity.mjs';
import {configureMatchesMacroParser,matchesParserFacts} from './matches-macro-context.mjs';
const checkers=new WeakMap(),mapGet=Map.prototype.get;
const equal=(a,b)=>{
  // Enum syntax omits record/tuple rather than spelling false. Undefined has
  // no JSON hash input; every supplied metadata value still gets validation.
  if(a===undefined||b===undefined){if(a!==undefined)metadataDigest(a);if(b!==undefined)metadataDigest(b);return a===b;}
  return metadataDigest(a)===metadataDigest(b);
};
const canonical=path=>path[0]==='crate'?path.slice(1):path;
const fail=span=>{throw typeError('shared nullary pattern differs from its original receiver or complete enum layout',span);};
function prototypeMethods(prototype,methods) {
  for(const [name,method]of methods) {
    let current=prototype,descriptor,depth=0;
    while(current&&!descriptor){if(++depth>64)throw new TypeError('Original enum parser prototype lookup exceeds its bounded source profile');if(types.isProxy(current))throw new TypeError('Original enum parser prototype is a proxy');descriptor=Object.getOwnPropertyDescriptor(current,name);if(!descriptor)current=Object.getPrototypeOf(current);}
    if(!descriptor||!Object.hasOwn(descriptor,'value')||descriptor.value!==method)throw new TypeError('Original enum parser/cursor method identity changed');
  }
}
function parserIdentity(parser,snapshot) {
  const methods=new Map(snapshot.parserMethods),cursorMethods=new Map(snapshot.cursorMethods);
  prototypeMethods(HostRustParser.prototype,methods);prototypeMethods(TokenCursor.prototype,cursorMethods);
  assertOriginalParserIdentity(parser,HostRustParser.prototype,methods);
  assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,cursorMethods,{originalGuard:originalTextCursorGuard(parser.cursor)});
}
function reparseOriginalEnum(layout,original) {
  // Read the actual definition-time snapshot only after cyclic initialization.
  // Check prototype descriptors before constructing/parsing, so replacements
  // cannot execute even on the first parse. No low generic Base brand suffices.
  const snapshot=originalHostParserIdentitySnapshot();
  prototypeMethods(HostRustParser.prototype,new Map(snapshot.parserMethods));prototypeMethods(TokenCursor.prototype,new Map(snapshot.cursorMethods));
  const bounds=layout.source.declarationSpan,source=original.member.source.slice(bounds.start,bounds.end),parser=new HostRustParser(tokenizeRust(source));
  parser.compilationProfile=original.member.compilationProfile;
  parserIdentity(parser,snapshot);
  configureMatchesMacroParser(parser,original.context,{file:original.member.sourcePath,modulePath:original.member.modulePath,offset:bounds.start});
  const surface={language:'Rust',items:[],main:null};
  parser.items(surface,surface.items,[...original.member.modulePath],()=>parser.cursor.atEnd());
  parserIdentity(parser,snapshot);matchesParserFacts(parser);
  if(!parser.cursor.atEnd()||surface.items.length!==1||surface.items[0].k!=='data')fail(layout.syntax.span);
  const actual=copyMetadata(surface.items[0]);
  for(const key of ['name','ctors','record','tuple','rustAttributes','deriveTraits'])if(!equal(actual[key],layout.syntax[key]))fail(layout.syntax.span);
}
function collect(items,path,result,budget={remaining:100000}) {
  if(types.isProxy(items)||!Array.isArray(items)||Object.getPrototypeOf(items)!==Array.prototype||path.length>128)throw new TypeError('Shared nullary source requires ordinary bounded module items');
  const descriptors=Object.getOwnPropertyDescriptors(items),length=descriptors.length.value;
  if(Reflect.ownKeys(descriptors).length!==length+1||length>budget.remaining)throw new TypeError('Shared nullary source items are sparse, extended or unbounded');
  for(let index=0;index<length;index++) {
    const descriptor=descriptors[String(index)];if(!descriptor||!Object.hasOwn(descriptor,'value')||--budget.remaining<0)throw new TypeError('Shared nullary source items cannot invoke callbacks');
    const item=descriptor.value,kind=ownData(item,'k');
    if(kind==='module'){collect(ownData(item,'items'),[...path,ownData(item,'name')],result,budget);continue;}
    // Private lookup precedes every inspection of the declaration's metadata.
    const source=originalParsedDeclarationEvidence(item);if(!source)continue;
    const syntax=copyMetadata(item);
    if(syntax.k!=='data'||syntax.generated||syntax.record||syntax.tuple||syntax.standardGeneric||syntax.rustAttributes?.length||syntax.deriveTraits?.length||!syntax.ctors.length||syntax.ctors.length>256)continue;
    // No partially configured or omitted variant set: even inert per-variant
    // attributes stay outside this first grammar. Actual parser/source linking
    // and the original closed method owner separately check enclosing attrs.
    if(syntax.ctors.some(ctor=>ctor.ctorStyle!=='unit'||ctor.fields.length||ctor.rustAttributes?.length))continue;
    const names=syntax.ctors.map(ctor=>ctor.name);if(new Set(names).size!==names.length)continue;
    result.set([...path,syntax.name].join('.'),{item,source,path:[...path],syntax,digest:metadataDigest(item)});
  }
}
function activeReceiver(checker,item,path,entry,layouts) {
  // Host admission also validates this association. A fake/cloned source
  // certificate cannot reach the adapter's private active receiver context.
  const semantic=originalMethodSemanticFacts(item),original=originalMethodTransformFacts(semantic.transform);
  if(original.method.receiver!=='shared'||original.lowered.receiver!=='shared')return null;
  const parameter=entry.params[0],type=parameter?.type,reference=type?.rustReference,pointee=reference?.pointee;
  const target=canonical(original.lowered.typePath).join('.'),layout=layouts.get(target);
  if(!layout)return null;
  originalParsedDeclarationEvidence(layout.item);
  const source=originalParsedDeclarationEvidence(item);
  if(!source||layout.source.sourcePath!==original.member.sourcePath||layout.source.sourceSha256!==original.proof.sourceSha256||source.sourceSha256!==layout.source.sourceSha256||source.sourceScopeSha256!==layout.source.sourceScopeSha256||source.compilationProfileSha256!==layout.source.compilationProfileSha256||!equal(layout.path,path)||!equal(original.member.modulePath,path))return null;
  reparseOriginalEnum(layout,original);
  if(parameter.name!==original.lowered.receiverName||type.kind!=='data'||type.name!==target||reference?.kind!=='shared'||pointee?.kind!=='data'||pointee.name!==target||pointee.rustReference||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved||type.rustOwnership||pointee.rustGenericIdentityUnresolved||pointee.rustBorrowingUnresolved||pointee.rustOwnership)return null;
  if(!equal(pointee.rustSharedReceiverSource,item.impl.sharedReceiverSource)||!equal(reference.span,item.params[0].type.rustReference.span))fail(item.span);
  const declaration=checker.items.get(target);
  if(!declaration||declaration.k!=='data'||declaration.record||declaration.tuple||declaration.standardGeneric||!equal(declaration.modulePath,path)||!equal(declaration.ctors,layout.syntax.ctors))fail(item.span);
  return {item,semantic,original,parameter,type,typeDigest:metadataDigest(type),layout,declaration,subject:false};
}
function validate(checker,context,type,env,path,span) {
  originalMethodSemanticFacts(context.item);originalMethodTransformFacts(context.semantic.transform);
  originalParsedDeclarationEvidence(context.item);originalParsedDeclarationEvidence(context.layout.item);
  if(metadataDigest(context.layout.item)!==context.layout.digest||checker.items.get(type.name)!==context.declaration||!equal(context.declaration.ctors,context.layout.syntax.ctors)||!equal(context.declaration.modulePath,context.layout.path)||!equal(path,context.layout.path))fail(span);
  if(types.isProxy(env)||Object.getPrototypeOf(env)!==Map.prototype||Reflect.ownKeys(env).length||mapGet.call(env,context.parameter.name)!==context.type||metadataDigest(context.type)!==context.typeDigest||metadataDigest(type)!==context.typeDigest)fail(span);
}
export function withSharedNullaryEnumChecker(Base) {return class extends Base {
  program(surface) {
    const layouts=new Map();collect(surface.items,[],layouts);
    checkers.set(this,{layouts,active:null});
    try{return super.program(surface);}finally{checkers.delete(this);}
  }
  visitDeclaration(item,path,entry,visit,phase) {
    const state=checkers.get(this),previous=state?.active;
    if(state)state.active=phase==='declaration-bodies'&&item.k==='fn'&&Object.hasOwn(item,'sourceMethodProof')?activeReceiver(this,item,path,entry,state.layouts):null;
    try{return super.visitDeclaration(item,path,entry,visit,phase);}
    finally{if(state)state.active=previous;}
  }
  expr(node,env,path,expected,allowLiteral=false) {
    const context=checkers.get(this)?.active;
    if(!context)return super.expr(node,env,path,expected,allowLiteral);
    // Only the original written self, rewritten by the sealed generic method
    // transform, is a candidate. Other parameters/locals/field expressions do
    // not borrow this receiver's authority merely because their types agree.
    const previous=context.subject;
    context.subject=node.k==='routerOrderedMatch'&&node.subject?.k==='name'&&node.subject.path.length===1&&node.subject.path[0]===context.parameter.name;
    try{return super.expr(node,env,path,expected,allowLiteral);}finally{context.subject=previous;}
  }
  sharedNullaryPatternOwner(node,type,path,env) {
    const context=checkers.get(this)?.active;
    if(!context?.subject)return null;
    validate(this,context,type,env,path,node.span);
    let remaining=256;
    const normalize=(pattern,depth=0)=>{
      if(--remaining<0||depth>32)fail(pattern.span);
      if(pattern.k==='wild')return pattern;
      if(pattern.k==='or')return {...pattern,alternatives:pattern.alternatives.map(child=>normalize(child,depth+1))};
      if(!['ctor','bindOrCtor'].includes(pattern.k))fail(pattern.span);
      const names=pattern.k==='bindOrCtor'?[pattern.name]:pattern.path,actual=this.lookup(names,path,pattern.span);
      if(actual?.k!=='ctor'||actual.data!==type.name||!context.declaration.ctors.some(ctor=>ctor.name===actual.name&&ctor.ctorStyle==='unit'&&ctor.fields.length===0)||(pattern.args??[]).length||pattern.registeredGenericOwner)fail(pattern.span);
      return {...pattern,k:'ctor',path:[type.name,actual.name],data:type.name,ctor:actual.name,args:[]};
    };
    return normalize(node);
  }
};}
