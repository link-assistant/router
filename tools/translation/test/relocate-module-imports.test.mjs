import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {relocateModuleImports} from './relocate-module-imports.mjs';
import {relocateSourceModule} from './relocate-source-module.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
function fixture(t){const root=mkdtempSync(join(tmpdir(),'router-import-only-copy-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const original=join(root,'original'),target=join(root,'target');for(const path of [original,target])mkdirSync(path);for(const [path,n]of [[original,1],[target,2]]){writeFileSync(join(path,'dep.mjs'),'export const value='+n+';');writeFileSync(join(path,'resource.txt'),String(n));}return {original,target};}
const source='import {readFileSync} from "node:fs";\nimport {value} from "./dep.mjs";\nexport {value as exported} from "./dep.mjs";\nconst dynamic=await import("./dep.mjs");\nexport const result=[value,dynamic.value,readFileSync(new URL("./resource.txt",import.meta.url),"utf8")];\nexport const historical="import.meta.url and ./dep.mjs";\n';

test('complete current module imports relocate while actual copied resource URLs remain local',{timeout:15000},async t=>{
 const {original,target}=fixture(t),origin=pathToFileURL(join(original,'subject.mjs')).href,proposal=relocateModuleImports(source,origin);assert.equal(proposal.selected.length,3);assert.equal(proposal.selected.some(row=>row.kind==='original-module-url'),false);assert.equal(proposal.localResourceBasePreserved,true);assert.equal(proposal.compilerAuthority,false);assert.equal(proposal.inverse,source);assert.deepEqual(proposal.trace.map(row=>row.phase),['language','repository']);for(const [wire,expected]of [[proposal.beforeMeta,source],[proposal.afterMeta,proposal.text]])assert.equal(transportConcreteSyntaxMeta(wire).source,expected);
 const path=join(target,'subject.mjs');writeFileSync(path,proposal.text);const actual=await import(pathToFileURL(path));assert.deepEqual(actual.result,[1,1,'2']);assert.equal(actual.exported,1);assert.equal(actual.historical,'import.meta.url and ./dep.mjs');
});

test('original whole-module relocation still retains original resource identity independently',{timeout:15000},async t=>{
 const {original,target}=fixture(t),origin=pathToFileURL(join(original,'subject.mjs')).href,proposal=relocateSourceModule(source,origin);assert.equal(proposal.selected.filter(row=>row.kind==='original-module-url').length,1);const path=join(target,'subject.mjs');writeFileSync(path,proposal.text);assert.deepEqual((await import(pathToFileURL(path))).result,[1,1,'1']);assert.equal(proposal.inverse,source);
});

test('explicit import substitutions never rewrite local resource text or historical embedded strings',{timeout:15000},async t=>{
 const {original,target}=fixture(t),custom=join(original,'custom.mjs');writeFileSync(custom,'export const value=9;');const origin=pathToFileURL(join(original,'subject.mjs')).href,proposal=relocateModuleImports(source,origin,new Map([['./dep.mjs',pathToFileURL(custom).href]]));assert.equal(proposal.selected.length,3);const path=join(target,'subject.mjs');writeFileSync(path,proposal.text);assert.deepEqual((await import(pathToFileURL(path))).result,[9,9,'2']);let inverse=proposal.text;for(const row of [...proposal.mapping].reverse()){const [start,end]=row.afterSpan;assert.equal(inverse.slice(start,end),row.after);inverse=inverse.slice(0,start)+row.before+inverse.slice(end);}assert.equal(inverse,source);
});

test('malformed source escaping origins and observable override records cannot supply source permission',{timeout:15000},()=>{
 const origin='file:///original/subject.mjs';assert.throws(()=>relocateModuleImports('export const =;',origin),/grammar/);for(const changed of ['https://example.com/source.mjs','file:///original/source.mjs?query','file:///original/source.mjs#hash'])assert.throws(()=>relocateModuleImports(source,changed),/original file URL/);let calls=0;const proxy=new Proxy(new Map(),{get(){calls++;throw Error('observed');},getPrototypeOf(){calls++;throw Error('observed');}});assert.throws(()=>relocateModuleImports(source,origin,proxy));assert.equal(calls,0);assert.throws(()=>relocateModuleImports({source,compilerAuthority:true},origin));
});
