import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gunzipSync,gzipSync} from 'node:zlib';
import {readOwnedReaderSourceHistory,readHostAssetSourceHistory} from './owned-reader-source-history.mjs';
const helper=new URL('./owned-reader-source-history.mjs',import.meta.url);
const current=()=>readFileSync(new URL('../js-to-rust/owned-core-source.mjs',import.meta.url),'utf8');
test('complete reader history refuses foreign bodies imports suffixes and nonprimitive source',{timeout:60000},()=>{
 const source=current();
 for(const changed of [source+'\n',source.replace('export function','export async function'),"import 'foreign-history';\n"+source]){
  assert.notEqual(changed,source);assert.throws(()=>readOwnedReaderSourceHistory(changed),/complete current reader differs/);
 }
 assert.throws(()=>readOwnedReaderSourceHistory({source}),/complete primitive current reader/);
 const host=readFileSync(new URL('../host-assets.mjs',import.meta.url),'utf8');
 for(const changed of [host+'\n',host.replace('export function','export async function'),"import 'foreign-history';\n"+host]){
  assert.notEqual(changed,host);assert.throws(()=>readHostAssetSourceHistory(changed),/complete current reader differs/);
 }
 assert.throws(()=>readHostAssetSourceHistory({source:host}),/complete primitive current reader/);
});
test('a fresh historical reader refuses corrupt and validly reencoded changed archives',{timeout:60000},async t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-owned-reader-history-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const original=readFileSync(helper,'utf8'),edits=[];let code=original;
 const imports=[...code.matchAll(/from '(\.\.\/[^']+)'/gu)];assert.equal(imports.length,2);
 for(const match of imports){const before=match[0],after='from '+JSON.stringify(new URL(match[1],helper).href);assert.equal(code.split(before).length,2);code=code.replace(before,()=>after);edits.push({before,after});}
 const archive=join(directory,'layers.json.gz'),before="new URL('./fixtures/owned-reader-history/layers.json.gz',import.meta.url)",after='new URL('+JSON.stringify(pathToFileURL(archive).href)+')';
 assert.equal(code.split(before).length,2);code=code.replace(before,()=>after);edits.push({before,after});
 let inverse=code;for(const edit of [...edits].reverse())inverse=inverse.replace(edit.after,()=>edit.before);assert.equal(inverse,original);
 const modulePath=join(directory,'history.mjs');writeFileSync(modulePath,code,{flag:'wx'});assert.equal(readFileSync(modulePath,'utf8'),code);
 const reader=(await import(pathToFileURL(modulePath).href)).readOwnedReaderSourceHistory;
 const packed=readFileSync(new URL('./fixtures/owned-reader-history/layers.json.gz',import.meta.url));
 const corrupt=Buffer.from(packed);corrupt[corrupt.length-1]^=1;writeFileSync(archive,corrupt,{flag:'wx'});
 assert.throws(()=>reader(current()),/complete historical producer archive differs/);
 const changed=JSON.parse(gunzipSync(packed));changed.layers[0].row.before+='\n';
 writeFileSync(archive,gzipSync(JSON.stringify(changed)+'\n'));
 assert.throws(()=>reader(current()),/complete historical producer archive differs/);
});
