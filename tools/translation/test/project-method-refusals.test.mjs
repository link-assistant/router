import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRust,checkProgram,checkProjectProgram} from '../extensions/host-contracts.mjs';
import {declarationRefusals,withDeclarationRefusalCollection,checkCollectedDeclarationTypes} from '../extensions/declaration-refusals.mjs';
import {TranslationError} from '../vendor/meta-language/translation/diagnostics.js';
import {captureSourceModuleViews} from '../source-module-views.mjs';
import {extractImplDeclarations,lowerSharedMethodTokens} from '../impl-resolver.mjs';
import {createMatchesMacroContext,matchesParserFacts} from '../matches-macro-context.mjs';
import {createOriginalMethodTokenTransform} from '../source-method-transforms.mjs';
import {parseOriginalMethodTransform,originalMethodParsedFacts} from '../source-method-parser.mjs';
import {originalMethodSemantic,originalMethodRefusalRange} from '../source-method-admission.mjs';
import {translateProject,resolveModuleGraph} from '../project.mjs';
import {serializeProgram} from '../semantic-meta.mjs';
import {verifyCohortTargets} from './cohort-targets.mjs';

const project=(source,options={})=>translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,...options});
function failure(operation){try{operation();}catch(error){return error;}assert.fail('Unsupported original source must fail');}
function fixture(source){
  const sourceView=captureSourceModuleViews({source,sourcePath:'src/lib.rs'}).views[0];
  const context=createMatchesMacroContext({modules:[{file:'src/lib.rs',path:[],source,sourceView}]});
  const implementations=extractImplDeclarations(source,{sourcePath:'src/lib.rs',sourceView}).implementations;
  const rows=implementations.flatMap(implementation=>implementation.methods.map(method=>{
    const lowered=lowerSharedMethodTokens(method,['crate',...method.typePath]),transform=createOriginalMethodTokenTransform(context,method,lowered),parsed=parseOriginalMethodTransform(transform);
    return {method,lowered,parsed,surface:originalMethodSemantic(parsed)};
  }));
  // The nominal declaration is parsed from its original prefix. The direct
  // phase controls below never emit code; full-source project cases do that.
  const nominal=parseRust(source.slice(0,implementations[0].span.start)+'\nfn main(){}\n');
  return {source,rows,program:{language:'Rust',items:[...nominal.items,...rows.map(row=>row.surface)],main:null}};
}
const name=row=>row.surface.name;

test('private original method signatures collect together with exact original type spans',()=>{
  const source='pub struct Counter{value:u8}impl Counter{pub fn first(v:MissingA)->u8{0}pub fn second(v:MissingB)->u8{0}pub fn good()->u8{7}}';
  const row=fixture(source),batch=declarationRefusals(failure(()=>checkProjectProgram(row.program)));
  assert.deepEqual(batch.map(entry=>entry.name),row.rows.slice(0,2).map(name));
  assert.ok(batch.every(entry=>entry.phase==='declaration-types'&&entry.error instanceof TranslationError));
  assert.deepEqual(batch.map(entry=>source.slice(entry.error.span.start,entry.error.span.end)),['MissingA','MissingB']);
  for(const method of row.rows)assert.deepEqual(originalMethodRefusalRange(method.surface,[]),method.method.span);
  const ordinary=failure(()=>checkProgram(row.program));assert.equal(declarationRefusals(ordinary),null);
  assert.equal(ordinary.reason,batch[0].error.reason);assert.deepEqual(ordinary.span,batch[0].error.span);
});

test('optional original method body collection preserves ordinary and default first failures',()=>{
  const source='pub struct Counter{value:u8}impl Counter{pub fn first()->u8{missingA()}pub fn second()->u8{missingB()}pub fn good()->u8{7}}';
  const row=fixture(source),batch=declarationRefusals(failure(()=>checkProjectProgram(row.program,{collectIndependentBodies:true})));
  assert.deepEqual(batch.map(entry=>entry.name),row.rows.slice(0,2).map(name));assert.ok(batch.every(entry=>entry.phase==='declaration-bodies'));
  for(const operation of [()=>checkProgram(row.program),()=>checkProjectProgram(row.program)]){
    const error=failure(operation);assert.equal(declarationRefusals(error),null);assert.equal(error.reason,batch[0].error.reason);assert.deepEqual(error.span,batch[0].error.span);
  }
});

