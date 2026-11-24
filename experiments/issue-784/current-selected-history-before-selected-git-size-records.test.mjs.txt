import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {readSelectedGitSizeRecords} from '../selected-git-size-records.mjs';
import {prepareSelectedGitCensus} from '../prepare-selected-git-census.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const selected=path=>path.endsWith('.rs')||path==='Cargo.toml',limits={maxPaths:900,maxFileBytes:8*1024*1024,maxTotalBytes:64*1024*1024};
function git(root,args,options={}){return execFileSync('/usr/bin/git',['-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','maintenance.auto=false','-C',root,...args],{timeout:10000,maxBuffer:16*1024*1024,...options});}
test('actual complete selected Git rows equal the old full size census while unrelated objects are never sized',{timeout:60000},t=>{
 const root=mkdtempSync(join(tmpdir(),'router-selected-git-rows-'));t.after(()=>rmSync(root,{recursive:true,force:true}));git(root,['init','-q']);for(const [path,source]of [['Cargo.toml','[workspace]\n'],['rust/src/lib.rs','// Ω😀 whole source\npub fn answer()->u8{7}\n'],['rust/tests/edge.rs','#[test] fn edge() {}\n'],['unrelated.txt','unrelated complete input\n']]){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);}git(root,['add','.']);const revision=git(root,['write-tree']).toString().trim(),calls=[],run=(args,options)=>{calls.push({args,options});return git(root,args,options);};
 const actual=readSelectedGitSizeRecords({run,revision,select:selected,...limits}),expected=git(root,['ls-tree','-r','-l','-z',revision]).toString().split('\0').filter(Boolean).filter(row=>selected(row.split('\t')[1])).map(row=>{const [fields,path]=row.split('\t');return fields.trim().split(/\s+/u).join(' ')+'\t'+path;});assert.deepEqual(actual,expected);assert.equal(calls.length,2);assert.deepEqual(calls[0].args,['ls-tree','-r','-z',revision]);assert.deepEqual(calls[1].args,['cat-file','--batch-check']);assert.equal(calls[1].options.input.trim().split('\n').length,3);const unrelated=git(root,['rev-parse',revision+':unrelated.txt']).toString().trim();assert.equal(calls[1].options.input.includes(unrelated),false);
});
test('missing mismatched truncated and oversized selected size streams retain every original census bound',{timeout:60000},()=>{
 const revision='a'.repeat(40),blob='b'.repeat(40),listing=Buffer.from('100644 blob '+blob+'\tsource.rs\0'),invoke=(body,extra={})=>readSelectedGitSizeRecords({run:args=>args[0]==='ls-tree'?listing:Buffer.from(body),revision,select:selected,...limits,...extra});assert.deepEqual(invoke(blob+' blob 4\n'),['100644 blob '+blob+' 4\tsource.rs']);for(const body of ['',blob+' blob 4','c'.repeat(40)+' blob 4\n',blob+' tree 4\n',blob+' blob -1\n',blob+' blob 1e3\n',blob+' blob 4\n'+blob+' blob 4\n'])assert.throws(()=>invoke(body));assert.throws(()=>invoke(blob+' blob 4\n',{maxFileBytes:3}));assert.throws(()=>invoke(blob+' blob 4\n',{maxTotalBytes:3}));assert.throws(()=>invoke(blob+' blob 4\n',{maxPaths:0}));assert.throws(()=>invoke(blob+' blob 9007199254740992\n'));
});
test('empty selected input needs no object query and too many rows refuse before requesting sizes',{timeout:60000},()=>{
 const revision='a'.repeat(40),blob='b'.repeat(40),calls=[],run=args=>{calls.push(args);if(args[0]!=='ls-tree')throw Error('unexpected object query');return Buffer.from('100644 blob '+blob+'\tfirst.rs\0'+'100644 blob '+blob+'\tsecond.rs\0');};assert.deepEqual(readSelectedGitSizeRecords({run,revision,select:()=>false,...limits}),[]);assert.equal(calls.length,1);assert.throws(()=>readSelectedGitSizeRecords({run,revision,select:selected,...limits,maxPaths:1}),/path bound/);assert.equal(calls.length,2);
});
test('all three complete controller copies retain native selections both CST phases and the actual strict producer equation',{timeout:60000},()=>{
 const plan=prepareSelectedGitCensus();assert.equal(plan.files.length,3);assert.equal(plan.newCaches,false);assert.equal(plan.semanticAuthority,false);assert.equal(plan.performanceQualified,false);assert.equal(plan.originalLimitsAndValidationBodiesRetained,true);assert.equal(plan.canonicalArchiveBytesUnchanged,true);const strict=plan.files.find(row=>row.path.endsWith('/strict-static-source-producer.mjs'));assert.equal(strict.after,plan.strictProducer.files[0].after);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.allOriginalValidationBodiesRetained,true);assert.equal(row.nativeSelections.length,1);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}assert.equal(row.repositorySelections.length,row.path.endsWith('static-source-universe.mjs')?1:3);}
});

test('the exact census-only predecessor retains both encoder inverses and rejects an unknown compression source',{timeout:60000},t=>{
 const root=mkdtempSync(join(tmpdir(),'router-selected-census-history-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const prefix='tools/translation/',paths=['prepare-real-source-fixtures.mjs','static-source-universe.mjs','strict-static-source-producer.mjs','prepare-strict-static-source-producer.mjs','prepare-selected-git-census.mjs','selected-git-size-records.mjs','source-profiles/selected-git-census/complete-originals.json.gz'];
 const encoder='packed=gzipSync(stored.raw,{level:1,mtime:0})',original='packed=gzipSync(stored.raw,{level:9,mtime:0})';
 for(const name of paths){
  const path=prefix+name,target=join(root,path);mkdirSync(dirname(target),{recursive:true});let bytes=readFileSync(new URL('../../../'+path,import.meta.url));
  if(['prepare-real-source-fixtures.mjs','strict-static-source-producer.mjs'].includes(name)){
   const source=bytes.toString('utf8');assert.equal(source.split(encoder).length,3);bytes=Buffer.from(source.replaceAll(encoder,original));
  }
  writeFileSync(target,bytes);
 }
 const plan=prepareSelectedGitCensus({root});assert.equal(plan.files.length,3);
 for(const row of plan.files){
  assert.equal(row.current,row.censusOnly);assert.equal(row.inverse,row.before);
  if(row.path.endsWith('/static-source-universe.mjs')){assert.equal(row.censusOnly,row.after);assert.deepEqual(row.censusHistory,[]);continue;}
  assert.deepEqual(row.censusHistory.map(stage=>stage.phase),['language','repository']);
  for(const stage of row.censusHistory){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}
  assert.equal(row.censusHistory[0].before,row.current);assert.equal(row.censusHistory[1].after,row.after);
 }
 const path=join(root,prefix+paths[0]),source=readFileSync(path,'utf8');
 assert.equal(source.split(original).length,3);writeFileSync(path,source.replace(original,()=>original.replace('level:9','level:2')));
 assert.throws(()=>prepareSelectedGitCensus({root}),/unknown current source: tools\/translation\/prepare-real-source-fixtures\.mjs/);
});
