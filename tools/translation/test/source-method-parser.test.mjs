import test from 'node:test';
import assert from 'node:assert/strict';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {extractImplDeclarations,lowerSharedMethodTokens} from '../impl-resolver.mjs';
import {createMatchesMacroContext,configureMatchesMethodParser,proveOriginalMatchesCall} from '../matches-macro-context.mjs';
import {createOriginalMethodTokenTransform,originalMethodParserTokens} from '../source-method-transforms.mjs';
import {parseOriginalMethodTransform,originalMethodParsedFacts} from '../source-method-parser.mjs';
import {HostRustParser,originalHostParserIdentitySnapshot} from '../extensions/host-contracts.mjs';
function fixture(source,path=[]) {
  const captured=captureSourceModuleViews({source,sourcePath:'src/lib.rs'}),modules=captured.views.map(sourceView=>({file:'src/lib.rs',path:[...sourceView.modulePath],source,sourceView})),module=modules.find(module=>JSON.stringify(module.path)===JSON.stringify(path));
  const context=createMatchesMacroContext({modules}),method=extractImplDeclarations(source,{sourcePath:module.file,modulePath:module.path,sourceView:module.sourceView}).implementations[0].methods[0],lowered=lowerSharedMethodTokens(method,['crate',...module.path,...method.typePath]);
  return {context,method,lowered,transform:createOriginalMethodTokenTransform(context,method,lowered)};
}
test('definition-time immutable identity refuses prototype replacement before the first method parse',()=>{
  const row=fixture('struct Counter{value:u8}impl Counter{fn read(&self)->u8{self.value}}'),original=Object.getOwnPropertyDescriptor(HostRustParser.prototype,'fn'),snapshot=originalHostParserIdentitySnapshot();
  assert.ok(Object.isFrozen(snapshot));assert.ok(Object.isFrozen(snapshot.parserMethods));assert.ok(snapshot.parserMethods.every(Object.isFrozen));
  HostRustParser.prototype.fn=()=>({k:'fn',name:'read',params:[],body:{k:'lit',value:0n}});
  try{assert.throws(()=>parseOriginalMethodTransform(row.transform),/method identity changed/);}finally{if(original===undefined)delete HostRustParser.prototype.fn;else Object.defineProperty(HostRustParser.prototype,'fn',original);}
});
test('actual highest parser consumes the whole original shared const method through the sealed generic transform',()=>{
  const row=fixture('struct Counter{value:u8}impl Counter{pub const fn read(&self)->u8{self.value}}'),result=parseOriginalMethodTransform(row.transform),facts=originalMethodParsedFacts(result);
  assert.equal(result.entry.name,'read');assert.equal(result.entry.constFunction,true);assert.equal(result.entry.params[0].name,'router_self');assert.equal(result.entry.params[0].type.rustReference.kind,'shared');
  assert.equal(facts.transform,row.transform);assert.equal(result.proof.parsedTokenTransformVerified,true);assert.equal(result.proof.transform.originalBodySpan.start,row.method.bodySpan.start);
  for(const flag of ['checkedSourceAssociation','namespaceAuthority','copyAuthority','applicationEffectCompleteness','runtimeParity'])assert.equal(result.proof[flag],false);
});
test('original inline static Self return and construction parse without a member body template',()=>{
  const row=fixture('mod child{pub struct Counter{value:u8}impl Counter{pub fn make(value:u8)->Self{Self{value}}}}',['child']),result=parseOriginalMethodTransform(row.transform);
  assert.equal(result.entry.name,'make');assert.deepEqual(result.proof.transform.owner.owner,['crate','child','Counter']);assert.equal(result.proof.transform.receiver,null);originalMethodParsedFacts(result);
});
test('public transformed snapshots and copied parse records cannot issue or reconstruct private AST proof',()=>{
  const row=fixture('struct Counter{value:u8}impl Counter{fn read(&self)->u8{self.value}}'),result=parseOriginalMethodTransform(row.transform);
  assert.ok(Object.isFrozen(originalMethodParsedFacts(result)));assert.throws(()=>{originalMethodParsedFacts(result).digest='resealed';},TypeError);
  assert.throws(()=>parseOriginalMethodTransform(structuredClone(row.transform)),/unsealed|copied/);
  assert.throws(()=>originalMethodParsedFacts(structuredClone(result)),/unsealed|fabricated/);
  assert.throws(()=>originalMethodParsedFacts({entry:result.entry,proof:result.proof}),/unsealed|fabricated/);
  const changed=structuredClone(result.entry.body);result.entry.body={k:'lit',value:0n,type:{kind:'fixed',bits:8,signed:false},span:row.method.bodySpan};
  assert.throws(()=>originalMethodParsedFacts(result),/body\/signature/);result.entry.body=changed;
});
test('changed parser callbacks and transformed tokens are denied before a private parse can be reused',()=>{
  const row=fixture('struct Counter{value:u8}impl Counter{fn read(&self)->u8{self.value}}'),result=parseOriginalMethodTransform(row.transform),state=originalMethodParsedFacts(result);
  state.parser.fn=()=>result.entry;assert.throws(()=>originalMethodParsedFacts(result),/callbacks|identity/);delete state.parser.fn;
  state.parser.cursor.tokens.find(token=>token.value==='value').value='other';assert.throws(()=>originalMethodParsedFacts(result),/token stream/);
});
test('original method macro calls remain carried until the transformed opaque AST context is genuinely linked',()=>{
  const row=fixture('enum Mode{On,Off}impl Mode{fn is_on(&self)->bool{matches!(self,Self::On)}}');
  assert.throws(()=>parseOriginalMethodTransform(row.transform),/private source association|original.*context|genuine.*parser|source.*capture/i);
});
test('transformed caller frames prove only the exact original invocation inside the member body',()=>{
  const source='enum Mode{On,Off}impl Mode{fn is_on(&self)->bool{matches!(self,Self::On)}}fn other()->bool{matches!(true,true)}',row=fixture(source),parser=new HostRustParser(originalMethodParserTokens(row.transform));
  configureMatchesMethodParser(parser,row.context,row.method);
  const start=source.indexOf('matches!'),end=source.indexOf(')}',start)+1,proof=proveOriginalMatchesCall(parser,{segments:['matches'],start,end});
  assert.equal(proof.originalInvocation,'matches!(self,Self::On)');assert.deepEqual(proof.originalSpan,{start,end});assert.equal(proof.macroOwnerResolved,true);assert.equal(proof.runtimeParity,false);
  const other=source.lastIndexOf('matches!');assert.throws(()=>proveOriginalMatchesCall(parser,{segments:['matches'],start:other,end:source.indexOf(')}',other)+1}),/member body/);
  assert.throws(()=>configureMatchesMethodParser(new HostRustParser(structuredClone(parser.cursor.tokens)),row.context,row.method),/copied|unissued/);
});
test('actual method caller frames retain original macro shadows and incompatible full views',()=>{
  const row=fixture('macro_rules! matches{($e:expr,$p:pat)=>{false}}enum Mode{On,Off}impl Mode{fn is_on(&self)->bool{matches!(self,Self::On)}}'),parser=new HostRustParser(originalMethodParserTokens(row.transform));
  configureMatchesMethodParser(parser,row.context,row.method);
  const source=row.method.source,start=row.method.span.start+source.indexOf('matches!'),end=row.method.span.start+source.indexOf(')}',source.indexOf('matches!'))+1;
  assert.throws(()=>proveOriginalMatchesCall(parser,{segments:['matches'],start,end}),/not its original standard macro owner|actual.*scopes|shadow/);
  const other=fixture('enum Mode{On,Off}impl Mode{fn is_on(&self)->bool{true}}');assert.throws(()=>configureMatchesMethodParser(parser,other.context,row.method),/identity differs|another original/);
});
