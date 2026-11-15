import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {checkProfileTypeScript,profileTypeScriptTrees} from '../check-profile-typescript.mjs';
import {createCompilationMatrix,compilationMatrixDescription,DECLARED_FAMILY_PROFILES} from '../../tools/translation/compilation-matrix.mjs';

function fixture(){
  const root=mkdtempSync(join(tmpdir(),'router-profile-typescript-test-'));
  const matrix=createCompilationMatrix({profiles:DECLARED_FAMILY_PROFILES});
  const expected=compilationMatrixDescription(matrix).profiles;
  const put=(path,source)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);};
  const profiles=expected.map((profile,index)=>{
    const layout=index===0?'ts':'packages/typescript';
    const base=`${profile.directory}/${layout}/generated`;
    put(`${base}/rust-draft/src/lib.ts`,'export const answer: number = 42;\n');
    const target=`${base}/rust-project/src/lib.ts`;
    put(target,'export const label: string = "profile";\n');
    return {name:profile.name,profileSha256:profile.sha256,directory:profile.directory,projects:[{targets:{typescript:target}}]};
  });
  put(`profiles/matrix-${matrix.sha256}.json`,JSON.stringify({schema:'independent-profile-bulk-inventory-v1',matrixSha256:matrix.sha256,profiles}));
  return {root,expected,profiles,put,dispose:()=>rmSync(root,{recursive:true,force:true})};
}

test('strictly compiles all explicit profiles in their declared language-root layouts',{timeout:60_000},()=>{
  const value=fixture();
  try{
    const results=checkProfileTypeScript({root:value.root});
    assert.deepEqual(results.map(row=>row.profile),value.expected.map(row=>row.name));
    for(const row of results){
      assert.equal(row.exitCode,0);assert.equal(row.version,'5.9.3');
      assert.equal(row.strict,true);assert.equal(row.noEmit,true);assert.equal(row.runtimeParity,false);
      assert.equal(row.trees.length,2);
    }
    // Neither tree may be reduced to just the files listed as project entries.
    value.put(`${value.profiles[0].directory}/ts/generated/rust-draft/unindexed.ts`,'export function echo(value) { return value; }\n');
    value.put(value.profiles[1].projects[0].targets.typescript,'export const label: string = 42;\n');
    const invalid=checkProfileTypeScript({root:value.root});
    assert.deepEqual(invalid.map(row=>row.exitCode===0),[false,false,true]);
  }finally{value.dispose();}
});

test('refuses missing, mixed, escaped and mismatched profile targets',()=>{
  const value=fixture();
  try{
    const profile=value.expected[0],observed=value.profiles[0];
    const trees=()=>profileTypeScriptTrees(value.root,profile,observed);
    const original=observed.projects[0].targets.typescript;
    for(const target of [original.replace('/ts/','/packages/typescript/'),original.replace('/src/lib.ts','/../outside.ts'),original.replace('/src/lib.ts','/src/*.ts')]){
      observed.projects[0].targets.typescript=target;
      assert.throws(trees,/Missing/);
    }
    observed.projects[0].targets.typescript=original;
    observed.projects.push({targets:{typescript:original.replace('/ts/','/packages/typescript/')}});
    assert.throws(trees,/inconsistent/);observed.projects.pop();
    observed.profileSha256='changed';assert.throws(trees,/Mismatched/);observed.profileSha256=profile.sha256;
    rmSync(join(value.root,original));assert.throws(trees,/Missing/);
    value.put(original,'export const value = 1;\n');
    rmSync(join(value.root,profile.directory,'ts/generated/rust-draft'),{recursive:true});assert.throws(trees,/Missing/);
  }finally{value.dispose();}
});