test('root inline and external method removal rechecks callers with exact relocated source attribution',{timeout:240000},async()=>{
  const members='pub struct Counter{value:u8}impl Counter{pub fn first()->u8{missingA()}pub fn second()->u8{missingB()}pub fn middle()->u8{Counter::first()}pub fn good(v:u8)->u8{v+2}}';
  const callers=owner=>`pub fn caller()->u8{${owner}::middle()}pub fn run(v:u8)->u8{${owner}::good(v)}`;
  const cases=[
    {files:{'src/lib.rs':members+callers('Counter')},method:'Counter.good'},
    {files:{'src/lib.rs':'pub mod model;'+callers('model::Counter'),'src/model.rs':members},method:'model.Counter.good'},
    {files:{'src/lib.rs':'pub mod model{'+members+'}'+callers('model::Counter')},method:'model.Counter.good'},
  ];
  for(const row of cases){
    const options={entry:'src/lib.rs',paths:Object.keys(row.files),readSource:path=>row.files[path]},graph=resolveModuleGraph(options);
    const batched=translateProject(options),ordinary=translateProject({...options,collectIndependentBodies:false});
    const refusals=result=>result.meta.refused.map(entry=>({name:entry.name,message:entry.message,span:entry.span})).sort((a,b)=>a.name.localeCompare(b.name));
    assert.deepEqual(refusals(batched),refusals(ordinary));assert.equal(batched.javascript,ordinary.javascript);assert.equal(batched.typescript,ordinary.typescript);
    assert.ok(batched.meta.refused.some(row=>row.name==='caller'));
    const attributed=[];
    for(const refusal of batched.meta.refused.filter(row=>row.term==='method')){
      const module=graph.modules.find(module=>module.file===refusal.file&&module.path.join('.')===(row.method.startsWith('model.')?'model':''));assert.ok(module);
      const methods=extractImplDeclarations(module.source,{sourcePath:module.file,modulePath:module.path,sourceView:module.sourceView}).implementations.flatMap(row=>row.methods);
      const owner=methods.find(method=>method.span.start+module.offset<=refusal.span.start&&refusal.span.end<=method.span.end+module.offset);assert.ok(owner);
      attributed.push(owner.name);assert.ok(module.source.slice(refusal.span.start-module.offset,refusal.span.end-module.offset).length>0);
    }
    assert.deepEqual(attributed.sort(),['first','middle','second']);
    assert.deepEqual(batched.meta.checkedMethods.map(row=>row.name),[row.method]);assert.ok(batched.meta.executable.some(row=>row.name==='run'));
    await verifyCohortTargets(batched,api=>{assert.equal(api.run(4n),6n);assert.equal(api.run(5n),7n);assert.throws(()=>api.run(255n),RangeError);assert.deepEqual(Object.keys(api),['run']);});
  }
});

test('128 actual source methods are refused without callable stubs or unchecked caller bodies',{timeout:90000},async()=>{
  const source='pub struct Counter{value:u8}impl Counter{'+Array.from({length:128},(_,index)=>`pub fn bad${index}()->u8{missing${index}()}`).join('')+'pub fn good()->u8{11}}pub fn run()->u8{Counter::good()}';
  const result=project(source);assert.equal(result.meta.refused.length,128);assert.equal(new Set(result.meta.refused.map(row=>row.name)).size,128);
  assert.deepEqual(result.meta.checkedMethods.map(row=>row.name),['Counter.good']);
  await verifyCohortTargets(result,api=>{assert.deepEqual(Object.keys(api),['run']);assert.equal(api.run(),11n);});
});

test('successful actual method programs keep ordinary checked semantic serialization',()=>{
  const row=fixture('pub struct Counter{value:u8}impl Counter{pub fn first(v:u8)->u8{v+1}pub fn second()->u8{3}}');
  assert.equal(serializeProgram(checkProjectProgram(row.program,{collectIndependentBodies:true})),serializeProgram(checkProgram(row.program)));
  assert.equal(originalMethodRefusalRange(row.rows[0].surface,['wrong']),null);
});

