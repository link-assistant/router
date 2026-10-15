// Whole source-flow prerequisite controls. No Rust generator execution claim.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {builtinDeriveAstSourceProfile,compilerOutputAstSourceAccess,isBuiltinDeriveAstProfile,originalAstFunction,assertOriginalAstFunction,requireCompilerOutputAstSourceAccess} from '../builtin-derive-ast-meta.mjs';
import {createBuiltinAstSourceSubstitution,createCompilerOutputAstSourceSubstitution,isBuiltinAstSourceSubstitution,assertBuiltinAstSourceSubstitution} from '../builtin-ast-source-substitution.mjs';
import {originalStandardBangOutputSourcePlan} from '../standard-bang-output-source.mjs';
import {createCompilerOutputAstCompiler,compileOriginalCompilerOutputFlow,originalCompilerOutputFlowFacts,COMPILER_OUTPUT_COLLECTION_WORKLIST} from '../compiler-output-ast.mjs';
import {captureOriginalEditionPanicSourceFlow,originalEditionPanicSourceFlowFacts} from '../edition-panic-source-output.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from '../source-module-views.mjs';
import {originalDeclarationHeader} from '../module-bindings.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from '../extensions/external-trait-sources.mjs';
import {captureOriginalNamespaceFunction,originalNamespaceFunctionMembers,originalNamespaceFunctionInvocationPosition,originalNamespacePositionFacts} from '../original-namespace-parser.mjs';
import {captureOriginalNamespaceSourceSuperset} from '../conditional-namespace-superset.mjs';
import {resolveModuleGraph,translateProject} from '../project.mjs';
import {verifyTypedTargets} from './typed-targets.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
const dependencies=loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')}),profile=builtinDeriveAstSourceProfile(dependencies),plan=originalStandardBangOutputSourcePlan();
const edition='compiler/rustc_builtin_macros/src/edition_panic.rs';
const retain=(name,value)=>{const dir=process.env.ROUTER_EDITION_PANIC_FLOW_VECTOR_DIR;if(dir){mkdirSync(dir,{recursive:true});writeFileSync(join(dir,name+'.json'),JSON.stringify(value)+'\n',{flag:'wx'});}};
function walk(value,predicate,result=[]){if(!value||typeof value!=='object')return result;if(predicate(value))result.push(value);for(const [key,child]of Object.entries(value))if(!['syntax','schema','import','recipe','typeSyntax','sourceBinding'].includes(key))if(Array.isArray(child))for(const row of child)walk(row,predicate,result);else walk(child,predicate,result);return result;}
function source(module,item,memberIndex=null,index=0,superset=captureOriginalNamespaceSourceSuperset({module,dependencies})){const selected={module,item,memberIndex},frame=captureOriginalNamespaceFunction(selected),position=originalNamespaceFunctionInvocationPosition(frame,selected,index);return {dependencies,source:selected,frame,position,superset};}
function authored(text,index=0){const views=captureSourceModuleViews({source:text,sourcePath:'src/lib.rs',compilationProfile:PRODUCTION_PROFILE}),module={source:text,file:'src/lib.rs',path:[],sourceView:views.views[0],compilationProfile:PRODUCTION_PROFILE},item=originalSourceModuleItems(module).find(row=>originalDeclarationHeader(row)?.name==='caller');assert.ok(item);return source(module,item,null,index);}
function issue(options){const token=captureOriginalEditionPanicSourceFlow(options);return {token,facts:originalEditionPanicSourceFlowFacts(token,options)};}
function noAuthority(facts){for(const key of ['callerMacroOwnerResolved','callsiteEditionResolved','configurationSelected','globalBangComplete','completeOutputProved','namespaceAuthority','typeAuthority','runtimeAuthority'])assert.equal(facts[key],false,key);}

