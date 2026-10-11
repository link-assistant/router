import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createCompilationMatrix,compilationMatrixDescription,profileRelativePath,DECLARED_FAMILY_PROFILES} from '../compilation-matrix.mjs';
import {analyzeCompilationMatrix,PROFILE_GRAPH_LIMITS} from '../profile-graph-evidence.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const matrix=()=>createCompilationMatrix({profiles:DECLARED_FAMILY_PROFILES});
const analyze=(files,options={})=>analyzeCompilationMatrix({matrix:matrix(),entries:['src/lib.rs'],paths:Object.keys(files),readSource:path=>files[path],...options});
const result=(evidence,name)=>evidence.results.find(result=>result.profile===name);
const rootScope=result=>result.bindingEvidence.scopes.find(scope=>scope.path.length===0);

test('explicit profiles normalize deterministically and remain immutable without host selection',()=>{
  const original=matrix(),reordered=createCompilationMatrix({profiles:[...DECLARED_FAMILY_PROFILES].reverse()});
  assert.deepEqual(original,reordered);assert.equal(original.platformDomainComplete,false);assert.equal(original.runtimeParity,false);
  assert.deepEqual(original.requiredProfiles,['neutral','unix-family','windows-family']);
  assert.deepEqual(original.profiles.find(profile=>profile.name==='neutral').compilationProfile.flags,{test:false});
  for(const member of original.profiles){assert.ok(Object.isFrozen(member.compilationProfile.flags));assert.equal(member.compilationProfile.flags.debug_assertions,undefined);assert.equal(member.compilationProfile.values.target_os,undefined);assert.deepEqual(member.compilationProfile.closedKeys,[]);}
  assert.throws(()=>{original.profiles[0].compilationProfile.flags.unix=true;},TypeError);
  assert.throws(()=>compilationMatrixDescription({...original}),/original explicit compilation matrix/);
});

test('reserved neutral identity, duplicate names, digests and incomplete required lists refuse',()=>{
  for(const profiles of [
    DECLARED_FAMILY_PROFILES.filter(profile=>profile.name!=='neutral'),
    [...DECLARED_FAMILY_PROFILES,{name:'neutral',compilationProfile:{flags:{test:false}}}],
    [{name:'neutral',compilationProfile:{flags:{test:false,unix:true}}}],
    [...DECLARED_FAMILY_PROFILES,{name:'other',compilationProfile:{flags:{test:false}}}],
    [...DECLARED_FAMILY_PROFILES,{name:'runtime',compilationProfile:{flags:{test:false,custom:true}}}],
    [...DECLARED_FAMILY_PROFILES,{name:'Unix-family',compilationProfile:{flags:{test:false,custom:true}}}],
    [...DECLARED_FAMILY_PROFILES,{name:'../escape',compilationProfile:{flags:{test:false,custom:true}}}],
    [{name:'neutral',compilationProfile:{flags:{test:false}}},{name:'unix-family',compilationProfile:{flags:{test:false,unix:false,windows:true}}}],
  ])assert.throws(()=>createCompilationMatrix({profiles}),TypeError);
  for(const requiredProfiles of [[],['unix-family'],['neutral','neutral'],['neutral','unknown']])assert.throws(()=>createCompilationMatrix({profiles:DECLARED_FAMILY_PROFILES,requiredProfiles}),TypeError);
});

test('output paths and context identifiers cannot concatenate distinct profiles',()=>{
  const selected=matrix(),outputs=selected.profiles.map(member=>profileRelativePath(selected,member.name,'src/lib.graph-evidence.json'));
  assert.equal(new Set(outputs).size,3);assert.ok(outputs.every(path=>path.startsWith('profiles/')));
  for(const path of ['/tmp/output','../output','src/../output','src//output','src\\output','src:output',''])assert.throws(()=>profileRelativePath(selected,'neutral',path),TypeError);
  assert.throws(()=>profileRelativePath(selected,'missing','src/lib.json'),TypeError);
  assert.throws(()=>analyzeCompilationMatrix({matrix:{...selected},entries:[],paths:[],readSource:()=>''}),/original explicit compilation matrix/);
});

