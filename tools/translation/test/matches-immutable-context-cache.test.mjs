import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {extractImplDeclarations,lowerSharedMethodTokens} from '../impl-resolver.mjs';
import {createMatchesMacroContext,matchesParserFacts,originalMethodNamespaceOwner,originalMethodParserNamespace} from '../matches-macro-context.mjs';
import {createOriginalMethodTokenTransform,originalMethodTransformFacts} from '../source-method-transforms.mjs';
import {parseOriginalMethodTransform,originalMethodParsedFacts} from '../source-method-parser.mjs';
import {metadataDigest} from '../extensions/source-links.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const source='pub enum Mode{On,Off}impl Mode{pub fn is_on(&self)->bool{matches!(self,Self::On)}}';
function fixture(text=source,path=[]){
  const captured=captureSourceModuleViews({source:text,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE});
  const modules=captured.views.map(sourceView=>({file:'src/lib.rs',path:[...sourceView.modulePath],source:text,sourceView,compilationProfile:PRODUCTION_PROFILE,configurationCondition:sourceView.configurationCondition}));
  const context=createMatchesMacroContext({modules,compilationProfile:PRODUCTION_PROFILE}),module=modules.find(module=>JSON.stringify(module.path)===JSON.stringify(path));
  const method=extractImplDeclarations(text,{sourcePath:module.file,modulePath:module.path,sourceView:module.sourceView,compilationProfile:PRODUCTION_PROFILE}).implementations[0].methods[0];
  const lowered=lowerSharedMethodTokens(method,['crate',...module.path,...method.typePath]),transform=createOriginalMethodTokenTransform(context,method,lowered),parsed=parseOriginalMethodTransform(transform),parser=originalMethodParsedFacts(parsed).parser;
  const facts=matchesParserFacts(parser).facts,owner=originalMethodNamespaceOwner(context,method);
  return {context,method,lowered,transform,parsed,parser,facts,owner,source:text};
}
function changedProperty(object,key,descriptor,operation){
  const original=Object.getOwnPropertyDescriptor(object,key);
  Object.defineProperty(object,key,{configurable:true,enumerable:true,...descriptor});
  try{operation();}finally{if(original)Object.defineProperty(object,key,original);else delete object[key];}
}
test('repeated genuine owners retain complete original scope and source digests without granting authority',()=>{
  for(const row of [fixture(),fixture('mod child{'+source+'}',['child'])]){
    const scope=row.facts.evidence.scopes.find(scope=>scope.path.join('.')===row.owner.modulePath.join('.'));
    assert.equal(row.owner.sourceSha256,hash(row.source));assert.equal(row.owner.scopeSha256,hash(JSON.stringify(scope)));assert.equal(row.owner.scopeMetadataSha256,metadataDigest(scope));
    for(let at=0;at<4;at++){assert.deepEqual(originalMethodNamespaceOwner(row.context,row.method),row.owner);assert.equal(originalMethodParsedFacts(row.parsed).entry,row.parsed.entry);matchesParserFacts(row.parser);}
    assert.equal(row.parsed.entry.body.sourceMacro.sourceMatchesProof.originalRuleInterpreted,true);
    for(const flag of ['namespaceAuthority','copyAuthority','applicationEffectCompleteness','runtimeParity'])assert.equal(row.owner[flag],false);
  }
});
test('warmed immutable-context caches reject byte-identical replacement of every issued root',()=>{
  const row=fixture();
  for(const key of ['modules','evidence','profile','compilationProfile']){
    changedProperty(row.facts,key,{value:structuredClone(row.facts[key]),writable:true},()=>assert.throws(()=>originalMethodNamespaceOwner(row.context,row.method),/private issuance/));
    assert.deepEqual(originalMethodNamespaceOwner(row.context,row.method),row.owner);
  }
  assert.throws(()=>originalMethodNamespaceOwner(structuredClone(row.context),row.method),/private module context/);
});
test('warmed roots reject accessors and proxy substitutions without evaluating callbacks',()=>{
  const row=fixture();let calls=0;
  for(const key of ['modules','evidence','profile','compilationProfile']){
    const original=row.facts[key];
    changedProperty(row.facts,key,{get(){calls++;return original;}},()=>assert.throws(()=>originalMethodNamespaceOwner(row.context,row.method),TypeError));
    const proxy=new Proxy(original,{get(){calls++;return null;},getPrototypeOf(){calls++;return null;},ownKeys(){calls++;return [];}});
    changedProperty(row.facts,key,{value:proxy,writable:true},()=>assert.throws(()=>originalMethodNamespaceOwner(row.context,row.method),/private issuance/));
  }
  assert.equal(calls,0);assert.deepEqual(originalMethodNamespaceOwner(row.context,row.method),row.owner);
});
test('issued scopes ancestors and module paths are recursively immutable rather than caller-frozen authority',()=>{
  const row=fixture('mod child{'+source+'}',['child']),scope=row.facts.evidence.scopes.find(scope=>scope.path.join('.')==='child'),ancestor=row.facts.evidence.scopes.find(scope=>scope.path.length===0);
  assert.ok(Object.isFrozen(scope));assert.ok(Object.isFrozen(scope.bindings));assert.ok(Object.isFrozen(scope.path));assert.ok(Object.isFrozen(ancestor));
  assert.throws(()=>{scope.unresolvedTypeScope=true;},TypeError);assert.throws(()=>{ancestor.configurationCondition='unknown';},TypeError);assert.throws(()=>scope.path.push('forged'),TypeError);
  assert.throws(()=>{scope.bindings.find(binding=>binding.name==='Mode').target[0]='std';},TypeError);assert.throws(()=>{row.facts.modules[1].source+='\n';},TypeError);
  const clone=structuredClone(row.facts.evidence);Object.freeze(clone);
  changedProperty(row.facts,'evidence',{value:clone,writable:true},()=>assert.throws(()=>originalMethodNamespaceOwner(row.context,row.method),/private issuance/));
  assert.deepEqual(originalMethodNamespaceOwner(row.context,row.method),row.owner);
});
test('warmed scope hashes do not skip mutable member token parser or parsed-body validation',()=>{
  const row=fixture();
  changedProperty(row.method,'source',{value:row.method.source+' ',writable:true},()=>assert.throws(()=>originalMethodNamespaceOwner(row.context,row.method),/changed/));
  const loweredToken=row.lowered.tokens.find(token=>token.value==='is_on');
  changedProperty(loweredToken,'value',{value:'forged',writable:true},()=>assert.throws(()=>originalMethodTransformFacts(row.transform),/changed/));
  const parserToken=row.parser.cursor.tokens.find(token=>token.value==='is_on');
  changedProperty(parserToken,'value',{value:'forged',writable:true},()=>assert.throws(()=>originalMethodParsedFacts(row.parsed),/token stream/));
  changedProperty(row.parser,'fn',{value:()=>row.parsed.entry,writable:true},()=>assert.throws(()=>originalMethodParsedFacts(row.parsed),/callbacks|identity/));
  changedProperty(row.parsed.entry,'body',{value:{k:'lit',value:false},writable:true},()=>assert.throws(()=>originalMethodParsedFacts(row.parsed),/body\/signature/));
  originalMethodParsedFacts(row.parsed);
});
test('warmed immutable hashes leave all mutable alias maps target arrays and evidence fully validated',()=>{
  const row=fixture(),map=row.parser.sourceNamespaceAliases.type.get(''),target=map.get('Mode');assert.ok(Array.isArray(target));
  map.set('Mode',['std','Mode']);try{assert.throws(()=>matchesParserFacts(row.parser),/association/);}finally{map.set('Mode',target);}
  target.push('forged');try{assert.throws(()=>matchesParserFacts(row.parser),/association/);}finally{target.pop();}
  let calls=0;changedProperty(row.parser,'sourceNamespaceAliases',{get(){calls++;return row.facts;}},()=>assert.throws(()=>matchesParserFacts(row.parser),TypeError));
  const proxy=new Proxy(row.parser.sourceNamespaceAliases,{get(){calls++;return null;},ownKeys(){calls++;return [];}});
  changedProperty(row.parser,'sourceNamespaceAliases',{value:proxy,writable:true},()=>assert.throws(()=>matchesParserFacts(row.parser),TypeError));
  assert.equal(calls,0);
  row.parser.sourceNamespaceEvidence.module.push('forged');try{assert.throws(()=>originalMethodParsedFacts(row.parsed),/source namespace/);}finally{row.parser.sourceNamespaceEvidence.module.pop();}
  originalMethodParsedFacts(row.parsed);matchesParserFacts(row.parser);
});
test('warmed immutable hashes preserve metadata budgets cycles and descriptor validation on mutable members',()=>{
  const row=fixture();
  for(const value of ['x'.repeat(4194305),(()=>{const cyclic={};cyclic.self=cyclic;return cyclic;})()]){
    Object.defineProperty(row.method,'forgedMetadata',{value,writable:true,enumerable:true,configurable:true});
    try{assert.throws(()=>originalMethodNamespaceOwner(row.context,row.method),/budget|acyclic/);}finally{delete row.method.forgedMetadata;}
  }
  let calls=0;Object.defineProperty(row.method,'forgedMetadata',{enumerable:true,configurable:true,get(){calls++;return row.owner;}});
  try{assert.throws(()=>originalMethodNamespaceOwner(row.context,row.method),/accessor/);}finally{delete row.method.forgedMetadata;}
  const proxy=new Proxy(row.method,{get(){calls++;return null;},getPrototypeOf(){calls++;return null;},ownKeys(){calls++;return [];}});
  assert.throws(()=>originalMethodNamespaceOwner(row.context,proxy),/unsealed/);assert.equal(calls,0);assert.deepEqual(originalMethodNamespaceOwner(row.context,row.method),row.owner);
});
test('issued context indices retain unrelated original modules and never accept replacement or foreign roots',()=>{
  const text='mod unrelated{pub const MARK:u8=7;mod tokio{}}'+source,row=fixture(text);
  const namespace=originalMethodParserNamespace(row.context,row.method);assert.deepEqual(namespace.shadowedEffectRoots,['tokio']);assert.ok(Object.isFrozen(namespace.shadowedEffectRoots));
  for(let count=0;count<3;count++){assert.equal(originalMethodParserNamespace(row.context,row.method).shadowedEffectRoots,namespace.shadowedEffectRoots);assert.deepEqual(originalMethodNamespaceOwner(row.context,row.method),row.owner);originalMethodParsedFacts(row.parsed);}
  const unrelated=row.facts.modules.find(module=>module.path.join('.')==='unrelated');
  assert.throws(()=>{unrelated.source+=' ';},TypeError);assert.throws(()=>{unrelated.path[0]='changed';},TypeError);
  const replacements=row.facts.modules.map(module=>module===unrelated?{...module,source:module.source+' '}:module);
  for(const modules of [replacements,Object.freeze(replacements)])changedProperty(row.facts,'modules',{value:modules,writable:true},()=>assert.throws(()=>originalMethodParserNamespace(row.context,row.method),/private issuance/));
  for(const context of [structuredClone(row.context),Object.freeze(structuredClone(row.context))])assert.throws(()=>originalMethodParserNamespace(context,row.method),/private module context/);
  const foreign=fixture(text);assert.throws(()=>originalMethodNamespaceOwner(foreign.context,row.method),/identity differs/);
  assert.deepEqual(originalMethodNamespaceOwner(row.context,row.method),row.owner);matchesParserFacts(row.parser);
});
test('context index hits never bypass source-view caller profile or configuration identity checks',()=>{
  const row=fixture('mod child{'+source+'}',['child']),module=row.facts.modules.find(module=>module.path.join('.')==='child');
  assert.deepEqual(originalMethodParserNamespace(row.context,row.method).modulePath,['child']);
  for(const contextRoot of ['modules','evidence','profile','compilationProfile','cargoEditionContext']){
    let calls=0;const original=row.facts[contextRoot];changedProperty(row.facts,contextRoot,{get(){calls++;return original;}},()=>assert.throws(()=>originalMethodParserNamespace(row.context,row.method),TypeError));assert.equal(calls,0);
  }
  for(const field of ['source','sourceView','compilationProfile','configurationCondition'])if(Object.hasOwn(module,field))assert.throws(()=>{module[field]=structuredClone(module[field]);},TypeError);
  assert.throws(()=>row.facts.evidence.scopes[0].path.push('forged'),TypeError);
  originalMethodParsedFacts(row.parsed);matchesParserFacts(row.parser);
});
test('private issued indices do not dispatch through changed public Map lookup callbacks',()=>{
  const row=fixture();let calls=0;
  changedProperty(Map.prototype,'get',{get(){calls++;return ()=>{calls++;return null;};}},()=>{
    assert.deepEqual(originalMethodNamespaceOwner(row.context,row.method),row.owner);
    assert.deepEqual(originalMethodParserNamespace(row.context,row.method).modulePath,[]);
  });assert.equal(calls,0);originalMethodParsedFacts(row.parsed);
});
