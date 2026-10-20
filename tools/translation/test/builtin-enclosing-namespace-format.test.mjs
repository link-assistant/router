import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
// New enclosing-only format. Generated method behavior remains opaque.
import nodeTest from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Hash,createHash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {createDeriveFootprintContext,deriveFootprintAt,deriveFootprintOriginalContext,deriveFootprintExternalModules} from '../derive-footprints.mjs';
import {createDeriveBangContext,isDeriveBangContext} from '../derive-bang-context.mjs';
import {proveDeriveEmptyEnclosingEffect,deriveEmptyEnclosingEffectFacts} from '../derive-output-effects.mjs';
import {proveBuiltinDeriveBangFootprint,proveBuiltinDebugEnclosingNamespace,requireBuiltinDebugEnclosingNamespace,reissueBuiltinDebugEnclosingNamespace} from '../builtin-derive-bang-footprints.mjs';
import {builtinDeriveAstSourceProfile,originalAstFunction} from '../builtin-derive-ast-meta.mjs';
import {builtinDebugDataInputs} from '../builtin-derive-data-inputs.mjs';
import {compileBuiltinDebugEnclosingNamespaceModel} from '../builtin-debug-ast-route.mjs';
import {createDeriveEnclosingNamespaceContext,isDeriveEnclosingNamespaceContext,deriveEnclosingNamespaceModules,deriveEnclosingNamespaceOutputAt,originalDeriveEnclosingNamespaceOutputs,proveDeriveEnclosingNamespaceEffect,deriveEnclosingNamespaceEffectFacts} from '../derive-enclosing-namespace-context.mjs';
import {resolveModuleBindings,resolveEnclosingNamespaceModuleBindings} from '../module-bindings.mjs';
import {createCoreAdoptionProducerContext,createWholeScopedCoreAdoptionProducerContext,createEnclosingCoreAdoptionProducerContext,coreAdoptionProducerBindings,coreAdoptionDeriveAttributeClosed,finishCoreAdoptionProducerContext} from '../core-adoption-producer-context.mjs';
import {proposeCoreBase64Corpus} from '../migrate-core-base64.mjs';
import {resolveModuleGraph,translateProject} from '../project.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {itemConfiguration,PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE,ROUTER_CORE_RANGES_SOURCE,ROUTER_CORE_JSON_COLLECTIONS_SOURCE,ROUTER_CORE_BASE64_SOURCE} from '../router-core-source-data.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {parseProgram,serializeProgram} from '../semantic-meta.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {restoreCurrentEnclosingNamespaceSource as restoreEnclosingNamespaceSource} from './fixtures/native-proof-json-format.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
import {writeJsonTextGzip} from '../../evidence/write-json-gzip.mjs';
const root=new URL('../../../',import.meta.url),base=new URL('../',import.meta.url),json=JSON.stringify,apply=Reflect.apply,get=Object.getOwnPropertyDescriptor,define=Object.defineProperty;
const hash=value=>createHash('sha256').update(value).digest('hex');
function read(path){return readFileSync(repositorySourceURL(path,root),'utf8');}
function test(name,body){return nodeTest(name,{timeout:60_000},async t=>{
 const vectors=[],retain=(kind,value)=>{vectors.push({kind,value});return value;};
 try{await body(t,retain);}finally{
  const directory=process.env.ROUTER_BUILTIN_ENCLOSING_NAMESPACE_VECTOR_DIR;
  if(directory){mkdirSync(directory,{recursive:true});writeJsonTextGzip(join(directory,hash(name)+'.json.gz'),json({name,vectors,rustExecuted:false,performanceQualified:false},(_key,value)=>typeof value==='bigint'?{$integer:String(value)}:value===undefined?{$undefined:true}:value));}
 }
});}
function capture(run){try{return {value:run()};}catch(error){return {error};}}
function materialize(result){return result.error?{error:{name:result.error.name,message:result.error.message,stack:String(result.error.stack)}}:{value:result.value};}
function refused(run){const result=capture(run);assert.ok(result.error instanceof TypeError, result.error?String(result.error):'expected genuine private refusal');return materialize(result);}
function once(source,before,after){assert.equal(source.split(before).length,2,'one full source rule');return source.replace(before,()=>after);}
function deepFrozen(value,seen=new Set()){
 if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);assert.equal(Object.isFrozen(value),true);
 for(const key of Reflect.ownKeys(value)){const field=get(value,key);assert.ok(field&&Object.hasOwn(field,'value'));deepFrozen(field.value,seen);}
}
function setup(source,options={}){
 const cargo={manifest:read('Cargo.toml'),lock:read('Cargo.lock')},dependencies=loadDeriveDependencyProof(cargo);
 const modules=options.modules??[{file:'src/lib.rs',path:[],source:'mod model;',configurationCondition:'active'},{file:'src/model.rs',path:['model'],source,configurationCondition:'active'}];
 const derive=createDeriveFootprintContext({modules,dependencies,compilationProfile:PRODUCTION_PROFILE});
 const module=modules.find(row=>row.file===(options.file??'src/model.rs')),item=originalSourceModuleItems(module).find(row=>row.name===(options.name??'Record')&&['struct','enum'].includes(row.term));
 assert.ok(item,'actual complete source item');const certificate=deriveFootprintAt(derive,module,item);if(!options.allowUnproved)assert.ok(certificate);
 const attribute=certificate?certificate.attributes.find(row=>row.name==='derive'&&row.derives.some(path=>path.length===1&&path[0]==='Debug')):itemConfiguration(item.tokens,PRODUCTION_PROFILE).attributes.find(row=>row.name==='derive');assert.ok(attribute);
 return {source,modules,dependencies,cargo,derive,module,item,certificate,invocation:{path:['Debug'],attributeSpan:attribute.span},externalModules:deriveFootprintExternalModules(derive),compilationProfile:PRODUCTION_PROFILE};
}
function args(row){return {context:row.derive,certificate:row.certificate,invocation:row.invocation};}
function selected(row){const token=proveBuiltinDebugEnclosingNamespace(args(row));assert.ok(token,'new private named/unit Debug issuer selected');return {token,facts:requireBuiltinDebugEnclosingNamespace(token,row.derive,row.certificate,row.invocation)};}
function dimension(row,context){const token=proveDeriveEnclosingNamespaceEffect(context,row.derive,row.module,row.item);return {token,facts:deriveEnclosingNamespaceEffectFacts(token,context,row.derive,row.module,row.item)};}
function resolve(row,context,current){return (current?resolveEnclosingNamespaceModuleBindings:resolveModuleBindings)({modules:row.modules,deriveContext:row.derive,deriveBangContext:context,externalModules:row.externalModules,compilationProfile:row.compilationProfile});}
const DEBUG_LANGUAGE_EDITS=[{"phase":"language","id":"javascript:separate-enclosing-grammar-entry","before":"export function liftBuiltinDebugAstRoute(","after":"export function compileBuiltinDebugEnclosingNamespaceModel("},{"phase":"language","id":"javascript:retain-only-closed-named-unit-debug-domain","before":"if(input.style==='payload-enum')return liftPayloadEnum(profile,plan,original,certificate,input);","after":"if(input.style==='payload-enum')return null;"},{"phase":"language","id":"javascript:package-complete-tree-closure-as-enclosing-data","before":" const evidence={schema:'original-debug-data-ast-bridge-v1',profileDigest:profile.digest,input,typedSource:{fields,variants:input.variants,inputStyle:input.style},descriptor:plan.descriptor,method:plan.method,recipes:plan.recipes,compilerMeta:plan.compilerMeta,positiveSchemas:plan.positiveSchemas,schemas:plan.schemas,parserFieldSpans:plan.parserFieldSpans,sourceControls:plan.sourceControls,branches:closeBranches(plan,branches,input,fields).map(branch=>({...branch,outputKind:'ItemKind::Impl',associatedKind:'AssocItemKind::Fn',bodyKind:'Block',associatedItems:1,associatedTypes:0,genericParameters:0,wherePredicates:0,generatedAttributes:['automatically_derived','inline'],lastBodyWrapper:'StmtKind::Expr from original BlockOrExpr::into_block'})),positiveOutputGrammarComplete:true,namespaceAuthority:false,copyAuthority:false,noDropAuthority:false,constAuthority:false,generatedImplBehavior:false,obligations:['original compiler metadata includes independent uncompiled builder/helper execution facts','fmt/format/allocator execution is not translated','actual original caller/helper/ancestor owners require the independent private issuer join','all other derives, ownership, trait validity and const eligibility remain separate']};return freezeCompleted({...evidence,digest:hash(composeJson(evidence))});","after":" const closed=closeBranches(plan,branches,input,fields);\n // The candidate is DATA only. The private invocation issuer independently\n // joins current input/owner/source and the original resolver rule.\n return {schema:'original-debug-enclosing-grammar-candidate-v1',inputStyle:input.style,\n  sources:plan.recipes.map(recipe=>({source:recipe.source,sourceSha256:recipe.sourceSha256,span:recipe.span,syntaxSha256:recipe.syntaxSha256,digest:recipe.digest})),\n  branches:closed.map(branch=>({condition:branch.condition,statements:branch.statements.length,closure:branch.recursiveNamespaceClosure})),\n  sourceControls:plan.sourceControls,generatedAttributes:['automatically_derived','inline'],\n  sourceTypeRoundtrips:fields.map(field=>({name:field.name,typeSpan:field.typeSpan,sourceSha256:field.sourceSha256,semanticSyntaxRoundTrip:field.semanticSyntaxRoundTrip})),\n  methodBehavior:'opaque-untranslated',namespaceAuthority:false,runtimeAuthority:false};"}];
function stage(retain,source,after,id,phase){
 const initial=transportConcreteSyntaxSource(source,{language:'JavaScript'}),wire=serializeConcreteSyntaxMeta(initial.document),first=transportConcreteSyntaxMeta(wire);assert.equal(first.source,source);
 const edits=[{span:[0,source.length],expected:source,replacement:after}],rule={id,edits},sequence={languageRules:phase==='language'?[rule]:[],repositoryRules:phase==='repository'?[rule]:[]};
 const applied=applyConcreteSyntaxSubstitutions(first.document,sequence),afterWire=serializeConcreteSyntaxMeta(applied.value),last=transportConcreteSyntaxMeta(afterWire);assert.equal(last.source,after);
 const inverseRule={id:id+'-inverse',edits:[{span:[0,after.length],expected:after,replacement:source}]},inverse=applyConcreteSyntaxSubstitutions(last.document,{languageRules:phase==='language'?[inverseRule]:[],repositoryRules:phase==='repository'?[inverseRule]:[]});
 assert.equal(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source,source);
 const ts=ownershipCompiler();for(const text of [source,after])assert.equal(ts.createSourceFile('namespace.mjs',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS).parseDiagnostics.length,0);
 retain('complete-language-repository-source-stage',{source,after,id,phase,wire,afterWire,sequence,inverseRule,trace:applied.trace,authority:false});return after;
}
function functionSource(source,name){const ts=ownershipCompiler(),file=ts.createSourceFile('namespace.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);const rows=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert.equal(rows.length,1);return source.slice(rows[0].getStart(file),rows[0].end)+'\n';}
function relocate(source,url){const rules=[];let current=source.replace(/(from\s+)(['"])(\.\.?\/[^'"\n]+)\2/g,(whole,prefix,quote,spec)=>{const after=prefix+quote+new URL(spec,url).href+quote;rules.push({before:whole,after});return after;});let inverse=current;for(const row of [...rules].reverse())inverse=once(inverse,row.after,row.before);assert.equal(inverse,source);return {source,current,rules,inverse};}
async function sourceModule(t,source,url,retain,label){const moved=relocate(source,url),directory=mkdtempSync(join(tmpdir(),'router-enclosing-format-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const path=join(directory,hash(label)+'.mjs');writeFileSync(path,moved.current);assert.equal(readFileSync(path,'utf8'),moved.current);retain('complete-copied-source-subject',{label,path,...moved,sourceAuthority:false});return import(pathToFileURL(path).href);}
function coreOptions(row){return {modules:row.modules,compilationProfile:row.compilationProfile,dependencyInputs:row.cargo};}
function closeCore(context,row){return coreAdoptionDeriveAttributeClosed(context,row.module.source,row.module.file,row.module.sourceView?.modulePath??row.module.path,row.item,row.certificate.attributes.find(a=>a.name==='derive'));}

//1. New private dimension versus the actual full old output/effect API.
test('genuine named and unit Debug close every original branch with private enclosing-only facts',(_t,retain)=>{
 for(const source of ['#[derive(Debug)]pub struct Record{a:u8,b:u64}','#[derive(Debug)]pub enum Record{A,B}']){
  const row=setup(source),full=proveBuiltinDeriveBangFootprint(args(row)),minimal=selected(row);
  assert.equal(full.selectedOwnerBangComplete,true);assert.equal(full.generatedImplBehavior,false);
  assert.equal(minimal.facts.model.schema,'original-debug-enclosing-namespace-model-v1');
  assert.equal(minimal.facts.model.methodBehavior,'opaque-untranslated');assert.equal(minimal.facts.namespaceAuthority,false);assert.equal(minimal.facts.runtimeAuthority,false);
  assert.equal(Object.hasOwn(minimal.facts,'selectedOwnerBangComplete'),false);assert.equal(Object.hasOwn(minimal.facts.model,'selectedOwnerBangComplete'),false);
  assert.equal(json(JSON.parse(minimal.facts.wire)),minimal.facts.wire);assert.equal(hash(minimal.facts.wire),minimal.facts.digest);deepFrozen(minimal.facts);
  const branches=minimal.facts.model.grammar.branches;assert.ok(branches.length>=2);assert.deepEqual(branches.map(b=>b.condition.split(';')[0]),full.route.branches.map(b=>{assert.ok(['original-builtin-scalar-ast-output-v1','original-debug-data-ast-bridge-v1'].includes(full.route.schema));return (full.route.schema==='original-builtin-scalar-ast-output-v1'?b.feature:b.condition).split(';')[0];}));
  for(const branch of branches){assert.equal(branch.closure.schema,'source-original-debug-positive-tree-closure-v1');assert.equal(branch.closure.sourceConstructorsOnly,true);assert.equal(branch.closure.bodyExpressionComplete,true);assert.ok(branch.closure.nodes>0);}
  const old=createDeriveBangContext({deriveContext:row.derive}),current=createDeriveEnclosingNamespaceContext({deriveContext:row.derive});
  const oldToken=proveDeriveEmptyEnclosingEffect(old,row.derive,row.module,row.item),oldFacts=deriveEmptyEnclosingEffectFacts(oldToken,old,row.derive,row.module,row.item),now=dimension(row,current);
  assert.equal(isDeriveBangContext(current),false);assert.equal(isDeriveEnclosingNamespaceContext(old),false);
  assert.deepEqual(now.facts.enclosingTypeBindings,oldFacts.enclosingTypeBindings);assert.deepEqual(now.facts.enclosingUsableValueBindings,oldFacts.enclosingUsableValueBindings);assert.deepEqual(now.facts.enclosingMacroNames,[]);
  assert.equal(now.facts.runtimeAuthority,false);assert.equal(now.facts.generatedImplBehavior,false);
  const outputs=originalDeriveEnclosingNamespaceOutputs(current,row.derive,row.module,row.item);assert.equal(outputs.outputs.length,1);assert.equal(outputs.outputs[0].format,'debug-enclosing');
  retain('complete-old-full-and-new-private-dimension',{source,modules:row.modules,certificate:row.certificate,invocation:row.invocation,full,minimal,oldContext:old,newContext:current,oldFacts,newFacts:now.facts,outputs});
 }
});

//2. Complete real parents are input DATA; spans and private source joins decide.
test('complete actual Router parent and primitive field variants retain full source spans and old proof relation',(_t,retain)=>{
 const parent=read('src/bridge_response.rs'),modules=[{file:'src/lib.rs',path:[],source:'mod bridge_response;'},{file:'src/bridge_response.rs',path:['bridge_response'],source:parent}];
 const row=setup(parent,{modules,file:'src/bridge_response.rs',name:'StopSemantics'}),minimal=selected(row),full=proveBuiltinDeriveBangFootprint(args(row));
 assert.equal(row.certificate.sourceSha256,hash(parent));assert.equal(row.certificate.itemSha256,hash(parent.slice(row.certificate.span.start,row.certificate.span.end)));
 assert.equal(minimal.facts.model.itemSha256,full.itemSha256);assert.deepEqual(minimal.facts.model.span,row.certificate.span);assert.deepEqual(minimal.facts.model.owner.target,['core','Debug']);
 assert.equal(minimal.facts.model.grammar.sourceTypeRoundtrips.length,4);assert.ok(minimal.facts.model.grammar.sourceTypeRoundtrips.every(field=>field.semanticSyntaxRoundTrip===true));
 assert.equal(minimal.facts.model.owner.registration.source,'compiler/rustc_builtin_macros/src/lib.rs');assert.ok(minimal.facts.model.resolverSources.length>0);
 const fresh=reissueBuiltinDebugEnclosingNamespace(minimal.token,row.derive,row.certificate,row.invocation);assert.equal(fresh.wire,minimal.facts.wire);
 const variants=[];for(const count of [0,1,6]){const source='#[derive(Debug)]pub struct Record{'+Array.from({length:count},(_,i)=>'f'+i+':u8').join(',')+'}',input=setup(source),proof=selected(input);assert.equal(proof.facts.model.grammar.sourceTypeRoundtrips.length,count);assert.ok(proof.facts.model.grammar.branches.some(branch=>branch.condition.includes('Full')));variants.push({source,certificate:input.certificate,facts:proof.facts});}
 retain('complete-real-parent-and-field-thresholds',{parent,modules,certificate:row.certificate,invocation:row.invocation,full,minimal,fresh,variants,scope:'Complete actual bridge_response parent, not a full application translation or Rust execution.'});
});

//3. No selected subset can erase actual other producers or namespace uncertainty.
test('complete sibling owners payload fallback and unknown external producers preserve residual obligations',(_t,retain)=>{
 const rows=[];
 for(const source of ['#[derive(Clone,Copy,Debug)]pub struct Record{value:u8}','#[derive(Debug,serde::Serialize,serde::Deserialize)]pub struct Record{value:u8}']){
  const row=setup(source),current=createDeriveEnclosingNamespaceContext({deriveContext:row.derive}),certificate=deriveEnclosingNamespaceOutputAt(current,row.derive,row.module,row.item);assert.ok(certificate);
  const actual=row.certificate.attributes.filter(a=>a.name==='derive').flatMap(a=>a.derives);assert.equal(certificate.actualOwners.length,actual.length);assert.equal(certificate.selectedOwners.length,actual.length);assert.deepEqual(certificate.residualOwners,[]);
  const outputs=originalDeriveEnclosingNamespaceOutputs(current,row.derive,row.module,row.item);assert.equal(outputs.outputs.filter(output=>output.format==='debug-enclosing').length,1);assert.ok(outputs.outputs.length>=actual.length);
  const proof=dimension(row,current);assert.deepEqual(proof.facts.enclosingTypeBindings,[]);rows.push({source,input:row.certificate,current,certificate,outputs,facts:proof.facts});
 }
 for(const source of ['#[derive(Debug,unknown::Open)]pub struct Record{value:u8}','#[derive(Debug,clap::Parser)]pub struct Record{value:u8}','#[derive(Debug)]pub struct Record{#[unknown]value:u8}']){
  const row=setup(source,{allowUnproved:true}),current=createDeriveEnclosingNamespaceContext({deriveContext:row.derive}),certificate=deriveEnclosingNamespaceOutputAt(current,row.derive,row.module,row.item);
  assert.equal(certificate,null);assert.ok(current.diagnostics.length+row.derive.diagnostics.length>0);if(row.certificate)assert.ok(current.certificates.some(c=>c.residualOwners.length>0));else assert.ok(row.derive.diagnostics.length>0);
  rows.push({source,input:row.certificate,originalDeriveDiagnostics:row.derive.diagnostics,current,certificate,refusal:refused(()=>dimension(row,current))});
 }
 const payload=setup('#[derive(Debug)]pub enum Record{A(u8),B{value:u8}}'),candidate=proveBuiltinDebugEnclosingNamespace(args(payload));assert.equal(candidate,null);
 const fallback=createDeriveEnclosingNamespaceContext({deriveContext:payload.derive});const output=deriveEnclosingNamespaceOutputAt(fallback,payload.derive,payload.module,payload.item);
 if(output){const all=originalDeriveEnclosingNamespaceOutputs(fallback,payload.derive,payload.module,payload.item);assert.ok(all.outputs.every(row=>row.format!=='debug-enclosing'));rows.push({payload:payload.source,output,all});}else{assert.ok(fallback.diagnostics.length);rows.push({payload:payload.source,fallback});}
 retain('complete-owner-composition-and-payload-boundary',{rows,external657Authority:false});
});

//4. Copied grammar subjects exercise the actual private source-derived checker.
test('genuine positive constructor closure rejects changed children binders tokens attributes and source types',async(t,retain)=>{
 const row=setup('#[derive(Debug)]pub struct Record{value:u8}'),original={...deriveFootprintOriginalContext(row.derive,row.certificate),module:row.module},profile=builtinDeriveAstSourceProfile(row.dependencies),entry=originalAstFunction(profile,'compiler/rustc_builtin_macros/src/deriving/debug.rs','expand_deriving_debug'),input=builtinDebugDataInputs({source:row.module.source,span:row.certificate.span}),options={profile,entry,original,certificate:row.certificate,input};
 const clean=compileBuiltinDebugEnclosingNamespaceModel(options);assert.ok(clean);const url=new URL('../builtin-debug-ast-route.mjs',import.meta.url),source=readFileSync(url,'utf8'),start=source.indexOf('export function compileBuiltinDebugEnclosingNamespaceModel(');assert.ok(start>0);
 const prefix=source.slice(0,start),body=source.slice(start),anchor=' const closed=closeBranches(plan,branches,input,fields);';assert.equal(body.split(anchor).length,2);
 const attacks=[
  {name:'unknown MacCall',code:"branches[0].body={kind:'ExprKind::MacCall'};"},
  {name:'unknown generated attribute',code:"branches[0].body.attrs=[{name:'macro_export'}];"},
  {name:'unexpected tokens',code:"branches[0].body.tokens={kind:'opaque'};"},
  {name:'missing required child',code:"delete branches[0].body.slots.expr;"},
  {name:'unproved local binder',code:"branches[0].statements=[{kind:'StmtKind::Let',local:{kind:'LocalKind::Init',tokens:null,attrs:[],mutable:false,pattern:{kind:'PatKind::Ident',bindingMode:'NONE',ident:'foreign',subpattern:null}}}];"},
 ];
 const outcomes=[];for(const attack of attacks){const changedBody=once(body,anchor,' '+attack.code+'\n'+anchor),changed=prefix+changedBody,api=await sourceModule(t,changed,url,retain,attack.name),outcome=refused(()=>api.compileBuiltinDebugEnclosingNamespaceModel(options));assert.match(outcome.error.message,/positive namespace grammar/);outcomes.push({attack,source:changed,outcome});}
 const invalid=[];for(const source of ['#[derive(Debug)]pub struct Record{value:unknown!()}','#[derive(Debug)]#[repr(packed)]pub struct Record{value:u8}']){
  const subject=setup(source,{allowUnproved:true}),outcome=capture(()=>proveBuiltinDebugEnclosingNamespace(args(subject)));assert.ok(outcome.error instanceof TypeError||outcome.value===null);invalid.push({source,certificate:subject.certificate,outcome:materialize(outcome)});
 }
 retain('complete-actual-grammar-and-adverse-source-subjects',{source,prefix,body,options,clean,outcomes,invalid,scope:'Copied grammar output has no private issuer membership, even when its source checks succeed.'});
 const fake={schema:'private-original-debug-enclosing-namespace-v1',model:clean};retain('copied-positive-grammar-is-not-private-proof',refused(()=>requireBuiltinDebugEnclosingNamespace(fake,row.derive,row.certificate,row.invocation)));
});

//5. Serialized DATA never replaces the private current invocation relation.
test('private membership and final source owner profile reentry fences reject copied and stale models',(_t,retain)=>{
 const row=setup('#[derive(Debug)]pub struct Record{value:u8}'),chosen=selected(row),current=createDeriveEnclosingNamespaceContext({deriveContext:row.derive}),effect=dimension(row,current),failures=[];
 for(const token of [structuredClone(chosen.token),{...chosen.token},JSON.parse(chosen.facts.wire),{...chosen.facts,digest:hash(chosen.facts.wire)},{}])failures.push(refused(()=>requireBuiltinDebugEnclosingNamespace(token,row.derive,row.certificate,row.invocation)));
 failures.push(refused(()=>requireBuiltinDebugEnclosingNamespace(chosen.token,row.derive,structuredClone(row.certificate),row.invocation)));
 failures.push(refused(()=>requireBuiltinDebugEnclosingNamespace(chosen.token,setup(row.source).derive,row.certificate,row.invocation)));
 failures.push(refused(()=>requireBuiltinDebugEnclosingNamespace(chosen.token,row.derive,row.certificate,{path:['Clone'],attributeSpan:row.invocation.attributeSpan})));
 failures.push(refused(()=>deriveEnclosingNamespaceEffectFacts({...effect.token},current,row.derive,row.module,row.item)));
 failures.push(refused(()=>deriveEnclosingNamespaceOutputAt(structuredClone(current),row.derive,row.module,row.item)));
 failures.push(refused(()=>deriveEnclosingNamespaceModules(current,{deriveContext:row.derive,modules:row.modules.slice(1),externalModules:row.externalModules,compilationProfile:PRODUCTION_PROFILE})));
 const external=new Map(row.externalModules);external.set('foreign',{kind:'unqualified'});failures.push(refused(()=>deriveEnclosingNamespaceModules(current,{deriveContext:row.derive,modules:row.modules,externalModules:external,compilationProfile:PRODUCTION_PROFILE})));
 failures.push(refused(()=>deriveEnclosingNamespaceModules(current,{deriveContext:row.derive,modules:row.modules,externalModules:row.externalModules,compilationProfile:{...PRODUCTION_PROFILE,features:['foreign']}})));
 const saved=row.module.source;try{row.module.source=saved+'\n';assert.equal(reissueBuiltinDebugEnclosingNamespace(chosen.token,row.derive,row.certificate,row.invocation).wire,chosen.facts.wire,'the sealed original source snapshot stays unchanged');failures.push(refused(()=>deriveEnclosingNamespaceEffectFacts(effect.token,current,row.derive,row.module,row.item)));}finally{row.module.source=saved;}
 const carrier={...row.module,items:[]};failures.push(refused(()=>deriveEnclosingNamespaceOutputAt(current,row.derive,carrier,row.item)));
 assert.throws(()=>define(chosen.facts.model,'namespaceAuthority',{value:true}),TypeError);assert.equal(requireBuiltinDebugEnclosingNamespace(chosen.token,row.derive,row.certificate,row.invocation).namespaceAuthority,false);
 const update=get(Hash.prototype,'update'),events=[],nested=[],savedSpan=row.invocation.attributeSpan;let raw,entered=false;
 try{define(Hash.prototype,'update',{...update,value:function(...values){
  const result=apply(update.value,this,values);events.push(values.map(value=>typeof value==='string'?{string:value}:Buffer.isBuffer(value)?{base64:value.toString('base64')}:{type:typeof value}));
  if(!entered&&typeof values[0]==='string'&&values[0].includes('original-debug-enclosing-namespace-model-v1')){entered=true;nested.push(capture(()=>requireBuiltinDebugEnclosingNamespace(chosen.token,row.derive,row.certificate,row.invocation)));row.invocation.attributeSpan={...savedSpan,start:savedSpan.start+1};}
  return result;
 }});raw=capture(()=>proveBuiltinDebugEnclosingNamespace(args(row)));}finally{define(Hash.prototype,'update',update);row.module.source=saved;row.invocation.attributeSpan=savedSpan;}
 if(entered)assert.ok(raw.error instanceof TypeError,'post-observer changed current invocation must not issue a token');else assert.ok(raw.error instanceof TypeError||raw.value===null,'guarded Hash override cannot create unobserved authority');
 assert.equal(reissueBuiltinDebugEnclosingNamespace(chosen.token,row.derive,row.certificate,row.invocation).wire,chosen.facts.wire);
 retain('complete-private-freshness-and-raw-observer-results',{source:row.source,certificate:row.certificate,chosen,current,effect,failures,events,entered,nested:nested.map(materialize),raw:materialize(raw),observerContract:'New format has distinct guard/JSON/Hash payload observations. Guard refusal is retained; it is not an unguarded observer success.'});
});

//6. Complete graphs retain every ordinary import/configuration/unknown macro.
test('whole resolver bindings agree with full proofs while sibling globs and unknown configuration remain uncertain',(_t,retain)=>{
 const positive=setup('#[derive(Debug)]pub struct Record{value:u8}pub const VALUE:u8=7;',{modules:[{file:'src/lib.rs',path:[],source:'mod model;use model::{Record,VALUE};'},{file:'src/model.rs',path:['model'],source:'#[derive(Debug)]pub struct Record{value:u8}pub const VALUE:u8=7;'}]});
 const old=createDeriveBangContext({deriveContext:positive.derive}),current=createDeriveEnclosingNamespaceContext({deriveContext:positive.derive}),before=resolve(positive,old,false),after=resolve(positive,current,true);
 assert.deepEqual(after,before);assert.ok(after.scopes.find(row=>row.path.length===0).bindings.some(row=>row.name==='Record'&&row.status==='resolved'));
 const residuals=[];for(const extra of ['unknown!();','#[cfg(unknown_feature)]pub struct Maybe;','use unavailable::*;']){
  const row=setup('#[derive(Debug)]pub struct Record{value:u8}'+extra,{allowUnproved:true}),old=createDeriveBangContext({deriveContext:row.derive}),next=createDeriveEnclosingNamespaceContext({deriveContext:row.derive}),a=resolve(row,old,false),b=resolve(row,next,true);
  assert.deepEqual(b,a);const model=b.scopes.find(scope=>scope.file===row.module.file);assert.ok(model.unresolvedTypeScope||model.unresolvedMacroScope||model.unresolvedBangMacroScope||b.diagnostics.length,'unresolved unrelated producer stays represented');residuals.push({source:row.source,old,next,before:a,after:b});
 }
 const foreignView={...positive.module,sourceView:{...positive.module.sourceView,digest:'changed'}};
 const viewRefusal=refused(()=>deriveEnclosingNamespaceModules(current,{deriveContext:positive.derive,modules:positive.modules.map(module=>module===positive.module?foreignView:module),externalModules:positive.externalModules,compilationProfile:PRODUCTION_PROFILE}));
 retain('complete-resolver-relation',{positive:{modules:positive.modules,input:positive.certificate},old,current,before,after,residuals,viewRefusal,scope:'Enclosing names only; generated method semantics and selectedOwnerBangComplete remain unclaimed.'});
});

//7. Two explicit rule phases, complete canonical CST, and strict cold children.
test('source derived language then repository equations and cold owner parse guards keep private currentness',(_t,retain)=>{
 const url=new URL('../builtin-debug-ast-route.mjs',import.meta.url),actual=readFileSync(url,'utf8'),legacy=restoreEnclosingNamespaceSource(actual,(kind,value)=>retain(kind,value));
 assert.ok(actual.startsWith(legacy));const original=functionSource(legacy,'liftBuiltinDebugAstRoute');let language=original;
 for(const rule of DEBUG_LANGUAGE_EDITS){const next=once(language,rule.before,rule.after);language=stage(retain,language,next,rule.id,'language');}
 assert.equal(language,functionSource(actual,'compileBuiltinDebugEnclosingNamespaceModel'));
 const repository=stage(retain,legacy,actual,'router:append-enclosing-only-debug-format','repository');assert.equal(repository,actual);
 const bang=readFileSync(new URL('../builtin-derive-bang-footprints.mjs',import.meta.url),'utf8'),bangLegacy=restoreEnclosingNamespaceSource(bang,(kind,value)=>retain(kind,value));assert.ok(bang.startsWith(bangLegacy));stage(retain,bangLegacy,bang,'router:append-private-enclosing-issuer','repository');
 for(const name of ['derive-enclosing-namespace-context.mjs','module-bindings.mjs','core-adoption-producer-context.mjs','migrate-core-base64.mjs']){
  const source=readFileSync(new URL('../'+name,import.meta.url),'utf8'),reparsed=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document));assert.equal(reparsed.source,source);retain('complete-actual-new-format-module-source',{name,source,wire:serializeConcreteSyntaxMeta(reparsed.document)});
 }
 const addresses={dependencies:new URL('../derive-dependencies.mjs',import.meta.url).href,footprints:new URL('../derive-footprints.mjs',import.meta.url).href,bang:new URL('../builtin-derive-bang-footprints.mjs',import.meta.url).href,profile:new URL('../cfg-profile.mjs',import.meta.url).href,sourceURLs:new URL('./fixtures/repository-paths.mjs',import.meta.url).href,root:root.href};
 const cold=[];for(const mode of ['proxy-owner','null-owner','undefined-owner','ordinary-owner','parse-method']){
  const script=`import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createRequire,syncBuiltinESMExports} from 'node:module';import {types} from 'node:util';
import {loadDeriveDependencyProof} from ${json(addresses.dependencies)};import {createDeriveFootprintContext} from ${json(addresses.footprints)};import {proveBuiltinDebugEnclosingNamespace,requireBuiltinDebugEnclosingNamespace} from ${json(addresses.bang)};import {PRODUCTION_PROFILE} from ${json(addresses.profile)};import {repositorySourceURL} from ${json(addresses.sourceURLs)};
const root=${json(addresses.root)},mode=${json(mode)},read=path=>readFileSync(repositorySourceURL(path,root),'utf8'),cargo={manifest:read('Cargo.toml'),lock:read('Cargo.lock')},source='#[derive(Debug)]pub struct Record{value:u8}',modules=[{file:'src/lib.rs',path:[],source}],context=createDeriveFootprintContext({modules,dependencies:loadDeriveDependencyProof(cargo),compilationProfile:PRODUCTION_PROFILE}),certificate=context.certificates.find(c=>c.name==='Record');assert.ok(certificate);const attribute=certificate.attributes.find(a=>a.name==='derive'),invocation={path:['Debug'],attributeSpan:attribute.span},token=proveBuiltinDebugEnclosingNamespace({context,certificate,invocation});assert.ok(token);const facts=requireBuiltinDebugEnclosingNamespace(token,context,certificate,invocation),require=createRequire(import.meta.url),util=require('node:util'),owner=Object.getOwnPropertyDescriptor(util,'types'),parse=Object.getOwnPropertyDescriptor(JSON,'parse'),originalTypes=types,tape=[];let error,value,rebound=false;
try{if(mode==='parse-method')Object.defineProperty(JSON,'parse',{...parse,value:function(...args){tape.push({op:'parse',count:args.length});return Reflect.apply(parse.value,this,args);}});else{let replacement=mode==='null-owner'?null:mode==='undefined-owner'?undefined:mode==='ordinary-owner'?{isProxy(){tape.push({op:'isProxy'});return false;}}:new Proxy(originalTypes,{get(target,key,receiver){tape.push({op:'get',key:String(key)});return Reflect.get(target,key,receiver);},getOwnPropertyDescriptor(target,key){tape.push({op:'descriptor',key:String(key)});return Reflect.getOwnPropertyDescriptor(target,key);}});Object.defineProperty(util,'types',{...owner,value:replacement});syncBuiltinESMExports();rebound=types!==originalTypes;}try{value=requireBuiltinDebugEnclosingNamespace(token,context,certificate,invocation);}catch(cause){error=cause;}}
finally{Object.defineProperty(util,'types',owner);syncBuiltinESMExports();Object.defineProperty(JSON,'parse',parse);}
if(mode==='parse-method'||rebound)assert.ok(error instanceof TypeError);else assert.equal(value.wire,facts.wire);assert.deepEqual(tape,[]);assert.equal(requireBuiltinDebugEnclosingNamespace(token,context,certificate,invocation).wire,facts.wire);console.log(JSON.stringify({mode,source,modules,certificate,invocation,facts,rebound,qualified:mode==='parse-method'||rebound,tape,outcome:error?{error:{name:error.name,message:error.message,stack:String(error.stack)}}:{value}}));`;
  const result=spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',timeout:20_000,maxBuffer:4*1024*1024});
  retain('complete-cold-source-and-raw-child-result',{mode,script,status:result.status,signal:result.signal,stdout:result.stdout,stderr:result.stderr,error:result.error?{name:result.error.name,message:result.error.message}:null,childTimeoutMs:20_000,maxBuffer:4*1024*1024});assert.equal(result.error,undefined);assert.equal(result.status,0,result.stderr);const data=JSON.parse(result.stdout);assert.equal(data.mode,mode);assert.deepEqual(data.tape,[]);cold.push(data);
 }
 retain('complete-cold-owner-and-parse-controls',{addresses,cold,note:'A no-op named-binding synchronization is explicitly unqualified, never fabricated as a successful owner rebind.'});
});

function observeHash(run){
 const update=get(Hash.prototype,'update'),digest=get(Hash.prototype,'digest'),tape=[],errors=[];let result;
 try{define(Hash.prototype,'update',{...update,value:function(...args){const output=apply(update.value,this,args);tape.push({op:'update',args:args.map(value=>typeof value==='string'?{string:value}:Buffer.isBuffer(value)?{base64:value.toString('base64')}:{type:typeof value})});errors.push(new Error('raw Hash.update observer'));return output;}});
  define(Hash.prototype,'digest',{...digest,value:function(...args){const output=apply(digest.value,this,args);tape.push({op:'digest',args,value:typeof output==='string'?output:{base64:output.toString('base64')}});errors.push(new Error('raw Hash.digest observer'));return output;}});result=capture(run);
 }finally{define(Hash.prototype,'update',update);define(Hash.prototype,'digest',digest);}
 return {result:materialize(result),tape,rawStacks:errors.map(error=>String(error.stack))};
}
//8. Actual opt-in route, original default bodies, and strict emitted targets.
test('actual core base64 selection retains complete source proposals and genuine checked strict20s targets',async(t,retain)=>{
 const row=setup('#[derive(Debug)]pub struct Record{value:u8}'),options=coreOptions(row),old=createWholeScopedCoreAdoptionProducerContext(options);assert.ok(old);const backendTrials=[legacyBackendReadTrial(old,row)];const current=createEnclosingCoreAdoptionProducerContext(options);assert.ok(current);backendTrials.push(legacyBackendReadTrial(old,row));retain('legacy-backend-before-and-after-explicit-mode',backendTrials);
 assert.equal(closeCore(old,row),true);assert.equal(closeCore(current,row),true);assert.deepEqual(coreAdoptionProducerBindings(current),coreAdoptionProducerBindings(old));
 const oldFacts=finishCoreAdoptionProducerContext(old),currentFacts=finishCoreAdoptionProducerContext(current);assert.equal(oldFacts.selections.length,1);assert.equal(currentFacts.selections.length,1);assert.equal(currentFacts.selections[0].languageRule,'rust.original-debug-enclosing-namespace-format.v1');assert.equal(currentFacts.runtimeAuthority,false);assert.equal(currentFacts.generatedImplBehavior,false);
 assert.throws(()=>finishCoreAdoptionProducerContext({...current}),/copied|foreign/);
 const core=readFileSync(new URL('../core-adoption-producer-context.mjs',import.meta.url),'utf8'),coreHistory=restoreEnclosingNamespaceSource(core,(kind,value)=>retain(kind,value));
 for(const name of ['createCoreAdoptionProducerContext','createWholeScopedCoreAdoptionProducerContext'])assert.equal(functionSource(core,name),functionSource(coreHistory,name));
 const tapes={legacy:observeHash(()=>{const context=createCoreAdoptionProducerContext(options);closeCore(context,row);return finishCoreAdoptionProducerContext(context);}),enclosing:observeHash(()=>{const context=createEnclosingCoreAdoptionProducerContext(options);closeCore(context,row);return finishCoreAdoptionProducerContext(context);})};
 // Both raw tapes/outcomes are retained. The new payload/guard schedule is a
 // distinct format, and native guard refusal under a wrapper remains refusal.
 for(const trial of Object.values(tapes))assert.ok(trial.result.error?.name==='TypeError'||trial.result.value?.runtimeAuthority===false);
 const files={'src/lib.rs':'pub mod translation_core;#[derive(Debug)]pub struct Record{value:u8}pub fn original(value:&str)->String{base64::Engine::encode(&base64::engine::general_purpose::STANDARD,value)}pub fn echo(value:u8)->u8{value}',
  'src/translation_core.rs':ROUTER_FORMATTING_FACADE_SOURCE,'src/translation_core/primitives.rs':ROUTER_CORE_PRIMITIVES_SOURCE,'src/translation_core/ranges.rs':ROUTER_CORE_RANGES_SOURCE,'src/translation_core/json_collections.rs':ROUTER_CORE_JSON_COLLECTIONS_SOURCE,'src/translation_core/base64.rs':ROUTER_CORE_BASE64_SOURCE};
 const input={entry:'src/lib.rs',files,dependencyInputs:row.cargo,compilationProfile:PRODUCTION_PROFILE},url=new URL('../migrate-core-base64.mjs',import.meta.url),actual=readFileSync(url,'utf8'),historical=restoreEnclosingNamespaceSource(actual,(kind,value)=>retain(kind,value)),api=await sourceModule(t,historical,url,retain,'complete-legacy-base64-control');
 const before=api.proposeCoreBase64Corpus(input),progress=[],after=proposeCoreBase64Corpus(input,event=>progress.push(event));assert.deepEqual(after.after,before.after);assert.deepEqual(after.before,files);assert.ok(after.proposals.some(proposal=>proposal.edits.length>0));
 for(const proposal of after.proposals){assert.equal(transportConcreteSyntaxMeta(proposal.before.meta).source,files[proposal.file]);assert.equal(transportConcreteSyntaxMeta(proposal.after.meta).source,proposal.after.source);let inverse=proposal.after.source;for(const part of [...proposal.mapping].reverse())if(part.kind==='substitution')inverse=inverse.slice(0,part.after[0])+part.expected+inverse.slice(part.after[1]);assert.equal(inverse,files[proposal.file]);}
 assert.ok(progress.some(event=>event.phase==='base64-producer-context'&&event.state==='end'));
 const result=translateProject({entry:input.entry,paths:Object.keys(after.after),readSource:path=>after.after[path],compilationProfile:PRODUCTION_PROFILE,cargoManifest:row.cargo.manifest,deriveDependencies:row.dependencies});assert.ok(result.meta.executable.some(row=>row.name==='echo'),json(result.meta.refused));
 const wire=json(result.meta.checkedSemanticProgram);assert.equal(serializeProgram(parseProgram(wire)),wire);
 retain('complete-real-opt-in-route-and-strict-subject',{row:{source:row.source,modules:row.modules,input:row.certificate},options,oldFacts,currentFacts,tapes,core,coreHistory,input,actualBase64:actual,historicalBase64:historical,before,after,progress,result,wire,scope:'Actual selected route/full returned source equality and checked echo targets; not full Router corpus, generated trait execution, original17 deadline, or CLI120 qualification.'});
 await verifyTypedTargets(result,api=>{for(const value of [0n,1n,255n])assert.equal(api.echo(value),value);assert.throws(()=>api.echo('255'));},{childTimeoutMs:20_000});
});

function legacyBackendReadTrial(context,row){
 const descriptor=get(Object.prototype,'backend');assert.equal(descriptor,undefined);let reads=0,result;
 try{define(Object.prototype,'backend',{configurable:true,get(){reads++;throw new Error('inherited private backend must never be read');}});result=capture(()=>closeCore(context,row));}finally{delete Object.prototype.backend;}
 assert.equal(reads,0);if(result.error)assert.ok(result.error instanceof TypeError);else assert.equal(result.value,true);
 return {reads,result:materialize(result)};
}
