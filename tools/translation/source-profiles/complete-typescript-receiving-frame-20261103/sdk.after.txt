// Full standalone installed SDK source DATA. No SDK load, install or compiler permit.
import {mkdirSync,lstatSync,realpathSync,rmdirSync} from 'node:fs';
import {resolve,dirname,basename,join,sep} from 'node:path';
import {types} from 'node:util';
import {exportCompactInstalledTypeScriptVault} from './compact-typescript-source-vault-20261102.mjs';
import {readCompactSourceVaultDirectory} from './compact-source-vault-store-20261102.mjs';
import {inspectCompactSourceVault,withCompactSourceVault} from './compact-source-vault-20261102.mjs';
import {materializeCompactSourceSelection} from './compact-source-materialization-20261102.mjs';
import {compactSparsePhysicalCensus,recloseCompactSparsePhysicalCensus,releaseCompactSparsePhysicalCensus,readCompactSparsePhysicalFile,sameCompactPhysicalSourceStamp} from './compact-sparse-git-io-20261102.mjs';
import {withProtectedNativeWriter,mutateProtectedNativeAbsoluteEntries,verifyProtectedNativeWriter,protectedNativeWriterRetainedBytes} from './protected-native-writers-20261102.mjs';
import {ownSourceFailureField} from './source-error-fields-20261102.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation,withSourceFailureOperation} from './source-failure-operations.mjs';
export const COMPLETE_TYPESCRIPT_RECEIVING_SOURCE_LIMITS=Object.freeze({rawBytes:67108864,files:8192,aggregateBytes:201326592,deadlineMs:60000});
const L=COMPLETE_TYPESCRIPT_RECEIVING_SOURCE_LIMITS,PREFIX='js/node_modules/typescript/';
const fail=message=>{throw TypeError('Complete TypeScript receiving source DATA: '+message);};
const sameIdentity=(a,b)=>a.dev===b.dev&&a.ino===b.ino&&a.mode===b.mode&&a.uid===b.uid&&a.gid===b.gid;
/** Output is an entirely fresh separate tree, never an existing node_modules.
 * The existing exporter closes original installed inputs as one complete snapshot.
 * Materialization subsequently consumes only that independently retained DATA.
 * A receiver must load and qualify its copied SDK afresh; no token is transferred.
 */
