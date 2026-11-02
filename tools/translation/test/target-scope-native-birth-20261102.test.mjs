// Proposed source/native-lifetime receiving cases SOURCE. Execution is UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {proposeTargetScopeNativeBirthCopies} from '../target-scope-native-birth-20261102-source.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {protectedFlatWriterFixture} from './protected-flat-writer-20261102-fixture.mjs';
import {compactSparseGit} from '../compact-sparse-git-io-20261102.mjs';
const SOURCE=fileURLToPath(new URL('../../../',import.meta.url)),BASE='tools/translation/source-profiles/target-scope-native-birth-20261102/';
const paths=['tools/translation/js-to-rust/vendor/module-syntax.mjs','tools/translation/draft-scope-20261102-target-collector.mjs','tools/translation/translation-provenance-20261102.json'],keys=['loader-before.mjs.txt','collector-before.mjs.txt','provenance-before.json.txt'];
const input=()=>paths.map((path,index)=>({path,source:fs.readFileSync(join(SOURCE,BASE+keys[index]),'utf8')}));
test('three complete genuine native loader/observer/provenance source successors retain full CST inverses',{timeout:60000},()=>{
 const proposal=proposeTargetScopeNativeBirthCopies(input());assert.equal(proposal.rows.length,3);assert.equal(proposal.sourceInstalled,false);for(const row of proposal.rows){assert.equal(row.history.inverse,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.history.afterMeta).source,row.after);assert.deepEqual([...new Set(row.ruleTrace.map(part=>part.phase))],row.path===paths[0]?['language']:row.path===paths[1]?['language','repository']:['repository']);assert.notEqual(row.before,row.after);}
});
test('native source closure proposal cannot accept a forged incomplete original module',{timeout:60000},()=>{
 const rows=input();rows[0].source+='\n// foreign original\n';assert.throws(()=>proposeTargetScopeNativeBirthCopies(rows),/original/);assert.throws(()=>proposeTargetScopeNativeBirthCopies(input().slice(1)),/all complete/);
});
test('full copied source compiler joins original birth in isolated receiving children',{timeout:3600000,concurrency:false},t=>{
 // Full committed compiler/profile/ancillary closure; no tiny mock Host or AST.
 const root=protectedFlatWriterFixture(t),proposal=proposeTargetScopeNativeBirthCopies(input());for(const row of proposal.rows){const path=join(root,row.path);assert.equal(fs.readFileSync(path,'utf8'),row.before);fs.writeFileSync(path,row.after);assert.equal(fs.readFileSync(path,'utf8'),row.after);}
 // The receiving private loader gets a separate SDK selector root. Application
 // source is imported exclusively from the copied compiler, never SOURCE.
 const dependencyRoot=join(dirname(root),'sdk-selector');fs.mkdirSync(join(dependencyRoot,'js/node_modules'),{recursive:true});fs.copyFileSync(join(SOURCE,'js/package.json'),join(dependencyRoot,'js/package.json'));fs.symlinkSync(fs.realpathSync(join(root,'js/node_modules/typescript')),join(dependencyRoot,'js/node_modules/typescript'),'dir');
 for(const row of proposal.rows){const blob=compactSparseGit(root,['hash-object','-w','--no-filters',row.path],{maxBytes:1024}).trim();compactSparseGit(root,['update-index','--cacheinfo','100644',blob,row.path],{maxBytes:1024});}
 const runner=fileURLToPath(new URL('./target-scope-native-birth-20261102-receiving.mjs',import.meta.url));
 for(const mode of ['baseline','foreign','enum','sys','factory','subclass','accessor','proxy']){const raw=execFileSync(process.execPath,[runner,root,mode,dependencyRoot],{cwd:root,env:{...process.env,ROUTER_NATIVE_TS_SOURCE_ROOT:dependencyRoot},timeout:20000,maxBuffer:16777216,encoding:'utf8'}),result=JSON.parse(raw.trim());assert.equal(result.schema,'target-scope-native-birth-case-20261102-v1');assert.equal(result.mode,mode);assert.equal(result.executableAuthority,false);}
});
