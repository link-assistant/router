import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {translateProject} from '../project.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {HostChecker,HostRustParser,parseRust} from '../extensions/host-contracts.mjs';
import {originalParsedDeclarationEvidence,withCapturedSourceParser,linkProjectDeclaration,linkProjectMethodDeclaration} from '../extensions/source-links.mjs';
import {TokenCursor} from '../vendor/meta-language/translation/lexer.js';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {createMatchesMacroContext,originalMethodParserNamespace} from '../matches-macro-context.mjs';
import {extractImplDeclarations,lowerSharedMethodTokens} from '../impl-resolver.mjs';
import {createOriginalMethodTokenTransform} from '../source-method-transforms.mjs';
import {parseOriginalMethodTransform,originalMethodParsedFacts} from '../source-method-parser.mjs';
import {originalMethodSemantic} from '../source-method-admission.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';
const member='pub enum Mode{On,Off}impl Mode{pub fn is_on(&self)->bool{matches!(self,Self::On)}}';
const source=member+'pub fn probe(v:u8)->bool{matches!(v,1 | 2)}'+'pub fn on(v:&Mode)->bool{v.is_on()}pub fn make_on()->Mode{Mode::On}pub fn make_off()->Mode{Mode::Off}';
const hash=value=>createHash('sha256').update(value).digest('hex');
const project=files=>translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});
const both=(result,verify)=>verifyTypedTargets(result,verify,{childTimeoutMs:30000});
function find(value,predicate){if(!value||typeof value!=='object')return null;if(predicate(value))return value;for(const [key,child]of Object.entries(value))if(key!=='type'){const result=Array.isArray(child)?child.map(item=>find(item,predicate)).find(Boolean):find(child,predicate);if(result)return result;}return null;}
test('the complete historical Mode source now checks only a shared discriminant in JS and strict TS',{timeout:90000},async()=>{
  assert.equal(hash(member),'aca172c1f6f8e10efcddf152ead52c6f02a275002a98e7ff67444e0cea9ba2a1');
  assert.equal(hash(source),'f9418cd4c97560e8808aef755645b3d92516a3deacc10be21ae2874f45d0d35f');
  const result=project({'src/lib.rs':source});assert.deepEqual(result.meta.refused,[]);
  assert.ok(result.meta.checkedMethods.some(row=>row.name==='Mode.is_on'&&row.receiver==='shared'));
  assert.equal(result.meta.runtimeParity,false);assert.equal(result.meta.sources[0].sha256,hash(source));
  const checked=parseProgram(JSON.stringify(result.meta.checkedSemanticProgram)),method=[...checked.declarations.values()].find(entry=>entry.impl?.method==='is_on');
  const originalEnum=checked.declarations.get('Mode');
  assert.equal(Object.hasOwn(originalEnum,'record'),false);assert.equal(Object.hasOwn(originalEnum,'tuple'),false);
  assert.equal(originalEnum.record,undefined);assert.equal(originalEnum.tuple,undefined);
  assert.equal(method.params[0].type.rustReference.kind,'shared');assert.equal(method.params[0].type.rustReference.pointee.name,'Mode');
  assert.equal(method.impl.copyCertificate,undefined);assert.equal(method.params[0].copyReceiver,undefined);assert.equal(method.sourceMethodProof.copyAuthority,false);
  assert.equal(find(method.body,node=>node.k==='routerPatternProjection'),null);
  const evidence=find(method.body,node=>node.patternControl?.kind==='ordered-scalar-match').patternControl;
  for(const row of evidence.rows)assert.deepEqual(row.plan.bindings,[]);
  assert.equal(source.slice(71,79),'Self::On');assert.deepEqual(result.meta.checkedMethods.find(row=>row.name==='Mode.is_on').span,{start:31,end:81});
  await both(result,api=>{assert.equal(api.on(api.make_on()),true);assert.equal(api.on(api.make_off()),false);for(const [v,expected]of [[0n,false],[1n,true],[2n,true],[255n,false]])assert.equal(api.probe(v),expected);});
});
test('single-variant constructor and wildcard retain exact immutable tagged layout guards',{timeout:90000},async()=>{
  const original='pub enum One{Only}impl One{pub fn only(&self)->bool{matches!(self,Self::Only)}pub fn any(&self)->bool{matches!(self,_)}}pub fn only(v:&One)->bool{v.only()}pub fn any(v:&One)->bool{v.any()}pub fn make()->One{One::Only}';
  const result=project({'src/lib.rs':original});assert.deepEqual(result.meta.refused,[]);
  for(const method of ['only','any'])assert.ok(result.meta.checkedMethods.some(row=>row.name==='One.'+method));
  await both(result,api=>{
    const valid=api.make();assert.equal(api.only(valid),true);assert.equal(api.any(valid),true);
    let callbacks=0;const traps={get(){callbacks++;throw Error('get');},ownKeys(){callbacks++;throw Error('keys');},getPrototypeOf(){callbacks++;throw Error('prototype');},getOwnPropertyDescriptor(){callbacks++;throw Error('descriptor');}};
    const invalid=[null,{$:'Only'},Object.freeze({}),Object.freeze({$:'Unknown'}),Object.freeze({$:'Only',field0:1n}),Object.freeze({get $(){callbacks++;return 'Only';}}),new Proxy(valid,traps),Object.freeze(Object.create({$:'Only'}))];
    for(const value of invalid)for(const name of ['only','any'])assert.throws(()=>api[name](value),TypeError);
    assert.equal(callbacks,0);assert.equal(api.only(valid),true);assert.ok(Object.isFrozen(valid));
  });
});
test('original shared enum guards preserve alternative retry and subject call order',{timeout:90000},async()=>{
  const original='pub enum Mode{On,Off}fn mark(path:&str)->bool{std::fs::read_to_string(path).is_ok()}impl Mode{pub fn selected(&self)->bool{matches!(self,Self::On | Self::On if mark("guard"))}}fn build()->Mode{let ignored=mark("subject");Mode::On}pub fn run()->bool{build().selected()}pub fn off()->bool{Mode::Off.selected()}';
  const result=project({'src/lib.rs':original});assert.deepEqual(result.meta.refused,[]);assert.ok(result.meta.checkedMethods.some(row=>row.name==='Mode.selected'&&row.receiver==='shared'));
  await verifyCohortTargets(result,(api,{withEffectCapabilities})=>{
    const calls=[];let guards=0;
    const capabilities={fs:{sync:{readFileSync(path){calls.push(path);if(path==='guard'&&++guards===1)throw Object.assign(Error('missing'),{code:'ENOENT'});return new Uint8Array();}}}};
    assert.equal(withEffectCapabilities(capabilities,()=>api.run()),true);assert.deepEqual(calls,['subject','guard','guard']);
    calls.length=0;assert.equal(withEffectCapabilities(capabilities,()=>api.off()),false);assert.deepEqual(calls,[]);
  });
});
test('inline and external original enum methods keep their own declaration and receiver scope',{timeout:90000},async()=>{
  const model='pub enum State{On,Off}impl State{pub fn active(&self)->bool{matches!(self,Self::On)}}pub fn on()->State{State::On}pub fn off()->State{State::Off}';
  const files={'src/lib.rs':'mod model;mod inline{'+model+'}pub fn left()->bool{inline::on().active()}pub fn right()->bool{model::off().active()}','src/model.rs':model};
  const result=project(files);assert.deepEqual(result.meta.refused,[]);
  for(const name of ['inline.State.active','model.State.active'])assert.ok(result.meta.checkedMethods.some(row=>row.name===name&&row.receiver==='shared'));
  await both(result,api=>{assert.equal(api.left(),true);assert.equal(api.right(),false);});
});
test('payload empty-tuple record conditional and unproved receiver shapes remain refused',()=>{
  for(const original of [
    'enum Mode{On(u8),Off}impl Mode{fn bad(&self)->bool{matches!(self,Self::Off)}}',
    'enum Mode{On(),Off}impl Mode{fn bad(&self)->bool{matches!(self,Self::Off)}}',
    'enum Mode{On{},Off}impl Mode{fn bad(&self)->bool{matches!(self,Self::Off)}}',
    'enum Mode{#[cfg(unix)]On,Off}impl Mode{fn bad(&self)->bool{matches!(self,Self::Off)}}',
    'enum Mode{On,Off}impl Mode{fn bad(&self,v:&Self)->bool{matches!(v,Self::On)}}',
    'enum Mode{On,Off}enum Other{On,Off}impl Mode{fn bad(&self)->bool{matches!(self,Other::On)}}',
    'mod model{pub enum Mode{On,Off}}impl model::Mode{fn bad(&self)->bool{matches!(self,Self::On)}}',
    'enum Mode{On,Off}pub fn bad(v:&Mode)->bool{matches!(v,Mode::On)}',
    'enum Mode{On,Off}impl Mode{fn bad(&mut self)->bool{matches!(self,Self::On)}}',
    'enum Mode{On,Off}impl Mode{fn bad(self)->bool{matches!(self,Self::On)}}',
    'enum Mode{On,Off}impl Mode{fn bad(&self)->Self{match self{_=>self}}}',
    'enum Mode{On,Off}impl Mode{fn bad(&self)->bool{matches!(self,Self::On)}}macro_rules! matches{($($t:tt)*)=>{true}}',
  ]){const result=project({'src/lib.rs':original});assert.equal(result.meta.checkedMethods.some(row=>row.name==='Mode.bad'),false,original);assert.equal(result.meta.executable.some(row=>row.name==='bad'),false,original);assert.ok(result.meta.refused.length,original);}
});
test('original linked enum evidence denies cloned resealed accessor and proxy layouts without calls',()=>{
  const surface=parseRust('pub enum Mode{On,Off}fn main(){}'),entry=surface.items.find(item=>item.k==='data'),evidence=originalParsedDeclarationEvidence(entry);assert.ok(evidence);assert.ok(Object.isFrozen(evidence));
  let callbacks=0;const proxy=new Proxy(entry,{get(){callbacks++;throw Error('get');},ownKeys(){callbacks++;throw Error('keys');},getPrototypeOf(){callbacks++;throw Error('prototype');},getOwnPropertyDescriptor(){callbacks++;throw Error('descriptor');}});
  assert.equal(originalParsedDeclarationEvidence(proxy),null);assert.equal(originalParsedDeclarationEvidence(structuredClone(entry)),null);
  const previous=Object.getOwnPropertyDescriptor(entry,'ctors');Object.defineProperty(entry,'ctors',{configurable:true,enumerable:true,get(){callbacks++;return [];}});
  try{assert.throws(()=>originalParsedDeclarationEvidence(entry),/accessor/);}finally{Object.defineProperty(entry,'ctors',previous);}
  entry.ctors[0].ctorStyle='tuple';assert.throws(()=>originalParsedDeclarationEvidence(entry),/changed after source capture/);entry.ctors[0].ctorStyle='unit';assert.equal(originalParsedDeclarationEvidence(entry),evidence);
  assert.equal(new HostChecker('Rust',[]).sharedNullaryPatternOwner(proxy,proxy,proxy,proxy),null);assert.equal(callbacks,0);
  // A public low parser factory really can issue a source-integrity record.
  // It cannot prove that the original payload enum was actually nullary.
  const original='enum Mode{On(u8),Off}impl Mode{fn bad(&self)->bool{matches!(self,Self::Off)}}',enumEnd=original.indexOf('impl');
  const sourceView=captureSourceModuleViews({source:original,sourcePath:'src/lib.rs'}).views[0],context=createMatchesMacroContext({modules:[{file:'src/lib.rs',path:[],source:original,sourceView}]}),method=extractImplDeclarations(original,{sourcePath:'src/lib.rs',sourceView}).implementations[0].methods[0];
  const parsed=parseOriginalMethodTransform(createOriginalMethodTokenTransform(context,method,lowerSharedMethodTokens(method,['crate','Mode']))),semantic=originalMethodSemantic(parsed),namespace=originalMethodParserNamespace(context,method);
  const scope={bindingEvidence:namespace.scope,compilationProfile:namespace.compilationProfile,configurationCondition:sourceView.configurationCondition};
  linkProjectMethodDeclaration(originalMethodParsedFacts(parsed).parser,parsed.entry,semantic,semantic,{source:original,sourcePath:'src/lib.rs',memberSpan:method.span,bodySpan:method.bodySpan,scope});
  const forged={k:'data',name:'Mode',ctors:['On','Off'].map(name=>({name,fields:[],ctorStyle:'unit',rustAttributes:[]})),rustAttributes:[],deriveTraits:[],span:{start:0,end:enumEnd}};
  class FakeBase {constructor(tokens){this.cursor=new TokenCursor(tokens,'Rust');}items(root,items){this.cursor.index=this.cursor.tokens.length-1;items.push(forged);}}
  const fake=new(withCapturedSourceParser(FakeBase))(tokenizeRust(original.slice(0,enumEnd))),items=[];fake.items({},items,[],()=>fake.cursor.atEnd());
  assert.equal(linkProjectDeclaration(fake,forged,forged,{source:original,sourcePath:'src/lib.rs',itemSpan:{start:0,end:enumEnd},itemOffset:0,globalOffset:0,path:[],scope}),true);
  assert.ok(originalParsedDeclarationEvidence(forged));
  assert.throws(()=>new HostChecker('Rust',[]).program({language:'Rust',items:[forged,semantic],main:null}),/complete enum layout/);
  const descriptor=Object.getOwnPropertyDescriptor(HostRustParser.prototype,'enumItem');
  Object.defineProperty(HostRustParser.prototype,'enumItem',{configurable:true,value(){callbacks++;return forged;}});
  try{assert.throws(()=>new HostChecker('Rust',[]).program({language:'Rust',items:[forged,semantic],main:null}),/identity|changed/);}finally{if(descriptor)Object.defineProperty(HostRustParser.prototype,'enumItem',descriptor);else delete HostRustParser.prototype.enumItem;}
  const parent=Object.getPrototypeOf(HostRustParser.prototype);let tail=parent;
  for(let depth=0;depth<64;depth++)tail=Object.create(tail);
  Object.setPrototypeOf(HostRustParser.prototype,tail);
  try{assert.throws(()=>new HostChecker('Rust',[]).program({language:'Rust',items:[forged,semantic],main:null}),/bound|depth/);}finally{Object.setPrototypeOf(HostRustParser.prototype,parent);}
  assert.equal(callbacks,0);
});
test('raw public method and enum metadata cannot mint a private shared receiver admission',()=>{
  let callbacks=0;const surface=parseRust('pub enum Mode{On,Off}pub fn probe(v:&Mode)->bool{matches!(v,Mode::On)}fn main(){}');
  const fn=surface.items.find(item=>item.k==='fn');fn.sourceMethodProof={schema:'original-method-semantic-source-v1',copyAuthority:false};
  assert.throws(()=>new HostChecker('Rust',[]).program(surface),/copied|unsealed|fabricated/);
  const cloned=structuredClone(surface);Object.defineProperty(cloned.items[1],'sourceMethodProof',{enumerable:true,get(){callbacks++;return fn.sourceMethodProof;}});
  assert.throws(()=>new HostChecker('Rust',[]).program(cloned),/data property|accessor/);assert.equal(callbacks,0);
});
test('fresh-process source checker and project imports keep the existing initialization boundary',()=>{
  for(const file of ['../shared-nullary-enum.mjs','../project.mjs','../extensions/host-contracts.mjs','../extensions/source-links.mjs']){
    execFileSync(process.execPath,['--input-type=module','-e',`await import(${JSON.stringify(new URL(file,import.meta.url).href)});`],{stdio:'pipe',timeout:10000});
  }
});
