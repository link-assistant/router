// Independent integration source. Do not execute during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {planUnitSynchronization,applyUnitSynchronization} from '../synchronize-units.mjs';
const limits={timeout:60_000};
test('TypeScript to Rust baseline and Rust body edits preserve actual aliases and optional API',limits,async t=>{
 const root=mkdtempSync(join(tmpdir(),'router-unit-paired-api-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const write=(path,value)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),value);},git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe'});
 git(['init','--quiet']);write('seed.txt','source baseline\n');git(['add','seed.txt']);git(['commit','--quiet','-m','Initial source baseline']);
 const unit={id:'normalize',profile:'portable',authority:'auto',paths:{Rust:'rust/src/normalize.rs',JavaScript:'js/src/normalize.mjs',TypeScript:'ts/src/normalize.ts'},runtimes:{JavaScript:'js/runtime',TypeScript:'ts/runtime'},meta:'translation/normalize.json'},source='export type Count=number; type Maybe<T>=T|undefined; export function normalize(value?:Count):Maybe<Count>{if(value===undefined){return undefined;}return value+1;}';
 write('units.json',JSON.stringify({schema:'router-source-unit-sync-v1',units:[unit]}));write(unit.paths.TypeScript,source);const options={root,manifestPath:'units.json'};
 const first=planUnitSynchronization(options);assert.equal(first.units[0].authority,'TypeScript');applyUnitSynchronization(JSON.stringify(first),options);assert.equal(readFileSync(join(root,unit.paths.TypeScript),'utf8'),source);git(['add','.']);git(['commit','--quiet','-m','Complete typed source baseline']);
 const rust=readFileSync(join(root,unit.paths.Rust),'utf8'),changed=rust.replace('+ 1.0','+ 2.0');assert.notEqual(changed,rust);write(unit.paths.Rust,changed);
 const next=planUnitSynchronization(options);assert.equal(next.units[0].authority,'Rust');const target=next.outputs.find(row=>row.path===unit.paths.TypeScript);assert.match(target.after,/value\?\s*:\s*Count/);assert.ok(target.after.includes('type Maybe<T>=T|undefined;'));
 const metadata=JSON.parse(next.outputs.find(row=>row.path===unit.meta).after);assert.ok(metadata.semanticMeta.pairedTypeScriptAPIHistory);assert.equal(metadata.semanticMeta.pairedTypeScriptAPIHistory.runtimeAuthority,false);assert.equal(metadata.semanticMeta.portableRustSourceHistory.equation.inverse,changed);
 applyUnitSynchronization(JSON.stringify(next),options);assert.equal(readFileSync(join(root,unit.paths.Rust),'utf8'),changed);const module=await import(pathToFileURL(join(root,unit.paths.JavaScript)).href);assert.equal(module.normalize(),undefined);assert.equal(module.normalize(1),3);assert.equal(next.rustExecuted,false);
});
