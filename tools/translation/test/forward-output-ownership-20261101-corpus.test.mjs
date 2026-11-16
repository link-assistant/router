// Independent original/new private corpus receiving case SOURCE. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {captureSourceCorpus as captureOriginal,sourceCorpusPaths as originalPaths} from '../source-corpus.mjs';
import {captureSourceCorpus,sourceCorpusPaths,sourceCorpusText,assertSourceCorpusSelection} from '../forward-output-ownership-20261101-corpus.mjs';
import {planRegeneration} from '../bulk.mjs';
function project(t){const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-forward-versioned-corpus-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(join(root,'src'));fs.writeFileSync(join(root,'src/lib.rs'),'pub fn answer()->u8{7}\n');const run=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','user.name=Corpus fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe',timeout:10000});run(['init','--quiet']);run(['add','src/lib.rs']);run(['commit','--quiet','-m','Exact original private source']);return root;}
for(const capture of [captureOriginal,captureSourceCorpus])test('actual forward private planner accepts genuine '+(capture===captureOriginal?'original':'successor')+' source issuer and checks actual bytes',{timeout:60000},t=>{
 const root=project(t),corpus=capture({root,paths:['src/lib.rs']});assert.deepEqual(sourceCorpusPaths(corpus,root),['src/lib.rs']);assert.equal(sourceCorpusText(corpus,root,'src/lib.rs'),'pub fn answer()->u8{7}\n');assert.deepEqual(assertSourceCorpusSelection(corpus,root,['src/lib.rs']),['src/lib.rs']);const plan=planRegeneration({root,sourceCorpus:corpus,sources:['src/lib.rs'],entries:['src/lib.rs']});assert.ok(plan.outputs.length);assert.throws(()=>sourceCorpusPaths({...corpus},root),/unsealed/);fs.writeFileSync(join(root,'src/lib.rs'),'pub fn answer()->u8{8}\n');assert.throws(()=>planRegeneration({root,sourceCorpus:corpus,sources:['src/lib.rs'],entries:['src/lib.rs']}),/complete corpus bytes|original|changed|differ/);assert.equal(fs.readFileSync(join(root,'src/lib.rs'),'utf8'),'pub fn answer()->u8{8}\n');
});
test('successor READ-DATA tokens do not manufacture an original private issuer or source-selection override',t=>{const root=project(t),corpus=captureSourceCorpus({root,paths:['src/lib.rs']});assert.throws(()=>originalPaths(corpus,root),/unsealed/);assert.throws(()=>assertSourceCorpusSelection(corpus,root,[]));const other=project(t);assert.throws(()=>sourceCorpusPaths(corpus,other),/another repository/);});
test('old private corpus bridge getters stay pure and cannot recapture a missing ordinary source',t=>{const root=project(t),corpus=captureOriginal({root,paths:['src/lib.rs']});fs.unlinkSync(join(root,'src/lib.rs'));assert.deepEqual(sourceCorpusPaths(corpus,root),['src/lib.rs']);assert.equal(sourceCorpusText(corpus,root,'src/lib.rs'),'pub fn answer()->u8{7}\n');assert.throws(()=>planRegeneration({root,sourceCorpus:corpus,sources:['src/lib.rs'],entries:['src/lib.rs']}));assert.equal(fs.existsSync(join(root,'src/lib.rs')),false);});
