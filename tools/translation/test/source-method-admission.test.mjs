import test from 'node:test';
import assert from 'node:assert/strict';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {extractImplDeclarations,lowerSharedMethodTokens} from '../impl-resolver.mjs';
import {createMatchesMacroContext} from '../matches-macro-context.mjs';
import {createOriginalMethodTokenTransform} from '../source-method-transforms.mjs';
import {parseOriginalMethodTransform} from '../source-method-parser.mjs';
import {originalMethodSemantic,originalMethodSemanticFacts,relocateOriginalMethodSemantic,validateOriginalMethodAssociations} from '../source-method-admission.mjs';
import {withCapturedSourceParser} from '../extensions/source-links.mjs';
import {checkProgram} from '../extensions/host-contracts.mjs';
import {TokenCursor} from '../vendor/meta-language/translation/lexer.js';
import {tokenizeRust} from '../extensions/lexical.mjs';
function fixture(source) {
  const sourceView=captureSourceModuleViews({source,sourcePath:'src/lib.rs'}).views[0],context=createMatchesMacroContext({modules:[{file:'src/lib.rs',path:[],source,sourceView}]}),method=extractImplDeclarations(source,{sourcePath:'src/lib.rs',sourceView}).implementations[0].methods[0],lowered=lowerSharedMethodTokens(method,['crate',...method.typePath]);
  return {method,parsed:parseOriginalMethodTransform(createOriginalMethodTokenTransform(context,method,lowered))};
}
test('only the fixed generic ABI decorations and one source relocation attach to the original parsed body',()=>{
  const row=fixture('struct Counter{value:u8}impl Counter{fn read(&self)->u8{self.value}}'),surface=originalMethodSemantic(row.parsed),semantic=relocateOriginalMethodSemantic(surface,100);
  assert.equal(surface.generated,'router-checked-inherent-method');assert.equal(surface.impl.method,'read');assert.equal(surface.params[0].type.rustReference.pointee.rustSharedReceiverSource.kind,'shared');
  assert.equal(semantic.span.start,surface.span.start+100);assert.equal(semantic.sourceMethodProof,surface.sourceMethodProof);
  assert.equal(originalMethodSemanticFacts(semantic).offset,100);validateOriginalMethodAssociations({items:[{k:'module',name:'child',items:[semantic]}]});
  assert.throws(()=>relocateOriginalMethodSemantic(semantic,100),/one exact/);assert.equal(surface.sourceMethodProof.copyAuthority,false);
  assert.throws(()=>originalMethodSemantic(row.parsed,{fieldCertificates:[]}),/caller fieldCertificates/);
});
test('copied resealed and body substituted semantic methods cannot mint parsed source association',()=>{
  const row=fixture('struct Counter{value:u8}impl Counter{fn read(&self)->u8{self.value}}'),surface=originalMethodSemantic(row.parsed),copy=structuredClone(surface);
  assert.throws(()=>originalMethodSemanticFacts(copy),/unsealed/);assert.throws(()=>validateOriginalMethodAssociations({items:[copy]}),/unsealed/);
  let reads=0;const options={};Object.defineProperty(options,'fieldCertificates',{enumerable:true,get(){reads++;return [];}});assert.throws(()=>originalMethodSemantic(row.parsed,options),/accessor/);assert.equal(reads,0);
  surface.body={k:'lit',value:0n,span:row.method.bodySpan};assert.throws(()=>originalMethodSemanticFacts(surface),/body\/signature/);
});
test('method macro proof retains original invocation coordinates while only checked AST spans relocate',()=>{
  const row=fixture('enum Mode{On,Off}impl Mode{fn is_on(&self)->bool{matches!(self,Self::On)}}'),surface=originalMethodSemantic(row.parsed),semantic=relocateOriginalMethodSemantic(surface,200),proof=surface.body.sourceMacro.sourceMatchesProof;
  assert.equal(proof.call.originalInvocation,'matches!(self,Self::On)');assert.deepEqual(semantic.body.sourceMacro.sourceMatchesProof,proof);assert.equal(semantic.body.span.start,surface.body.span.start+200);assert.equal(semantic.sourceMethodProof.checkedSourceAssociation,false);
});
test('public generic captured-parser factories cannot mint actual Host method admission',()=>{
  const row=fixture('struct Counter{value:u8}impl Counter{fn read(&self)->u8{self.value}}'),surface=originalMethodSemantic(row.parsed);
  class FakeParser {constructor(tokens){this.cursor=new TokenCursor(tokens,'Rust');}fn(){while(!this.cursor.atEnd())this.cursor.next();return structuredClone(row.parsed.entry);}}
  const fake=new(withCapturedSourceParser(FakeParser))(tokenizeRust(row.method.source)),entry=fake.fn([]);
  assert.equal(entry.name,'read');const clone=structuredClone(surface);clone.body=entry.body;
  assert.throws(()=>checkProgram({language:'Rust',items:[clone],main:null}),/copied|unsealed|fabricated/);
});
