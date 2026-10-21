#!/usr/bin/env node
// Compile every explicitly declared profile independently; a common program is unproved.
import {readFileSync,mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createCompilationMatrix,DECLARED_FAMILY_PROFILES,compilationMatrixDescription} from '../tools/translation/compilation-matrix.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const matrix=createCompilationMatrix({profiles:DECLARED_FAMILY_PROFILES});
const expected=compilationMatrixDescription(matrix).profiles;
const manifest=JSON.parse(readFileSync(join(root,`profiles/matrix-${matrix.sha256}.json`),'utf8'));
if(manifest.schema!=='independent-profile-bulk-inventory-v1'||manifest.matrixSha256!==matrix.sha256||manifest.profiles.length!==expected.length)throw new Error('Missing or mismatched declared profile inventory; regenerate the explicit compilation matrix.');
let failures=0;
for(const profile of expected){
  const observed=manifest.profiles.find(member=>member.name===profile.name);
  if(!observed||observed.directory!==profile.directory||observed.profileSha256!==profile.sha256)throw new Error(`Mismatched explicit profile identity: ${profile.name}`);
  const trees=['rust-draft','rust-project'].map(name=>join(root,profile.directory,'ts/generated',name));
  if(trees.some(path=>!existsSync(path)))throw new Error(`Missing TypeScript output tree: ${profile.name}`);
  const temporary=mkdtempSync(join(tmpdir(),'router-profile-typescript-'));
  try{
    const config=join(temporary,'tsconfig.json');
    writeFileSync(config,JSON.stringify({compilerOptions:{strict:true,target:'ES2022',module:'ESNext',noEmit:true,skipLibCheck:true},include:trees.map(path=>path+'/**/*.ts')}));
    const started=performance.now();
    const result=spawnSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'-p',config],{cwd:root,stdio:'inherit'});
    console.log(JSON.stringify({profile:profile.name,profileSha256:profile.sha256,directory:profile.directory,elapsedMilliseconds:Math.round(performance.now()-started),exitCode:result.status,signal:result.signal??null,error:result.error?.message??null,strict:true,noEmit:true,runtimeParity:false}));
    if(result.status!==0||result.error)failures++;
  }finally{rmSync(temporary,{recursive:true,force:true});}
}
if(failures)process.exitCode=1;
