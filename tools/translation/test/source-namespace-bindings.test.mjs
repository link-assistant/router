import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceItems} from '../rust-structure.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {parserSourceScope,configureParserSourceScope} from '../source-scopes.mjs';
import {withSourceNamespaceParser} from '../extensions/source-namespaces.mjs';
const evidence=source=>resolveModuleBindings({modules:[{file:'src/lib.rs',path:[],source,items:sourceItems(source)}]});
class Base {
  constructor(){this.aliases=new Map();this.cursor={is:()=>false};}
  resolve(names,path){const alias=this.aliases.get(path.join('.'))?.get(names[0]);return alias?[...alias,...names.slice(1)]:names;}
  type(){return this.resolve(['Option'],[]);}
  expr(){return this.resolve(['Option'],[]);}
  genericType(){return this.resolve(['Option'],[]);}
  builtinShadow(name){return this.resolve([name],[]).join('::')!==name;}
}
const Parser=withSourceNamespaceParser(Base);
const configured=source=>{const result=evidence(source);return configureParserSourceScope(new Parser(),result.scopes[0],result.scopes);};

test('value-only prelude spellings do not enter the actual type namespace',()=>{
  const scope=parserSourceScope(evidence('fn Option(){} fn Result(){} fn Vec(){} fn String(){}').scopes[0]);
  for(const name of ['Option','Result','Vec','String']){assert.equal(scope.aliases.has(name),false);assert.deepEqual(scope.namespaceAliases.value.get(name),['crate',name]);assert.equal(scope.shadowedPreludeTypes.has(name),false);}
  const parser=configured('fn Option(){}');assert.deepEqual(parser.type(),['Option']);assert.deepEqual(parser.expr(),['crate','Option']);assert.deepEqual(parser.genericType(),['Option']);assert.equal(parser.builtinShadow('Option'),false);assert.equal(parser.sourceResolutionNamespace,undefined);
});

test('actual type shadow and shared tuple constructor identities are preserved',()=>{
  for(const declaration of ['mod Option;','struct Option {value:u8}','type Option=u8;']){const parser=configured(declaration);assert.deepEqual(parser.type(),['crate','Option']);assert.equal(parser.builtinShadow('Option'),true);}
  const scope=parserSourceScope(evidence('struct Pair(u8);').scopes[0]);assert.deepEqual(scope.namespaceAliases.type.get('Pair'),['crate','Pair']);assert.deepEqual(scope.namespaceAliases.value.get('Pair'),['crate','Pair']);
});

test('a named record and a same-spelled function remain distinct source bindings',()=>{
  const parser=configured('struct Option {value:u8} fn Option()->u8{7}');assert.deepEqual(parser.type(),['crate','Option']);assert.deepEqual(parser.expr(),['crate','Option']);
  assert.equal(parser.sourceNamespaceAliases.type.get('').has('Option'),true);assert.equal(parser.sourceNamespaceAliases.value.get('').has('Option'),true);
});

test('unknown imports and procedural expansion retain each namespace refusal',()=>{
  const named=configured('use unknown::Option;');for(const namespace of ['type','value','macro'])assert.deepEqual(named.resolveSourceNamespace(['Option'],[],namespace),['crate','ml_unresolved_source_binding','Option']);
  const glob=configured('use unknown::*;');assert.equal(glob.unresolvedImportScope,true);assert.equal(glob.unresolvedMacroScope,true);
  const proc=configured('#[derive(custom::Expand)] struct S;');assert.equal(proc.unresolvedImportScope,true);assert.equal(proc.unresolvedMacroScope,true);
});

