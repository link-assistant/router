import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const fixture=new URL('../fixtures/private-frozen-json-cohorts/',import.meta.url),base=new URL('../',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',fixture),'utf8')),directory=mkdtempSync(join(tmpdir(),'router-json-cohorts-'));
const previous=readFileSync(new URL(manifest.storedPath,fixture),'utf8'),actual=readFileSync(new URL('../private-frozen-json.mjs',import.meta.url),'utf8');
assert.equal(Buffer.byteLength(previous),manifest.bytes);assert.equal(createHash('sha256').update(previous).digest('hex'),manifest.sha256);
function relocate(source,name){const imports=[],relocated=source.replace(/\bfrom (['"])(\.\/[^'"]+)\1/g,(_whole,quote,path)=>{const url=new URL(path,base).href;imports.push({path,url});return 'from '+quote+url+quote;}),path=join(directory,name+'.mjs');writeFileSync(path,relocated);return {source,relocated,imports,path,url:pathToFileURL(path).href};}
const sources={previous:relocate(previous,'previous'),current:relocate(actual,'current')},old=await import(sources.previous.url),current=await import(sources.current.url);
after(()=>rmSync(directory,{recursive:true,force:true}));
function retain(name,value){const output=process.env.ROUTER_PRIVATE_JSON_COHORT_VECTOR_DIR;if(output){mkdirSync(output,{recursive:true});writeFileSync(join(output,name+'.json'),JSON.stringify(value)+'\n',{flag:'wx'});}}

test('complete previous helper and exact 63/64-cell subtrees preserve JSON budgets and bounded cohorts',{timeout:5000},()=>{
 assert.deepEqual(Object.keys(old),['createPrivateFrozenJsonCache','privateFrozenJsonCacheFacts']);assert.deepEqual(Object.keys(current),['createPrivateFrozenJsonCache','createPrivateFrozenJsonComposer','privateFrozenJsonCacheFacts','privateFrozenJsonEqualHint']);
 for(const name of ['createPrivateFrozenJsonCache','createPrivateFrozenJsonComposer','privateFrozenJsonCacheFacts'])assert.equal(typeof current[name],'function');
 assert.equal(typeof current.privateFrozenJsonEqualHint,'function');
 let hintReads=0;const mutableHintInput={value:1},getterHintInput=Object.freeze(Object.defineProperty({},'value',{enumerable:true,get(){hintReads++;return 1;}})),proxyHintInput=new Proxy(Object.freeze({value:1}),{get(){hintReads++;throw Error('hint proxy read');},ownKeys(){hintReads++;throw Error('hint proxy keys');},getOwnPropertyDescriptor(){hintReads++;throw Error('hint proxy descriptor');},getPrototypeOf(){hintReads++;throw Error('hint proxy prototype');}});
 const beforeHint=current.privateFrozenJsonCacheFacts(),hintRefusals=[current.privateFrozenJsonEqualHint(Object.freeze({value:1}),Object.freeze({value:2})),current.privateFrozenJsonEqualHint(mutableHintInput,mutableHintInput),current.privateFrozenJsonEqualHint(getterHintInput,getterHintInput),current.privateFrozenJsonEqualHint(proxyHintInput,proxyHintInput)],afterHint=current.privateFrozenJsonCacheFacts();
 assert.deepEqual(hintRefusals,[null,null,null,null]);assert.equal(hintReads,0);assert.deepEqual(afterHint,beforeHint);
 retain('01-additive-equality-hint-refusals',{namespace:Object.keys(current),oldStorageExportsCallable:true,equalityHintCallable:typeof current.privateFrozenJsonEqualHint,subjects:['unequal-frozen','mutable','accessor','proxy'],hintRefusals,hintReads,beforeHint,afterHint});
 assert.deepEqual(current.privateFrozenJsonCacheFacts().limits,old.privateFrozenJsonCacheFacts().limits);
 assert.equal(current.privateFrozenJsonCacheFacts().eligibilityMemo.maximumEntries,old.privateFrozenJsonCacheFacts().eligibilityMemo.maximumEntries);
 for(const [name,source]of Object.entries(sources)){assert.equal(source.relocated.replace(/\bfrom (['"])(file:[^'"]+)\1/g,(whole,quote,url)=>{const row=source.imports.find(row=>row.url===url);return row?'from '+quote+row.path+quote:whole;}),source.source);retain('01-source-'+name,source);}
 const small=Object.freeze(Array(62).fill(null)),large=Object.freeze(Array(63).fill(null)),root=Object.freeze({small,large}),cache=current.createPrivateFrozenJsonCache(),before=current.privateFrozenJsonCacheFacts();
 assert.equal(cache(root),old.createPrivateFrozenJsonCache()(root));const middle=current.privateFrozenJsonCacheFacts();assert.equal(middle.eligibilityMemo.subtrees.small.entries,before.eligibilityMemo.subtrees.small.entries+1);assert.equal(middle.eligibilityMemo.subtrees.large.entries,before.eligibilityMemo.subtrees.large.entries+1);
 const alias=Object.freeze({anotherSmall:small,anotherLarge:large});assert.equal(cache(alias),JSON.stringify(alias));const after=current.privateFrozenJsonCacheFacts();assert.equal(after.eligibilityMemo.subtrees.large.hits,middle.eligibilityMemo.subtrees.large.hits+1);assert.equal(after.eligibilityMemo.subtrees.small.hits,middle.eligibilityMemo.subtrees.small.hits+1);
 assert.equal(typeof current.createPrivateFrozenJsonComposer,'function');const compose=current.createPrivateFrozenJsonComposer();assert.equal(typeof compose,'function');const wrapper={entry:root,sequence:0},first=compose(wrapper),repeat=compose(wrapper);assert.equal(first,JSON.stringify(wrapper));assert.equal(repeat,first);wrapper.sequence=1;const changed=compose(wrapper);assert.equal(changed,JSON.stringify(wrapper));assert.notEqual(changed,first);retain('01-current-composer-extension',{wrapper,first,repeat,changed});
 retain('01-boundary',{root,alias,before,middle,after});
});

test('shared complete large subtree survives tiny-node churn and independent complete-owner rotation',{timeout:15000},()=>{
 const payload=Object.freeze(Array.from({length:100},(_,index)=>Object.freeze({index}))),first=Object.freeze({payload}),churn=Object.freeze({tiny:Object.freeze(Array.from({length:5000},(_,index)=>Object.freeze({index})))}),next=Object.freeze({reused:payload});
 function run(module){const cache=module.createPrivateFrozenJsonCache();assert.equal(cache(first),JSON.stringify(first));const before=module.privateFrozenJsonCacheFacts();for(let at=0;at<before.eligibilityMemo.owners.maximumEntries+1;at++)cache(Object.freeze({owner:at}));assert.equal(cache(churn),JSON.stringify(churn));const middle=module.privateFrozenJsonCacheFacts(),value=cache(next),after=module.privateFrozenJsonCacheFacts();return {value,before,middle,after};}
 const expected=run(old),observed=run(current);assert.equal(observed.value,expected.value);assert.equal(observed.value,JSON.stringify(next));assert.ok(observed.after.eligibilityMemo.subtrees.large.hits>observed.middle.eligibilityMemo.subtrees.large.hits);assert.ok(observed.middle.eligibilityMemo.rotations>observed.before.eligibilityMemo.rotations);
 assert.ok(observed.after.eligibilityMemo.entries<=observed.after.eligibilityMemo.maximumEntries);assert.ok(observed.after.eligibilityMemo.owners.entries<=observed.after.eligibilityMemo.owners.maximumEntries);for(const size of ['small','large'])assert.ok(observed.after.eligibilityMemo.subtrees[size].entries<=observed.after.eligibilityMemo.subtrees[size].maximumEntries);
 retain('02-large-reuse',{first,churn,next,expected,observed});
});