test('current semantic parsed token and private context mutations cannot become collected source refusals',()=>{
  const source='pub struct Counter{value:u8}impl Counter{pub fn bad()->u8{missing()}}';
  const corruptions=[
    row=>{row.rows[0].surface.body={k:'name',path:['changed'],span:row.rows[0].method.bodySpan};},
    row=>{row.rows[0].parsed.entry.ret={kind:'bool'};},
    row=>{row.rows[0].lowered.tokens[0].value='changed';},
    row=>{const parser=originalMethodParsedFacts(row.rows[0].parsed).parser,frame=matchesParserFacts(parser);frame.facts.modules=structuredClone(frame.facts.modules);},
  ];
  for(const corrupt of corruptions){
    const row=fixture(source);corrupt(row);const error=failure(()=>checkProjectProgram(row.program,{collectIndependentBodies:true}));
    assert.ok(error instanceof TypeError);assert.equal(declarationRefusals(error),null);
  }
});

test('public copies accessors and proxies cannot mint a method refusal range or invoke callbacks',()=>{
  const row=fixture('pub struct Counter{value:u8}impl Counter{pub fn bad()->u8{missing()}}'),surface=row.rows[0].surface;
  let calls=0;const traps={get(){calls++;throw Error('get');},ownKeys(){calls++;throw Error('keys');},getPrototypeOf(){calls++;throw Error('prototype');},getOwnPropertyDescriptor(){calls++;throw Error('descriptor');}};
  for(const value of [structuredClone(surface),new Proxy(surface,traps),Object.defineProperty({},'sourceMethodProof',{get(){calls++;return surface.sourceMethodProof;}})])assert.equal(originalMethodRefusalRange(value,[]),null);
  Object.defineProperty(surface.body,'hidden',{enumerable:true,get(){calls++;return 0;}});
  const error=failure(()=>checkProjectProgram(row.program,{collectIndependentBodies:true}));assert.ok(error instanceof TypeError);assert.equal(declarationRefusals(error),null);assert.equal(calls,0);
});

test('out-of-member ranges internal exceptions and nonissued generated bodies remain ordinary errors',()=>{
  const row=fixture('pub struct Counter{value:u8}impl Counter{pub fn bad()->u8{missing()}}'),item=row.rows[0].surface;
  for(const error of [new TranslationError('unsupported','outside actual member',{start:0,end:1}),new TypeError('internal source failure')]){
    class Base{program(){this.walk([item],[],()=>{throw error;},'declaration-bodies');}walk(items,path,visit,phase){for(const value of items)this.visitDeclaration(value,path,value,visit,phase);}visitDeclaration(value,path,entry,visit){return visit(value,path,entry);}}
    const checker=new(withDeclarationRefusalCollection(Base))();assert.equal(failure(()=>checkCollectedDeclarationTypes(checker,{},{collectIndependentBodies:true})),error);assert.equal(declarationRefusals(error),null);
  }
  const generated={language:'Rust',main:null,items:[{k:'fn',name:'ml_unissued',generated:true,params:[],ret:{kind:'fixed',bits:8,signed:false},span:{start:0,end:10},body:{k:'name',path:['missing'],span:{start:5,end:6}}}]};
  const error=failure(()=>checkProjectProgram(generated,{collectIndependentBodies:true}));assert.ok(error instanceof TranslationError);assert.equal(declarationRefusals(error),null);
});

test('complete body checking still rejects final constant and source-lifetime proof failures',()=>{
  for(const source of ['const BAD:u8=255u8+1u8;fn main(){}',"pub fn bad(value:&str)->&'static str{value}fn main(){}"]){
    const error=failure(()=>checkProjectProgram(parseRust(source),{collectIndependentBodies:true}));assert.ok(error instanceof TranslationError);assert.equal(declarationRefusals(error),null);assert.match(error.reason,/constant evaluation|escaping source borrow/);
  }
});
