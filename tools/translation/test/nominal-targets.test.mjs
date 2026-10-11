import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sourceItems} from '../rust-structure.mjs';
import {resolveModuleGraph,translateProject} from '../project.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {extractImplDeclarations,certifyCopyType} from '../impl-resolver.mjs';
import {nominalTypeIdentities,resolveNominalImplTarget} from '../project-nominal.mjs';
import {parseRust,checkProgram} from '../extensions/host-contracts.mjs';
import {macroProvenance} from '../macro-provenance.mjs';
import {loadJavaScript} from './artifact-loader.mjs';
function evidence(files){const graph=resolveModuleGraph({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]}),scopes=resolveModuleBindings({modules:graph.modules}).scopes,identities=nominalTypeIdentities(scopes,graph.modules);return {graph,scopes,identities};}
function targets(context){return context.graph.modules.flatMap(module=>extractImplDeclarations(module.source,{sourcePath:module.file,modulePath:module.path}).implementations.map(implementation=>({...implementation,resolvedNominalTarget:resolveNominalImplTarget(implementation,module,context.scopes,context.identities)})));}
test('opaque fields and generic arguments preserve actual resolved nominal family identities',()=>{
  const files={'src/lib.rs':'mod model; use crate::model::Opaque as Alias; trait Marker{} impl<T> Marker for Alias<T> {}','src/model.rs':'pub struct Opaque<T>{item:T}'};
  const context=evidence(files),implementation=targets(context)[0];assert.deepEqual(implementation.resolvedNominalTarget.family,['crate','model','Opaque']);assert.equal(implementation.resolvedNominalTarget.source,'src/model.rs');
  assert.equal(context.identities.has(JSON.stringify(['crate','model','Opaque'])),true);
});
test('nominal paths use actual module aliases, visibility and super scope rather than last-segment spelling',()=>{
  const context=evidence({'src/lib.rs':'mod left; mod right;','src/left.rs':'pub struct Same<T>{item:T}','src/right.rs':'use crate::left as owner; trait Marker{} impl<T> Marker for owner::Same<T> {}'});
  assert.deepEqual(targets(context)[0].resolvedNominalTarget.family,['crate','left','Same']);
  const privateTarget=evidence({'src/lib.rs':'mod model; trait Marker{} impl Marker for model::Private {}','src/model.rs':'struct Private;'});assert.equal(targets(privateTarget)[0].resolvedNominalTarget,null);
});
test('aliases, unknown type parameters and qualified associated targets cannot invent nominal identities',()=>{
  for(const declaration of ['type Alias=Opaque; impl Marker for Alias {}','type Alias<T>=Opaque<T>; impl<T> Marker for Alias<T> {}','impl<T> Marker for T {}','impl<T> Marker for <T as Marker>::Associated {}']){
    const context=evidence({'src/lib.rs':'struct Opaque<T>{item:T} trait Marker{} '+declaration});assert.equal(targets(context)[0].resolvedNominalTarget,null,declaration);
  }
});
test('certificate excludes only a proven unequal nominal family and rejects a matching or forged target',()=>{
  const source='#[derive(Clone,Copy)] enum Kind{A}',checked=checkProgram(parseRust(source+' fn main(){}')),context=evidence({'src/lib.rs':'struct Opaque<T>{item:T} trait Marker{} impl<T> Marker for Opaque<T>{}'});
  const implementation=targets(context)[0],options={declarations:checked.declarations,implementations:[implementation],macroProvenance:macroProvenance(source),nominalTypes:context.identities};
  assert.equal(certifyCopyType({kind:'data',name:'Kind'},options).verified,true);
  assert.equal(certifyCopyType({kind:'data',name:'Kind'},{...options,nominalTypes:new Map()}).verified,false);
  const matching=evidence({'src/lib.rs':source+' trait Marker{} impl<T> Marker for Kind<T>{}'});
  assert.equal(certifyCopyType({kind:'data',name:'Kind'},{...options,implementations:targets(matching),nominalTypes:matching.identities}).verified,false);
});
test('project Copy body remains executable when unrelated generic nominal layouts are carried',async()=>{
  const source='trait Marker{} struct Opaque<T>{item:T} impl<T> Marker for Opaque<T>{} #[derive(Clone,Copy)] enum Kind{A,B(u8)} impl Kind {fn read(self)->u8{match self{Self::A=>0,Self::B(value)=>value}}} pub fn run(value:Kind)->u8{value.read()}';
  const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.equal(result.meta.executable.some(entry=>entry.name==='run'),true);assert.ok(result.meta.refused.some(entry=>entry.name==='Opaque'));assert.equal(result.meta.checkedMethods.find(entry=>entry.name==='Kind.read').receiver,'value');
  const api=(await loadJavaScript(result.javascript)).translated;assert.equal(api.run(Object.freeze({$:'B',field0:7n})),7n);assert.throws(()=>api.run({$:'B',field0:7n}),TypeError);
});

