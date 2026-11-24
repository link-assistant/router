// Actual complete repository corpus, original opaque issuer and ORIGINAL
// source domains. No fragment/type/owner registration API is added.
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {captureSourceCorpus,sourceCorpusPaths,sourceCorpusText,SOURCE_CORPUS_LIMITS} from './source-corpus.mjs';
import {repositoryRustLayout} from './repository-layout.mjs';
import {withBoundedTrackedSourceOperation} from './forward-output-ownership-20261101-bounded-bytes.mjs';
import {withSourceInputValidation,withSourceFailureOperation} from './source-failure-operations.mjs';
import {requireSynchronousSourceCallback,withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const actualRoot=resolve(fileURLToPath(new URL('../../',import.meta.url))),fail=message=>{throw new TypeError('Actual policy source universe: '+message);};
let active=null;
function trackedRustPaths(root){
 const nil=process.platform==='win32'?'NUL':'/dev/null',env={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:nil,GIT_CONFIG_SYSTEM:nil,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_PAGER:'cat'};
 return execFileSync(process.platform==='win32'?'git':'/usr/bin/git',['-C',root,'-c','core.hooksPath='+nil,'-c','gc.auto=0','-c','maintenance.auto=false','-c','core.fsmonitor=false','-c','core.untrackedCache=false','ls-files','-z','--','*.rs'],{cwd:root,encoding:'utf8',timeout:20000,maxBuffer:1048576,env});
}
function state(token){if(!active||active.token!==token)fail('source context is foreign or no longer active');return active;}
export function withActualPolicySourceUniverse(configuration,run){
 requireSynchronousSourceCallback(run);accountData(configuration);if(!configuration||typeof configuration!=='object'||Object.keys(configuration).some(key=>!['root','entry','readBudgetBytes'].includes(key))||Array.isArray(configuration)||Object.hasOwn(configuration,'root')&&(typeof configuration.root!=='string'||configuration.root.length>4096||configuration.root.includes(String.fromCharCode(0)))||Object.hasOwn(configuration,'entry')&&typeof configuration.entry!=='string'||Object.hasOwn(configuration,'readBudgetBytes')&&(!Number.isSafeInteger(configuration.readBudgetBytes)||configuration.readBudgetBytes<0||configuration.readBudgetBytes>SOURCE_CORPUS_LIMITS.totalSourceBytes+3*SOURCE_CORPUS_LIMITS.cargoBytes)||active)fail('one synchronous complete original repository source operation required');
 const readBudgetBytes=Object.hasOwn(configuration,'readBudgetBytes')?configuration.readBudgetBytes:SOURCE_CORPUS_LIMITS.totalSourceBytes+3*SOURCE_CORPUS_LIMITS.cargoBytes,root=resolve(Object.hasOwn(configuration,'root')?configuration.root:actualRoot),layout=repositoryRustLayout(root),entry=Object.hasOwn(configuration,'entry')?configuration.entry:layout.entries[0];if(entry!==layout.entries[0])fail('only the actual original complete library entry is this producer domain');
 return withSourceFailureOperation(()=>withBoundedTrackedSourceOperation(root,()=>{
  const inventory=withSourceInputValidation(()=>trackedRustPaths(root)),paths=inventory.split('\0').filter(Boolean);withSourceInputValidation(()=>{if(!paths.length||paths.length>SOURCE_CORPUS_LIMITS.trackedPaths)fail('original complete tracked source count required');});
  const corpus=withSourceInputValidation(()=>captureSourceCorpus({root,paths})),captured=sourceCorpusPaths(corpus,root),required=[layout.entries[0],layout.productionPrefix+'clients.rs',layout.productionPrefix+'subscription.rs',layout.productionPrefix+'subscription/types.rs',layout.productionPrefix+'client_policy.rs'];
  withSourceInputValidation(()=>{if(required.some(path=>!captured.includes(path)))fail('complete actual original lib/clients/subscription/reexport/client_policy inputs are absent');});
  // Original source and Cargo are retained by the actual old private corpus
  // issuer. The shared physical frame remains live through compile+visitors.
  const token=Object.freeze({schema:'active-complete-policy-source-context-v1'}),frame={token,root,layout,entry,corpus,readBudgetBytes,paths:Object.freeze(captured)};active=frame;
  return withCompleteSourceClosingFence(()=>run(token),[()=>{const current=withSourceInputValidation(()=>trackedRustPaths(root));if(current!==inventory)fail('complete original tracked source census changed');},()=>{active=null;}]);
 },{limits:{paths:SOURCE_CORPUS_LIMITS.trackedPaths+3,bytes:readBudgetBytes}}));
}
export function policyOriginalSource(token,path){return withSourceInputValidation(()=>{const current=state(token);return sourceCorpusText(current.corpus,current.root,path);});}
export function policyOriginalPaths(token){return [...state(token).paths];}
export function policyOriginalEntry(token){return state(token).entry;}
export function policyOriginalCargo(token){
 const current=state(token),read=path=>policyOriginalSource(token,path),manifest=read(current.layout.manifest),lock=read(current.layout.lock);if(typeof manifest!=='string'||typeof lock!=='string')fail('actual complete manifest+lock dependency inputs required');return {manifest,lock,manifestPath:current.layout.manifest};
}
export function policyOriginalDescription(token){
 const current=state(token),result={schema:'complete-actual-policy-source-description-v1',root:current.root,entry:current.entry,sources:current.corpus.sources,cargo:current.corpus.cargo,totalSourceBytes:current.corpus.totalSourceBytes,limits:SOURCE_CORPUS_LIMITS,physicalReadBudgetBytes:current.readBudgetBytes,readOnlyDependencyRoot:true,originalIssuerRetained:true,sourceAuthority:false,semanticAuthority:false,productionPolicyMethodsAdmitted:false};accountData(result);return result;
}