test('private extended source access retains complete pinned inputs without widening original profile issuers',{timeout:60000},()=>{
 const access=compilerOutputAstSourceAccess(profile,plan),stage=createCompilerOutputAstSourceSubstitution(profile,access),fragment=access.function(edition,'expand_panic');
 assert.equal(isBuiltinDeriveAstProfile(access),false);assert.throws(()=>createBuiltinAstSourceSubstitution(access),TypeError);assert.throws(()=>originalAstFunction(profile,edition,'expand_panic'),TypeError);assert.throws(()=>assertOriginalAstFunction(profile,fragment),TypeError);assert.throws(()=>requireCompilerOutputAstSourceAccess(structuredClone({schema:access.schema,digest:access.digest})),TypeError);
 const foreign=builtinDeriveAstSourceProfile(loadDeriveDependencyProof({manifest:read('Cargo.toml'),lock:read('Cargo.lock')}));assert.throws(()=>createCompilerOutputAstSourceSubstitution(foreign,access),TypeError);
 for(const input of plan.sources){const original=access.original(input.sourcePath);assert.equal(original.source,input.source);assert.equal(hash(original.source),input.sha256);assert.equal(Buffer.byteLength(original.source),input.bytes);}
 const program=stage.compile(fragment),result=stage.substitute(program);assert.equal(stage.assert(result),result);assert.equal(isBuiltinAstSourceSubstitution(result),false);assert.throws(()=>assertBuiltinAstSourceSubstitution(result,stage),TypeError);assert.equal(result.selectedOwnerBangComplete,false);assert.throws(()=>stage.compile(structuredClone(fragment)),TypeError);assert.throws(()=>stage.substitute(structuredClone(program)),TypeError);retain('01-complete-original-access-and-private-domains',{plan,fragment,program,result});
});

test('both actual registered callbacks preserve both complete edition alternatives and original forwarded arguments',{timeout:60000},()=>{
 const compiler=createCompilerOutputAstCompiler(profile,plan),rows=[];
 for(const [name,expected]of [['expand_panic',['panic_2021','panic_2015']],['expand_unreachable',['unreachable_2021','unreachable_2015']]]){
  const token=compileOriginalCompilerOutputFlow(compiler,edition,name),facts=originalCompilerOutputFlowFacts(token,compiler),branches=walk(facts.program,value=>value.tag==='original-if-expression');assert.equal(branches.length,1);assert.equal(branches[0].selectionEstablished,false);
  assert.deepEqual([branches[0].thenBody.result.path,branches[0].elseBody.result.path],[['sym',expected[0]],['sym',expected[1]]]);assert.equal(facts.program.slots.find(slot=>slot.name==='mac').value,branches[0]);
  const call=facts.program.tree.result;assert.equal(call.kind,'source-function-call');assert.deepEqual(call.path,['expand']);assert.deepEqual(call.args.map(arg=>facts.program.slots.find(slot=>slot.id===arg.slotId)?.name),['mac','cx','sp','tts']);assert.equal(facts.completeOutputProved,false);rows.push({token,facts});
 }
 retain('02-complete-callbacks-both-branches-and-forwarded-slots',{plan,rows});
});

test('actual std_path and full output chain preserve immutable-construction syntax and unproved shared closure domains',{timeout:60000},()=>{
 const compiler=createCompilerOutputAstCompiler(profile,plan),expand=originalCompilerOutputFlowFacts(compileOriginalCompilerOutputFlow(compiler,edition,'expand'),compiler),path=originalCompilerOutputFlowFacts(compileOriginalCompilerOutputFlow(compiler,'compiler/rustc_expand/src/base.rs','std_path'),compiler);
 const array=walk(expand.program,value=>value.tag==='original-array-source-construction');assert.equal(array.length,1);assert.equal(array[0].elements.length,2);assert.deepEqual(array[0].elements[0].path,['sym','panic']);assert.equal(array[0].elements[1].tag,'lexical-slot');assert.equal(array[0].valueDomainEstablished,false);
 const methods=walk(expand.program,value=>value.kind==='source-method-call').map(node=>node.method);for(const name of ['std_path','into_iter','map','collect'])assert.ok(methods.includes(name),name);
 const closure=walk(path.program,value=>value.tag==='source-closure');assert.equal(closure.length,1);const slot=path.program.slots.find(slot=>slot.id===closure[0].parameters[0]);assert.equal(slot.kind,'open-shared-closure-pattern-binding');assert.deepEqual(slot.syntax.map(node=>node.text),['&','s']);assert.ok(path.program.obligations.some(row=>row.kind==='shared-reference-pattern-copy-and-input-domain'));
 assert.ok(walk(expand.program,value=>value.kind==='source-function-call'&&value.path?.join('::')==='PathSegment::from_ident').length);for(const facts of [expand,path])assert.equal(facts.concreteCollectionValuesProved,false);retain('03-full-path-array-methods-and-unresolved-pattern',{expand,path});
});

