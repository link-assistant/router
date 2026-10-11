import test from 'node:test';
import assert from 'node:assert/strict';
import {compilationProfile,PRODUCTION_PROFILE,evaluateConfiguration,itemConfiguration} from '../cfg-profile.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {resolveModuleGraph,translateProject} from '../project.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
const evaluate=(source,profile=PRODUCTION_PROFILE)=>evaluateConfiguration(rustTokens(source),profile);
const condition=(source,profile=PRODUCTION_PROFILE)=>itemConfiguration(rustTokens(source),profile);
test('production configuration sets only the explicit non-test flag',()=>{
  assert.equal(evaluate('test').value,false);for(const flag of ['unix','windows','debug_assertions','unknown'])assert.equal(evaluate(flag).value,null);
  assert.equal(evaluate('target_os = "linux"').value,null);assert.equal(evaluate('feature = "serde"').value,null);
  assert.equal(evaluate('test',null).value,null);assert.equal(Object.isFrozen(PRODUCTION_PROFILE.flags),true);
});
test('three-valued boolean composition follows Rust all any and not predicates',()=>{
  for(const [input,value] of [['all()',true],['any()',false],['not(test)',true],['all(test,unknown)',false],['any(not(test),unknown)',true],['all(not(test),unknown)',null],['any(test,unknown)',null],['not(unknown)',null],['all(not(test),any(test,not(test)),)',true]])assert.equal(evaluate(input).value,value,input);
});
test('explicit values and closed sets distinguish absent from unknown features',()=>{
  const profile=compilationProfile({values:{feature:['serde','std'],target_os:['linux']},closedKeys:['feature']});
  assert.equal(evaluate('feature = "serde"',profile).value,true);assert.equal(evaluate('feature = "other"',profile).value,false);assert.equal(evaluate('target_os = "macos"',profile).value,null);
  assert.equal(evaluate('target_os = r#"linux"#',profile).value,true);
});
test('malformed or unsupported grammar does not become an active condition',()=>{
  for(const input of ['not()','not(test,unknown)','not(test,)','all(test,,unknown)','all(test','custom(test)','feature = 9','test trailing','true','false'])assert.equal(evaluate(input).value,null,input);
});
test('false cfg removes an entire item even with unrelated unknown attribute expansion',()=>{
  const result=condition('#[derive(Unknown)] #[cfg(test)] struct Hidden;');assert.equal(result.status,'inactive');assert.equal(result.attributes[1].evaluation.value,false);assert.deepEqual(result.attributes[1].span,{start:19,end:31});
});
test('active known conditions retain original attributes and unknown cfg_attr stays unproven',()=>{
  const result=condition('#[cfg(not(test))] #[allow(dead_code)] fn visible(){}');assert.equal(result.status,'active');assert.equal(result.attributes.length,2);assert.equal(result.attributes[0].tokens.join(''),'#[cfg(not(test))]');
  for(const source of ['#[cfg(unknown)] fn maybe(){}','#[cfg_attr(test,derive(Custom))] struct Maybe;'])assert.equal(condition(source).status,'unknown');
});
test('profile proof clones caller state and remains serializable and deeply immutable',()=>{
  const input={flags:{test:false},values:{feature:['std']},closedKeys:['feature']},profile=compilationProfile(input);input.flags.test=true;input.values.feature.push('other');
  assert.equal(profile.flags.test,false);assert.deepEqual(profile.values.feature,['std']);assert.equal(Object.isFrozen(profile.values.feature),true);assert.deepEqual(compilationProfile(JSON.parse(JSON.stringify(profile))),profile);
  let reads=0;assert.throws(()=>compilationProfile({get flags(){reads++;return {};}}),TypeError);assert.equal(reads,0);
  for(const profile of [{flags:{test:'false'}},{values:{feature:[1]}},{closedKeys:['not-valid']},{schemaVersion:2},{target:'native'}])assert.throws(()=>compilationProfile(profile),TypeError);
});

