import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createPrivateDescribedByteOutputTextMap} from '../private-described-byte-output-text.mjs';
import {deriveDescribedByteOutputTextSource} from '../prepare-described-byte-output-text.mjs';
import {captureOwnedDefinitionInputs,packageOwnedDefinitions,finishOwnedDefinitionOutput} from '../owned-definition-output.mjs';
import {effectRuntimeAssets} from '../effect-assets.mjs';import {hostRuntimeAssetsNamedDataAliases} from '../host-assets.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../',import.meta.url)),hash=value=>createHash('sha256').update(value).digest('hex');
function allUnits(){let value='';for(let base=0;base<65536;base+=256)value+=String.fromCharCode(...Array.from({length:256},(_,index)=>base+index));return value;}
const nativeDescriptions=map=>[...map].map(([path,text])=>({path,bytes:Buffer.byteLength(text),sha256:hash(text)}));
function concrete(source){const wire=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).document);assert.equal(transportConcreteSyntaxMeta(wire).source,source);return wire;}

test('description hashes preserve every UTF16 unit and surrogate pairs across all chunk boundaries',limits,()=>{
 const sources=['','\ud800','\udc00','\u0000猫😀',allUnits(),'a'.repeat(65535)+'😀tail','a'.repeat(131071)+'😀tail','a'.repeat(65535)+'\ud800x','a'.repeat(65535)+'\udc00x',('猫\ud800\u0000😀').repeat(40000)],map=createPrivateDescribedByteOutputTextMap(),native=new Map();
 for(const [index,text]of sources.entries()){map.set('source'+index,text);native.set('source'+index,text);}
 assert.deepEqual([...map.descriptions()],nativeDescriptions(native));assert.deepEqual([...map], [...native]);
 for(const row of map.descriptions()){assert.ok(Object.isFrozen(row));assert.throws(()=>{row.sha256='changed';},TypeError);}
});

test('replacement deletion and live description iteration track the same complete current cells',limits,()=>{
 const map=createPrivateDescribedByteOutputTextMap(),native=new Map(),put=(key,text)=>{assert.equal(map.set(key,text),map);native.set(key,text);};
 put('a','a'.repeat(150000));put('b','猫'.repeat(90000));put('a','😀'.repeat(60000));const cursor=map.descriptions();assert.deepEqual(cursor.next().value,nativeDescriptions(native)[0]);
 assert.equal(map.delete('b'),native.delete('b'));put('c','last\ud800');assert.deepEqual(cursor.next().value,nativeDescriptions(native)[1]);assert.equal(cursor.next().done,true);assert.equal(map.get('missing'),undefined);assert.equal(map.delete('missing'),false);
 const before=[...map.descriptions()];assert.throws(()=>map.set('bad',{}),TypeError);assert.deepEqual([...map.descriptions()],before);assert.deepEqual([...map.keys()],[...native.keys()]);assert.deepEqual([...map.values()],[...native.values()]);
});

test('complete actual source derivation preserves the old byte module and every CST inverse',limits,()=>{
 const original=readFileSync(new URL('../private-byte-output-text.mjs',import.meta.url),'utf8'),proposal=deriveDescribedByteOutputTextSource(original),current=readFileSync(new URL('../private-described-byte-output-text.mjs',import.meta.url),'utf8');
 assert.equal(proposal.text,current);assert.equal(proposal.inverse,original);assert.equal(transportConcreteSyntaxMeta(proposal.beforeMeta).source,original);assert.equal(transportConcreteSyntaxMeta(proposal.afterMeta).source,current);assert.deepEqual([...new Set(proposal.trace.map(row=>row.phase))],['language','repository']);
 assert.deepEqual(proposal.authority,{source:false,owner:false,semantic:false});for(const source of [null,'',original.replace('mapSet(records,key,storage.retain(text))','changedMapSet(records,key,storage.retain(text))')])assert.throws(()=>deriveDescribedByteOutputTextSource(source));
 assert.equal(readFileSync(new URL('../private-byte-output-text.mjs',import.meta.url),'utf8'),original);
});

