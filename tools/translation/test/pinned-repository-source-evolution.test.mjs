import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {derivePinnedRepositorySourceEvolution} from '../pinned-repository-source-evolution.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const before='export function number(){return 1;}\n';
const after='export function result(){return 2;}\n';
function fixture(run){
 const root=mkdtempSync(join(tmpdir(),'router-pinned-source-'));
 try{
  const profile=join(root,'rules.json'),path='fixture.mjs';
  const input={schema:'pinned-repository-source-evolution-v1',path,phase:'repository',
   beforeSha256:hash(before),afterSha256:hash(after),
   edits:[{id:'receiving:rename',before:'number()',after:'result()'},
    {id:'receiving:value',before:'return 1',after:'return 2'}],
   sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false,
   productionExecutableGain:0};
  const save=()=>{const bytes=JSON.stringify(input);writeFileSync(profile,bytes);return hash(bytes);};
  const derive=(options={})=>derivePinnedRepositorySourceEvolution(ownershipCompiler(),{
   profile,path,source:before,profileSha256:save(),...options});
  run({root,profile,input,save,derive});
 }finally{rmSync(root,{recursive:true,force:true});}
}

test('pinned source DATA retains ordered edits and the complete inverse without execution authority',()=>fixture(({derive})=>{
 const row=derive();
 assert.equal(row.before,before);assert.equal(row.after,after);assert.equal(row.inverse,before);
 assert.deepEqual(row.trace,[{phase:'repository',id:'receiving:rename'},
  {phase:'repository',id:'receiving:value'}]);
 assert.equal(row.languageRules.length,0);assert.equal(row.repositoryRules.length,2);
 for(const key of ['sourceAuthority','semanticAuthority','runtimeAuthority'])assert.equal(row[key],false);
 assert.equal(row.productionExecutableGain,0);
}));

test('complete predecessor profile and target pins reject unrelated or redirected source',()=>fixture(({derive})=>{
 assert.throws(()=>derive({source:before+'// unrelated\n'}),/unregistered complete source/u);
 assert.throws(()=>derive({path:'foreign.mjs'}),/source rule universe/u);
 assert.throws(()=>derive({profileSha256:'0'.repeat(64)}),/authored rule profile differs/u);
}));

test('source profiles cannot grant authority or accept an ambiguous inverse',()=>fixture(({input,derive})=>{
 input.runtimeAuthority=true;assert.throws(()=>derive(),/source rule universe/u);
 input.runtimeAuthority=false;input.productionExecutableGain=1;
 assert.throws(()=>derive(),/source rule universe/u);
 input.productionExecutableGain=0;input.edits[1].after='result';
 input.afterSha256=hash('export function result(){result;}\n');
 assert.throws(()=>derive(),/inverse anchor differs/u);
}));

test('source transport refuses malformed native syntax and symbolic profile aliases',()=>fixture(({root,profile,input,derive,save})=>{
 input.edits[1].after='return (';input.afterSha256=hash('export function result(){return (;}\n');
 assert.throws(()=>derive(),/native grammar/u);
 const profileSha256=save(),alias=join(root,'alias.json');symlinkSync(profile,alias);
 assert.throws(()=>derive({profile:alias,profileSha256}),/ordinary authored rule profile/u);
}));