test('inactive module scopes never read source or poison production macro names',()=>{
  const files={'src/lib.rs':'#[cfg(test)] mod tests; #[cfg(not(test))] mod normal;','src/tests.rs':'macro_rules! String {()=>{}}','src/normal.rs':'pub fn amount()->u8{3}'},reads=[];
  const graph=resolveModuleGraph({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>{reads.push(path);return files[path];},compilationProfile:PRODUCTION_PROFILE});
  assert.deepEqual(reads,['src/lib.rs','src/normal.rs']);assert.equal(graph.modules[0].allItems.length,2);assert.equal(graph.modules[0].items.length,1);assert.equal(graph.modules[0].inactiveItems.length,1);
  const bindings=resolveModuleBindings({modules:graph.modules,compilationProfile:PRODUCTION_PROFILE});const root=bindings.scopes.find(scope=>!scope.path.length);assert.equal(root.unresolvedMacroScope,false);assert.equal(root.bindings.some(binding=>binding.name==='tests'),false);assert.equal(Object.isFrozen(root.compilationProfile.flags),true);
});
test('unknown target conditions and cfg_attr do not certify module edges or namespace closure',()=>{
  for(const attr of ['#[cfg(unix)]','#[cfg_attr(test,allow(dead_code))]']){const files={'src/lib.rs':attr+' mod conditional;','src/conditional.rs':'pub fn amount()->u8{3}'},graph=resolveModuleGraph({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE});assert.equal(graph.edges.length,0);const bindings=resolveModuleBindings({modules:graph.modules,compilationProfile:PRODUCTION_PROFILE});assert.equal(bindings.scopes[0].unresolvedMacroScope,true);}
});
test('inactive nested fields remain explicit refusals until profile-aware field layout exists',()=>{
  const source='struct Record{#[cfg(test)] amount:u8} pub fn invented(value:Record)->u8{value.amount}',result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});assert.equal(result.meta.executable.some(entry=>entry.name==='invented'),false);
});

test('inner inactive and unknown module conditions never grant source declarations or methods',()=>{
  for(const predicate of ['test','unix']){
    const source=`#![cfg(${predicate})]\npub struct Amount{value:u8} impl Amount{pub fn value(&self)->u8{self.value}} pub fn invented()->u8{7}`;
    const modules=[{file:'src/lib.rs',path:[],source}],binding=resolveModuleBindings({modules,compilationProfile:PRODUCTION_PROFILE});
    assert.equal(binding.scopes[0].bindings.some(binding=>binding.status==='resolved'),false);assert.equal(binding.scopes[0].configurationCondition,predicate==='test'?'inactive':'unknown');
    const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});assert.deepEqual(result.meta.executable,[]);assert.deepEqual(result.meta.checkedMethods,[]);
  }
});
test('unknown inner scopes retain possible exported macro shadows at the crate root',()=>{
  const files={'src/lib.rs':'mod conditional; pub fn invented()->String{format!("BUILTIN")}','src/conditional.rs':'#![cfg(unix)]\n#[macro_export] macro_rules! format {()=>{}}'},graph=resolveModuleGraph({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE});
  const bindings=resolveModuleBindings({modules:graph.modules,compilationProfile:PRODUCTION_PROFILE}),root=bindings.scopes.find(scope=>!scope.path.length);assert.equal(root.unresolvedMacroScope,true);assert.equal(root.bindings.find(binding=>binding.name==='format')?.status,'unresolved');
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE});assert.equal(result.meta.executable.some(entry=>entry.name==='invented'),false);
});
test('unknown inner trait implementations cannot be excluded from Copy certificates',()=>{
  const files={'src/lib.rs':'mod conditional; #[derive(Clone,Copy)] pub enum Kind{A} impl Kind{fn value(self)->u8{1}} pub fn invented(value:Kind)->u8{value.value()}','src/conditional.rs':'#![cfg(unix)]\nimpl Drop for crate::Kind{fn drop(&mut self){}}'};
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE});assert.equal(result.meta.executable.some(entry=>entry.name==='invented'),false);
});
test('unknown parent conditions propagate to descendants and cannot lend a different profile',()=>{
  const files={'src/lib.rs':'#![cfg(unix)]\nmod child;','src/child.rs':'pub fn invented()->u8{7}'},graph=resolveModuleGraph({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE});
  assert.deepEqual(graph.modules.map(module=>module.configurationCondition),['unknown','unknown']);assert.throws(()=>resolveModuleBindings({modules:graph.modules}),/profiles must agree/);
  const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path],compilationProfile:PRODUCTION_PROFILE});assert.deepEqual(result.meta.executable,[]);assert.equal(result.sourceScopes.every(scope=>scope.configurationCondition==='unknown'&&Object.isFrozen(scope)),true);
});
