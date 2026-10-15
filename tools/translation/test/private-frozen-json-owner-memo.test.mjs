import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const fixture=new URL('../fixtures/private-frozen-json-owner-memo/',import.meta.url),base=new URL('../',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',fixture),'utf8')),directory=mkdtempSync(join(tmpdir(),'router-json-owner-memo-'));
const previous=readFileSync(new URL(manifest.storedPath,fixture),'utf8'),actual=readFileSync(new URL('../private-frozen-json.mjs',import.meta.url),'utf8');
assert.equal(Buffer.byteLength(previous),manifest.bytes);assert.equal(createHash('sha256').update(previous).digest('hex'),manifest.sha256);
function relocate(source,name){const imports=[],relocated=source.replace(/\bfrom (['"])(\.\/[^'"]+)\1/g,(_whole,quote,path)=>{const url=new URL(path,base).href;imports.push({path,url});return 'from '+quote+url+quote;}),path=join(directory,name+'.mjs');writeFileSync(path,relocated);return {source,relocated,imports,path,url:pathToFileURL(path).href};}
const sources={previous:relocate(previous,'previous'),current:relocate(actual,'current')},old=await import(sources.previous.url),current=await import(sources.current.url);
after(()=>rmSync(directory,{recursive:true,force:true}));
function retain(name,value){const output=process.env.ROUTER_PRIVATE_JSON_OWNER_VECTOR_DIR;if(output){mkdirSync(output,{recursive:true});writeFileSync(join(output,name+'.json'),JSON.stringify(value)+'\n',{flag:'wx'});}}

test('complete previous helper is pinned and storage exports and logical budgets stay unchanged',{timeout:5000},()=>{
 assert.deepEqual(Object.keys(current),Object.keys(old));assert.equal(current.privateFrozenJsonCacheFacts().available,true);
 assert.deepEqual(current.privateFrozenJsonCacheFacts().limits,old.privateFrozenJsonCacheFacts().limits);
 assert.equal(current.privateFrozenJsonCacheFacts().eligibilityMemo.maximumEntries,old.privateFrozenJsonCacheFacts().eligibilityMemo.maximumEntries);
 for(const [name,source]of Object.entries(sources)){assert.equal(source.relocated.replace(/\bfrom (['"])(file:[^'"]+)\1/g,(whole,quote,url)=>{const row=source.imports.find(row=>row.url===url);return row?'from '+quote+row.path+quote:whole;}),source.source);retain('01-source-'+name,source);}
});

test('complete owner survives unrelated child churn after its encoded bytes were evicted',{timeout:15000},()=>{
 const owner=Object.freeze({original:Object.freeze({text:'Ω😀\u0000',value:-0})}),children=Object.freeze(Array.from({length:5000},(_,index)=>Object.freeze({index}))),churn=Object.freeze({children});
 function run(module){const cache=module.createPrivateFrozenJsonCache();assert.equal(cache(owner),JSON.stringify(owner));for(let at=0;at<32;at++)cache(Object.freeze({evict:at}));const before=module.privateFrozenJsonCacheFacts();assert.equal(cache(churn),JSON.stringify(churn));const middle=module.privateFrozenJsonCacheFacts();const result=cache(owner),after=module.privateFrozenJsonCacheFacts();return {result,before,middle,after};}
 const expected=run(old),observed=run(current);assert.equal(observed.result,expected.result);assert.equal(observed.result,JSON.stringify(owner));
 assert.ok(observed.after.misses>observed.middle.misses);assert.ok(observed.after.eligibilityMemo.hits>observed.middle.eligibilityMemo.hits);
 assert.ok(observed.middle.eligibilityMemo.rotations>observed.before.eligibilityMemo.rotations);
 assert.ok(observed.after.eligibilityMemo.entries<=observed.after.eligibilityMemo.maximumEntries);
 retain('02-complete-owner-reuse',{owner,churn,expected,observed});
});

test('owner partition itself rotates and never retains an unbounded set of root identities',{timeout:15000},()=>{
 const cache=current.createPrivateFrozenJsonCache(),first=Object.freeze({first:true});cache(first);const before=current.privateFrozenJsonCacheFacts();
 for(let at=0;at<before.eligibilityMemo.owners.maximumEntries+1;at++)assert.equal(cache(Object.freeze({at})),JSON.stringify({at}));
 const middle=current.privateFrozenJsonCacheFacts();assert.ok(middle.eligibilityMemo.rotations>before.eligibilityMemo.rotations);
 const expected=old.createPrivateFrozenJsonCache()(first);assert.equal(cache(first),expected);const after=current.privateFrozenJsonCacheFacts();assert.equal(after.eligibilityMemo.hits,middle.eligibilityMemo.hits);
 assert.ok(after.eligibilityMemo.owners.entries<=after.eligibilityMemo.owners.maximumEntries);assert.ok(after.eligibilityMemo.subtrees.entries<=after.eligibilityMemo.subtrees.maximumEntries);assert.ok(after.eligibilityMemo.entries<=after.eligibilityMemo.maximumEntries);
 retain('03-owner-rotation',{first,before,middle,after,expected});
});

test('a refused final sibling never makes a partially visited root eligible',{timeout:5000},()=>{
 const children=Object.freeze(Array.from({length:100},(_,index)=>Object.freeze({index}))),root=Object.freeze({children,unsupported:()=>7}),cache=current.createPrivateFrozenJsonCache(),reference=old.createPrivateFrozenJsonCache(),before=current.privateFrozenJsonCacheFacts();
 const first=cache(root),middle=current.privateFrozenJsonCacheFacts(),second=cache(root),after=current.privateFrozenJsonCacheFacts();assert.equal(first,reference(root));assert.equal(second,reference(root));assert.equal(second,JSON.stringify(root));
 assert.equal(middle.captures,before.captures);assert.equal(after.captures,before.captures);assert.equal(middle.eligibilityMemo.owners.entries,before.eligibilityMemo.owners.entries);assert.equal(after.eligibilityMemo.owners.entries,before.eligibilityMemo.owners.entries);
 retain('04-incomplete-root',{serialized:first,before,middle,after});
});