test('actual edition loop and PathSegment fields remain whole original source rather than fabricated iterator or hygiene values',{timeout:60000},()=>{
 const compiler=createCompilerOutputAstCompiler(profile,plan),loop=originalCompilerOutputFlowFacts(compileOriginalCompilerOutputFlow(compiler,edition,'use_panic_2021'),compiler),segment=originalCompilerOutputFlowFacts(compileOriginalCompilerOutputFlow(compiler,'compiler/rustc_ast/src/ast.rs','from_ident','PathSegment { ident, id: DUMMY_NODE_ID, args: None }'),compiler);
 const body=loop.original.source.slice(loop.fragment.span.start,loop.fragment.span.end);for(const text of ['loop {','allow_internal_unstable','continue;','break expn.edition >= Edition::Edition2021;'])assert.ok(body.includes(text));assert.ok(loop.program.obligations.some(row=>row.kind==='source-expression-grammar'));assert.equal(loop.controlAndEffectClosureComplete,false);
 const record=segment.program.tree.result;assert.equal(record.tag,'original-positive-record');assert.deepEqual(record.fields.map(field=>field.schema.name),['ident','id','args']);assert.equal(record.fields[1].value.kind,'unbound-source-name');assert.equal(record.fields[2].value.kind,'unbound-source-name');assert.equal(segment.constructorOwnerResolved,false);
 assert.equal(COMPILER_OUTPUT_COLLECTION_WORKLIST.length,11);for(const row of COMPILER_OUTPUT_COLLECTION_WORKLIST){assert.equal(row.status,'unresolved');assert.equal(row.semanticsProved,false);assert.ok(row.inputs.length&&row.requires.length);}retain('04-whole-loop-constructor-and-machine-worklist',{loop,segment,worklist:COMPILER_OUTPUT_COLLECTION_WORKLIST});
});

test('complete actual 39-member package and all three remaining Engine calls retain exact original TT and every competing alternative',{timeout:60000},()=>{
 const packageToken=captureOriginalExternalTraitPackage(dependencies,'base64'),original=originalExternalTraitPackageInputs(packageToken),files=new Map(original.sources.map(row=>[row.path,row.source])),paths=original.sources.filter(row=>row.path.endsWith('.rs')).map(row=>row.path),graph=resolveModuleGraph({entry:original.crateRoot,paths,readSource:path=>files.get(path),compilationProfile:null}),module=graph.modules.find(row=>row.file==='src/engine/mod.rs'),item=originalSourceModuleItems(module).find(row=>originalDeclarationHeader(row)?.name==='Engine'),members=originalNamespaceFunctionMembers({module,item}),superset=captureOriginalNamespaceSourceSuperset({module,dependencies}),rows=[];
 for(const member of members){if(member.kind!=='fn')continue;let options;try{options=source(module,item,member.memberIndex,0,superset);}catch(error){if(error instanceof TypeError&&/actual private opaque invocation index required/.test(error.message))continue;throw error;}
  // Preserve vec sites as well; only collect actual written panic/unreachable candidates.
  for(let index=0;;index++){let position;try{position=originalNamespaceFunctionInvocationPosition(options.frame,options.source,index);}catch(error){if(error instanceof TypeError&&/actual private opaque invocation index required/.test(error.message))break;throw error;}
   const positionFacts=originalNamespacePositionFacts(position,options.frame,options.source);if(!['panic','unreachable'].includes(positionFacts.invocation.fields.path.fields.segments.at(-1)))continue;const result=issue({...options,position});
   noAuthority(result.facts);assert.equal(result.facts.original.original,module.source.slice(result.facts.original.invocationSpan.start,result.facts.original.invocationSpan.end));assert.equal(result.facts.flows.length,6);assert.equal(result.facts.originalScopeAlternatives.attributeOwnersResolved,false);rows.push({member,options:{...options,position},result});
  }
 }
 assert.equal(rows.length,3);assert.equal(rows.filter(row=>row.result.facts.original.original.startsWith('unreachable!')).length,2);assert.equal(rows.filter(row=>row.result.facts.original.original.startsWith('panic!')).length,1);retain('05-complete-package-all-engine-calls-and-source-flows',{original,graph,members,rows});
});

