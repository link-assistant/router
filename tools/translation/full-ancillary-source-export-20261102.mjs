// Additive fixed compiler-directory DATA export. No dependency/checker verdict.
// Original compact exporter limits, file checks and closing fences are retained.
import {execFileSync} from 'node:child_process';
import {realpathSync} from 'node:fs';
import {resolve} from 'node:path';
import {types} from 'node:util';
import {exportCompactCommittedSourceVault} from './compact-committed-source-vault-20261102.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation} from './source-failure-operations.mjs';
const EXCLUDED=new Set(['test','fixtures','meta','projects','generated','source-profiles']);
const LIMIT=16384,PREFIX='tools/translation/';
const fail=message=>{throw TypeError('Full ancillary compiler source export: '+message);};
function path(name){if(typeof name!=='string'||!name||name.length>4096||name.startsWith('/')||/[\x00-\x1f\x7f\\:]/u.test(name)||/\p{Surrogate}/u.test(name)||name.split('/').some(part=>!part||part==='.'||part==='..'))fail('ordinary repository-relative source path required');return name;}
export function isFullAncillaryCompilerSourcePath(name){
 path(name);if(!name.startsWith(PREFIX))return false;
 return !name.slice(PREFIX.length).split('/').some(part=>EXCLUDED.has(part)||part.endsWith('-generated'));
}
function extras(value){
 if(!Array.isArray(value)||types.isProxy(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('ordinary explicit extra-source array required');
 const size=Object.getOwnPropertyDescriptor(value,'length');if(!size||!Object.hasOwn(size,'value')||!Number.isSafeInteger(size.value)||size.value<0||size.value>LIMIT||Reflect.ownKeys(value).length!==size.value+1)fail('bounded dense explicit extra-source array required');
 const names=[],seen=new Set();for(let at=0;at<size.value;at++){const row=Object.getOwnPropertyDescriptor(value,String(at));if(!row||!Object.hasOwn(row,'value')||!row.enumerable)fail('own data source paths required');const name=path(row.value);if(seen.has(name))fail('duplicate explicit source path');seen.add(name);names.push(name);}return names;
}
function git(root,args){
 const empty=process.platform==='win32'?'NUL':'/dev/null',env={...Object.fromEntries(Object.entries(process.env).filter(([name])=>!name.startsWith('GIT_'))),GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:empty,GIT_CONFIG_SYSTEM:empty,GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1'};
 const raw=execFileSync('git',['-C',root,...args],{env,timeout:10000,maxBuffer:8388608}),text=raw.toString('utf8');if(!Buffer.from(text).equals(raw))fail('complete original SCM pathname UTF-8 required');return text;
}
function selection(root){
 const head=git(root,['rev-parse','--verify','HEAD']).trim();if(!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(head))fail('actual committed source HEAD required');
 const tree=[];for(const item of git(root,['ls-tree','-r','-z',head]).split('\0').filter(Boolean)){
  const match=/^([0-7]{6}) (\S+) ([a-f0-9]+)\t([\s\S]+)$/u.exec(item);if(!match)fail('complete original tree row required');const name=match[4];if(!isFullAncillaryCompilerSourcePath(name))continue;
  if(!['100644','100755'].includes(match[1])||match[2]!=='blob'||match[3].length!==head.length||tree.length===LIMIT)fail('bounded ordinary ancillary source blob required');tree.push({path:name,mode:match[1],gitBlob:match[3]});
 }
 const index=[];for(const item of git(root,['ls-files','--stage','-z']).split('\0').filter(Boolean)){
  const match=/^([0-7]{6}) ([a-f0-9]+) ([0-3])\t([\s\S]+)$/u.exec(item);if(!match)fail('complete original index row required');const name=match[4];if(!isFullAncillaryCompilerSourcePath(name))continue;
  if(!['100644','100755'].includes(match[1])||match[3]!=='0'||match[2].length!==head.length||index.length===LIMIT)fail('ordinary unmerged-free ancillary source index required');index.push({path:name,mode:match[1],gitBlob:match[2]});
 }
 const order=(a,b)=>a.path<b.path?-1:a.path>b.path?1:0;tree.sort(order);index.sort(order);if(JSON.stringify(tree)!==JSON.stringify(index)||!tree.length)fail('complete ancillary compiler index differs from HEAD');return {head,rows:tree};
}
/** Includes every tracked compiler-directory suffix: compressed source packets,
 * notices, Python helpers and unknown future extensions. Excluded fixture/test/
 * generated/meta/project cohorts still require explicit real receiving inputs.
 * Copying a broader byte scope never grants a namespace or semantic permission.
 */
export function exportFullAncillaryCompilerSourceVault({sourceRoot,output,extraPaths=[]}={}){
 return withSourceInputValidation(()=>{
  if(typeof sourceRoot!=='string'||typeof output!=='string')fail('explicit original source and fresh destination roots required');const root=realpathSync(resolve(sourceRoot)),explicit=extras(extraPaths),before=selection(root),wire=JSON.stringify(before);
  const close=()=>{if(JSON.stringify(selection(root))!==wire)fail('complete ancillary source HEAD/index selection changed');};
  return withCompleteSourceClosingFence(()=>{
   const selected=[...new Set([...before.rows.map(row=>row.path),...explicit])];if(selected.length>LIMIT)fail('complete explicit ancillary source count exceeds original vault domain');
   const result=exportCompactCommittedSourceVault({sourceRoot:root,output,extraPaths:selected});
   close();return {...result,ancillarySelection:{schema:'full-ancillary-compiler-source-data-v1',originalHead:before.head,compilerDirectoryFiles:before.rows.length,explicitExtraFiles:explicit.length,allCompilerDirectorySuffixes:true,completeReceivingClosure:false,completeDependencyResolution:false,compilerQualified:false,sourceAuthority:false,semanticAuthority:false,runtimeParity:false}};
  },[close]);
 });
}
