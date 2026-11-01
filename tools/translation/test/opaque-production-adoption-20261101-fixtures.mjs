// Independent copied WHOLE original native/source fixture SOURCE; all UNRUN.
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {withActualPolicySourceUniverse,policyOriginalPaths,policyOriginalSource,policyOriginalEntry} from '../policy-nominal-producer-20261101-corpus.mjs';
import {repositoryRustLayout} from '../repository-layout.mjs';
export const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
export function git(root,args,input){return execFileSync(process.platform==='win32'?'git':'/usr/bin/git',['-C',root,'--literal-pathspecs','-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false','-c','commit.gpgSign=false',...args],{input,encoding:'utf8',timeout:20000,maxBuffer:8388608,env:{...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:process.platform==='win32'?'NUL':'/dev/null',GIT_CONFIG_SYSTEM:process.platform==='win32'?'NUL':'/dev/null',GIT_AUTHOR_NAME:'Opaque source fixture',GIT_AUTHOR_EMAIL:'opaque@invalid',GIT_COMMITTER_NAME:'Opaque source fixture',GIT_COMMITTER_EMAIL:'opaque@invalid',GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'}});}
export function copiedNative(t,extras=[]){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-opaque-whole-native-'))),paths=[];t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const put=(path,source)=>{fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),source);paths.push(path);};
 withActualPolicySourceUniverse({root:ROOT},context=>{for(const path of policyOriginalPaths(context))put(path,policyOriginalSource(context,path));for(const path of repositoryRustLayout(ROOT).cargoInputs){const source=policyOriginalSource(context,path);if(source!==null)put(path,source);}if(!paths.includes(policyOriginalEntry(context)))throw Error('Whole original entry was not copied');});
 for(const row of extras)put(row.path,row.source);git(root,['init','--quiet']);git(root,['add','--sparse','--pathspec-from-file=-','--pathspec-file-nul'],paths.join('\0')+'\0');git(root,['commit','--quiet','--no-verify','-m','complete independent original opaque corpus']);return root;
}
export function exactThrown(run){let failed=false,primary;try{run();}catch(error){failed=true;primary=error;}if(!failed)throw Error('Expected exact independent refusal');return primary;}

// Only the independent receiving fixture installs the EXISTING complete scalar
// parent recipe. Production modules add no writer/installer or source override.
export async function copiedInstalledCompiler(t){
 const {exportPartitionedTranslatorBundle}=await import('../partitioned-export-bundle.mjs'),{visitJsonScalarReadersSourceEquations}=await import('../json-scalar-readers-20261101-profile.mjs'),parent=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-opaque-installed-scalar-'))),root=join(parent,'compiler');t.after(()=>fs.rmSync(parent,{recursive:true,force:true}));exportPartitionedTranslatorBundle({sourceRoot:ROOT,output:root});
 const put=(path,source)=>{fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),source);};
 withActualPolicySourceUniverse({root:ROOT},context=>{for(const path of policyOriginalPaths(context))put(path,policyOriginalSource(context,path));for(const path of repositoryRustLayout(ROOT).cargoInputs){const source=policyOriginalSource(context,path);if(source!==null)put(path,source);}});
 const projection=visitJsonScalarReadersSourceEquations(()=>null);for(const row of projection.substitutions){const before=projection.sources[row.physicalBeforeVersion],after=projection.sources[row.afterVersion];if(fs.readFileSync(join(root,row.path),'utf8')!==before)throw Error('Complete existing scalar parent preimage differs');put(row.path,after);}for(const row of [...projection.additions,...projection.resources])put(row.path,projection.sources[row.version]);
 git(root,['add','--sparse','--all']);git(root,['commit','--quiet','--no-verify','-m','independent complete scalar170 receiving parent']);return root;
}
export function inspectInstalledChild(root,preload=false){
 const program=(preload?`const {createRequire}=await import('node:module');createRequire(${JSON.stringify(join(ROOT,'js/package.json'))})('typescript');`:'')+`const {inspectOpaqueProductionAdoption}=await import('./tools/translation/opaque-production-adoption-20261101.mjs');const sources=new Set(),metadata=new Set(),stages=new Set(),attempts=[];let events=0;const result=inspectOpaqueProductionAdoption({root:process.cwd()},event=>{events++;if(event.kind==='complete-source-chunk'&&event.phase==='complete-original-corpus'&&event.role==='before')sources.add(event.path);if(event.role==='complete-original-project-metadata-field')metadata.add(event.path);if(event.kind==='actual-whole-candidate-stage-complete')stages.add(event.stage);if(event.kind==='actual-whole-project-attempt')attempts.push(event.phase);return {consumed:true};});process.stdout.write(JSON.stringify({result,events,sourceFiles:sources.size,metadataFields:metadata.size,completedStages:[...stages],attempts}));`;
 const env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_')&&!['NODE_OPTIONS','NODE_PATH'].includes(key))),ROUTER_NATIVE_TS_SOURCE_ROOT:ROOT};return JSON.parse(execFileSync(process.execPath,['--input-type=module','--eval',program],{cwd:root,env,encoding:'utf8',timeout:20000,maxBuffer:8388608}));
}
