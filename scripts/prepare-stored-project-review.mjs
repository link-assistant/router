#!/usr/bin/env node
// Proposal-only source generation. No source or review verdict is cached.
import {readFileSync,writeFileSync,mkdirSync,lstatSync} from 'node:fs';
import {resolve,relative,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createRulePipeline} from '../tools/translation/rule-pipeline.mjs';
import {exactLiteralSubstitutionRule} from '../tools/translation/literal-substitution-rule.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta} from '../tools/translation/concrete-syntax-meta.mjs';
import {ownershipCompiler} from '../tools/translation/js-to-rust/vendor/module-syntax.mjs';

const path='scripts/review-translation-draft.mjs',hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Stored project reviewer source preparation: '+message);};
const extraImports="import {createCloneEnclosingSourceContext} from '../tools/translation/clone-trait-source.mjs';\nimport {createDeriveEnclosingNamespaceContext} from '../tools/translation/derive-enclosing-namespace-context.mjs';\nimport {compilationProfile} from '../tools/translation/cfg-profile.mjs';\n";
const importAnchor="import {createCloneSourceContext,cloneSourceContextFacts} from '../tools/translation/clone-trait-source.mjs';";
const compareAnchor='export function compareGeneratedMethods(before,after) {';
const storedBefore='reviewGeneratedMethods(concreteReview.semanticMetadata,row,';
const storedAfter='reviewStoredProjectGeneratedMethods(concreteReview.semanticMetadata,row,';
const banner='\n// Explicit stored-project review format. Fresh original joins remain required;\n// private contexts are shared only within this call. The direct API above stays exact.\n';

function concrete(source){
 if(typeof source!=='string'||Buffer.byteLength(source)>1048576)fail('complete bounded source required');
 const meta=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document);
 const restored=transportConcreteSyntaxMeta(meta);if(restored.source!==source)fail('lossless serialized/reparsed CST differs');
 return {source:restored.source,meta};
}
function native(source){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)fail('complete native JavaScript grammar required');
 return {ts,file};
}
function one(value,before,after){
 if(value.split(before).length!==2)fail('one complete source anchor required');
 return value.replace(before,()=>after);
}
function inverse(text,rules){
 for(const [,before,after]of [...rules].reverse())text=one(text,after,before);
 return text;
}
function copyFunction(source,beforeName,afterName,rules){
 const rename=['javascript:copy-whole-original-'+beforeName,beforeName+'(',afterName+'('];
 const result=createRulePipeline([
  {phase:'language',rules:[exactLiteralSubstitutionRule(...rename,'One complete original function name required')]},
  {phase:'repository',rules:rules.map(row=>exactLiteralSubstitutionRule(...row,'Complete source reviewer copy equation changed'))},
 ]).run(source);
 const all=[rename,...rules],before=concrete(source),after=concrete(result.value);
 if(inverse(after.source,all)!==source)fail('complete copied function inverse differs');
 native(after.source);
 return {source,text:after.source,beforeMeta:before.meta,afterMeta:after.meta,rules:all,inverse:source,trace:result.trace};
}

