import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createProjectMatchesMacroContexts,isProjectMatchesAnalysisPair} from '../project-matches-analysis-context.mjs';
import {createMatchesMacroContext,configureMatchesMacroParser} from '../matches-macro-context.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {extractImplDeclarations,lowerSharedMethodTokens} from '../impl-resolver.mjs';
import {createOriginalMethodTokenTransform} from '../source-method-transforms.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {parseOriginalMethodTransform} from '../source-method-parser.mjs';
import {originalMethodSemantic} from '../source-method-admission.mjs';
import {sourceNominalDisplayClosure,sourceNominalDisplayClosureFacts,verifySourceNominalDisplayMethod} from '../format-display-source.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';

const call='pub fn show(value:Provider)->String{format!("{value}")}';
const source="pub enum Provider{One}impl Provider{pub fn as_str(&self)->&'static str{\"one\"}}"
 +"impl std::fmt::Display for Provider{fn fmt(&self,f:&mut std::fmt::Formatter<'_>)->std::fmt::Result{f.pad(self.as_str())}}"+call;
const sourceView=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}).views[0];
const options=()=>({modules:[{file:'src/lib.rs',path:[],source,sourceView}],compilationProfile:PRODUCTION_PROFILE});
function findFormat(node){
 if(node?.k==='routerFormat')return node;
 if(!node||typeof node!=='object')return null;
 for(const value of Object.values(node)){
  const found=Array.isArray(value)?value.map(findFormat).find(Boolean):findFormat(value);
  if(found)return found;
 }
 return null;
}
function closure(context){
 const parser=new HostRustParser(tokenizeRust(call));parser.compilationProfile=PRODUCTION_PROFILE;
 configureMatchesMacroParser(parser,context,{file:'src/lib.rs',offset:source.indexOf(call)});
 parser.attributes();parser.visibility();
 const node=findFormat(parser.fn([]).body);
 return sourceNominalDisplayClosure(node.sourceDisplayScope,['crate','Provider'],parser);
}
function semantic(context){
 const method=extractImplDeclarations(source,{sourcePath:'src/lib.rs',modulePath:[],sourceView,
  compilationProfile:PRODUCTION_PROFILE}).implementations.find(row=>!row.traitPath).methods[0];
 return originalMethodSemantic(parseOriginalMethodTransform(createOriginalMethodTokenTransform(
  context,method,lowerSharedMethodTokens(method,['crate','Provider']))));
}

test('paired original parser and complete method contexts join Display while foreign analyses remain refused',
 {timeout:60000},()=>{
 const first=createProjectMatchesMacroContexts(options()),second=createProjectMatchesMacroContexts(options());
 const method=semantic(first.methods()),checked={...method,modulePath:[]};
 assert.notStrictEqual(first.parser,first.methods());
 assert.strictEqual(first.methods(),first.methods());
 assert.equal(verifySourceNominalDisplayMethod(closure(first.parser),method,checked).runtimeParity,false);
 assert.throws(()=>verifySourceNominalDisplayMethod(closure(second.parser),method,checked),/foreign.*analysis context/u);
 assert.throws(()=>verifySourceNominalDisplayMethod(closure(createMatchesMacroContext(options())),method,checked),/foreign.*analysis context/u);
 assert.throws(()=>verifySourceNominalDisplayMethod(closure(first.parser),structuredClone(method),checked),/copied|unsealed/u);
});

test('private project associations reject copied proxy reversed and separately constructed contexts without invoking getters',
 {timeout:60000},()=>{
 const pair=createProjectMatchesMacroContexts(options()),method=pair.methods();
 let reads=0;const getter=Object.defineProperty({},'originalModules',{get(){reads++;throw new Error('getter');}});
 assert.equal(isProjectMatchesAnalysisPair(pair.parser,method),true);
 for(const fake of [{...pair.parser},structuredClone(pair.parser),new Proxy(pair.parser,{}),getter])
  assert.equal(isProjectMatchesAnalysisPair(fake,method),false);
 for(const fake of [{...method},structuredClone(method),new Proxy(method,{}),getter,
  createMatchesMacroContext(options()),pair.parser])
  assert.equal(isProjectMatchesAnalysisPair(pair.parser,fake),false);
 assert.equal(isProjectMatchesAnalysisPair(method,pair.parser),false);
 assert.equal(reads,0);
});

test('lazy method construction retains the captured original source and profile after caller input changes',
 {timeout:60000},()=>{
 const input=options(),pair=createProjectMatchesMacroContexts(input);
 input.modules[0].source='malformed source';input.modules[0].path.push('changed');
 input.modules.length=0;input.compilationProfile=null;input.deriveDependencies={};
 const method=pair.methods(),hash=createHash('sha256').update(source).digest('hex');
 assert.equal(method.originalModules[0].sha256,hash);
 assert.deepEqual(method.originalModules[0].path,[]);
 assert.deepEqual(method.compilationProfile,PRODUCTION_PROFILE);
 const original=semantic(method);
 assert.equal(verifySourceNominalDisplayMethod(closure(pair.parser),original,
  {...original,modulePath:[]}).runtimeParity,false);
});

test('a genuine project association cannot bypass changed original parser facts',
 {timeout:60000},()=>{
 const pair=createProjectMatchesMacroContexts(options()),method=semantic(pair.methods());
 const selected=closure(pair.parser),facts=sourceNominalDisplayClosureFacts(selected).state.facts;
 const checked={...method,modulePath:[]};
 for(const key of ['modules','evidence','profile','compilationProfile']){
  const descriptor=Object.getOwnPropertyDescriptor(facts,key);
  Object.defineProperty(facts,key,{...descriptor,value:structuredClone(facts[key])});
  try{
   assert.equal(isProjectMatchesAnalysisPair(pair.parser,pair.methods()),true);
   assert.throws(()=>verifySourceNominalDisplayMethod(selected,method,checked),/private issuance/u);
  }finally{Object.defineProperty(facts,key,descriptor);}
 }
 assert.equal(verifySourceNominalDisplayMethod(selected,method,checked).runtimeParity,false);
});
