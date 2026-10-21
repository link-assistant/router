import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {preparePrivateParserAssignmentDataCandidate} from '../prepare-private-parser-assignment-data-candidate.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import * as candidate from '../private-parser-assignment-data-candidate.mjs';
import * as original from '../private-parser-execution.mjs';
import * as facade from '../private-parser-assignment-data.mjs';
import {Hash} from 'node:crypto';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
function scratch(t){const path=mkdtempSync(join(tmpdir(),'router-private-DATA-assignment-'));t.after(()=>rmSync(path,{recursive:true,force:true}));return path;}
function outcome(run){try{return {value:run()};}catch(error){return {error:{name:error.name,message:error.message}};}}
function probe(t){
 const before=readFileSync(resolve(ROOT,'tools/translation/private-parser-assignment-data-candidate.mjs'),'utf8'),directory=scratch(t),path=join(directory,'actual-complete-executor-probe.mjs');
 // The diagnostic seam invokes the actual two private copiers under their
 // original guards. It issues DATA only and does not become a shipped API.
 const suffix="\nexport function inspectActualPrivateData(value,whole,budget){checked();const result=whole?assignmentData(value,0,budget):data(value,0,budget);checked();return result;}\n";
 const imports=["./private-parser-sha256.mjs","./original-json-intrinsics.mjs"];let language=before;
 for(const name of imports){const token="from '"+name+"'",replacement="from '"+new URL(name,new URL('../private-parser-assignment-data-candidate.mjs',import.meta.url)).href+"'";assert.equal(language.split(token).length,2);language=language.replace(token,replacement);}
 const after=language+suffix,rule=(old,next,id)=>({id,edits:[{span:[0,old.length],expected:old,replacement:next}]}),first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),run=applyConcreteSyntaxSubstitutions(first.document,{languageRules:[rule(before,language,'javascript:retain-whole-original-private-copier-probe')],repositoryRules:[rule(language,after,'router:absolute-current-imports-and-explicit-DATA-only-test-seam')]}),stored=serializeConcreteSyntaxMeta(run.value);
 assert.equal(transportConcreteSyntaxMeta(stored).source,after);const inverse=applyConcreteSyntaxSubstitutions(run.value,{languageRules:[rule(after,before,'javascript:restore-entire-private-executor')],repositoryRules:[]});assert.equal(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source,before);writeFileSync(path,after,{flag:'wx'});assert.equal(readFileSync(path,'utf8'),after);return {path,directory};
}

test('actual complete original executor and copiers remain available beside native-bound CST candidate routes',{timeout:60000},()=>{
 const plan=preparePrivateParserAssignmentDataCandidate(),row=plan.files[0];assert.equal(plan.files.length,1);assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.ok(row.after.startsWith(row.before));assert.equal(row.selection.originalAPIsUntouched,true);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(plan.defaultChanged,false);assert.equal(plan.performanceQualified,false);assert.equal(row.sequence.languageRules.length,1);assert.equal(row.sequence.repositoryRules.length,1);
 assert.ok(row.selection.propertyWrite.replacement.includes('key in result'));assert.ok(row.selection.data.edits.some(edit=>edit.expected==='data'&&edit.replacement==='assignmentData'));
 assert.equal(facade.lexPrivateConcreteSource,candidate.lexAssignmentPrivateConcreteSource);assert.equal(facade.lexPrivateConcreteSources,candidate.lexAssignmentPrivateConcreteSources);assert.equal(facade.originalPrivateParserSourceInputs,candidate.originalAssignmentPrivateParserSourceInputs);
});

test('complete Rust JavaScript and TypeScript lexical operations and recipes preserve old data and source fences',{timeout:60000},()=>{
 const rows=[{source:'pub fn value()->u8{7}',language:'Rust'},{source:'export function value(){return [true,7,"x"]}',language:'JavaScript'},{source:'export function value():number{return 7}',language:'TypeScript'}];
 for(const row of rows){const baseline=original.lexPrivateConcreteSource(row.source,row.language);assert.deepStrictEqual(candidate.lexAssignmentPrivateConcreteSource(row.source,row.language),baseline);assert.deepStrictEqual(candidate.lexPrivateConcreteSource(row.source,row.language),baseline);}
 assert.deepStrictEqual(candidate.lexAssignmentPrivateConcreteSources(rows),original.lexPrivateConcreteSources(rows));assert.deepStrictEqual(candidate.originalAssignmentPrivateParserSourceInputs(),original.originalPrivateParserSourceInputs());
 assert.deepStrictEqual(outcome(()=>candidate.lexAssignmentPrivateConcreteSource('x','unknown')),outcome(()=>original.lexPrivateConcreteSource('x','unknown')));
});