test('profile selection rejects member accessors and proxies without calling them',()=>{
  let reads=0;
  const member=Object.defineProperty({compilationProfile:{flags:{test:false}}},'name',{enumerable:true,get(){reads++;return 'neutral';}});
  assert.throws(()=>createCompilationMatrix({profiles:[member]}),/data descriptors/);
  const proxy=new Proxy({name:'neutral',compilationProfile:{flags:{test:false}}},{ownKeys(){reads++;return [];},getPrototypeOf(){reads++;return Object.prototype;},get(){reads++;return undefined;}});
  assert.throws(()=>createCompilationMatrix({profiles:[proxy]}),/descriptor-only records/);
  const members=[];Object.defineProperty(members,'0',{enumerable:true,get(){reads++;return DECLARED_FAMILY_PROFILES[0];}});
  assert.throws(()=>createCompilationMatrix({profiles:members}),/dense data descriptors/);
  const selection=Object.defineProperty({},'profiles',{enumerable:true,get(){reads++;return DECLARED_FAMILY_PROFILES;}});
  assert.throws(()=>createCompilationMatrix(selection),/data descriptors/);
  assert.equal(reads,0);
});

test('namespace composition sees an immutable complete graph and cannot change source identities',()=>{
  const files={'src/lib.rs':'pub fn common()->u8{7}'};
  for(const mutate of [
    graph=>{graph.entry='src/other.rs';},
    graph=>{graph.modules[0].path.push('other');},
    graph=>{graph.modules[0].source='pub fn changed()->u8{9}';},
    graph=>{graph.modules[0].items[0].name='changed';},
    graph=>{graph.compilationProfile.flags.unix=true;},
    graph=>{graph.modules[0].configurationCondition='inactive';},
  ])assert.throws(()=>analyze(files,{namespaceOptionsForGraph:graph=>{mutate(graph);return {};}}),TypeError);
  const unchanged=analyze(files,{namespaceOptionsForGraph:graph=>{assert.ok(Object.isFrozen(graph));assert.ok(Object.isFrozen(graph.modules[0].allItems[0].tokens));assert.equal(graph.modules[0].source,files['src/lib.rs']);return {};}});
  assert.equal(unchanged.results.length,3);
});

test('path entry and original byte budgets stop reads at the first exceeded bound',()=>{
  const selected=matrix();let reads=0;
  const readSource=()=>{reads++;return '';};
  assert.throws(()=>analyzeCompilationMatrix({matrix:selected,paths:Array.from({length:PROFILE_GRAPH_LIMITS.trackedPaths+1},(_,index)=>`src/file${index}.rs`),entries:['src/file0.rs'],readSource}),/tracked path budget/);assert.equal(reads,0);
  const paths=Array.from({length:PROFILE_GRAPH_LIMITS.entries+1},(_,index)=>`src/file${index}.rs`);
  assert.throws(()=>analyzeCompilationMatrix({matrix:selected,paths,entries:paths,readSource}),/entry budget/);assert.equal(reads,0);
  assert.throws(()=>analyzeCompilationMatrix({matrix:selected,paths:['src/lib.rs','src/z.rs'],entries:['src/lib.rs'],readSource:()=>{reads++;return 'é'.repeat(PROFILE_GRAPH_LIMITS.sourceBytes/2+1);}}),/original source byte budget/);assert.equal(reads,1);
  reads=0;const many=Array.from({length:10},(_,index)=>`src/file${index}.rs`),source=' '.repeat(PROFILE_GRAPH_LIMITS.sourceBytes);
  assert.throws(()=>analyzeCompilationMatrix({matrix:selected,paths:many,entries:[many[0]],readSource:()=>{reads++;return source;}}),/total original source byte budget/);assert.equal(reads,9,'the following file is not read after total bytes exceed 64 MiB');
});