test('description census restores zero outputs in a complete source-derived receiving observer',limits,async()=>{
 const path=new URL('../private-described-byte-output-text.mjs',import.meta.url),before=readFileSync(path,'utf8'),anchor='function restore(cell){';assert.equal(before.split(anchor).length,2);
 const observed=before.replace(anchor,anchor+'observedRestoreCalls++;')+'\nlet observedRestoreCalls=0;export const readObservedRestoreCalls=()=>observedRestoreCalls;\n';
 const first=applyConcreteSyntaxSubstitutions(transportConcreteSyntaxMeta(concrete(before)).document,{languageRules:[{id:'receiving:complete-restoration-observer',edits:[{span:[0,before.length],expected:before,replacement:observed}]}],repositoryRules:[]});let source=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(first.value)).source;
 const ts=ownershipCompiler(),file=ts.createSourceFile(path.pathname,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);const edits=[];
 for(const node of file.statements)if(ts.isImportDeclaration(node)&&node.moduleSpecifier.text.startsWith('.')){const start=node.moduleSpecifier.getStart(file),end=node.moduleSpecifier.end,old=source.slice(start,end),quote=old[0];edits.push({span:[start,end],expected:old,replacement:quote+new URL(node.moduleSpecifier.text,path).href+quote});}
 // The concrete layer intentionally retains this helper as one opaque
 // source node. TypeScript independently selects imports; change that complete
 // CST node and retain every exact parsed-specifier inverse separately.
 let relocated=source;for(const edit of [...edits].reverse()){assert.equal(relocated.slice(...edit.span),edit.expected);relocated=relocated.slice(0,edit.span[0])+edit.replacement+relocated.slice(edit.span[1]);}
 const afterFile=ts.createSourceFile(path.pathname,relocated,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(afterFile.parseDiagnostics.length,0);
 const relocatedImports=afterFile.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text.startsWith('file:'));assert.equal(relocatedImports.length,edits.length);let importInverse=relocated;
 for(let index=relocatedImports.length-1;index>=0;index--){const specifier=relocatedImports[index].moduleSpecifier,start=specifier.getStart(afterFile),end=specifier.end;assert.equal(relocated.slice(start,end),edits[index].replacement);importInverse=importInverse.slice(0,start)+edits[index].expected+importInverse.slice(end);}
 assert.equal(importInverse,source);
 const second=applyConcreteSyntaxSubstitutions(transportConcreteSyntaxMeta(concrete(source)).document,{languageRules:[],repositoryRules:[{id:'receiving:whole-CST-with-independent-import-spans',edits:[{span:[0,source.length],expected:source,replacement:relocated}]}]});source=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(second.value)).source;
 const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64')),map=api.createPrivateDescribedByteOutputTextMap(),native=new Map();
 for(const [name,text]of [['large','source 猫😀\ud800\n'.repeat(30000)],['small','tail']]){map.set(name,text);native.set(name,text);}
 assert.equal(api.readObservedRestoreCalls(),0);assert.deepEqual([...map.descriptions()],nativeDescriptions(native));assert.equal(api.readObservedRestoreCalls(),0);assert.equal(map.get('large'),native.get('large'));assert.equal(api.readObservedRestoreCalls(),1);
 const inverse=applyConcreteSyntaxSubstitutions(transportConcreteSyntaxMeta(concrete(source)).document,{languageRules:[],repositoryRules:[{id:'receiving:complete-observer-and-import-inverse',edits:[{span:[0,source.length],expected:source,replacement:before}]}]});assert.equal(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source,before);
});

test('packaging and owned budgets select keys before reading large unrelated metadata',limits,()=>{
 const native=new Map([['unrelated/large.meta.json','x'.repeat(2*1024*1024)]]),reads=[];let enumerations=0;
 const expected={has:key=>native.has(key),set(key,text){native.set(key,text);return this;},get(key){assert.notEqual(key,'unrelated/large.meta.json');reads.push(key);return native.get(key);},keys:()=>native.keys(),[Symbol.iterator](){enumerations++;throw Error('Unselected output text must not be restored');}};
 const inputs=captureOwnedDefinitionInputs(root),outputRoots=['a','b','c','d','e','f','owned/meta','owned/js','owned/ts'],assets=effectRuntimeAssets(),entry='rust/src/lib.rs',result={schema:'forward-owned-json-definitions-v1',definitions:[],parents:[],unsupported:[]},project=packageOwnedDefinitions({result,entry,expected,outputRoots,prefix:'',profile:null,inputs,assets,hostAssets:hostRuntimeAssetsNamedDataAliases()});
 finishOwnedDefinitionOutput(expected,{projects:[project],outputRoots,prefix:'',profile:null,inputs});assert.equal(enumerations,0);assert.ok(reads.length>0);assert.ok(native.has('unrelated/large.meta.json'));const index=JSON.parse(native.get(project.index));assert.ok(index.files.length>0);assert.ok(index.files.every(row=>row.path.startsWith('owned/')));assert.equal(index.runtimeParity,false);
});

test('late changed crypto operations refuse descriptions and writes before invoking the replacement',limits,()=>{
 const map=createPrivateDescribedByteOutputTextMap();map.set('source','x'.repeat(90000));const before=[...map.descriptions()];let calls=0;
 for(const [owner,key]of [[crypto,'createHash'],[crypto.Hash.prototype,'update'],[crypto.Hash.prototype,'digest']]){
  const field=Object.getOwnPropertyDescriptor(owner,key);let descriptionError,writeError;
  try{Object.defineProperty(owner,key,{...field,value(){calls++;throw Error('changed crypto called');}});try{[...map.descriptions()];}catch(error){descriptionError=error;}try{map.set('changed','new');}catch(error){writeError=error;}}
  finally{Object.defineProperty(owner,key,field);}
  assert.match(descriptionError?.message??'',/stock crypto changed/);assert.match(writeError?.message??'',/stock crypto changed/);assert.equal(calls,0);assert.deepEqual([...map.descriptions()],before);assert.equal(map.has('changed'),false);
 }
});
