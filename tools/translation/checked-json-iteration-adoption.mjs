// Explicit API adoption. Every plan/apply rechecks complete actual functions;
// neither a saved source proposal nor detached semantic metadata grants access.
import {lstatSync,realpathSync} from 'node:fs';
import {resolve,join,posix} from 'node:path';
import {execFileSync} from 'node:child_process';
import {formattingPacketIO as IO} from './formatting-packet-io.mjs';
import {proposeCoreJsonIterationCorpus} from './migrate-core-json-iterations.mjs';
import {translateProject} from './project.mjs';
import {loadJsonMacroSourceProof} from './json-macro-sources.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {repositoryRustLayout} from './repository-layout.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {installFreshSourceProposal,readCurrentSourceProposalFile as outputBefore} from './unit-runtime-materialization.mjs';
const LIMIT=64*1024*1024,FILE_LIMIT=8*1024*1024,SCHEMA='router-checked-json-iteration-adoption-v1';
const fail=message=>{throw new TypeError('Checked JSON iterator adoption: '+message);};
function relative(path){if(typeof path!=='string'||!path||path.length>4096||posix.isAbsolute(path)||path.includes('\\')||/[\0\r\n:]/u.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..'))fail('canonical relative source or meta path required');return path;}
function head(root){
 const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_'))),empty=process.platform==='win32'?'NUL':'/dev/null';
 const revision=execFileSync(process.platform==='win32'?'git':'/usr/bin/git',['-C',root,'rev-parse','HEAD'],{env:{...env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:empty,GIT_CONFIG_SYSTEM:empty},encoding:'utf8',timeout:30_000,maxBuffer:4096}).trim();if(!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(revision))fail('complete current Git revision required');return revision;
}
function nativeSpan(position,edits){let delta=0;for(const edit of edits){if(position>edit.span[0]&&position<edit.span[1])fail('function boundary lies inside an adoption expression');if(position>=edit.span[1])delta+=edit.replacement.length-(edit.span[1]-edit.span[0]);}return position+delta;}
function retainedFunction(row,selection,edits){return {path:row.file,name:selection.function,before:selection.functionSpan,after:selection.functionSpan.map(position=>nativeSpan(position,edits)),sourceAuthority:false,semanticAuthority:false};}
export function planCheckedJsonIterationAdoption({root,metaPath='tools/translation/adoption/json-iterations.json',functions=null}={}){
 root=realpathSync(resolve(root));metaPath=relative(metaPath);const original=IO.snapshot(root),cargo=IO.sequenceDependencies(root),revision=head(root);if(!cargo.inputs||cargo.rows.some(row=>row.absent))fail('complete current native Cargo inputs required');
 const workspaceInputs=repositoryRustLayout(root).cargoInputs.filter(path=>!cargo.rows.some(row=>row.path===path)).map(path=>{const source=outputBefore(root,path);if(source===null)fail('complete actual workspace Cargo input required');return {path,source};});
 const inputs=original.rows.map(row=>({path:row.path,source:row.source})).concat(cargo.rows.map(row=>({path:row.path,source:row.source})),workspaceInputs),protectedPaths=new Set(inputs.map(row=>row.path));if(protectedPaths.has(metaPath))fail('meta cannot overwrite native source/Cargo input');
 const inputBytes=inputs.reduce((sum,row)=>sum+Buffer.byteLength(row.source),0);if(inputBytes>LIMIT)fail('complete source input byte budget exceeded');
 if(functions!==null&&(!Array.isArray(functions)||!functions.length||functions.length>4096||functions.some(row=>!row||typeof row.name!=='string'||!row.name||row.name.length>256||relative(row.path)!==row.path)||new Set(functions.map(row=>row.path+'\0'+row.name)).size!==functions.length))fail('bounded unique explicit source function selection required');
 const selected=functions===null?null:new Set(functions.map(row=>row.path+'\0'+row.name));let candidate,after,histories,definitions,checked;
 const run=createRulePipeline([
  {phase:'language',rules:[
   {id:'rust:recompute-complete-original-iterator-adoption-proposal',apply:()=>{candidate=proposeCoreJsonIterationCorpus({entry:IO.rootEntry(root),files:original.files,dependencyInputs:cargo.inputs,compilationProfile:PRODUCTION_PROFILE});return candidate;}},
   {id:'rust:retain-complete-selected-function-source-equations',apply:value=>{
    after={...original.files};histories=[];definitions=[];const found=new Set();
    for(const row of value.proposals){
     const choices=row.selections.filter(selection=>selected===null||selected.has(row.file+'\0'+selection.function));if(!choices.length)continue;
     const edits=row.edits.filter(edit=>choices.some(selection=>selection.span[0]===edit.span[0]&&selection.span[1]===edit.span[1])).sort((a,b)=>a.span[0]-b.span[0]);if(edits.length!==choices.length)fail('complete selected source equations differ');
     const originalCst=transportConcreteSyntaxSource(row.before.source,{language:'Rust'}),stage=applyConcreteSyntaxSubstitutions(originalCst.document,{languageRules:[{id:'rust:retain-complete-actual-selected-source',edits:[]}],repositoryRules:[{id:'router:adopt-selected-qualified-json-iteration-boundaries',edits}]}),current=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(stage.value));
     let inverse=current.source;for(const edit of [...edits].reverse()){const begin=nativeSpan(edit.span[0],edits),end=begin+edit.replacement.length;if(inverse.slice(begin,end)!==edit.replacement)fail('complete selected inverse differs');inverse=inverse.slice(0,begin)+edit.expected+inverse.slice(end);}if(inverse!==row.before.source)fail('whole selected source inverse differs');
     after[row.file]=current.source;histories.push({path:row.file,before:row.before.source,after:current.source,beforeMeta:originalCst.meta,afterMeta:current.meta,edits,inverse,trace:stage.trace});
     for(const choice of choices){const key=row.file+'\0'+choice.function;found.add(key);if(!definitions.some(definition=>definition.path===row.file&&definition.before[0]===choice.functionSpan[0]&&definition.before[1]===choice.functionSpan[1]))definitions.push(retainedFunction(row,choice,edits));}
    }
    if(!definitions.length||selected&&[...selected].some(key=>!found.has(key)))fail('every selected actual function must have a closed source adoption');
    if(selected&&[...selected].some(key=>definitions.filter(row=>row.path+'\0'+row.name===key).length!==1))fail('selected source function name is ambiguous');return after;
   }},
   {id:'meta:freshly-check-all-selected-whole-functions-and-emit-both-targets',apply:files=>{
    checked=translateProject({entry:IO.rootEntry(root),paths:Object.keys(files),readSource:path=>files[path],jsonMacroDependencies:loadJsonMacroSourceProof(cargo.inputs),deriveDependencies:loadDeriveDependencyProof(cargo.inputs),cargoManifest:cargo.inputs.manifest,compilationProfile:PRODUCTION_PROFILE});
    const refused=definitions.filter(definition=>checked.meta.executable.filter(row=>row.term==='fn'&&row.source===definition.path&&row.span.start===definition.after[0]&&row.span.end===definition.after[1]).length!==1);
    if(refused.length){const error=new TypeError('Every selected complete function must freshly translate; unresolved: '+refused.map(row=>row.path+':'+row.name).join(', '));error.refusals=checked.meta.refused;throw error;}return checked;
   }},
  ]},
  {phase:'repository',rules:[{id:'router:retain-full-source-target-and-semantic-review-before-installation',apply:result=>({schema:SCHEMA,functions:definitions,sourceHistories:histories,semanticMeta:result.meta,javascript:result.javascript,typescript:result.typescript,originalTraitDispatchProved:false,runtimeParity:false,wholeRouterSynchronization:false,rustExecuted:false})}]},
 ]).run(null);
 const outputs=[];let retained=inputBytes;
 for(const history of histories){const source=original.rows.find(row=>row.path===history.path);retained+=Buffer.byteLength(history.before)+Buffer.byteLength(history.after);if(retained>LIMIT)fail('complete source adoption proposal byte budget exceeded');outputs.push({path:history.path,before:history.before,after:history.after,inverse:history.before,mode:source.identity.mode&0o777,kind:'adopted-source'});}
 const before=outputBefore(root,metaPath),metadata=JSON.stringify({...run.value,trace:run.trace})+'\n';if(Buffer.byteLength(metadata)>FILE_LIMIT)fail('complete semantic/source/target review exceeds original file bound');retained+=Buffer.byteLength(metadata)+(before===null?0:Buffer.byteLength(before));if(retained>LIMIT)fail('complete source/semantic adoption byte budget exceeded');outputs.push({path:metaPath,before,after:metadata,inverse:before,mode:before===null?0o644:lstatSync(join(root,metaPath)).mode&0o777,kind:'translation-meta'});
 IO.rejoin(original);cargo.verify();for(const row of workspaceInputs)if(outputBefore(root,row.path)!==row.source)fail('complete workspace Cargo input changed');if(head(root)!==revision)fail('Git baseline changed during complete source checking');if(outputBefore(root,metaPath)!==before)fail('complete meta output changed');
 return {schema:SCHEMA,root,baseRevision:revision,inputs,outputs,functions:definitions,retainedSourceBytes:retained,trace:run.trace,sourceAuthority:false,semanticAuthority:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false,rustExecuted:false};
}
export function applyCheckedJsonIterationAdoption(serialized,options){return installFreshSourceProposal(serialized,()=>planCheckedJsonIterationAdoption(options));}
