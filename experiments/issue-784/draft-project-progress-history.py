#!/usr/bin/env python3
"""Draft the explicit project receiving-history adapter after source checks end."""
from pathlib import Path

HELPER = '''// Historical comparison DATA only; actual graph behavior stays independently tested.
import {readFileSync,lstatSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {derivePinnedRepositorySourceEvolution} from '../pinned-repository-source-evolution.mjs';
import {transportConcreteNamedSourcePhases} from '../concrete-source-origin-phases.mjs';

const path='tools/translation/project.mjs';
const profile=new URL('../source-profiles/project-namespace-composition/source-rules.json',import.meta.url);
const profileSha256='67fe9db0a517b6050ff9117a59c427ba880272e93a9fa90417ad61affcd74730';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Project progress source history: '+message);};

export function restoreProjectProgressSourceHistory(source,retain=()=>{}){
 if(typeof source!=='string'||Buffer.byteLength(source)>262144||typeof retain!=='function')
  fail('bounded complete primitive source and callback required');
 const state=lstatSync(profile);
 if(!state.isFile()||state.isSymbolicLink()||state.size>131072)
  fail('bounded ordinary authored profile required');
 const bytes=readFileSync(profile);
 if(bytes.length!==state.size||hash(bytes)!==profileSha256)fail('complete authored profile differs');
 const input=JSON.parse(bytes);
 if(hash(source)!==input.afterSha256)fail('unregistered complete current project source');
 let before=source;
 for(const edit of [...input.edits].reverse()){
  if(before.split(edit.after).length!==2)fail('complete inverse anchor differs');
  before=before.replace(edit.after,()=>edit.before);
 }
 const proof=derivePinnedRepositorySourceEvolution(ownershipCompiler(),{
  profile,profileSha256,path,source:before,
 });
 if(proof.after!==source||proof.inverse!==before)fail('complete forward replay differs');
 const [equation]=transportConcreteNamedSourcePhases([{before,middle:before,
  after:source,language:'JavaScript',rules:['javascript:retain-complete-progress-predecessor',
   'router:join-complete-project-namespace-successor','javascript:restore-complete-progress-predecessor',
   'router:restore-complete-progress-predecessor']}]);
 if(equation.before!==before||equation.after!==source||equation.inverse!==before)
  fail('complete serialized concrete syntax equation differs');
 if(!readFileSync(profile).equals(bytes))fail('authored profile changed during derivation');
 retain('complete-project-progress-receiving-history',{path,current:source,historical:before,
  proof,equation,sourceAuthority:false,semanticAuthority:false,runtimeAuthority:false,
  productionExecutableGain:0});
 return before;
}
'''

TEST = '''import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {restoreProjectProgressSourceHistory} from './project-progress-source-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';

const source=()=>readFileSync(new URL('../project.mjs',import.meta.url),'utf8');
test('complete project progress receiving history preserves current bytes and the original full inverse',
 {timeout:60000},()=>{
 const current=source(),rows=[];
 const historical=restoreProjectProgressSourceHistory(current,(kind,value)=>rows.push({kind,value}));
 assert.equal(rows.length,1);const row=rows[0].value;
 assert.equal(row.current,current);assert.equal(row.historical,historical);
 assert.equal(row.proof.after,current);assert.equal(row.proof.inverse,historical);
 assert.equal(row.equation.after,current);assert.equal(row.equation.inverse,historical);
 for(const stage of row.equation.stages){
  assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);
  assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);
 }
 for(const key of ['sourceAuthority','semanticAuthority','runtimeAuthority'])assert.equal(row[key],false);
 assert.equal(row.productionExecutableGain,0);assert.equal(source(),current);
 assert.match(historical,/export function resolveModuleGraph/u);
});

test('complete project progress history refuses altered wrappers foreign bytes and callbacks',
 {timeout:60000},()=>{
 const current=source();
 for(const changed of [current+'\\n',current.replace('trackedInput={value:null}','trackedInput={value:false}'),
  current.replace('return graph;','return null;')])
  assert.throws(()=>restoreProjectProgressSourceHistory(changed),/complete current project source/u);
 assert.throws(()=>restoreProjectProgressSourceHistory(new String(current)),/primitive source/u);
 assert.throws(()=>restoreProjectProgressSourceHistory(current,null),/callback/u);
 const failure=new Error('retaining complete source failed');
 assert.throws(()=>restoreProjectProgressSourceHistory(current,()=>{throw failure;}),error=>error===failure);
});
'''

target = Path('tools/translation/test')
subject = target / 'core-adoption-progress.test.mjs'
source = subject.read_text()
anchor = 'function progressLayoutHistory(path,source){\n'
replacement = anchor + " if(path==='tools/translation/project.mjs')return restoreProjectProgressSourceHistory(source,retain);\n"
assert source.count(anchor) == 1
assert 'restoreProjectProgressSourceHistory' not in source
for name, text in [('project-progress-source-history.mjs', HELPER),
                   ('project-progress-source-history.test.mjs', TEST)]:
    with (target / name).open('x') as output:
        output.write(text)
subject.write_text("import {restoreProjectProgressSourceHistory} from './project-progress-source-history.mjs';\n" + source.replace(anchor, replacement))
print('Drafted complete project history adapter; original rules, cases, and deadlines retained')
