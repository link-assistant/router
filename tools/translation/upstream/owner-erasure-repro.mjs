// Read-only reproduction against unmodified pinned upstream; never runs Rust.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {translateProgram} from '../vendor/meta-language/program-translation.js';

const vendor=new URL('../vendor/',import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex');
const lockBytes=readFileSync(new URL('upstream-lock.json',vendor));
const lock=JSON.parse(lockBytes);
for(const [path,expected] of Object.entries(lock.files))assert.equal(hash(readFileSync(new URL(path,vendor))),expected,`modified vendor: ${path}`);
const relevant=['program-translation.js','translation/rust.js','translation/check.js','translation/emit-javascript.js'];
const nodeVersion=spawnSync('node',['--version'],{encoding:'utf8',timeout:5000});
assert.equal(nodeVersion.status,0);assert.equal(nodeVersion.stderr,'');
const cases=[];
for(const [owner,method] of [['String','from'],['Box','new']]){
  for(const qualified of [false,true]){
    const callee=`${qualified?'crate::':''}${owner}::${method}`;
    const source=`mod ${owner} {pub fn ${method}(value:&str)->&'static str{"CUSTOM"}} fn caller()->&'static str{${callee}("x")} fn main(){println!("{}",caller());}`;
    const result=translateProgram(source,'Rust','JavaScript');
    assert.equal(result.contract.support,'semantic-translation');assert.equal(result.diagnostic,null);
    assert.equal(result.semantics.provenance.sourceSha256,hash(source));
    // Execute the exact complete emitted program, including its original header.
    const executed=spawnSync('node',['--input-type=module'],{input:result.code,encoding:'utf8',timeout:5000,maxBuffer:131072});
    assert.equal(executed.error,undefined);assert.equal(executed.status,0);assert.equal(executed.stderr,'');
    assert.equal(executed.stdout,qualified?'CUSTOM\n':'x\n');
    cases.push({owner,callee,source,sourceSha256:hash(source),sourceBytes:Buffer.byteLength(source),support:result.contract.support,diagnostic:result.diagnostic,emittedJavaScript:result.code,emittedSha256:hash(result.code),node:{status:executed.status,stdout:executed.stdout,stderr:executed.stderr},rustExpectation:{stdout:'CUSTOM\n',basis:'Source-derived name resolution: the local module supplies this function; no Rust compiler was executed.'},isWorkaroundControl:qualified});
  }
}
const macroSource='macro_rules! marker { () => { "CUSTOM" }; } fn main() { println!("{}", marker!()); }';
const macro=translateProgram(macroSource,'Rust','JavaScript');
assert.equal(macro.contract.support,'portable-encoding');assert.ok(macro.diagnostic);
assert.match(macro.diagnostic.message,/macro_rules/u);
const record={schema:'router-pinned-upstream-owner-erasure-reproduction-v1',upstream:{repository:'link-foundation/meta-language',commit:'e46e196db5ec34bf13a73b8645aa38d409737e60',lockSha256:hash(lockBytes),verifiedFiles:Object.keys(lock.files).length,fileHashes:Object.fromEntries(relevant.map(path=>[path,lock.files[`meta-language/${path}`]]))},nodeVersion:nodeVersion.stdout.trim(),rustExecuted:false,fullParity:false,routerProductionBodyCount:0,cases,macroControl:{source:macroSource,sourceSha256:hash(macroSource),support:macro.contract.support,diagnostic:macro.diagnostic,executed:false,scope:'Whole-source upstream macro definition is refused. Router per-item macro-context erasure is a separate downstream issue.'}};
process.stdout.write(JSON.stringify(record,null,2)+'\n');
