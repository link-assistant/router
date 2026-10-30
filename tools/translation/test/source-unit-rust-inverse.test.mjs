// Entire integration regression source; execution is deferred during bulk draft.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {planUnitSynchronization,applyUnitSynchronization} from '../synchronize-units.mjs';
const limits={timeout:60_000};
test('a committed three-language unit can synchronize an actual Rust body edit back to JS and TS',limits,async t=>{
 const root=mkdtempSync(join(tmpdir(),'router-unit-rust-inverse-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const git=args=>execFileSync('git',['-C',root,'-c','core.hooksPath=/dev/null','-c','user.name=Router fixture','-c','user.email=fixture@example.invalid',...args],{stdio:'pipe'}),write=(path,value)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),value);};
 git(['init','--quiet']);write('seed.txt','source baseline\n');git(['add','seed.txt']);git(['commit','--quiet','-m','Initial baseline']);
 const unit={id:'twice',profile:'portable',authority:'auto',paths:{Rust:'rust/src/twice.rs',JavaScript:'js/src/twice.mjs',TypeScript:'ts/src/twice.ts'},runtimes:{JavaScript:'js/runtime',TypeScript:'ts/runtime'},meta:'translation/twice.json'};
 write('units.json',JSON.stringify({schema:'router-source-unit-sync-v1',units:[unit]}));write(unit.paths.JavaScript,'/** @param {number} value @returns {number} */ export function twice(value){return value*2;}');
 const options={root,manifestPath:'units.json'},first=planUnitSynchronization(options);assert.equal(first.units[0].authority,'JavaScript');applyUnitSynchronization(JSON.stringify(first),options);git(['add','.']);git(['commit','--quiet','-m','Complete synchronized baseline']);
 const rust=readFileSync(join(root,unit.paths.Rust),'utf8'),changed=rust.replace('* 2.0','* 3.0');assert.notEqual(changed,rust);write(unit.paths.Rust,changed);
 const next=planUnitSynchronization(options);assert.equal(next.units[0].authority,'Rust');assert.equal(next.outputs.some(row=>row.path===unit.paths.Rust),false);
 const metadata=JSON.parse(next.outputs.find(row=>row.path===unit.meta).after),history=metadata.semanticMeta.portableRustSourceHistory;assert.ok(history);assert.equal(history.equation.inverse,changed);assert.equal(history.runtimeAuthority,false);
 applyUnitSynchronization(JSON.stringify(next),options);assert.equal(readFileSync(join(root,unit.paths.Rust),'utf8'),changed);
 const module=await import(pathToFileURL(join(root,unit.paths.JavaScript)).href);for(const value of [0,1,-1,0.5])assert.equal(module.twice(value),value*3);
 assert.ok(readFileSync(join(root,unit.paths.TypeScript),'utf8').includes('* 3'));assert.equal(next.rustExecuted,false);
});
