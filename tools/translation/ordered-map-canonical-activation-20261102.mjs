// Source-state routing and operational closure only. Never a compiler permit.
import fs from 'node:fs';import {matchesExactSourceEpoch} from './exact-source-compiler-epochs-20261103.mjs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {withCanonicalMapCompilerCohort} from './ordered-map-canonical-cohort-20261102.mjs';
import {orderedTextMapCallerParentSourceData,ORDERED_TEXT_MAP_CALLER_PARENT_PATHS} from './ordered-text-map-callers-20261102-profile.mjs';
import {orderedTextMapCanonicalParentSourceData} from './ordered-text-map-canonical-20261102-profile.mjs';import {orderedTextMapUnitParentSourceData} from './ordered-text-map-callers-20261102-unit-profile.mjs';
import {readCompactSparsePhysicalFile} from './compact-sparse-git-io-20261102.mjs';
import {requireSynchronousSourceCallback} from './complete-source-closing-fence.mjs';
import {types} from 'node:util';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const CANONICAL=['tools/translation/js-to-rust/owned-core-source.mjs','tools/translation/js-to-rust/owned-core-operations.mjs','tools/translation/js-to-rust/owned-core-corpus.mjs'];
const identity=stat=>[stat.dev,stat.ino,stat.mode,stat.uid,stat.gid].map(String).join(':');
const fail=message=>{throw TypeError('Canonical map source activation: '+message);};
function capture(sourceRoot){
 const root=fs.realpathSync(resolve(sourceRoot)),files=[],directories=new Map();let retained=0,closed=false;
 function parent(path){
  const stat=fs.lstatSync(path,{bigint:true});if(!stat.isDirectory()||stat.isSymbolicLink())fail('ordinary selected compiler ancestor required');
  const stamp=identity(stat),prior=directories.get(path);if(prior&&prior!==stamp)fail('selected compiler ancestor changed during capture');directories.set(path,stamp);
 }
 const close=()=>{
  if(closed)fail('operational source scope expired');let failed=false,primary;
  const check=operation=>{try{operation();}catch(error){if(!failed){failed=true;primary=error;}}};
  for(const row of files)check(()=>{if(!readCompactSparsePhysicalFile(row).equals(row.raw))fail('actual compiler source changed or was restored');});
  for(const [path,stamp]of directories)check(()=>{const stat=fs.lstatSync(path,{bigint:true});if(!stat.isDirectory()||stat.isSymbolicLink()||identity(stat)!==stamp)fail('compiler ancestor identity changed');});
  if(failed)throw primary;
 };
 let failed=false,primary,result;
 try{
  const units=orderedTextMapUnitParentSourceData(),rows=[...orderedTextMapCallerParentSourceData(),...orderedTextMapCanonicalParentSourceData(),...units],unitPaths=new Set(units.map(row=>row.path)),expected=new Set([...ORDERED_TEXT_MAP_CALLER_PARENT_PATHS,...CANONICAL,...unitPaths]);
  if(units.length!==12||unitPaths.size!==12||rows.length!==29||expected.size!==29||new Set(rows.map(row=>row.path)).size!==29)fail('all twenty-nine exact source equations required');
  let before=true,after=true,unitBefore=true,unitAfter=true;parent(root);
  for(const row of rows){
   if(!expected.has(row.path)||typeof row.before!=='string'||typeof row.after!=='string'||row.inverse!==row.before)fail('complete fixed source equation required');
   let current=root;for(const part of row.path.split('/').slice(0,-1)){current=join(current,part);parent(current);}
   const path=join(root,row.path),stat=fs.lstatSync(path,{bigint:true});if(!stat.isFile()||stat.isSymbolicLink()||stat.size>4194304n)fail('bounded ordinary compiler source required');
   const file={path,stat},raw=readCompactSparsePhysicalFile(file);retained+=raw.length;if(retained>16777216)fail('existing sixteen-MiB selected compiler source budget');
   files.push({...file,raw});if(unitPaths.has(row.path)){unitBefore&&=raw.equals(Buffer.from(row.before));unitAfter&&=raw.equals(Buffer.from(row.after));}else{before&&=raw.equals(Buffer.from(row.before));after&&=raw.equals(Buffer.from(row.after))||matchesExactSourceEpoch(row,raw.toString('utf8'),{root,retainedBytes:retained});}
  }
  if((!before&&!after)||(!unitBefore&&!unitAfter)||before&&unitAfter)fail('mixed or unknown compiler epoch; complete source-author integration required');
  result={root,installed:after&&unitAfter,verify:close,dispose(){closed=true;for(const row of files)row.raw=null;files.length=0;directories.clear();}};
 }catch(error){failed=true;primary=error;}
 try{close();}catch(error){if(!failed){failed=true;primary=error;}}
 if(failed){closed=true;for(const row of files)row.raw=null;directories.clear();throw primary;}return result;
}
export function withCurrentCanonicalMapCompiler({sourceRoot=ROOT,deadline}={},operation){
 requireSynchronousSourceCallback(operation);const source=capture(sourceRoot);let failed=false,primary,result;
 try{
  if(source.installed){
   // Current original imports retain their own complete private checks. This
   // DATA selection supplies none of their parser/type/source/body receipts.
   result=operation(null,{root:source.root,sourceRoot:source.root,installedSource:true,sourceAuthority:false,semanticAuthority:false});
  }else result=withCanonicalMapCompilerCohort({sourceRoot:source.root,deadline},operation);
  if(types.isPromise(result)||types.isProxy(result)||result!==null&&['object','function'].includes(typeof result)&&Reflect.has(result,'then'))fail('operation must complete synchronously');
 }catch(error){failed=true;primary=error;}
 try{source.verify();}catch(error){if(!failed){failed=true;primary=error;}else try{process.stderr.write('{"schema":"canonical-map-activation-closing-20261102","closingFailed":true}\n');}catch{}}
 finally{source.dispose();}
 if(failed)throw primary;return result;
}
