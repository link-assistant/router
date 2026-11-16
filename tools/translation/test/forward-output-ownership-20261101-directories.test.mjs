// Independent filesystem DATA cases, SOURCE ONLY / UNRUN. Original private
// source/producer checks remain separate and mandatory in the real callers.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import {join} from 'node:path';
import {createForwardSourceDirectoryLedger} from '../forward-output-ownership-20261101-directories.mjs';
const stamp=stat=>[stat.dev,stat.ino,stat.mode,stat.size,stat.mtimeNs,stat.ctimeNs].map(value=>value.toString());
function fixture(run){const root=fs.mkdtempSync(join(os.tmpdir(),'router-forward-parent-'));try{return run(root);}finally{fs.rmSync(root,{recursive:true,force:true});}}
function initial(root){const ledger=createForwardSourceDirectoryLedger(),reference={path:root,identity:stamp(fs.lstatSync(root,{bigint:true}))};ledger.observe([reference]);return {ledger,reference};}
function capture(run){let failed=false,value;try{run();}catch(error){failed=true;value=error;}assert.equal(failed,true);return value;}
test('exact own output member changes advance only their actual source parent',()=>fixture(root=>{
 const {ledger,reference}=initial(root),file=join(root,'generated.mjs');ledger.verify();
 ledger.mutate([file],()=>fs.writeFileSync(file,'export const value = 1;\n'));
 assert.deepEqual(reference.identity,stamp(fs.lstatSync(root,{bigint:true})));ledger.verify();
 ledger.mutate([file],()=>fs.unlinkSync(file));ledger.verify();ledger.release();assert.throws(()=>ledger.verify());
}));
test('an unrelated sibling is retained and refuses a purported own output transition',()=>fixture(root=>{
 const {ledger}=initial(root),file=join(root,'generated.mjs'),neighbor=join(root,'authored.txt');
 assert.throws(()=>ledger.mutate([file],()=>{fs.writeFileSync(file,'generated');fs.writeFileSync(neighbor,'external neighbor');}));
 assert.equal(fs.readFileSync(neighbor,'utf8'),'external neighbor');assert.throws(()=>ledger.verify());
}));
test('same-name same-content directory replacement refuses by full identity',()=>fixture(root=>{
 const nested=join(root,'source');fs.mkdirSync(nested);fs.writeFileSync(join(nested,'lib.rs'),'pub fn value() {}\n');
 const {ledger}=initial(nested),other=join(root,'replacement');fs.mkdirSync(other);fs.writeFileSync(join(other,'lib.rs'),fs.readFileSync(join(nested,'lib.rs')));
 fs.renameSync(nested,join(root,'original'));fs.renameSync(other,nested);assert.throws(()=>ledger.verify());
}));
test('all directory closing attempts preserve an exact falsy or frozen primary',()=>{
 for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('original frozen primary'))])fixture(root=>{
  const {ledger}=initial(root),file=join(root,'generated.mjs'),neighbor=join(root,'foreign.txt');
  assert.equal(capture(()=>ledger.mutate([file],()=>{fs.writeFileSync(neighbor,'keep');throw primary;})),primary);
  assert.equal(fs.readFileSync(neighbor,'utf8'),'keep');assert.throws(()=>ledger.verify());
 });
});
test('untouched ancestor clocks cannot be relaxed by a mutation in another directory',()=>fixture(root=>{
 const source=join(root,'source'),output=join(root,'output');fs.mkdirSync(source);fs.mkdirSync(output);const {ledger}=initial(source);
 fs.writeFileSync(join(source,'external.rs'),'// authored\n');
 ledger.mutate([join(output,'generated.mjs')],()=>fs.writeFileSync(join(output,'generated.mjs'),'generated'));
 assert.throws(()=>ledger.verify());assert.equal(fs.readFileSync(join(source,'external.rs'),'utf8'),'// authored\n');
}));
