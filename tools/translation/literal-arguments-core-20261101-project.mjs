// Portable owned domain through the complete combined copied compiler only.
import * as project from './project.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
import {types,isDeepStrictEqual} from 'node:util';
import {withLiteralArgumentsCoreInstalledSources} from './literal-arguments-core-20261101-profile.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from './json-macro-inputs.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {proposeForwardExpressionSynchronization} from './literal-arguments-core-20261101-inverse.mjs';
const fail=message=>{throw new TypeError('Literal arguments project: '+message);};
function requestData(value){
 accountData(value);const request=copyMetadata(value);
 if(!request||Object.keys(request).sort().join(',')!=='entry,files,lock,manifest'||typeof request.manifest!=='string'||typeof request.lock!=='string'||!Array.isArray(request.files)||!request.files.length||request.files.length>128)fail('exact complete bounded project request required');
 const paths=new Set();let bytes=0;for(const row of request.files){
  if(!row||Object.keys(row).sort().join(',')!=='path,source'||typeof row.path!=='string'||!row.path.endsWith('.rs')||row.path.length>4096||row.path.includes('\\')||row.path.includes('\0')||row.path.includes(':')||/[\r\n]/u.test(row.path)||row.path.startsWith('/')||row.path.split('/').some(part=>!part||part==='.'||part==='..')||paths.has(row.path.toLowerCase())||typeof row.source!=='string'||/\p{Surrogate}/u.test(row.source)||Buffer.byteLength(row.source)>2097152)fail('safe unique bounded complete Rust source required');paths.add(row.path.toLowerCase());bytes+=Buffer.byteLength(row.source);if(bytes>4194304)fail('complete project UTF8 source budget');
 }
 if(typeof request.entry!=='string'||!request.files.some(row=>row.path===request.entry))fail('actual complete root source required');return request;
}
function inputs(request){const dependencies={manifest:request.manifest,lock:request.lock},files=new Map(request.files.map(row=>[row.path,row.source]));return {entry:request.entry,paths:[...files.keys()],readSource:path=>{if(!files.has(path))fail('uncaptured original project source');return files.get(path);},cargoManifest:request.manifest,deriveDependencies:loadDeriveDependencyProof(dependencies),jsonMacroDependencies:loadJsonMacroSourceProof(dependencies),compilationProfile:PRODUCTION_PROFILE};}
export function compileLiteralArgumentsCoreProject(value){
 const request=requestData(value);return withLiteralArgumentsCoreInstalledSources(()=>{
  if(typeof project.translateProjectNominalLiteralArguments!=='function')fail('combined nominal/literal source profile is not installed');
  const result=project.translateProjectNominalLiteralArguments(inputs(request)),output={schema:'owned-literal-arguments-checked-project-v1',entry:request.entry,meta:result.meta,javascript:result.javascript,typescript:result.typescript,nominalCopyCollections:result.nominalCopyCollections,sources:request.files,targets:[],histories:[],sourceInstalled:true,originalProfileInstalled:false,ownedStaticPieces:true,zeroRuntimeArguments:true,counts:'fixed-u64',maxPieceUtf8Bytes:2097152,asStrSupported:false,stdArgumentsAbi:false,builtinOwnerResolved:false,langItemOwnerResolved:false,nativeSysrootConformance:false,actualInvocationObserved:false,unqualifiedFormatArgsEquivalent:false,productionOutputExecutable:false,runtimeParity:false,receivingExecuted:false};
  for(const row of request.files){const history=transportConcreteSourceEquations([{before:row.source,after:row.source,language:'Rust'}])[0];if(history.inverse!==row.source)fail('complete original native CST inverse differs');output.histories.push({path:row.path,...history});}
  for(const [language,source]of [['JavaScript',result.javascript],['TypeScript',result.typescript]]){const history=transportConcreteSourceEquations([{before:source,after:source,language}])[0];output.targets.push({language,source});output.histories.push(history);}
  accountData(output);return output;
 });
}
export function readLiteralArgumentsCoreMeta(value,meta){accountData(meta);const fresh=compileLiteralArgumentsCoreProject(value);if(!isDeepStrictEqual(fresh.meta,meta))fail('meta differs from complete fresh actual source reissue');return fresh;}
export function invertLiteralArgumentsCoreTarget(value,target){
 accountData(target);if(!target||types.isProxy(target)||Object.keys(target).sort().join(',')!=='language,source'||!['JavaScript','TypeScript'].includes(target.language)||typeof target.source!=='string')fail('one actual complete edited target required');const request=requestData(value);
 return withLiteralArgumentsCoreInstalledSources(()=>{
  const key=target.language==='JavaScript'?'javascript':'typescript',proposal=proposeForwardExpressionSynchronization({...inputs(request),[key]:target.source});
  const sources=new Map(request.files.map(row=>[row.path,row.source]));for(const edit of proposal.rustEdits){if(sources.get(edit.path)!==edit.before)fail('inverse differs from complete actual native source');sources.set(edit.path,edit.after);}
  const changed={...request,files:[...sources].map(([path,source])=>({path,source}))},fresh=compileLiteralArgumentsCoreProject(changed);
  if(fresh[key]!==proposal[key])fail('fresh whole native project differs from inverse canonical target');
  const output={schema:'owned-literal-arguments-edited-native-inverse-v1',proposal,changedRequest:changed,checkedChangedProject:fresh,originalMacroOrigin:'actual-owned-literal-arguments-facade',sourceInstalled:true,editedOwnedLiteralInverse:true,stdArgumentsAbi:false,builtinOwnerResolved:false,nativeSysrootConformance:false,unqualifiedFormatArgsEquivalent:false,productionOutputExecutable:false,receivingExecuted:false};accountData(output);return output;
 });
}
