import test from 'node:test';
import assert from 'node:assert/strict';
import {createConstructorSourceGraph,issueImportedErrorConstructor,originalImportedErrorConstructor,reissueImportedErrorConstructor} from '../vendor/source-constructors.mjs';
import {issueOriginalConstructorBody,lowerOriginalConstructorBody} from '../vendor/constructor-bodies.mjs';
import {analyzeJavaScript,parseMeta,emitRust,emitTypeScript} from '../translator.mjs';
import {toLino,check} from '../vendor/ir.mjs';

const errorSource="export class Mistake extends Error {constructor(message,status=400){super(message);this.status=status;this.code='bounded';}}";
const ownerSource="import {Mistake as Failure} from './errors.mjs';export function selected(value){if(value===null)throw new Failure('bad');return value;}";
const sources=(owner=ownerSource,error=errorSource)=>[{path:'fixture/errors.mjs',source:error},{path:'fixture/owner.mjs',source:owner}];
function constructor(owner=ownerSource,error=errorSource) {
  const graph=createConstructorSourceGraph(sources(owner,error)),start=owner.indexOf('new Failure'),end=owner.indexOf(');',start)+1;
  return {graph,token:issueImportedErrorConstructor(graph,'fixture/owner.mjs',start,end)};
}
function program(owner=ownerSource,error=errorSource) {
  const graph=createConstructorSourceGraph(sources(owner,error)),start=owner.indexOf('export function');
  return {graph,item:lowerOriginalConstructorBody(issueOriginalConstructorBody(graph,'fixture/owner.mjs',start,owner.length))};
}
const clone=value=>structuredClone(value);

test('genuine lexical import aliases issue ordered closed constructor/default evidence',()=>{
  const {token}=constructor(),state=originalImportedErrorConstructor(token),proof=state.proof;
  assert.equal(proof.import.binding,'Failure');assert.equal(proof.import.exported,'Mistake');
  assert.equal(state.message.value,'bad');assert.deepEqual(state.fields,[{name:'status',value:{kind:'number',value:400}},{name:'code',value:{kind:'string',value:'bounded'}}]);
  assert.equal(proof.conditions.outsideModulePrototypeClosureProved,false);assert.equal(proof.conditions.rustErrorIdentityPreserved,false);
  assert.deepEqual(originalImportedErrorConstructor(reissueImportedErrorConstructor(JSON.parse(JSON.stringify(proof)))).proof,proof);
  assert.throws(()=>originalImportedErrorConstructor({...token}),/copied or foreign/);
  assert.throws(()=>issueImportedErrorConstructor({},'fixture/owner.mjs',0,1),/copied or foreign/);
  for(const mutate of [p=>{p.runtimeParity=true;},p=>{p.conditions.unchangedErrorIntrinsicRequired=false;},p=>{p.conditions.hostDiagnosticLocationsPreserved=true;},p=>{p.original.fields.reverse();},p=>{p.original.params[1].default.value=401;},p=>{p.sources[0].source+=' ';},p=>{p.caller.end--;},p=>{p.extra=true;}]) {
    const changed=clone(proof);mutate(changed);assert.throws(()=>reissueImportedErrorConstructor(changed));
  }
});

test('constructor ownership rejects shadowing aliases mutation reflection effects and recovered syntax',()=>{
  const rows=[
    ()=>constructor(ownerSource.replace('new Failure','new Other')),
    ()=>constructor(ownerSource.replace('selected(value)','selected(value,Failure)')),
    ()=>constructor(ownerSource,errorSource+'const alias=Mistake;'),
    ()=>constructor(ownerSource,errorSource+'Mistake.prototype.status=1;'),
    ()=>constructor(ownerSource,errorSource+'Object.setPrototypeOf(Mistake,other);'),
    ()=>constructor(ownerSource,errorSource+'Error.prototype.status=1;'),
    ()=>constructor(ownerSource,errorSource+'Array.prototype.includes=evil;'),
    ()=>constructor(ownerSource,errorSource+'Object.prototype.status=1;'),
    ()=>constructor(ownerSource,errorSource+'Object.defineProperty(Object.prototype,"status",{set(value){sideEffect(value);}});'),
    ()=>constructor(ownerSource,errorSource.replace('export class','const Error=other;export class')),
    ()=>constructor(ownerSource,errorSource.replace("this.code='bounded';","this.code=sideEffect();")),
    ()=>constructor(ownerSource,errorSource.replace('status=400','status=sideEffect()')),
    ()=>constructor(ownerSource,errorSource.replace('constructor(message','get reflected(){return 1;}constructor(message')),
    ()=>constructor(ownerSource,errorSource.replace('export class','export abstract class')),
    ()=>constructor(ownerSource,errorSource+'function invalid('),
    ()=>constructor(ownerSource.replace("new Failure('bad')","new Failure(value)")),
    ()=>constructor(ownerSource.replace("new Failure('bad')","new Failure()")),
    ()=>constructor(ownerSource.replace("new Failure('bad')","new Failure(undefined)")),
    ()=>constructor(ownerSource.replace("new Failure('bad')","new Failure('bad',400,sideEffect())")),
  ];
  for(const run of rows)assert.throws(run);
});

