import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {sourceItems} from '../rust-structure.mjs';
import {resolveModuleGraph,translateProject} from '../project.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {parseProgram} from '../semantic-meta.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {staticSourceLifecycleContext} from './real-source-fixtures.mjs';
const staticOriginal=staticSourceLifecycleContext("macro-use-bindings.test.mjs");

const options=files=>({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE});
const graph=files=>resolveModuleGraph(options(files));
const bindings=files=>{const value=graph(files);return resolveModuleBindings({modules:value.modules,compilationProfile:value.compilationProfile});};
const root=result=>result.scopes.find(scope=>scope.path.length===0);
const hash=value=>createHash('sha256').update(value).digest('hex');

function originalOutput(){const source=staticOriginal.source('src/operation_output.rs');assert.equal(hash(source),'1a7dc0667a29686dff795f223097f655760b0118823a80111b0d3eff29811322');return source;}
function originalRootDeclarations(){
  const source=staticOriginal.source('src/lib.rs');assert.equal(hash(source),'3c9605387b5454634325dbbf7604e0ad919931be17dac05905a60ea0268286af');
  return sourceItems(source).filter(item=>item.term==='mod'&&['operation_output','account_http'].includes(item.name)).map(item=>source.slice(item.start,item.end)).join('\n');
}

test('original macro_use traverses its tracked body and records source textual imports without expansions',()=>{
  const files={'src/lib.rs':originalRootDeclarations(),'src/operation_output.rs':originalOutput(),'src/account_http.rs':''};
  const value=graph(files);assert.deepEqual(value.diagnostics,[]);assert.equal(value.edges[0].macroUse.kind,'textual-module-scope');
  const result=bindings(files),macros=root(result).bindings.filter(binding=>binding.namespace==='macro');
  assert.equal(root(result).unresolvedMacroScope,false);assert.deepEqual(macros.map(binding=>binding.name),['eprintln','print','println']);
  for(const binding of macros){assert.equal(binding.status,'unresolved');assert.equal(binding.via,'macro-use-import');assert.equal(binding.declaration.source,'src/operation_output.rs');assert.equal(binding.textualScope.visibleAfter,value.edges[0].macroUse.visibleAfter);}
});

test('nested macro_use propagates original names while qualified-only macro imports are not textual exports',()=>{
  const files={'src/lib.rs':'#[macro_use] mod middle;','src/middle.rs':'#[macro_use] mod child; use missing::format;','src/middle/child.rs':'macro_rules! local {()=>{0}} #[macro_export] macro_rules! exported {()=>{1}}'};
  const result=bindings(files),macros=root(result).bindings.filter(binding=>binding.namespace==='macro');
  assert.equal(root(result).unresolvedMacroScope,false);assert.deepEqual(macros.map(binding=>binding.name),['exported','local']);
  assert.equal(macros.find(binding=>binding.name==='local').declaration.source,'src/middle/child.rs');
});

test('child source declaration order selects its final textual definition without authorizing an expansion',()=>{
  for(const later of [true,false]){
    const declaration='macro_rules! format {()=>{"parent"}}',nested='#[macro_use] mod child;';
    const result=bindings({'src/lib.rs':'#[macro_use] mod middle;','src/middle.rs':later?nested+declaration:declaration+nested,'src/middle/child.rs':'macro_rules! format {()=>{"child"}}'});
    const actual=root(result).bindings.find(binding=>binding.name==='format'&&binding.namespace==='macro');
    assert.equal(actual.declaration.source,later?'src/middle.rs':'src/middle/child.rs');assert.equal(actual.status,'unresolved');
  }
});