test('conditional macro exports shadow only their own profile and unknown neutral remains open',()=>{
  let reads=0;
  const files={'src/lib.rs':'#[cfg(unix)] mod unix_only; pub fn common()->u8{7}', 'src/unix_only.rs':'#[macro_export] macro_rules! format {()=>{7u8}}'};
  const evidence=analyze(files,{readSource:path=>{reads++;return files[path];}});assert.equal(reads,2);
  const unix=result(evidence,'unix-family'),windows=result(evidence,'windows-family'),neutral=result(evidence,'neutral');
  const binding=rootScope(unix).bindings.find(binding=>binding.namespace==='macro'&&binding.name==='format');assert.deepEqual(binding.target,['crate','format']);assert.equal(binding.source,'src/unix_only.rs');
  assert.equal(rootScope(windows).bindings.some(binding=>binding.namespace==='macro'&&binding.name==='format'),false);assert.equal(rootScope(windows).unresolvedBangMacroScope,false);
  assert.equal(rootScope(neutral).unresolvedBangMacroScope,true);assert.ok(neutral.moduleDiagnostics.some(item=>item.module?.includes('unix_only')));
  assert.equal(unix.modules.some(module=>module.source==='src/unix_only.rs'),true);assert.equal(windows.modules.some(module=>module.source==='src/unix_only.rs'),false);
  assert.equal(evidence.sources.length,2,'inactive source bytes remain inventoried');assert.equal(new Set(evidence.results.map(result=>result.contextSha256)).size,3);
  assert.equal(evidence.commonExecutableOutput,false);assert.equal(evidence.executableAdmission,false);assert.ok(evidence.obligations.some(item=>item.kind==='profile-domain-incomplete'));
  for(const member of evidence.results)for(const scope of member.sourceScopes){assert.equal(scope.profile,member.profile);assert.equal(scope.profileSha256,member.profileSha256);assert.equal(scope.contextSha256,member.contextSha256);assert.deepEqual(scope.compilationProfile,member.compilationProfile);}
});

test('unknown OS, feature and cfg_attr evidence stays open in explicit family profiles',()=>{
  for(const source of ['#[cfg(target_os="linux")] mod configured;','#[cfg(feature="extra")] mod configured;','#[cfg_attr(target_os="linux",derive(Custom))] mod configured;']){
    const evidence=analyze({'src/lib.rs':source,'src/configured.rs':'pub struct Plain;'});
    for(const member of evidence.results){assert.equal(rootScope(member).unresolvedBangMacroScope,true);assert.ok(member.moduleDiagnostics.length);assert.equal(member.namespaceComposition,'tracked-only-external-and-expansion-proofs-absent');}
  }
});

test('source and namespace changes invalidate context keys instead of reusing profile aliases',()=>{
  const files={'src/lib.rs':'use external::Known;pub fn common()->u8{7}'};
  const missing=analyze(files),registered=analyze(files,{namespaceOptionsForGraph:()=>({externalModules:new Map([['external',{complete:true,bindings:[{name:'Known',namespace:'type',target:['external','Known'],kind:'struct'}]}]])})});
  for(const member of missing.results){const changed=result(registered,member.profile);assert.notEqual(member.namespaceSha256,changed.namespaceSha256);assert.notEqual(member.contextSha256,changed.contextSha256);assert.equal(member.profileSha256,changed.profileSha256);}
  const modified=analyze({'src/lib.rs':files['src/lib.rs'].replace('7','8')});assert.notEqual(missing.sourceSetSha256,modified.sourceSetSha256);
  assert.throws(()=>analyze(files,{namespaceOptionsForGraph:()=>({compilationProfile:{flags:{unix:true}}})}),/cannot replace the matrix graph or profile/);
});

test('whole original Unix module declaration and both full sources remain pinned as analysis evidence',()=>{
  const pins=JSON.parse(readFileSync(new URL('./fixtures/configuration-frontier.json',import.meta.url),'utf8'));
  const files=Object.fromEntries(pins.sources.map(pin=>{const source=readFileSync(new URL('../../../'+pin.path,import.meta.url),'utf8');assert.equal(hash(source),pin.sha256);return [pin.path,source];}));
  const declaration=files['src/lib.rs'].slice(pins.declaration.span.start,pins.declaration.span.end);assert.equal(declaration,pins.declaration.text);assert.equal(hash(declaration),pins.declaration.sha256);
  // This bounded original pair intentionally leaves other crate modules
  // unprovided; all missing-module obligations stay visible in every profile.
  const evidence=analyze(files);assert.equal(evidence.sources.length,2);
  for(const member of evidence.results){assert.ok(member.moduleDiagnostics.some(item=>item.kind==='module'&&item.message.includes('missing tracked module file')));assert.equal(member.runtimeParity,false);}
  assert.equal(result(evidence,'unix-family').modules.some(module=>module.source==='src/unix_listener.rs'),true);
  assert.equal(result(evidence,'windows-family').modules.some(module=>module.source==='src/unix_listener.rs'),false);
});