test('source/proof validation bounds work before callbacks and rejects dense-array impostors',()=>{
  let reads=0;
  const accessor={path:'fixture/errors.mjs',get source(){reads++;throw Error('getter');}};
  assert.throws(()=>createConstructorSourceGraph([accessor]));
  assert.throws(()=>createConstructorSourceGraph(new Proxy([],{get(){reads++;throw Error('proxy');},ownKeys(){reads++;throw Error('proxy');}})));
  assert.equal(reads,0);
  const sparse=Array(1),extended=sources();extended.extra=true;
  for(const rows of [sparse,extended,sources().concat(sources()),[{path:'../escape.mjs',source:errorSource}],Array(129)])assert.throws(()=>createConstructorSourceGraph(rows));
  const {token}=constructor(),proof=clone(originalImportedErrorConstructor(token).proof);let deep={};for(let index=0;index<170;index++)deep={child:deep};proof.extra=deep;assert.throws(()=>reissueImportedErrorConstructor(proof),/depth or cell/);
  for(const value of [NaN,Infinity,-Infinity]){const bad=clone(originalImportedErrorConstructor(token).proof);bad.extra=value;assert.throws(()=>reissueImportedErrorConstructor(bad),/nonfinite/);}
  const bad=clone(originalImportedErrorConstructor(token).proof);Object.defineProperty(bad,'extra',{enumerable:true,get(){reads++;throw Error('getter');}});assert.throws(()=>reissueImportedErrorConstructor(bad));assert.equal(reads,0);
});

test('the whole original parent and producer graph are mandatory before meta and either target',()=>{
  const {graph,item}=program(),meta=toLino(item)+'\n',decoded=parseMeta(meta,{constructorGraph:graph});
  assert.deepEqual(decoded,[item]);assert.throws(()=>parseMeta(meta),/copied or foreign/);
  const foreign=createConstructorSourceGraph(sources(ownerSource+' '));assert.throws(()=>parseMeta(meta,{constructorGraph:foreign}),/producer graph/);
  const ts=emitTypeScript(decoded,{outputPath:'fixture/owner.ts'}),rust=emitRust(decoded);
  assert.match(ts,/import \{ Mistake as routerOriginalError0 \} from "\.\/errors\.js"/);assert.match(ts,/throw new routerOriginalError0/);
  assert.match(rust,/Result<JsPayload<'a>, SourceErrorProjection>/);assert.match(rust,/return Err\(/);assert.match(rust,/return Ok\(/);
  assert.throws(()=>emitTypeScript(decoded),/exact output module path/);
  const mutations=[p=>{delete p.sourceConstructors;},p=>{p.sourceConstructors=null;},p=>{p.conditionalConstructors=false;},p=>{delete p.conditionalConstructors;},p=>{p.params[0].type='number';},p=>{p.name='foreign';},p=>{p.body.at(-1).value={kind:'number',text:'1'};},p=>{p.sourceConstructors.owner.start++;},p=>{p.sourceConstructors.constructors=[];}];
  for(const mutate of mutations)for(const run of [value=>check(value,new Map()),value=>emitRust([value]),value=>emitTypeScript([value],{outputPath:'fixture/owner.ts'})]) {
    const bad=clone(item);mutate(bad);assert.throws(()=>run(bad));
  }
  assert.equal(analyzeJavaScript(ownerSource,{sourcePath:'fixture/owner.mjs',constructorGraph:graph}).program.some(row=>row.name==='selected'),true);
  assert.equal(analyzeJavaScript(ownerSource,{sourcePath:'fixture/owner.mjs'}).program.some(row=>row.name==='selected'),false);
});