test('actual private DATA copies preserve every descriptor prototype sparse array and tolerated inherited get without invocation',{timeout:60000},async t=>{
 const {path}=probe(t),subject=await import(pathToFileURL(path).href),descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty,prior=descriptor(Object.prototype,'get');let calls=0;
 const values=[Object.assign(Object.create(null),{ordinary:1}),{ordinary:[null,undefined,2n,NaN,Infinity,-0]},Object.defineProperty({},'__proto__',{value:{retained:'own DATA'},enumerable:true}),Object.defineProperty({},'get',{value:'own DATA',enumerable:true})];
 const array=[];array[3]='sparse';define(array,'toString',{value:'own DATA',enumerable:true});values.push(array);
 try{define(Object.prototype,'get',{__proto__:null,get(){calls++;throw Error('inherited getter must remain unused');},configurable:true});for(const value of values){const baseline=subject.inspectActualPrivateData(value,false),actual=subject.inspectActualPrivateData(value,true);assert.deepStrictEqual(actual,baseline);assert.equal(Object.getPrototypeOf(actual),Object.getPrototypeOf(baseline));for(const key of Reflect.ownKeys(baseline))assert.deepStrictEqual(descriptor(actual,key),descriptor(baseline,key));}}finally{if(prior)define(Object.prototype,'get',prior);else delete Object.prototype.get;}assert.equal(calls,0);
});

test('actual private DATA copier retains accessor proxy class symbol function and depth refusals without caller callbacks',{timeout:60000},async t=>{
 const {path}=probe(t),subject=await import(pathToFileURL(path).href);let calls=0;
 const values=[()=>0,Symbol('refused'),new (class Private {})(),new Proxy({value:1},{get(){calls++;},ownKeys(){calls++;return [];}}),Object.defineProperty({},'value',{get(){calls++;},enumerable:true}),{[Symbol('refused')]:1}];
 let nested={};for(let at=0;at<258;at++)nested={nested};values.push(nested);
 for(const value of values){const baseline=outcome(()=>subject.inspectActualPrivateData(value,false)),actual=outcome(()=>subject.inspectActualPrivateData(value,true));assert.ok(baseline.error);assert.deepStrictEqual(actual,baseline);}assert.equal(calls,0);
 for(const cells of [0,1,3]){const before={cells},after={cells},value={nested:[1,2]};assert.deepStrictEqual(outcome(()=>subject.inspectActualPrivateData(value,true,after)),outcome(()=>subject.inspectActualPrivateData(value,false,before)));assert.deepStrictEqual(after,before);}
});

test('a genuine observed original source hash installing an inherited setter still refuses before DATA escapes',{timeout:60000},()=>{
 const descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty,update=descriptor(Hash.prototype,'update'),prior=descriptor(Object.prototype,'text'),source='pub fn guarded()->u8{7}';
 original.lexPrivateConcreteSource(source,'Rust');candidate.lexAssignmentPrivateConcreteSource(source,'Rust');const rows=[];
 for(const api of [original.lexPrivateConcreteSource,candidate.lexAssignmentPrivateConcreteSource]){
  let hashes=0,setters=0;const tape=[];let result;
  try{define(Hash.prototype,'update',{...update,value:function(...args){const returned=Reflect.apply(update.value,this,args);tape.push(args);hashes++;if(hashes===1)define(Object.prototype,'text',{__proto__:null,set(){setters++;},configurable:true});return returned;}});result=outcome(()=>api(source,'Rust'));}
  finally{define(Hash.prototype,'update',update);if(prior)define(Object.prototype,'text',prior);else delete Object.prototype.text;}
  assert.ok(hashes>0);assert.ok(tape.every(args=>args.length>0));assert.equal(setters,0);assert.ok(result.error);rows.push({result,tape});
 }
 assert.deepStrictEqual(rows[1],rows[0]);assert.deepStrictEqual(candidate.lexAssignmentPrivateConcreteSource(source,'Rust'),original.lexPrivateConcreteSource(source,'Rust'));
});

test('cold native nonwritable inherited Object and Array keys preserve defineProperty behavior',{timeout:60000},t=>{
 const {path,directory}=probe(t);
 for(const kind of ['Object','Array']){
  const source="import assert from 'node:assert/strict';\nconst owner="+kind+".prototype,key="+JSON.stringify(kind==='Object'?'toString':'map')+",field=Object.getOwnPropertyDescriptor(owner,key);Object.defineProperty(owner,key,{...field,writable:false});\nconst subject=await import("+JSON.stringify(pathToFileURL(path).href)+");const value="+(kind==='Object'?'{}':'[]')+";Object.defineProperty(value,key,{value:'complete own data',enumerable:true});const old=subject.inspectActualPrivateData(value,false),actual=subject.inspectActualPrivateData(value,true);assert.deepStrictEqual(actual,old);assert.deepStrictEqual(Object.getOwnPropertyDescriptor(actual,key),{value:'complete own data',writable:true,enumerable:true,configurable:true});process.stdout.write(JSON.stringify({kind:"+JSON.stringify(kind)+",complete:actual[key],descriptor:Object.getOwnPropertyDescriptor(actual,key)}));\n",child=join(directory,kind+'-cold.mjs');writeFileSync(child,source,{flag:'wx'});assert.equal(readFileSync(child,'utf8'),source);const result=JSON.parse(execFileSync(process.execPath,[child],{encoding:'utf8',timeout:12500,maxBuffer:8*1024*1024}));assert.equal(result.complete,'complete own data');assert.equal(result.descriptor.writable,true);
 }
});
