#!/usr/bin/env node
// Mandatory strict compilation of canonical and every declared profile sidecar.
import '../tools/translation/project.mjs';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,readdirSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createCompilationMatrix,DECLARED_FAMILY_PROFILES,compilationMatrixDescription} from '../tools/translation/compilation-matrix.mjs';
import {captureOwnedDefinitionCorpus} from '../tools/translation/js-to-rust/owned-core-definition-corpus.mjs';
import {ownedDefinitionRead,ownedDefinitionPhysical,ownedDefinitionHash} from '../tools/translation/owned-definition-output.mjs';
const implementationRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export function checkOwnedDefinitionTypeScript({root=implementationRoot}={}){
 root=resolve(root);const matrix=createCompilationMatrix({profiles:DECLARED_FAMILY_PROFILES}),profiles=[{name:'canonical',directory:'',compilationProfile:DECLARED_FAMILY_PROFILES.find(row=>row.name==='neutral').compilationProfile},...compilationMatrixDescription(matrix).profiles];
 const version=JSON.parse(readFileSync(join(implementationRoot,'packages/javascript/node_modules/typescript/package.json'),'utf8')).version;if(version!=='5.9.3')throw Error('Owned definitions require installed TypeScript5.9.3');
 const matrixIndex=JSON.parse(ownedDefinitionRead(root,`profiles/owned-definitions-matrix-${matrix.sha256}.json`));if(matrixIndex.schema!=='materialized-owned-definitions-matrix-v1'||matrixIndex.matrixSha256!==matrix.sha256||matrixIndex.profiles.length!==profiles.length-1)throw Error('Missing exact declared owned matrix');
 const results=[];
 for(const profile of profiles){
  const prefix=profile.directory?profile.directory+'/':'',capture=captureOwnedDefinitionCorpus(root,profile.directory),manifest=JSON.parse(ownedDefinitionRead(root,prefix+'parity/js-owned-core-definitions-reverse-draft.json'));
  if(manifest.schema!=='owned-core-definition-reverse-corpus-v1'||manifest.profile!==profile.name||manifest.forwardIndex!==capture.indexPath||!Array.isArray(manifest.occurrences)||manifest.occurrences.length!==capture.projects.reduce((n,row)=>n+row.definitions.length,0))throw Error('Current complete definition reverse inventory differs');
  if(JSON.stringify(capture.index.compilationProfile)!==JSON.stringify(profile.compilationProfile))throw Error('Strict current profile differs');
  const files=new Set([...capture.files.keys()].filter(path=>/\.(?:mts|ts)$/u.test(path))),reverse=new Set();
  for(const row of manifest.occurrences){const project=capture.projects.find(project=>project.entry===row.project),actual=project?.definitions.find(value=>value.identity===row.identity);if(!actual||actual.javascript!==row.javascript||actual.typescript!==row.typescript||!row.reverseTypescript.startsWith(prefix+'packages/typescript/generated/reverse-owned-definitions/'))throw Error('Definition strict source identity differs');const source=ownedDefinitionRead(root,row.reverseTypescript);if(!source.startsWith('// GENERATED: definition-only reverse checked TypeScript.'))throw Error('Unknown definition TypeScript');files.add(row.reverseTypescript);reverse.add(row.reverseTypescript);}
  const physical=new Set();function census(path){for(const row of readdirSync(ownedDefinitionPhysical(root,path),{withFileTypes:true})){const child=path+'/'+row.name;if(row.isSymbolicLink())throw Error('Linked strict source');if(row.isDirectory())census(child);else if(/\.(?:mts|ts)$/u.test(child))physical.add(child);}}
  census(prefix+'packages/typescript/generated/reverse-owned-definitions');if(physical.size!==reverse.size||[...physical].some(path=>!reverse.has(path)))throw Error('Unindexed strict reverse source');
  const before=[...files].sort().map(path=>({path,source:ownedDefinitionRead(root,path)})),temporary=mkdtempSync(join(tmpdir(),'router-owned-definition-types-'));
  try{
   const config=join(temporary,'tsconfig.json');writeFileSync(config,JSON.stringify({compilerOptions:{strict:true,noEmit:true,skipLibCheck:true,target:'ES2022',module:'NodeNext',moduleResolution:'NodeNext'},files:before.map(row=>join(root,row.path))}));
   const result=spawnSync(process.execPath,[join(implementationRoot,'packages/javascript/node_modules/typescript/bin/tsc'),'-p',config],{cwd:root,stdio:'inherit',timeout:20000});
   if(result.error||result.status!==0)throw Error('Strict owned definition TypeScript failed: '+profile.name+' '+(result.error?.message??result.status));
   capture.requireCurrent();for(const row of before)if(ownedDefinitionRead(root,row.path)!==row.source)throw Error('Strict original source changed');results.push({profile:profile.name,files:before.map(row=>({path:row.path,sha256:ownedDefinitionHash(row.source)})),version,strict:true,noEmit:true,runtimeParity:false});
  }finally{rmSync(temporary,{recursive:true,force:true});}
 }
 return results;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){if(process.argv.length!==2)throw Error('Usage: node scripts/check-owned-definition-typescript.mjs');console.log(JSON.stringify(checkOwnedDefinitionTypeScript()));}