test('qualified value owners use types while bare expressions and macro paths keep their namespaces',()=>{
  const parser=new Parser(),maps={type:new Map([['',new Map([['Owner',['std','option','Option']]])]]),value:new Map([['',new Map([['Owner',['crate','call']],['Present',['std','option','Option','Some']]])]]),macro:new Map([['',new Map([['Owner',['crate','macro_owner']]])]])};parser.sourceNamespaceAliases=maps;
  assert.deepEqual(parser.resolve(['Owner'],[]),['crate','call']);assert.deepEqual(parser.resolve(['Owner','Some'],[]),['std','option','Option','Some']);assert.deepEqual(parser.resolveSourceNamespace(['Owner'],[],'macro'),['crate','macro_owner']);
  assert.equal(parser.hasResolvedSourceAlias('Owner',['std','option','Option'],[]),true);assert.equal(parser.hasResolvedSourceAlias('Present',['std','option','Option'],[]),true);
  assert.equal(parser.hasResolvedSourceAlias('Present',['std','result','Result'],[]),false);assert.equal(parser.hasResolvedSourceAlias('Owner',['serde_json','Value'],[]),false);
  maps.value.get('').set('std',['crate','std']);assert.equal(parser.hasResolvedSourceAlias('std',['std','option','Option'],[]),false);
});

test('namespace context restoration is exact even when parsing refuses',()=>{
  const parser=configured('fn Option(){}');assert.throws(()=>parser.inSourceNamespace('type',()=>{throw new Error('refusal');}),/refusal/);assert.equal(parser.sourceResolutionNamespace,undefined);assert.deepEqual(parser.expr(),['crate','Option']);
});

test('local or parameter collisions carry before they can become module value calls',()=>{
  const parser=configured('fn Option(){} fn Some(){} fn None(){}');
  for(const declaration of [{params:[{name:'Option'}],body:{k:'unit'}},{params:[],body:{k:'let',name:'Some',body:{k:'unit'}}},{params:[],body:{k:'routerLambda',params:[{name:'None'}],body:{k:'unit'}}}])assert.throws(()=>parser.sourceDeclarationNamespace(declaration,[]),/scope collision/u);
  parser.resolve(['Option'],[]);const result=parser.sourceDeclarationNamespace({params:[{name:'value'}],body:{k:'name',path:['crate','Option']}},[]);assert.equal(result.sourceNamespaceEvidence.source,'src/lib.rs');assert.equal(result.sourceNamespaceEvidence.bindings.find(binding=>binding.name==='Option').namespace,'value');
});


test('host modules coexist with source values while actual type and module owners remain exclusions',async()=>{
  const {admittedHostData}=await import('../extensions/source-namespaces.mjs');
  const host={k:'module',name:'std',items:[]};
  for(const k of ['fn','const'])assert.deepEqual(admittedHostData([host],[{k,name:'std'}]),[host]);
  for(const k of ['module','data'])assert.deepEqual(admittedHostData([host],[{k,name:'std'}]),[]);
});

test('host namespace exclusion removes dependent support transitively without rebinding to source layouts',async()=>{
  const {admittedHostData}=await import('../extensions/source-namespaces.mjs');
  const field=path=>({type:{kind:'named',path}}),data=(name,fields)=>({k:'data',name,ctors:[{name:'Only',fields}]}),host={k:'module',name:'std',items:[{k:'module',name:'time',items:[data('Duration',[])]}]};
  const inner=data('Inner',[field(['std','time','Duration'])]),outer=data('Outer',[field(['Inner'])]),independent=data('Independent',[]);
  assert.deepEqual(admittedHostData([outer,inner,host,independent],[{k:'module',name:'std',items:[]}]),[independent]);
  assert.deepEqual(admittedHostData([outer,inner,host,independent],[{k:'fn',name:'std'}]),[outer,inner,host,independent]);
});


test('actual function-kind evidence permits lexical precedence and restores outer bindings',()=>{
  const parser=configured('fn value(){}');
  assert.equal(parser.sourceNamespaceEvidence.bindings.find(binding=>binding.name==='value').kind,'fn');
  parser.sourceLexicalScope([{name:'value',span:{start:1,end:6}}],()=>{assert.deepEqual(parser.resolve(['value'],[]),['value']);assert.deepEqual(parser.resolve(['value','member'],[]),['value','member']);});
  assert.deepEqual(parser.resolve(['value'],[]),['crate','value']);assert.equal(parser.sourceLexicalValues,undefined);
  assert.throws(()=>parser.sourceLexicalScope([{name:'value'}],()=>{throw new Error('refusal');}),/refusal/u);assert.equal(parser.sourceLexicalValues,undefined);
});