test('unrelated spellings repeated calls foreign copies stale source and hostile ingress cannot select a macro owner',{timeout:60000},()=>{
 const options=authored('use foreign::panic;fn caller(){strange!(same());strange!(same());}'),first=issue(options),secondOptions={...options,position:originalNamespaceFunctionInvocationPosition(options.frame,options.source,1)},second=issue(secondOptions);noAuthority(first.facts);assert.equal(first.facts.registeredCandidates.length,3);assert.notDeepEqual(first.facts.original.invocationSpan,second.facts.original.invocationSpan);
 for(const token of [{},structuredClone(first.token)])assert.throws(()=>originalEditionPanicSourceFlowFacts(token,options),TypeError);assert.throws(()=>originalEditionPanicSourceFlowFacts(first.token,secondOptions),TypeError);const foreign=authored(options.source.module.source);assert.throws(()=>originalEditionPanicSourceFlowFacts(first.token,foreign),TypeError);
 const prior=options.source.module.source;options.source.module.source+=' ';assert.throws(()=>originalEditionPanicSourceFlowFacts(first.token,options),TypeError);options.source.module.source=prior;assert.equal(originalEditionPanicSourceFlowFacts(first.token,options),first.facts);
 let callbacks=0;const getter=Object.defineProperty({...options},'source',{get(){callbacks++;throw Error('getter');}}),proxy=new Proxy(options,{ownKeys(){callbacks++;throw Error('proxy');}});for(const value of [getter,proxy])assert.throws(()=>captureOriginalEditionPanicSourceFlow(value),TypeError);assert.equal(callbacks,0);
 const compiler=createCompilerOutputAstCompiler(profile,plan),flow=compileOriginalCompilerOutputFlow(compiler,edition,'expand');assert.throws(()=>originalCompilerOutputFlowFacts(structuredClone(flow),compiler),TypeError);assert.throws(()=>originalCompilerOutputFlowFacts(flow,createCompilerOutputAstCompiler(profile,plan)),TypeError);retain('06-private-source-and-owner-nonadmission',{options,first,second,foreign,callbacks});
});

test('complete before/current default factories preserve every original metadata byte under the same dependency issuer',{timeout:60000},async()=>{
 const fixtureRoot=new URL('./fixtures/compiler-output-before-232/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',fixtureRoot),'utf8')),directory=mkdtempSync(join(tmpdir(),'router-232-default-')),relocations=[];
 try{
  for(const row of manifest.sources){const bytes=readFileSync(new URL(row.fixture,fixtureRoot));assert.equal(bytes.length,row.bytes);assert.equal(hash(bytes),row.sha256);const originalUrl=new URL('../'+row.path.split('/').at(-1),import.meta.url),text=bytes.toString('utf8').replace(/(from\s+|import\s*)(['"])(\.[^'"]+)\2/gu,(whole,prefix,quote,specifier)=>{const target=new URL(specifier,originalUrl),local=manifest.sources.find(entry=>new URL('../'+entry.path.split('/').at(-1),import.meta.url).href===target.href),replacement=local?pathToFileURL(join(directory,local.path.split('/').at(-1))).href:target.href;relocations.push({source:row.path,specifier,replacement});return prefix+quote+replacement+quote;}).replaceAll('import.meta.url',JSON.stringify(originalUrl.href));writeFileSync(join(directory,row.path.split('/').at(-1)),text,{flag:'wx'});}
  const oldMeta=await import(pathToFileURL(join(directory,'builtin-derive-ast-meta.mjs')).href),oldStageModule=await import(pathToFileURL(join(directory,'builtin-ast-source-substitution.mjs')).href),oldProfile=oldMeta.builtinDeriveAstSourceProfile(dependencies),oldStage=oldStageModule.createBuiltinAstSourceSubstitution(oldProfile),current=createBuiltinAstSourceSubstitution(profile),rows=[];
  for(const name of ['expr_deref','expr_call']){const path='compiler/rustc_expand/src/build.rs',oldFragment=oldMeta.originalAstFunction(oldProfile,path,name),newFragment=originalAstFunction(profile,path,name),oldProgram=oldStage.compile(oldFragment),newProgram=current.compile(newFragment),oldResult=oldStage.substitute(oldProgram),newResult=current.substitute(newProgram);assert.equal(JSON.stringify(newProgram),JSON.stringify(oldProgram));assert.equal(JSON.stringify(newResult),JSON.stringify(oldResult));rows.push({name,oldFragment,newFragment,oldProgram,newProgram,oldResult,newResult});}
  retain('07-complete-old-current-default-output',{manifest,relocations,rows});
 }finally{rmSync(directory,{recursive:true,force:true});}
});

test('ordinary authored checked JS and strict TS remain independent of unexecuted compiler collection contracts',{timeout:60000},async()=>{
 const options=authored('fn caller(){panic!("opaque {}",value());}'),result=issue(options),sourceText='pub fn choose(value:bool)->i32{if value{7}else{-3}}',translation=translateProject({entry:'src/lib.rs',paths:['src/lib.rs'],readSource:()=>sourceText,compilationProfile:PRODUCTION_PROFILE}),observations=[];noAuthority(result.facts);retain('08-complete-source-and-independent-checked-program',{options,result,sourceText,translation});
 try{await verifyTypedTargets(translation,api=>{const values=[api.choose(false),api.choose(true)];assert.deepEqual(values,[-3n,7n]);observations.push(values.map(String));},{childTimeoutMs:20000});}finally{retain('08-independent-js-and-strict-ts-observations',observations);}assert.equal(observations.length,2);assert.equal(result.facts.completeOutputProved,false);
});
