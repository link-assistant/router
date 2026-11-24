#!/usr/bin/env node
// Compile every explicitly declared profile independently; a common program is unproved.
import {readFileSync,mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createCompilationMatrix,DECLARED_FAMILY_PROFILES,compilationMatrixDescription} from '../tools/translation/compilation-matrix.mjs';

const implementationRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');

// Profile artifacts can precede the physical language-root migration. Read
// their explicit target layout rather than assuming the canonical tree layout.
// This selects files for strict compilation only; freshness is checked by the
// independent complete profile producer, and neither check establishes parity.
export function profileTypeScriptTrees(root,profile,observed){
  if(!observed||observed.directory!==profile.directory||observed.profileSha256!==profile.sha256)throw new Error(`Mismatched explicit profile identity: ${profile.name}`);
  const projects=observed.projects;
  const layout=['ts','packages/typescript'].find(base=>Array.isArray(projects)&&projects.length>0&&projects.every(project=>{
    const target=project.targets?.typescript,prefix=`${profile.directory}/${base}/generated/rust-project/`;
    return typeof target==='string'&&target.startsWith(prefix)&&target.endsWith('.ts')&&target.slice(prefix.length).split('/').every(part=>part&&part!=='.'&&part!=='..'&&!/[\\:\0*?\[\]{}!]/u.test(part));
  }));
  if(!layout)throw new Error(`Missing or inconsistent TypeScript project targets: ${profile.name}`);
  const trees=['rust-draft','rust-project'].map(name=>join(root,profile.directory,layout,'generated',name));
  if(trees.some(path=>!existsSync(path))||projects.some(project=>!existsSync(join(root,project.targets.typescript))))throw new Error(`Missing TypeScript output tree or target: ${profile.name}`);
  return trees;
}

export function checkProfileTypeScript({root=implementationRoot}={}){
  const rootPath=resolve(root);
  const matrix=createCompilationMatrix({profiles:DECLARED_FAMILY_PROFILES});
  const expected=compilationMatrixDescription(matrix).profiles;
  const manifest=JSON.parse(readFileSync(join(rootPath,`profiles/matrix-${matrix.sha256}.json`),'utf8'));
  if(manifest.schema!=='independent-profile-bulk-inventory-v1'||manifest.matrixSha256!==matrix.sha256||manifest.profiles.length!==expected.length)throw new Error('Missing or mismatched declared profile inventory; regenerate the explicit compilation matrix.');
  const version=JSON.parse(readFileSync(join(implementationRoot,'js/node_modules/typescript/package.json'),'utf8')).version;
  const results=[];
  for(const profile of expected){
    const observed=manifest.profiles.find(member=>member.name===profile.name);
    const trees=profileTypeScriptTrees(rootPath,profile,observed);
    const temporary=mkdtempSync(join(tmpdir(),'router-profile-typescript-'));
    try{
      const config=join(temporary,'tsconfig.json');
      writeFileSync(config,JSON.stringify({compilerOptions:{strict:true,target:'ES2022',module:'ESNext',noEmit:true,skipLibCheck:true},include:trees.map(path=>path+'/**/*.ts')}));
      const started=performance.now();
      const result=spawnSync(process.execPath,[join(implementationRoot,'js/node_modules/typescript/bin/tsc'),'-p',config],{cwd:rootPath,stdio:'inherit'});
      const record={profile:profile.name,profileSha256:profile.sha256,directory:profile.directory,trees,version,elapsedMilliseconds:Math.round(performance.now()-started),exitCode:result.status,signal:result.signal??null,error:result.error?.message??null,strict:true,noEmit:true,runtimeParity:false};
      console.log(JSON.stringify(record));results.push(record);
    }finally{rmSync(temporary,{recursive:true,force:true});}
  }
  return results;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(checkProfileTypeScript().some(result=>result.exitCode!==0||result.error))process.exitCode=1;
}