export function produceCompleteTypeScriptReceivingSourcePackage(input={}){
 if(!input||typeof input!=='object'||types.isProxy(input)||Object.getPrototypeOf(input)!==Object.prototype)fail('ordinary own source/destination DATA required');
 const sourceField=Object.getOwnPropertyDescriptor(input,'sourceRoot'),destinationField=Object.getOwnPropertyDescriptor(input,'destination');
 if(!sourceField||!destinationField||!Object.hasOwn(sourceField,'value')||!Object.hasOwn(destinationField,'value'))fail('own source/destination data fields required');
 const sourceRoot=sourceField.value,destination=destinationField.value;
 if(typeof sourceRoot!=='string'||typeof destination!=='string'||!destination)fail('explicit original root and fresh destination required');
 return withSourceFailureOperation(()=>{
  const root=realpathSync(resolve(sourceRoot)),requested=resolve(destination),container=join(realpathSync(dirname(requested)),basename(requested));
  if(container===root||container.startsWith(root+sep)||root.startsWith(container+sep))fail('separate fresh SDK container required');
  try{lstatSync(container);fail('SDK source container already exists');}catch(error){if(ownSourceFailureField(error,'code')!=='ENOENT')throw error;}
  const start=Date.now();
  return withCompleteSourceClosingFence(()=>withProtectedNativeWriter(root,()=>mutateProtectedNativeAbsoluteEntries(root,[container],captured=>{
  if(captured.length!==1||captured[0].canonicalTarget!==container)fail('actual canonical fresh SDK destination differs');
  const policyRetainedBytes=protectedNativeWriterRetainedBytes(root);let created=null,vaultCensus=null,rawCensus=null,model=null;
  const withinDeadline=()=>{if(Date.now()-start>L.deadlineMs)fail('complete SDK source operation deadline exceeded');};
  const policyCurrent=()=>withSourceInputValidation(()=>{verifyProtectedNativeWriter(root);withinDeadline();});
  const capacity=()=>{withinDeadline();if(created&&compactSparsePhysicalCensus(container,{maximum:L.aggregateBytes}).total>L.aggregateBytes)fail('complete SDK source aggregate exceeds declared192MiB profile');};
  const rawCurrent=()=>{
   const namespace=()=>{const actual=compactSparsePhysicalCensus(rawCensus.root,{maximum:L.rawBytes});if(JSON.stringify(actual.files.map(row=>row.name))!==JSON.stringify(rawCensus.files.map(row=>row.name))||JSON.stringify(actual.directories.map(row=>row.name))!==JSON.stringify(rawCensus.directories.map(row=>row.name)))fail('complete raw SDK namespace differs');for(let at=0;at<rawCensus.directories.length;at++)if(!sameCompactPhysicalSourceStamp(rawCensus.directories[at].stat,actual.directories[at].stat))fail('complete raw SDK directory identity differs');};
   return withCompleteSourceClosingFence(()=>withCompactSourceVault(model,reader=>{
    let failed=false,primary;for(const row of rawCensus.files)try{if(!readCompactSparsePhysicalFile(row).equals(reader.read(row.name)))fail('complete raw SDK source bytes differ');}catch(error){if(!failed){failed=true;primary=error;}}if(failed)throw primary;return null;
   }),[namespace]);
  };
  const sourcesCurrent=()=>withSourceInputValidation(()=>{
   const checks=[capacity];if(vaultCensus)checks.push(()=>recloseCompactSparsePhysicalCensus(vaultCensus));if(rawCensus)checks.push(rawCurrent);
   return withCompleteSourceClosingFence(()=>null,checks);
  });
  try{return withCompleteSourceClosingFence(()=>{
   policyCurrent();
   if(!Number.isSafeInteger(policyRetainedBytes)||policyRetainedBytes<0||policyRetainedBytes>L.rawBytes)fail('complete source policy retention exceeds original raw domain');
   // One admission protects the complete private fresh subtree. Every child is
   // subsequently created by existing no-follow/exclusive source writers.
   // Existing output roots, linked trees and protected descendant entries refuse.
   mkdirSync(container,{mode:0o700});created=lstatSync(container,{bigint:true});policyCurrent();
   const vault=join(container,'vault'),exported=exportCompactInstalledTypeScriptVault({sourceRoot:root,output:vault});policyCurrent();
   vaultCensus=compactSparsePhysicalCensus(vault,{retainBytes:true,maximum:L.aggregateBytes});capacity();
   model=readCompactSourceVaultDirectory(vault);sourcesCurrent();
   const rows=inspectCompactSourceVault(model).metadata.files,selectedPaths=rows.map(row=>row.path);
   const allowed=path=>path.startsWith(PREFIX)||['js/package.json','js/package-lock.json','translator-export/typescript-source-receipt.json'].includes(path);
   if(!rows.length||rows.length>L.files||new Set(selectedPaths).size!==rows.length||rows.some(row=>!allowed(row.path))||rows.reduce((sum,row)=>sum+row.bytes,0)+policyRetainedBytes>L.rawBytes)fail('complete SDK source selection or original64MiB raw-plus-policy bound differs');
   const original=withCompactSourceVault(model,reader=>JSON.parse(reader.read('translator-export/typescript-source-receipt.json').toString('utf8')));
   const actualPackage=selectedPaths.filter(path=>path.startsWith(PREFIX)).map(path=>path.slice(PREFIX.length)).sort();
   if(original.schema!=='complete-installed-typescript-source-data-v1'||original.version!=='5.9.3'||!Array.isArray(original.installedFiles)||JSON.stringify(original.installedFiles.slice().sort())!==JSON.stringify(actualPackage))fail('complete SDK original package census differs');
   const materialized=materializeCompactSourceSelection({model,output:join(container,'sdk'),selectedPaths});
   rawCensus=compactSparsePhysicalCensus(materialized.root,{maximum:L.rawBytes});policyCurrent();sourcesCurrent();
   return {schema:'complete-typescript-receiving-source-package-20261103-v1',container,root:materialized.root,nativeTypeScriptSourceRoot:materialized.root,
    vault,files:materialized.files,rawBytes:materialized.rawBytes,packageFiles:actualPackage,packageVersion:'5.9.3',lockIntegrity:exported.lockIntegrity,
    originalInstalledSnapshotClosed:true,completeInstalledPackage:true,tarballIntegrityVerified:false,policyRetainedBytes,
    aggregateProfile:'standalone-sdk-source-192MiB-v1',legacyVaultAndRawLimitsUnchanged:true,
    sourceAuthority:false,semanticAuthority:false,compilerExecuted:false,compilerQualified:false,receivingQualified:false,verification:'UNRUN'};
  },[policyCurrent,sourcesCurrent]);}
  finally{
   releaseCompactSparsePhysicalCensus(vaultCensus);releaseCompactSparsePhysicalCensus(rawCensus);
   if(model){model.volumes.length=0;model.metadata.files.length=0;model.metadata.objects.length=0;}
   // Existing materializers own partial-file cleanup. Never remove an unknown
   // or changed subtree; only our still-identical empty outer directory can go.
   if(created)try{const next=lstatSync(container,{bigint:true});if(next.isDirectory()&&!next.isSymbolicLink()&&sameIdentity(created,next))rmdirSync(container);}catch{}
  }
  })),[()=>{if(Date.now()-start>L.deadlineMs)fail('complete SDK source operation deadline exceeded');}]);
 });
}
