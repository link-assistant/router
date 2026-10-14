import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../json-macro-inputs.mjs';
import {builtinDefaultDependencyProof} from '../derive-builtin-default.mjs';
import {registeredDeriveHelperSource,isRegisteredDeriveHelperSource} from '../derive-helper-namespaces.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules,deriveFootprintHelperAttributeAt,isDeriveFootprintHelperAttributeProof} from '../derive-footprints.mjs';
import {createDeriveBangContext} from '../derive-bang-context.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {resolveModuleBindings} from '../module-bindings.mjs';
import {createMatchesMacroContext,configureMatchesMacroParser,proveOriginalMatchesCall} from '../matches-macro-context.mjs';
import {HostRustParser} from '../extensions/host-contracts.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';
import {translateProject} from '../project.mjs';
import {PRODUCTION_PROFILE,compilationProfile} from '../cfg-profile.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),hash=s=>createHash('sha256').update(s).digest('hex');
const read=path=>{try{return readFileSync(new URL(path,root),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;return execFileSync('git',['show','HEAD:'+path],{cwd:root,encoding:'utf8',maxBuffer:10000000});}};
const dependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
const jsonMacroDependencies=loadJsonMacroSourceProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')});
function setup(source,{file='src/lib.rs',profile=PRODUCTION_PROFILE}={}){
 const captured=captureSourceModuleViews({source,sourcePath:file,compilationProfile:profile}),modules=captured.views.map(sourceView=>({file,path:[...sourceView.modulePath],source,sourceView,compilationProfile:profile,configurationCondition:sourceView.configurationCondition}));
 const deriveContext=createDeriveFootprintContext({modules,dependencies,compilationProfile:profile}),externalModules=deriveFootprintExternalModules(deriveContext),input={modules,deriveContext,externalModules,compilationProfile:profile};
 return {...input,module:modules[0],item:originalSourceModuleItems(modules[0]).find(item=>['struct','enum'].includes(item.term))};
}
const nested=source=>{const at=source.indexOf('#[serde(',source.indexOf('{'));return {start:at,end:source.indexOf(']',at)+1};};
const serde='#[derive(serde::Serialize)]pub struct Record{#[serde(default,skip_serializing_if="Vec::is_empty")]value:Vec<String>}';
const defaultEnum='#[derive(Default,serde::Serialize)]pub enum Mode{On,#[default]Off}';
test('original proc/builtin registration sources remain narrow and privately issued after cache warming',()=>{
 const defaultProof=builtinDefaultDependencyProof(dependencies);
 for(const [target,helperName,needle]of [[['serde','Serialize'],'serde','proc_macro_derive(Serialize, attributes(serde))'],[['serde','Deserialize'],'serde','proc_macro_derive(Deserialize, attributes(serde))'],[['core','default','Default'],'default','rustc_builtin_macro(Default, attributes(default))']]){
  const proof=registeredDeriveHelperSource({dependencies,target,helperName,defaultProof});assert.equal(isRegisteredDeriveHelperSource(proof),true);assert.equal(isRegisteredDeriveHelperSource(structuredClone(proof)),false);assert.equal(isRegisteredDeriveHelperSource(Object.freeze(structuredClone(proof))),false);assert.ok(proof.registration.originalAttribute.includes(needle));assert.equal(proof.namespaceAuthority,false);assert.equal(proof.bangOutputAuthority,false);assert.equal(proof.generatedImplBehavior,false);assert.throws(()=>{proof.registration.registeredHelpers.push('unknown');},TypeError);
 }
 assert.throws(()=>registeredDeriveHelperSource({dependencies:structuredClone(dependencies),target:['serde','Serialize'],helperName:'serde'}),/private locked/);
 assert.throws(()=>registeredDeriveHelperSource({dependencies,target:['core','default','Default'],helperName:'default',defaultProof:structuredClone(defaultProof)}),/genuine/);
 assert.equal(registeredDeriveHelperSource({dependencies,target:['custom','Serialize'],helperName:'serde'}),null);assert.equal(registeredDeriveHelperSource({dependencies,target:['serde','Serialize'],helperName:'unknown'}),null);
});
test('exact default and callback-bearing serde helpers close nested export uncertainty independently of bang output',()=>{
 for(const source of [serde,defaultEnum]){
  const row=setup(source),span=source===serde?nested(source):{start:source.indexOf('#[default]'),end:source.indexOf('#[default]')+10},proof=deriveFootprintHelperAttributeAt(row.deriveContext,row.module,row.item,span);
  assert.equal(isDeriveFootprintHelperAttributeProof(proof),true);assert.equal(isDeriveFootprintHelperAttributeProof(structuredClone(proof)),false);assert.equal(proof.exactNestedHelperInert,true);assert.equal(proof.bangOutputAuthority,false);assert.equal(proof.copyAuthority,false);assert.deepEqual(proof.attribute.span,span);
  const before=resolveModuleBindings({modules:row.modules,externalModules:row.externalModules,compilationProfile:row.compilationProfile}),after=resolveModuleBindings(row);
  assert.ok(before.diagnostics.some(d=>d.message.includes('nested source attribute')));assert.equal(after.diagnostics.some(d=>d.message.includes('nested source attribute')),false);assert.equal(after.scopes[0].unresolvedBangMacroScope,true);assert.equal(after.scopes[0].unresolvedTypeScope,false);assert.equal(after.scopes[0].unresolvedAttributeMacroScope,false);
 }
});
test('warmed helper consumers reject replaced contexts source views headers tokens profiles and spans',()=>{
 const row=setup(serde),span=nested(serde),get=(context=row.deriveContext,module=row.module,item=row.item,range=span)=>deriveFootprintHelperAttributeAt(context,module,item,range);assert.ok(get());
 assert.throws(()=>get(structuredClone(row.deriveContext)),/Unsealed/);assert.throws(()=>get(Object.freeze(structuredClone(row.deriveContext))),/Unsealed/);
 for(const change of [{source:serde+' '},{sourceView:structuredClone(row.module.sourceView)},{compilationProfile:compilationProfile({flags:{test:true}})}])assert.throws(()=>get(row.deriveContext,{...row.module,...change}),/source|view|profile/);
 assert.throws(()=>get(row.deriveContext,row.module,{...row.item,tokens:[]}),/invocation/);assert.throws(()=>get(row.deriveContext,row.module,{...row.item,name:'Forged'}),/invocation/);
 assert.throws(()=>get(row.deriveContext,setup(serde).module),/view/);assert.equal(get(row.deriveContext,row.module,row.item,{start:span.start+1,end:span.end}),null);assert.equal(get(row.deriveContext,row.module,row.item,{start:0,end:serde.indexOf(']')+1}),null);
 assert.throws(()=>{get().attribute.helpers[0].key='unknown';},TypeError);
});
test('fresh processes reconstruct actual source ownership and cannot import serialized helper authority',()=>{
 const row=setup(serde),proof=deriveFootprintHelperAttributeAt(row.deriveContext,row.module,row.item,nested(serde));
 const script=`import {readFileSync}from'node:fs';import{loadDeriveDependencyProof}from${JSON.stringify(new URL('../derive-dependencies.mjs',import.meta.url).href)};import{captureSourceModuleViews,originalSourceModuleItems}from${JSON.stringify(new URL('../source-module-views.mjs',import.meta.url).href)};import{createDeriveFootprintContext,deriveFootprintHelperAttributeAt,isDeriveFootprintHelperAttributeProof}from${JSON.stringify(new URL('../derive-footprints.mjs',import.meta.url).href)};import{PRODUCTION_PROFILE}from${JSON.stringify(new URL('../cfg-profile.mjs',import.meta.url).href)};const fake=JSON.parse(process.argv.at(-1)),source=JSON.parse(process.argv.at(-2));if(isDeriveFootprintHelperAttributeProof(fake)||isDeriveFootprintHelperAttributeProof(Object.freeze(fake)))throw Error('serialized authority');const dependencies=loadDeriveDependencyProof({manifest:readFileSync(${JSON.stringify(new URL('Cargo.toml',root).pathname)},'utf8'),lock:readFileSync(${JSON.stringify(new URL('Cargo.lock',root).pathname)},'utf8')}),sourceView=captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}).views[0],module={file:'src/lib.rs',path:[],source,sourceView,compilationProfile:PRODUCTION_PROFILE},context=createDeriveFootprintContext({modules:[module],dependencies,compilationProfile:PRODUCTION_PROFILE}),item=originalSourceModuleItems(module).find(i=>i.term==='struct'),actual=deriveFootprintHelperAttributeAt(context,module,item,fake.attribute.span);if(!isDeriveFootprintHelperAttributeProof(actual)||actual.sourceSha256!==fake.sourceSha256)throw Error('source reconstruction');console.log(JSON.stringify({fake:false,genuine:true}));`;
 assert.deepEqual(JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script,JSON.stringify(serde),JSON.stringify(proof)],{encoding:'utf8',timeout:10000})),{fake:false,genuine:true});
});
test('source shadow unknown macro cfg and inactive helper declarations remain unproved',()=>{
 for(const source of ['use custom::serde;'+serde,'use custom::Default;'+defaultEnum,'use custom::default;'+defaultEnum,'use custom::doc;'+serde.replace('pub struct','#[doc="x"]pub struct'),'use custom::allow;'+serde.replace('pub struct','#[allow(dead_code)]pub struct'),'mod serde{}'+serde,'#[unknown]pub struct Other;'+serde,serde+'unknown!();',serde+'mod missing;','#[cfg(feature="unresolved")]'+serde,'#[cfg(test)]'+serde,serde.replace('skip_serializing_if="Vec::is_empty"','skip_serializing_if="helper!()"'),defaultEnum.replace('#[default]','#[default(value)]')]){
  const row=setup(source),span=source.includes('#[serde(')?nested(source):{start:source.indexOf('#[default'),end:source.indexOf(']',source.indexOf('#[default'))+1};assert.equal(deriveFootprintHelperAttributeAt(row.deriveContext,row.module,row.item,span),null,source);
 }
 const source='macro_rules!serde{()=>{}}'+serde,row=setup(source);assert.ok(deriveFootprintHelperAttributeAt(row.deriveContext,row.module,row.item,nested(source)),'A bang-only same-name binding does not become an attribute owner');
});
test('same-file sibling views cannot exchange helper owners or ignore an unknown ancestor',()=>{
 const source='pub mod left{'+serde+'}pub mod right{'+serde.replace('Record','Other')+'}',row=setup(source),left=row.modules.find(m=>m.path.join('.')==='left'),right=row.modules.find(m=>m.path.join('.')==='right'),item=originalSourceModuleItems(left).find(i=>i.term==='struct'),span=nested(source);assert.ok(deriveFootprintHelperAttributeAt(row.deriveContext,left,item,span));assert.equal(deriveFootprintHelperAttributeAt(row.deriveContext,right,item,span),null);
 const unknown=setup('#[unknown]pub mod outer{'+serde+'}'),child=unknown.modules.find(m=>m.path.join('.')==='outer');if(child){const inner=originalSourceModuleItems(child).find(i=>i.term==='struct');assert.equal(deriveFootprintHelperAttributeAt(unknown.deriveContext,child,inner,nested(child.source)),null);}
});
test('assembled complete source outputs execute ordinary matches in JS and strict TypeScript',{timeout:60000},async()=>{
 for(const prefix of ['#[derive(Copy,Eq,serde::Serialize,serde::Deserialize)]pub struct Payload{value:u8}', '#[derive(serde::Serialize)]pub struct Payload{#[serde(rename="λ😀#[macro_export]")]value:u8}']){
  const source=prefix+'pub fn accepted(v:Option<u8>)->bool{matches!(v,Some(n) if n>2)}',result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});assert.ok(result.meta.executable.some(r=>r.name==='accepted'));assert.equal(result.meta.refused.some(r=>r.name==='accepted'),false);
  await verifyTypedTargets(result,api=>{assert.equal(api.accepted(Object.freeze({$:'None'})),false);for(const [n,want]of [[0n,false],[2n,false],[3n,true],[255n,true]])assert.equal(api.accepted(Object.freeze({$:'Some',field0:n})),want);assert.throws(()=>api.accepted({$:'Some',field0:3n}),TypeError);assert.throws(()=>api.accepted(Object.freeze({$:'Some',field0:256n})),TypeError);},{childTimeoutMs:20000});
 }
});
test('original Default output closes its own namespace before ordinary matches execute',async()=>{
 const source='#[derive(Default,serde::Serialize)]pub enum Mode{On,#[default]Off}pub fn f(v:u8)->bool{matches!(v,1)}';
 const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});
 assert.equal(result.meta.executable.some(row=>row.name==='f'),true);assert.deepEqual(result.meta.refused,[]);
 await verifyTypedTargets(result,api=>{assert.equal(api.f(0n),false);assert.equal(api.f(1n),true);assert.equal(api.f(255n),false);assert.throws(()=>api.f(256n),RangeError);},{childTimeoutMs:20000});
});
test('unresolved sibling derives remain separate mandatory refusals',()=>{
 for(const source of ['#[derive(serde::Serialize,schemars::JsonSchema)]#[schemars(with="String")]pub struct Payload{value:u8}pub fn f(v:u8)->bool{matches!(v,1)}','#[unknown]struct Other;pub fn f(v:u8)->bool{matches!(v,1)}']){const result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE});assert.equal(result.meta.executable.some(r=>r.name==='f'),false);assert.match(result.meta.refused.find(r=>r.name==='f').message,/matches! original source contract/);}
});
test('the unchanged original const match executes independently of unresolved sibling derives',async()=>{
 const source='pub const fn f(v:u8)->bool{matches!(v,1)}',result=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>source,compilationProfile:PRODUCTION_PROFILE});assert.equal(result.meta.executable.some(r=>r.name==='f'),true);assert.deepEqual(result.meta.refused,[]);
 await verifyTypedTargets(result,api=>{assert.equal(api.f(0n),false);assert.equal(api.f(1n),true);assert.equal(api.f(255n),false);assert.throws(()=>api.f(256n),RangeError);},{childTimeoutMs:20000});
});
test('unchanged whole model contract proves four exact helpers while closing all46 derive owners',{timeout:60000},()=>{
 const source=read('src/model_contract.rs');assert.equal(hash(source),'98bcf7cc0d91d5b0a4f2b30f6f79aebf6d8e761e9cb54372cd135379e5c3e11b');const row=setup(source,{file:'src/model_contract.rs'}),bang=createDeriveBangContext(row),after=resolveModuleBindings({...row,deriveBangContext:bang});assert.equal(bang.certificates.reduce((n,r)=>n+r.actualOwners.length,0),46);assert.equal(bang.certificates.reduce((n,r)=>n+r.selectedOwners.length,0),46);assert.equal(bang.certificates.reduce((n,r)=>n+r.residualOwners.length,0),0);assert.equal(after.scopes[0].unresolvedBangMacroScope,false);assert.equal(after.diagnostics.some(r=>r.message.includes('nested source attribute')),false);
 const helpers=[];for(const item of originalSourceModuleItems(row.module).filter(i=>['struct','enum'].includes(i.term)))for(const c of row.deriveContext.certificates.filter(c=>c.span.start===item.start))for(const attr of c.attributes.filter(a=>a.position!=='container'&&['default','serde'].includes(a.name))){const proof=deriveFootprintHelperAttributeAt(row.deriveContext,row.module,item,attr.span);assert.ok(proof);helpers.push(proof);}assert.equal(helpers.length,4);
 const context=createMatchesMacroContext({modules:row.modules,deriveDependencies:dependencies,compilationProfile:PRODUCTION_PROFILE}),parser=new HostRustParser(tokenizeRust(source));parser.compilationProfile=PRODUCTION_PROFILE;configureMatchesMacroParser(parser,context,{file:'src/model_contract.rs'});assert.ok(proveOriginalMatchesCall(parser,{segments:['matches'],start:3024,end:source.indexOf(')',3024)+1}));
 const result=translateProject({entry:'src/model_contract.rs',paths:['src/model_contract.rs'],readSource:()=>source,deriveDependencies:dependencies,jsonMacroDependencies,compilationProfile:PRODUCTION_PROFILE});assert.equal(result.meta.checkedMethods.some(r=>r.name==='ModelSelectorKind.permits_resolution'),true);assert.match(result.meta.refused.find(r=>r.name==='ModelSelectorKind.deserialize').message,/generic/);assert.match(result.meta.refused.find(r=>r.name==='validate_served_model_for_selector').message,/ok_or_else/);
});
