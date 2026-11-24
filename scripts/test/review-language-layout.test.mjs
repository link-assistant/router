import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {repositorySourceURL} from '../../tools/translation/test/fixtures/repository-paths.mjs';
import {translateProject} from '../../tools/translation/project.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {loadJsonMacroSourceProof} from '../../tools/translation/json-macro-inputs.mjs';
import {PRODUCTION_PROFILE} from '../../tools/translation/cfg-profile.mjs';
import {sourceItems} from '../../tools/translation/rust-structure.mjs';
import {reviewTranslationDraft,reviewGeneratedMethods} from '../review-translation-draft.mjs';

const root=new URL('../../',import.meta.url),manifest=readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock=readFileSync(repositorySourceURL('Cargo.lock',root),'utf8');
const dependencies=loadDeriveDependencyProof({manifest,lock}),jsonMacroDependencies=loadJsonMacroSourceProof({manifest,lock}),hash=value=>createHash('sha256').update(value).digest('hex');
const source='#[derive(Default)]pub struct Choice{value:Option<u32>}pub fn make()->Choice{Choice::default()}',sourcePath='rust/src/lib.rs';
function compiled(){return translateProject({entry:sourcePath,paths:[sourcePath],readSource:()=>source,cargoManifest:manifest,cargoManifestPath:'rust/Cargo.toml',deriveDependencies:dependencies,jsonMacroDependencies,compilationProfile:PRODUCTION_PROFILE});}

test('independent generated-method review requires the actual nested Cargo edition source label',{timeout:60000},()=>{
 const result=compiled(),meta=JSON.parse(JSON.stringify(result.meta)),row={entry:sourcePath,checkedGeneratedMethods:meta.checkedGeneratedMethods.length};
 assert.deepEqual(meta.refused,[]);
 const options={readSource:()=>source,dependencies,jsonMacroDependencies,cargoManifest:manifest,cargoManifestPath:'rust/Cargo.toml'};
 const reviewed=reviewGeneratedMethods(meta,row,options);assert.equal(reviewed.length,1);assert.equal(reviewed[0].originalDeclarationTerm,'struct');
 assert.throws(()=>reviewGeneratedMethods(meta,row,{...options,cargoManifestPath:'Cargo.toml'}),/Cargo edition mismatch/);
});
test('complete nested crate review captures workspace package and lock bytes independently',{timeout:60000},t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-nested-review-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const write=(path,text)=>{mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),text);};
 const result=compiled(),meta=result.meta,workspace='[workspace]\nmembers=["rust"]\nresolver="3"\n';
 write(sourcePath,source);write('Cargo.toml',workspace);write('rust/Cargo.toml',manifest);write('Cargo.lock',lock);write('compiler.mjs','// bounded independent compiler fixture\n');
 const items=sourceItems(source).filter(item=>!item.comment).map(item=>({term:item.term,name:item.name,span:{start:item.start,end:item.end},source:source.slice(item.start,item.end),sha256:hash(source.slice(item.start,item.end)),status:item.term==='fn'?'executable':'carried'}));
 const counts={executable:items.filter(row=>row.status==='executable').length,carried:items.filter(row=>row.status==='carried').length,preserved:0};
 const targets={meta:'tools/translation/meta/rust/src/lib.meta.json',javascript:'js/generated/rust-draft/rust/src/lib.mjs',typescript:'ts/generated/rust-draft/rust/src/lib.ts'};
 write(targets.meta,JSON.stringify({sourcePath,sourceBytes:Buffer.byteLength(source),sourceSha256:hash(source),items,counts}));write(targets.javascript,'export {};\n');write(targets.typescript,'export {};\n');
 const projectTargets={meta:'tools/translation/projects/rust/src/lib.meta.json',javascript:'js/generated/rust-project/rust/src/lib.mjs',typescript:'ts/generated/rust-project/rust/src/lib.ts'};
 write(projectTargets.meta,JSON.stringify(meta));write(projectTargets.javascript,result.javascript);write(projectTargets.typescript,result.typescript);
 const project={entry:sourcePath,sources:meta.sources.length,refused:meta.refused.length,unloweredItems:meta.unloweredItems.length,checkedMethods:meta.checkedMethods.length,checkedGeneratedMethods:meta.checkedGeneratedMethods.length,moduleDiagnostics:meta.moduleDiagnostics.length,executableFunctions:meta.executable.filter(row=>row.term==='fn').length,executableConstants:0,targets:projectTargets};
 write('parity/rust-source-inventory.json',JSON.stringify({sources:[{source:sourcePath,sha256:hash(source),bytes:Buffer.byteLength(source),...counts,targets}],projects:[project],totals:{sources:1,...counts},implementationHashes:{'compiler.mjs':hash('// bounded independent compiler fixture\n')},functionCoverage:{all:{topLevelFunctions:1},production:{topLevelFunctions:1}},runtimeParity:false}));
 const git=args=>execFileSync('git',['-c','core.hooksPath=/dev/null','-c','gc.auto=0',...args],{cwd:directory,encoding:'utf8',timeout:10000,env:{...process.env,GIT_AUTHOR_NAME:'Router fixture',GIT_AUTHOR_EMAIL:'fixture@example.invalid',GIT_COMMITTER_NAME:'Router fixture',GIT_COMMITTER_EMAIL:'fixture@example.invalid'}});
 git(['init','-q']);git(['add','.']);git(['commit','-qm','complete nested receiving fixture']);const baselineSha=git(['rev-parse','HEAD']).trim();
 const report=reviewTranslationDraft({root:directory,baselineSha});assert.deepEqual(report.originalCargoInputs.map(row=>row.path).sort(),['Cargo.lock','Cargo.toml','rust/Cargo.toml']);assert.equal(report.projects[0].checkedGeneratedMethods,1);assert.equal(report.runtimeParity,false);assert.equal(report.rustExecuted,false);
 for(const [path,original]of [['Cargo.toml',workspace],['rust/Cargo.toml',manifest]]){write(path,original+'\n');assert.throws(()=>reviewTranslationDraft({root:directory,baselineSha}),/Original Cargo input changed since baseline/);write(path,original);}
});
