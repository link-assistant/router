#!/usr/bin/env node
// Explicit future producer/receiving driver SOURCE; UNRUN during drafting.
import {produceOrderedTextMapCallerSources} from '../tools/translation/ordered-text-map-callers-20261102-producer.mjs';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {ORDERED_TEXT_MAP_CALLER_PARENT_PATHS} from '../tools/translation/ordered-text-map-callers-20261102-profile.mjs';
import {createHash} from 'node:crypto';
const [mode,destination,...extra]=process.argv.slice(2);
if(!['--produce','--receive'].includes(mode)||typeof destination!=='string'||extra.length)throw TypeError('Usage: node scripts/ordered-text-map-callers-20261102.mjs (--produce NEW_EXTERNAL_DIRECTORY | --receive EXACT_PRODUCED_DIRECTORY)');
if(mode==='--produce'){
 const result=produceOrderedTextMapCallerSources({destination});process.stdout.write(JSON.stringify({schema:result.schema,destination:result.destination,parents:result.parentEquations.length,sourceExecuted:false,tests:'UNRUN',runtimeParity:false})+'\n');
}else{
 const root=realpathSync(resolve(destination)),file=join(root,'ordered-text-map-callers-20261102-package.json'),stat=lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>8388608)throw TypeError('Complete bounded ordinary produced source receipt required');const receipt=JSON.parse(readFileSync(file,'utf8'));
 if(receipt.schema!=='ordered-text-map-callers-source-package-20261102-v1'||receipt.destination!==root||!Array.isArray(receipt.currentClosure)||receipt.currentClosure.length>16384||!Array.isArray(receipt.parentEquations)||receipt.rawSourceBytes>268435456||receipt.transferProfile!=='full-compiler-profile-transfer-256MiB-v1'||receipt.allVaultPathsPhysicallyHot!==true||receipt.parentEquations.length!==ORDERED_TEXT_MAP_CALLER_PARENT_PATHS.length||JSON.stringify(receipt.parentEquations.map(row=>row.path).sort())!==JSON.stringify([...ORDERED_TEXT_MAP_CALLER_PARENT_PATHS].sort()))throw TypeError('Exact complete produced map package required');
 const current=()=>{
  for(const row of receipt.currentClosure){if(typeof row.path!=='string'||!row.path||row.path.length>4096||/[\x00-\x1f\x7f\\:]/u.test(row.path)||/\p{Surrogate}/u.test(row.path)||row.path.startsWith('/')||row.path.split('/').some(part=>!part||part==='.'||part==='..'))throw TypeError('Safe complete source closure required');let parent=root;for(const part of row.path.split('/').slice(0,-1)){parent=join(parent,part);const directory=lstatSync(parent);if(!directory.isDirectory()||directory.isSymbolicLink())throw TypeError('Complete regular produced source ancestors required');}const path=join(root,row.path),stat=lstatSync(path);if(!stat.isFile()||stat.isSymbolicLink()||stat.size!==row.bytes||stat.size>4194304||((stat.mode&0o111)?'100755':'100644')!==row.mode||createHash('sha256').update(readFileSync(path)).digest('hex')!==row.sha256)throw TypeError('Complete produced map source closure changed');}
  for(const row of receipt.parentEquations)if(readFileSync(join(root,row.path),'utf8')!==row.after)throw TypeError('Complete installed map parent source differs');
 };
 current();const env={...process.env,ROUTER_NATIVE_TS_SOURCE_ROOT:receipt.sourceRoot,ROUTER_ORDERED_MAP_CASE_SOURCE_ROOT:receipt.sourceRoot};let failed=false;
 try{
  const version=execFileSync(process.execPath,[join(receipt.sourceRoot,'js/node_modules/typescript/bin/tsc'),'--version'],{env,encoding:'utf8',timeout:20000,maxBuffer:4194304});process.stdout.write(version);
  const casesOutput=execFileSync(process.execPath,['--test','--test-concurrency=1',join(root,'tools/translation/test/ordered-text-map-callers-20261102-receiving.mjs'),join(root,'tools/translation/test/ordered-text-map-callers-20261102-cases.mjs'),join(root,'tools/translation/ordered-map-cold-capsule-20261102-receiving.mjs')],{cwd:root,env,timeout:60000,maxBuffer:4194304,stdio:'pipe'});
  process.stdout.write(casesOutput);const typesOutput=execFileSync(process.execPath,[join(receipt.sourceRoot,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--noEmit',join(root,'tools/translation/test/ordered-text-map-callers-20261102-types.mts')],{cwd:root,env,timeout:20000,maxBuffer:4194304,stdio:'pipe'});process.stdout.write(typesOutput);
 }catch(error){failed=true;throw error;}finally{try{current();}catch(error){if(!failed)throw error;}}
}