export function deriveStoredProjectReviewSource(input){
 const initial=concrete(input),{ts,file}=native(initial.source);
 const original=name=>{
  const nodes=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
  if(nodes.length!==1)fail('one complete original API function required: '+name);
  return nodes[0].getText(file);
 };
 const defaultFunction=original('originalUnitDefaultReviewContext');
 const cloneFunction=original('originalCloneReviewContext');
 const reviewFunction=original('reviewGeneratedMethods');
 const graphStatement="  const graph=resolveModuleGraph({entry:row.entry,paths,readSource:name=>sources.get(name),compilationProfile:meta.compilationProfile});";
 const defaultCreation=defaultFunction.split('\n').filter(line=>line.includes('defaultContext=createDefaultSourceContext(derive);'));
 if(defaultCreation.length!==1)fail('one original Default creation statement required');
 const defaultParsed=native(defaultFunction),returns=defaultParsed.file.statements[0].body.statements.filter(ts.isReturnStatement);
 if(returns.length!==1)fail('one complete original context return required');
 const sharedJoin="  const {graph,derive}=shared;\n  if(shared.state.deriveContext!==derive||shared.state.dependencies!==proof||sources.size!==shared.sources.size||[...sources].some(([name,source])=>shared.sources.get(name)!==source))throw new Error('Stored Default fresh original inputs differ from this invocation context');\n  cloneSame(graph.compilationProfile,compilationProfile(meta.compilationProfile),'Stored Default original profile changed');";
 const join=copyFunction(defaultFunction,'originalUnitDefaultReviewContext','originalStoredDefaultInputJoin',[
  ['review:accept-only-this-invocation-context',"cargoManifestPath='Cargo.toml'}) {","cargoManifestPath='Cargo.toml'},shared) {"],
  ['review:rejoin-all-fresh-source-dependency-profile-inputs',graphStatement,sharedJoin],
  ['review:reuse-original-private-Default-context',defaultCreation[0],'  // The complete original Default context is rejoined above.'],
  ['review:return-only-rejoined-original-context',returns[0].getText(defaultParsed.file),'return shared;'],
 ]);
 const cloneCreation="  const externalModules=registeredStandardHostBindings([...originalMatchesNamespaceBindings(),...lockedTomlValueNamespaceBindings(proof)]),derive=createDeriveFootprintContext({modules:graph.modules,dependencies:proof,externalModules,compilationProfile:graph.compilationProfile}),context=createCloneSourceContext(derive),state=cloneSourceContextFacts(context);";
 const cloneJoin="  const {graph,derive,defaultContext}=shared;\n  if(shared.state.deriveContext!==derive||shared.state.dependencies!==proof||sources.size!==shared.sources.size||[...sources].some(([name,source])=>shared.sources.get(name)!==source))throw new Error('Stored Clone fresh original inputs differ from this invocation Default context');\n  cloneSame(graph.compilationProfile,compilationProfile(meta.compilationProfile),'Stored Clone original profile changed');";
 const clone=copyFunction(cloneFunction,'originalCloneReviewContext','originalStoredCloneReviewContext',[
  ['review:accept-this-invocation-Clone-context','{readSource,dependencies,jsonMacroDependencies}) {','{readSource,dependencies,jsonMacroDependencies},shared) {'],
  ['review:retain-complete-fresh-Clone-inputs-and-layout',graphStatement,cloneJoin],
  ['review:compose-existing-genuine-enclosing-Clone-issuer',cloneCreation,"  const deriveBangContext=createDeriveEnclosingNamespaceContext({deriveContext:derive}),context=createCloneEnclosingSourceContext(derive,{defaultContext,deriveBangContext}),state=cloneSourceContextFacts(context);"],
 ]);
 const defaultCall='originalUnitDefaultReviewContext(meta,row,{readSource,dependencies,jsonMacroDependencies,cargoManifest,cargoManifestPath})';
 const review=copyFunction(reviewFunction,'reviewGeneratedMethods','reviewStoredProjectGeneratedMethods',[
  ['review:share-container-Default-only-inside-this-call','containerDefaultContext??='+defaultCall,'containerDefaultContext??=originalDefault()'],
  ['review:share-unit-Default-only-inside-this-call','unitDefaultContext??='+defaultCall,'unitDefaultContext??=originalDefault()'],
  ['review:pass-genuine-current-context-to-Clone','originalCloneReviewContext(meta,row,{readSource,dependencies,jsonMacroDependencies})','originalStoredCloneReviewContext(meta,row,{readSource,dependencies,jsonMacroDependencies},originalDefault())'],
  ['review:scope-lazy-original-context-to-this-invocation','let cloneContext=null,unitDefaultContext=null,containerDefaultContext=null;','let cloneContext=null,unitDefaultContext=null,containerDefaultContext=null,sharedDefaultContext=null;\n  const originalDefault=()=>sharedDefaultContext===null?(sharedDefaultContext='+defaultCall+'):originalStoredDefaultInputJoin(meta,row,{readSource,dependencies,jsonMacroDependencies,cargoManifest,cargoManifestPath},sharedDefaultContext);'],
 ]);
 const addition=banner+join.text+'\n'+clone.text+'\n'+review.text+'\n';
 let source=initial.source;
 const installed=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&['originalStoredDefaultInputJoin','originalStoredCloneReviewContext','reviewStoredProjectGeneratedMethods'].includes(node.name?.text));
 if(installed.length){
  if(installed.length!==3)fail('partial stored reviewer installation');
  source=one(source,addition+'\n'+compareAnchor,compareAnchor);
  source=one(source,extraImports+importAnchor,importAnchor);
  source=one(source,storedAfter,storedBefore);
 }else if(source.includes(banner)||source.includes(storedAfter)||source.includes(extraImports))fail('partial or altered generated reviewer source');
 const repository=[
  ['review:attach-existing-original-enclosing-APIs',importAnchor,extraImports+importAnchor],
  ['review:install-whole-source-derived-stored-reviewer',compareAnchor,addition+'\n'+compareAnchor],
  ['review:select-explicit-stored-project-consumer',storedBefore,storedAfter],
 ];
 const result=createRulePipeline([
  {phase:'language',rules:[{id:'javascript:retain-original-functions-and-derived-complete-copies',apply:value=>{if(value!==source)fail('original complete reviewer changed');return value;}}]},
  {phase:'repository',rules:repository.map(row=>exactLiteralSubstitutionRule(...row,'Complete original reviewer equation changed'))},
 ]).run(source);
 const before=concrete(source),after=concrete(result.value),parsed=native(after.source);
 for(const [name,wanted]of [['originalUnitDefaultReviewContext',defaultFunction],['originalCloneReviewContext',cloneFunction],['reviewGeneratedMethods',reviewFunction]]){
  const nodes=parsed.file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
  if(nodes.length!==1||nodes[0].getText(parsed.file)!==wanted)fail('complete original direct API changed');
 }
 if(inverse(after.source,repository)!==source)fail('complete original reviewer inverse differs');
 return {literalSubstitutions:true,path,source,text:after.source,currentSource:initial.source,sourceSha256:hash(source),sha256:hash(after.source),currentSha256:hash(initial.source),originals:{defaultFunction,cloneFunction,reviewFunction},copies:{join,clone,review},repository,beforeMeta:before.meta,afterMeta:after.meta,inverse:source,trace:result.trace,fullOriginalAPIsUnchanged:true,acrossInvocationCaches:false,semanticAuthority:false,runtimeParity:false,rustExecuted:false};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 if(!(args.length===1&&args[0]==='--check'||args.length===2&&args[0]==='--emit'))fail('Usage: prepare-stored-project-review.mjs --check | --emit FRESH_OUTSIDE_DIRECTORY');
 const target=resolve(root,path),status=lstatSync(target);if(!status.isFile()||status.isSymbolicLink())fail('ordinary current reviewer source required');
 const row=deriveStoredProjectReviewSource(readFileSync(target,'utf8'));
 if(args[0]==='--check'){
  if(row.currentSource!==row.text)fail('generated stored-project reviewer is stale');
  console.log(JSON.stringify({fresh:true,path,sha256:row.sha256,fullOriginalAPIsUnchanged:true,runtimeParity:false,rustExecuted:false}));
 }else{
  const output=resolve(args[1]),fromRoot=relative(root,output),toRoot=relative(output,root);
  if(!fromRoot.startsWith('..'+sep)||!toRoot.startsWith('..'+sep))fail('fresh outside proposal directory required');
  mkdirSync(output);const head=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',timeout:10000}).trim();
  const raw=Buffer.from(JSON.stringify({head,files:[row],installed:false,qualified:false,rustExecuted:false})+'\n'),packet=resolve(output,'complete-source-proposal-and-inverses.json.gz');
  writeFileSync(packet,gzipSync(raw,{level:1}),{flag:'wx'});if(!gunzipSync(readFileSync(packet)).equals(raw))fail('whole source proposal readback differs');
  console.log(JSON.stringify({packet,path,sha256:row.sha256,installed:false,qualified:false,rustExecuted:false}));
 }
}