test('unknown cfg proc expansion selective lists and missing children retain complete scope refusals',()=>{
  for(const [parent,child]of [
    ['#[macro_use] mod child;','#[derive(custom::Expand)] struct S;'],
    ['#[macro_use] mod child;','use missing::*;'],
    ['#[cfg(unix)] #[macro_use] mod child;','macro_rules! format {()=>{0}}'],
    ['#[macro_use(format)] mod child;','macro_rules! format {()=>{0}}'],
    ['#[macro_use] mod missing;',''],
    ['mod child;','#[derive(custom::Expand)] struct S;'],
  ]){const result=bindings({'src/lib.rs':parent,'src/child.rs':child});assert.equal(root(result).unresolvedMacroScope,true,parent+child);}
  const inactive=bindings({'src/lib.rs':'#[cfg(test)] #[macro_use] mod missing;'});assert.equal(root(inactive).unresolvedMacroScope,false);
  const rootCall=translateProject(options({'src/lib.rs':'mod child; pub fn text()->String{format!("unproved root namespace")}','src/child.rs':'#[derive(custom::Expand)] struct S;'}));assert.equal(rootCall.meta.executable.some(item=>item.name==='text'),false);assert.ok(rootCall.meta.refused.some(item=>item.name==='text'&&/macro format/u.test(item.message)));
  for(const nested of ['#[macro_export] macro_rules! format {($($t:tt)*)=>{String::from("custom")}}','#[cfg_attr(unix,macro_export)] macro_rules! format {()=>{"custom"}}','#[custom::Expand] struct S;']){
    const files={'src/lib.rs':'mod child; pub fn text()->String{format!("standard")}','src/child.rs':`pub fn register(){${nested}}`},evidence=bindings(files);
    assert.equal(root(evidence).unresolvedMacroScope,true);assert.ok(evidence.diagnostics.some(item=>/nested source attribute/u.test(item.message)));
    const result=translateProject(options(files));assert.equal(result.meta.executable.some(item=>item.name==='text'),false);assert.ok(result.meta.refused.some(item=>item.name==='text'&&/macro format/u.test(item.message)));
  }
});

test('custom textual format preserves import order evidence and conservatively refuses prior references',()=>{
  for(const before of [true,false]){
    const call='pub fn text()->String{format!("standard")}',declaration='#[macro_use] mod child;',files={'src/lib.rs':before?call+declaration:declaration+call,'src/child.rs':'macro_rules! format {()=>{"CUSTOM"}}'};
    const result=translateProject(options(files));assert.equal(result.meta.executable.some(item=>item.name==='text'),false);
    assert.ok(result.meta.refused.some(item=>item.name==='text'&&/macro format/u.test(item.message)));
    const binding=root(result.meta.bindingEvidence).bindings.find(binding=>binding.name==='format');assert.ok(binding.textualScope.visibleAfter>0);assert.equal(binding.status,'unresolved');
  }
});

test('unchanged account_http non_empty checks and executes with original tracked output macro names',async()=>{
  const source=staticOriginal.source('src/account_http.rs');assert.equal(hash(source),'876e7e38985d93f896c9d191f9d7591abb66697f93504a202d4fd208217bdd09');
  const selected=sourceItems(source).find(item=>item.name==='non_empty');assert.equal(hash(source.slice(selected.start,selected.end)),'4c1bb4cb6df8b811efb497fc5266ca0ae5cc6da15e216231283c009fe89b12b4');
  const result=translateProject(options({'src/lib.rs':originalRootDeclarations(),'src/operation_output.rs':originalOutput(),'src/account_http.rs':source}));
  assert.equal(result.meta.runtimeParity,false);assert.ok(result.meta.executable.some(item=>item.name==='account_http.non_empty'&&item.span.start===selected.start&&item.span.end===selected.end));
  const target=parseProgram(JSON.stringify(result.meta.targetSemanticProgram)),entry=target.declarations.get(`rp_${Buffer.from('account_http.non_empty').toString('hex')}`);assert.ok(entry);
  const alias=`\nexport {${entry.name} as originalNonEmpty};`;
  await verifyTypedTargets({...result,javascript:result.javascript+alias,typescript:result.typescript+alias},(_api,_result,module)=>{
    for(const [value,what,expected]of [[' abc ','env:',{$:'Ok',field0:'abc'}],['','env:',{$:'Err',field0:'env: needs a value'}],[' \n\t','file:',{$:'Err',field0:'file: needs a value'}],['東京','value',{$:'Ok',field0:'東京'}]])assert.deepEqual(module.originalNonEmpty(value,what),expected);
    assert.throws(()=>module.originalNonEmpty(7,'value'),TypeError);
  });
});

test('independent standard format survives known println imports in JavaScript and strict compiled TypeScript',async()=>{
  const result=translateProject(options({'src/lib.rs':'#[macro_use] mod output; pub fn text(value:u64)->String{format!("value={value}")} pub fn blocked(){println!("actual source macro");}','src/output.rs':'macro_rules! println {($($arg:tt)*)=>{unimplemented!()}}'}));
  assert.ok(result.meta.refused.some(item=>item.name==='blocked'));assert.ok(result.meta.executable.some(item=>item.name==='text'));
  await verifyTypedTargets(result,api=>{assert.equal(api.text(7n),'value=7');assert.throws(()=>api.text(7),TypeError);});
});