test('generic type binders shadow nominal owners before both layout and family resolution',()=>{
  for(const header of ['impl<Choice> Marker for Choice {}','impl<Choice: Marker> Marker for Choice where Choice: Marker {}',"impl<'a, Choice> Marker for Choice {}",'impl<#[cfg(flag)] Choice> Marker for Choice {}','impl<#[allow(dead_code)] Choice> Marker for Choice {}']){
    const context=evidence({'src/lib.rs':'struct Choice; trait Marker{} '+header});assert.equal(targets(context)[0].resolvedNominalTarget,null,header);
    const source='struct Choice; trait Marker{} '+header+' #[derive(Clone,Copy)] enum Kind{A} impl Kind{fn read(self)->u8{1}} pub fn run(value:Kind)->u8{value.read()}';
    assert.equal(translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source}).meta.checkedMethods.some(entry=>entry.name==='Kind.read'),false,header);
  }
  for(const header of ['impl<Choice> Marker for crate::Choice {}',"impl<'Choice> Marker for Choice {}",'impl<const Choice: usize> Marker for Choice {}']){
    const context=evidence({'src/lib.rs':'struct Choice; trait Marker{} '+header});assert.deepEqual(targets(context)[0].resolvedNominalTarget?.family,['crate','Choice'],header);
  }
});

test('derive expansion preserves only the original nominal definition and not expanded behavior',()=>{
  const context=evidence({'src/lib.rs':'mod model;','src/model.rs':'#[derive(custom::Expand)] pub struct Opaque<T>{value:T} impl<T> Marker for Opaque<T>{}'});
  const target=targets(context)[0].resolvedNominalTarget;assert.deepEqual(target.family,['crate','model','Opaque']);assert.ok(target.preservedDefinition.rule.endsWith('#macro.proc.derive.output'));
  assert.equal(context.scopes.find(scope=>scope.file==='src/model.rs').unresolvedTypeScope,true);
  for(const prefix of ['#[replace]','#[cfg(test)]','#[cfg_attr(test,derive(Custom))]']){
    const context=evidence({'src/lib.rs':prefix+' #[derive(Custom)] struct Opaque; impl Marker for Opaque{}'});assert.equal(targets(context)[0].resolvedNominalTarget,null,prefix);
  }
  const conditional=evidence({'src/lib.rs':'#![cfg(test)] #[derive(Custom)] struct Opaque; impl Marker for Opaque{}'});assert.equal(targets(conditional)[0].resolvedNominalTarget,null);
});

test('actual tracked proc-derived definitions supply family evidence while their layouts stay carried',()=>{
  for(const [file,name] of [['src/cli/management_args.rs','ManagementArgs'],['src/model_contract.rs','ModelAccessError']]){
    const original=readFileSync(new URL('../../../'+file,import.meta.url),'utf8');
    const files=file.includes('/cli/')?{'src/lib.rs':'mod cli;','src/cli/mod.rs':'mod management_args;',[file]:original}:{'src/lib.rs':'mod model_contract;',[file]:original};
    const context=evidence(files),declaration=sourceItems(original).find(item=>item.name===name&&item.term==='struct');
    const implementation=targets(context).find(item=>item.typePath?.at(-1)===name&&item.traitPath);
    assert.equal(implementation.resolvedNominalTarget.source,file);assert.deepEqual(implementation.resolvedNominalTarget.span,{start:declaration.start,end:declaration.end});assert.ok(implementation.resolvedNominalTarget.preservedDefinition);
    const result=translateProject({entry:'src/lib.rs',paths:Object.keys(files),readSource:path=>files[path]});assert.ok(result.meta.refused.some(item=>item.file===file&&item.name===name&&item.term==='struct'));
  }
});

test('attribute-replaced implementation targets never prove unrelated family identities',()=>{
  for(const attribute of ['#[replace]','#[cfg_attr(test,replace)]']){
    const source='struct Other; trait Marker{} '+attribute+' impl Marker for Other{} #[derive(Clone,Copy)] enum Kind{A} impl Kind{fn read(self)->u8{1}} pub fn run(value:Kind)->u8{value.read()}';
    const context=evidence({'src/lib.rs':source});assert.equal(targets(context)[0].resolvedNominalTarget,null);
    const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source});assert.equal(result.meta.checkedMethods.some(entry=>entry.name==='Kind.read'),false);
  }
});
