// Explicit API adoption. Every plan/apply rechecks complete actual functions;
// neither a saved source proposal nor detached semantic metadata grants access.
import {lstatSync,realpathSync} from 'node:fs';
import {resolve,join,posix} from 'node:path';
import {execFileSync} from 'node:child_process';
import {formattingPacketIO as IO} from './formatting-packet-io.mjs';
import {proposeCoreJsonFieldCorpus} from './migrate-core-json-fields.mjs';
import {translateProject} from './project.mjs';
import {loadJsonMacroSourceProof} from './json-macro-sources.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {repositoryRustLayout} from './repository-layout.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {installFreshSourceProposal,readCurrentSourceProposalFile as outputBefore} from './unit-runtime-materialization.mjs';
const LIMIT=64*1024*1024,FILE_LIMIT=8*1024*1024,SCHEMA='router-checked-json-field-adoption-v1';
const fail=message=>{throw new TypeError('Checked JSON field adoption: '+message);};
function relative(path){if(typeof path!=='string'||!path||path.length>4096||posix.isAbsolute(path)||path.includes('\\')||/[\0\r\n:]/u.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..'))fail('canonical relative source or meta path required');return path;}
function head(root){
 const env=Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_'))),empty=process.platform==='win32'?'NUL':'/dev/null';
 const revision=execFileSync(process.platform==='win32'?'git':'/usr/bin/git',['-C',root,'rev-parse','HEAD'],{env:{...env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:empty,GIT_CONFIG_SYSTEM:empty},encoding:'utf8',timeout:30_000,maxBuffer:4096}).trim();if(!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(revision))fail('complete current Git revision required');return revision;
}
function nativeSpan(position,edits){let delta=0;for(const edit of edits){if(position>edit.span[0]&&position<edit.span[1])fail('function boundary lies inside an adoption expression');if(position>=edit.span[1])delta+=edit.replacement.length-(edit.span[1]-edit.span[0]);}return position+delta;}
function retainedFunction(row,selection,edits){return {path:row.file,name:selection.function,before:selection.functionSpan,after:selection.functionSpan.map(position=>nativeSpan(position,edits)),sourceAuthority:false,semanticAuthority:false};}
export function planCheckedJsonFieldAdoption({root,metaPath='tools/translation/adoption/json-fields.json',functions=null}={}){
 root=realpathSync(resolve(root));metaPath=relative(metaPath);const original=IO.snapshot(root),cargo=IO.sequenceDependencies(root),revision=head(root);if(!cargo.inputs||cargo.rows.some(row=>row.absent))fail('complete current native Cargo inputs required');
 const workspaceInputs=repositoryRustLayout(root).cargoInputs.filter(path=>!cargo.rows.some(row=>row.path===path)).map(path=>{const source=outputBefore(root,path);if(source===null)fail('complete actual workspace Cargo input required');return {path,source};});
 const inputs=original.rows.map(row=>({path:row.path,source:row.source})).concat(cargo.rows.map(row=>({path:row.path,source:row.source})),workspaceInputs),protectedPaths=new Set(inputs.map(row=>row.path));if(protectedPaths.has(metaPath))fail('meta cannot overwrite native source/Cargo input');
 const inputBytes=inputs.reduce((sum,row)=>sum+Buffer.byteLength(row.source),0);if(inputBytes>LIMIT)fail('complete source input byte budget exceeded');
 if(functions!==null&&(!Array.isArray(functions)||!functions.length||functions.length>4096||functions.some(row=>!row||typeof row.name!=='string'||!row.name||row.name.length>256||relative(row.path)!==row.path)||new Set(functions.map(row=>row.path+'\0'+row.name)).size!==functions.length))fail('bounded unique explicit source function selection required');
 const selected=functions===null?null:new Set(functions.map(row=>row.path+'\0'+row.name));let candidate,after,histories,definitions,checked;
 const run=createRulePipeline([
  {phase:'language',rules:[
   {id:'rust:recompute-complete-original-field-adoption-proposal',apply:()=>{candidate=proposeCoreJsonFieldCorpus({entry:IO.rootEntry(root),files:original.files,dependencyInputs:cargo.inputs,compilationProfile:PRODUCTION_PROFILE});return candidate;}},
   {id:'rust:retain-complete-selected-function-source-equations',apply:value=>{
    after={...original.files};histories=[];definitions=[];const found=new Set();
    for(const row of value.proposals){
     const choices=row.selections.filter(selection=>selected===null||selected.has(row.file+'\0'+selection.function));if(!choices.length)continue;
     const edits=row.edits.filter(edit=>choices.some(selection=>selection.span[0]===edit.span[0]&&selection.span[1]===edit.span[1])).sort((a,b)=>a.span[0]-b.span[0]);if(edits.length!==choices.length)fail('complete selected source equations differ');
     const originalCst=transportConcreteSyntaxSource(row.before.source,{language:'Rust'}),stage=applyConcreteSyntaxSubstitutions(originalCst.document,{languageRules:[{id:'rust:retain-complete-actual-selected-source',edits:[]}],repositoryRules:[{id:'router:adopt-selected-qualified-json-field-boundaries',edits}]}),current=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(stage.value));
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
export function applyCheckedJsonFieldAdoption(serialized,options){return installFreshSourceProposal(serialized,()=>planCheckedJsonFieldAdoption(options));}
// Explicit primitive vector source unit; copied transaction helpers above keep
// their existing contracts. Planning and application always retranslate fresh.
const vectorUnitFailure=message=>{throw new TypeError('Owned vector source unit: '+message);};
const VECTOR_UNIT_SCHEMA='router-owned-vector-unit-proposal-v1';
export function planOwnedVectorUnitSynchronization({root,manifestPath}={}){
 root=realpathSync(resolve(root));manifestPath=relative(manifestPath);const manifestSource=outputBefore(root,manifestPath);if(manifestSource===null)vectorUnitFailure('complete actual vector unit manifest required');const unit=JSON.parse(manifestSource),keys=['schema','id','authority','javascript','typescript','runtimeRoot','declarationRoot','bindings','dependencies','meta',...(unit&&Object.hasOwn(unit,'nativeRoute')?['nativeRoute']:[])];
 if(!unit||typeof unit!=='object'||Array.isArray(unit)||Object.keys(unit).length!==keys.length||keys.some(key=>!Object.hasOwn(unit,key))||unit.schema!=='router-owned-vector-unit-v1'||typeof unit.id!=='string'||!/^[_a-zA-Z0-9-]{1,96}$/u.test(unit.id)||!['JavaScript','TypeScript'].includes(unit.authority))vectorUnitFailure('explicit complete vector unit and one JS/TS authority required');
 for(const key of ['javascript','typescript','runtimeRoot','declarationRoot','meta'])relative(unit[key]);if(!unit.javascript.endsWith('.mjs')||!/\.(?:mts|ts)$/u.test(unit.typescript)||!unit.meta.endsWith('.json')||new Set([manifestPath,unit.javascript,unit.typescript,unit.meta]).size!==4||!Array.isArray(unit.bindings)||!unit.bindings.length||unit.bindings.length>4096||!Array.isArray(unit.dependencies)||unit.dependencies.length>256||new Set(unit.dependencies).size!==unit.dependencies.length)vectorUnitFailure('distinct actual paired paths and bounded explicit native bindings/dependencies required');
 for(const path of unit.dependencies)if(!/\.(?:mjs|mts|ts)$/u.test(relative(path)))vectorUnitFailure('actual script source dependencies required');
 const original=IO.snapshot(root),cargo=IO.sequenceDependencies(root),revision=head(root),layout=repositoryRustLayout(root);if(!cargo.inputs||cargo.rows.some(row=>row.absent))vectorUnitFailure('complete actual native Cargo inputs required');
 const physicalInputs=new Map(),logicalInputs=new Map(),physicalToLogical=new Map();let retained=0;
 const physical=(path,source)=>{relative(path);if(physicalInputs.has(path)){if(physicalInputs.get(path)!==source)vectorUnitFailure('conflicting actual physical input snapshots');return;}if(typeof source!=='string'||Buffer.byteLength(source)>FILE_LIMIT)vectorUnitFailure('complete bounded physical source input required');physicalInputs.set(path,source);retained+=Buffer.byteLength(source);if(retained>LIMIT)vectorUnitFailure('complete vector source input budget exceeded');};
 const logical=(path,source)=>{if(logicalInputs.has(path))vectorUnitFailure('virtual native/script source paths overlap');logicalInputs.set(path,source);};
 for(const row of original.rows){const name=layout.root==='.'?row.path:row.path.slice(layout.root.length+1);if(layout.root!=='.'&&!row.path.startsWith(layout.root+'/'))vectorUnitFailure('actual Rust package source mapping differs');physical(row.path,row.source);logical(name,row.source);physicalToLogical.set(row.path,name);}
 for(const row of cargo.rows)physical(row.path,row.source);for(const path of layout.cargoInputs)if(!physicalInputs.has(path)){const source=outputBefore(root,path);if(source===null)vectorUnitFailure('complete workspace Cargo input required');physical(path,source);}
 logical('Cargo.toml',cargo.inputs.manifest);logical('Cargo.lock',cargo.inputs.lock);physical(manifestPath,manifestSource);
 for(const row of ownedVectorRuntimeSources(unit.runtimeRoot,unit.declarationRoot)){const source=outputBefore(root,row.path);if(source!==row.source)vectorUnitFailure('actual installed vector runtime/declaration closure differs');physical(row.path,source);logical(row.path,source);}
 for(const path of [unit.javascript,unit.typescript,...unit.dependencies]){const source=outputBefore(root,path);if(source===null)vectorUnitFailure('complete actual paired/dependency source required');physical(path,source);logical(path,source);}
 if(physicalInputs.has(unit.meta))vectorUnitFailure('review metadata cannot overwrite source/runtime/Cargo/manifest inputs');const beforeMeta=outputBefore(root,unit.meta),baseline=captureSourceUnitGitBaseline(root,revision,{prefix:posix.dirname(IO.rootEntry(root)),paths:[...physicalInputs.keys()]}),nativePaths=[...original.rows.map(row=>row.path),...layout.cargoInputs];chooseSourceUnitAuthority(unit,physicalInputs,baseline,nativePaths);
 const bindings=unit.bindings.map(row=>{if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).length!==3||!['javascriptName','rustPath','rustName'].every(key=>Object.hasOwn(row,key)))vectorUnitFailure('exact complete native vector binding required');const path=relative(row.rustPath);if(!physicalToLogical.has(path))vectorUnitFailure('actual physical Rust binding source is absent');return {javascriptPath:unit.javascript,javascriptName:row.javascriptName,rustPath:physicalToLogical.get(path),rustName:row.rustName};});
 const data={runtimeRoot:unit.runtimeRoot,declarationRoot:unit.declarationRoot,vectorBindings:bindings,files:[...logicalInputs].map(([path,source])=>({path,source}))},inputs=[...physicalInputs].map(([path,source])=>({path,source}));let primaryFailed=false;
 try{
  const run=createRulePipeline([
   {phase:'language',rules:[{id:'owned-vector-unit:recompute-original-paired-and-native-source-proposal',apply:()=>proposeOwnedVectorNativeSynchronization(data,{sourcePath:unit.javascript,typescriptPath:unit.typescript,[unit.authority==='JavaScript'?'javascript':'typescript']:physicalInputs.get(unit.authority==='JavaScript'?unit.javascript:unit.typescript)})}]},
   {phase:'repository',rules:[{id:'router:retain-physical-language-root-source-transaction-and-complete-review',apply:proposal=>{
    const outputs=[],paths=new Set(),add=(path,before,after,kind)=>{relative(path);if(paths.has(path)||typeof after!=='string'||Buffer.byteLength(after)>FILE_LIMIT)vectorUnitFailure('distinct bounded complete source outputs required');paths.add(path);retained+=Buffer.byteLength(after)+(before===null?0:Buffer.byteLength(before));if(retained>LIMIT)vectorUnitFailure('complete vector unit proposal byte budget exceeded');outputs.push({path,before,after,inverse:before,mode:before===null?0o644:lstatSync(join(root,path)).mode&0o777,kind});};
    for(const edit of proposal.rustEdits){const path=layout.root==='.'?edit.path:layout.root+'/'+edit.path;if(physicalInputs.get(path)!==edit.before)vectorUnitFailure('actual physical native source substitution differs');add(path,edit.before,edit.after,'synchronized-native-source');}
    for(const edit of proposal.files){if(physicalInputs.get(edit.path)!==edit.before)vectorUnitFailure('actual paired source substitution differs');add(edit.path,edit.before,edit.after,'synchronized-paired-source');}
    const {sourceInputs,...review}=proposal,metadata=JSON.stringify({schema:VECTOR_UNIT_SCHEMA,id:unit.id,authority:unit.authority,manifestSource,proposal:review,sourceAuthority:false,semanticAuthority:false,runtimeParity:false,wholeRouterSynchronization:false})+'\n';add(unit.meta,beforeMeta,metadata,'complete-source-review');return {schema:VECTOR_UNIT_SCHEMA,root,manifestPath,baseRevision:revision,manifestSource,units:[{id:unit.id,authority:unit.authority}],inputs,outputs,retainedSourceBytes:retained,sourceAuthority:false,semanticAuthority:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false,rustExecuted:false};
   }}]},
  ]).run(null);return {...run.value,trace:run.trace};
 }catch(error){primaryFailed=true;throw error;}finally{
  let fenceFailed=false,fenceError;const close=run=>{try{run();}catch(error){if(!fenceFailed){fenceFailed=true;fenceError=error;}}};close(()=>IO.rejoin(original));close(()=>cargo.verify());for(const row of inputs)close(()=>{if(outputBefore(root,row.path)!==row.source)vectorUnitFailure('complete original physical source changed');});close(()=>{if(head(root)!==revision||outputBefore(root,unit.meta)!==beforeMeta)vectorUnitFailure('actual source unit Git baseline or review target changed');});physicalInputs.clear();logicalInputs.clear();physicalToLogical.clear();baseline.clear();if(!primaryFailed&&fenceFailed)throw fenceError;
 }
}
export function applyOwnedVectorUnitSynchronization(serialized,options){return installFreshSourceProposal(serialized,()=>planOwnedVectorUnitSynchronization(options));}

import {ownedBulkRuntimeSources as ownedVectorRuntimeSources} from './js-to-rust/owned-vector-candidate-source.mjs';
import {proposeOwnedVectorNativeSynchronization} from './js-to-rust/owned-vector-native-synchronization.mjs';
import {captureSourceUnitGitBaseline,chooseSourceUnitAuthority} from './source-unit-git-baseline.mjs';

// Automatic initial adoption. The copied explicit-unit APIs above stay intact.
// No user-maintained function binding table or saved discovery result is input.
const BULK_NATIVE_SCHEMA='router-owned-native-bulk-unit-proposal-v1';
export function planOwnedNativeBulkUnitSynchronization({root,manifestPath}={}){
 root=realpathSync(resolve(root));manifestPath=relative(manifestPath);const manifestSource=outputBefore(root,manifestPath);if(manifestSource===null)vectorUnitFailure('complete actual bulk discovery manifest required');
 const unit=JSON.parse(manifestSource),keys=['schema','id','runtimeRoot','declarationRoot','javascriptRoot','typescriptRoot','meta'];
 if(!unit||typeof unit!=='object'||Array.isArray(unit)||Object.keys(unit).length!==keys.length||keys.some(key=>!Object.hasOwn(unit,key))||unit.schema!=='router-owned-native-bulk-unit-v1'||typeof unit.id!=='string'||!/^[_a-zA-Z0-9-]{1,96}$/u.test(unit.id))vectorUnitFailure('exact bulk initial-adoption manifest required');
 for(const key of keys.slice(2))relative(unit[key]);if(!unit.meta.endsWith('.json')||new Set([manifestPath,unit.runtimeRoot,unit.declarationRoot,unit.javascriptRoot,unit.typescriptRoot,unit.meta]).size!==6)vectorUnitFailure('distinct complete runtime receiving and review paths required');
 const original=IO.snapshot(root),cargo=IO.sequenceDependencies(root),revision=head(root),layout=repositoryRustLayout(root),physicalInputs=new Map(),logicalInputs=new Map(),outputBaselines=new Map();let retained=0,primaryFailed=false,proposal;
 const physical=(path,source)=>{relative(path);if(physicalInputs.has(path)){if(physicalInputs.get(path)!==source)vectorUnitFailure('conflicting current bulk source captures');return;}if(source!==null&&(typeof source!=='string'||Buffer.byteLength(source)>FILE_LIMIT))vectorUnitFailure('bounded complete bulk source capture required');physicalInputs.set(path,source);retained+=source===null?0:Buffer.byteLength(source);if(retained>LIMIT)vectorUnitFailure('complete bulk source capture byte budget');};
 const logical=(path,source)=>{if(logicalInputs.has(path))vectorUnitFailure('logical bulk source paths overlap');logicalInputs.set(path,source);};
 try{
  if(!cargo.inputs||cargo.rows.some(row=>row.absent))vectorUnitFailure('complete current native Cargo inputs required');
  for(const row of original.rows){if(layout.root!=='.'&&!row.path.startsWith(layout.root+'/'))vectorUnitFailure('actual Rust package source mapping differs');physical(row.path,row.source);logical(layout.root==='.'?row.path:row.path.slice(layout.root.length+1),row.source);}
  for(const row of cargo.rows)physical(row.path,row.source);for(const path of layout.cargoInputs)if(!physicalInputs.has(path)){const source=outputBefore(root,path);if(source===null)vectorUnitFailure('complete current workspace Cargo input required');physical(path,source);}
  logical('Cargo.toml',cargo.inputs.manifest);logical('Cargo.lock',cargo.inputs.lock);physical(manifestPath,manifestSource);
  const runtimeOutputs=[];for(const row of ownedVectorRuntimeSources(unit.runtimeRoot,unit.declarationRoot)){
   const before=outputBefore(root,row.path);if(before!==null&&before!==row.source)vectorUnitFailure('discovery cannot replace a differing installed runtime/declaration');if(physicalInputs.has(row.path))vectorUnitFailure('runtime output overlaps an authoritative source input');physical(row.path,before);logical(row.path,row.source);if(before===null)runtimeOutputs.push({path:row.path,before:null,after:row.source,inverse:null,mode:0o644,kind:'complete-runtime-closure'});
  }
  const inputs=[...physicalInputs].map(([path,source])=>({path,source}));if(physicalInputs.has(unit.meta))vectorUnitFailure('bulk review cannot overwrite source Cargo runtime or manifest inputs');const beforeMeta=outputBefore(root,unit.meta);
  const run=createRulePipeline([
   {phase:'language',rules:[{id:'native-bulk-unit:rediscover-compose-and-check-every-current-selected-source',apply:()=>{
    proposal=proposeOwnedNativeBulkSynchronization({runtimeRoot:unit.runtimeRoot,declarationRoot:unit.declarationRoot,vectorBindings:[],files:[...logicalInputs].map(([path,source])=>({path,source}))},{javascriptRoot:unit.javascriptRoot,typescriptRoot:unit.typescriptRoot});if(!proposal.modules.length||proposal.modules.length>256)vectorUnitFailure('a nonempty bounded complete native module source proposal is required; preserve refusals and extend source rules');return proposal;
   }}]},
   {phase:'repository',rules:[{id:'router:retain-one-physical-rust-js-ts-runtime-review-transaction',apply:value=>{
    const outputs=[],paths=new Set(),add=(path,before,after,kind)=>{relative(path);if(paths.has(path)||typeof after!=='string'||Buffer.byteLength(after)>FILE_LIMIT)vectorUnitFailure('distinct bounded complete bulk outputs required');paths.add(path);outputBaselines.set(path,before);retained+=(before===null?0:Buffer.byteLength(before))+Buffer.byteLength(after);if(retained>LIMIT)vectorUnitFailure('complete bulk source transaction byte budget');outputs.push({path,before,after,inverse:before,mode:before===null?0o644:lstatSync(join(root,path)).mode&0o777,kind});};
    for(const edit of value.nativeEdits){const path=layout.root==='.'?edit.path:layout.root+'/'+edit.path;if(physicalInputs.get(path)!==edit.before)vectorUnitFailure('composed physical native source baseline differs');add(path,edit.before,edit.after,'composed-native-source');}
    for(const edit of value.outputs){if(physicalInputs.has(edit.path)||outputBefore(root,edit.path)!==null||edit.before!==null)vectorUnitFailure('initial receiving targets must remain absent and distinct from inputs');add(edit.path,null,edit.after,'new-paired-source');}
    const directory=posix.dirname(unit.meta),prefix=directory==='.'?'':directory+'/',unitManifests=[],receivingPaths=new Set(value.outputs.map(row=>row.path));
    for(const module of value.modules){
     const javascript=module.bindings[0]?.javascriptPath,typescript=ownedCorePairedTypePath(javascript,receivingPaths,unit.runtimeRoot,unit.declarationRoot);if(!javascript||!typescript||module.bindings.some(row=>row.javascriptPath!==javascript))vectorUnitFailure('complete actual discovered module pair required');
     const path=prefix+'units/'+module.id+'.unit.json',meta=prefix+'units/'+module.id+'.review.json';for(const reserved of [path,meta]){if(physicalInputs.has(reserved)||paths.has(reserved)||outputBefore(root,reserved)!==null)vectorUnitFailure('generated synchronization manifests/reviews require distinct absent targets');physical(reserved,null);inputs.push({path:reserved,source:null});}
     const descriptor={schema:'router-owned-vector-unit-v1',id:module.id,authority:'JavaScript',javascript,typescript,nativeRoute:{rustPath:layout.root==='.'?module.rustSource:layout.root+'/'+module.rustSource,module:module.module},runtimeRoot:unit.runtimeRoot,declarationRoot:unit.declarationRoot,bindings:module.bindings.map(row=>({javascriptName:row.javascriptName,rustPath:layout.root==='.'?row.rustPath:layout.root+'/'+row.rustPath,rustName:row.rustName})),dependencies:[unit.runtimeRoot+'/primitive-operator-runtime.mjs',unit.declarationRoot+'/primitive-operator-runtime.d.mts'],meta};add(path,null,JSON.stringify(descriptor)+'\n','generated-source-unit-manifest');unitManifests.push(path);
    }
    const bulkPath=prefix+'native-bulk-sync.units.json',bulkMeta=prefix+'native-bulk-sync.review.json';for(const reserved of [bulkPath,bulkMeta]){if(physicalInputs.has(reserved)||paths.has(reserved)||outputBefore(root,reserved)!==null)vectorUnitFailure('generated bulk synchronization index/review targets must be distinct and absent');physical(reserved,null);inputs.push({path:reserved,source:null});}
    add(bulkPath,null,JSON.stringify({schema:'router-owned-vector-bulk-unit-v1',id:unit.id,authority:'JavaScript',units:unitManifests,meta:bulkMeta,nativeDiscovery:{javascriptRoot:unit.javascriptRoot,typescriptRoot:unit.typescriptRoot}})+'\n','generated-bulk-unit-manifest');
    for(const edit of runtimeOutputs)add(edit.path,null,edit.after,edit.kind);
    if(paths.has(unit.meta))vectorUnitFailure('review cannot overwrite a receiving/runtime target');const {sourceInputs,...review}=value,metadata=JSON.stringify({schema:BULK_NATIVE_SCHEMA,id:unit.id,authority:'Rust-initial-adoption',manifestSource,proposal:review,sourceAuthority:false,semanticAuthority:false,runtimeParity:false,wholeRouterSynchronization:false})+'\n';add(unit.meta,beforeMeta,metadata,'complete-bulk-source-review');
    for(const output of outputs)if(outputBefore(root,output.path)!==output.before)vectorUnitFailure('complete bulk output baseline changed');
    return {schema:BULK_NATIVE_SCHEMA,root,manifestPath,baseRevision:revision,manifestSource,units:value.modules.map(row=>({id:row.id,authority:'Rust-initial-adoption'})),inputs,outputs,refusals:value.refusals,retainedSourceBytes:retained,sourceAuthority:false,semanticAuthority:false,productionSelected:false,runtimeParity:false,wholeRouterSynchronization:false,crossInvocationCache:false,rustExecuted:false};
   }}]},
  ]).run(null);return {...run.value,trace:run.trace};
 }catch(error){primaryFailed=true;throw error;}finally{
  let failed=false,fenceError;const close=action=>{try{action();}catch(error){if(!failed){failed=true;fenceError=error;}}};close(()=>IO.rejoin(original));close(()=>cargo.verify());for(const [path,source]of physicalInputs)close(()=>{if(outputBefore(root,path)!==source)vectorUnitFailure('complete original bulk physical source changed');});for(const [path,source]of outputBaselines)close(()=>{if(outputBefore(root,path)!==source)vectorUnitFailure('complete bulk output baseline changed');});close(()=>{if(head(root)!==revision)vectorUnitFailure('bulk Git baseline changed');});physicalInputs.clear();logicalInputs.clear();outputBaselines.clear();proposal=null;if(!primaryFailed&&failed)throw fenceError;
 }
}
export function applyOwnedNativeBulkUnitSynchronization(serialized,options){return installFreshSourceProposal(serialized,()=>planOwnedNativeBulkUnitSynchronization(options));}
import {proposeOwnedNativeBulkSynchronization} from './js-to-rust/owned-native-bulk-composition.mjs';

import {ownedCorePairedTypePath} from './js-to-rust/owned-vector-module-pair.mjs';
