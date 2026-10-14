import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {analyzeJavaScript,parseMeta,emitRust,emitTypeScript} from '../translator.mjs';
import {toLino,check,lowerSourceClosure} from '../vendor/ir.mjs';
import {issueLexicalEnvironment,readLexicalEnvironment,reissueLexicalEnvironment,lexicalClosureName} from '../vendor/lexical-environments.mjs';
import {evaluate} from '../interpreter.mjs';
import {loadTypeScript} from '../native-typescript.mjs';
const ROOT=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
const vectors={schema:'original-scoped-closure-fixtures-v1',host:process.versions.bun?'Bun '+process.versions.bun:'Node '+process.version,rustCompiled:false,parentCreationLowered:false,positive:[],negative:[],census:[]};
const save=()=>{if(process.env.ROUTER_CLOSURE_VECTORS)writeFileSync(process.env.ROUTER_CLOSURE_VECTORS,JSON.stringify(vectors,null,2)+'\n');};
const copy=value=>JSON.parse(JSON.stringify(value));
const scoped=source=>analyzeJavaScript(source,{sourcePath:'fixtures/closure.mjs'}).scopedFunctions;
const positives=[
 ['identity','export function make(value){return ()=>value;}'],
 ['pair','export function make(value){return (other)=>({first:value,second:other});}'],
 ['array','export function make(first,second){return ()=>[first,second,first,null,undefined];}'],
 ['primitive','export function make(value){return ()=>typeof value===\'string\'?value.trim():value;}'],
 ['branch','export function make(value){return (choice)=>choice===true?value:undefined;}'],
 ['twoAncestors','export function make(first){return function intermediate(second){return (third)=>[first,second,third];};}'],
 ['shadow','export function make(value){return function inner(other){const fn=(value)=>other;return fn;};}'],
 ['direct','export const make=value=>()=>value;'],
 ['multiple','export function make(fooBar){return (otherValue)=>[fooBar,otherValue,fooBar];}'],
 ['null','export function make(value){return function named(){if(typeof value===\'undefined\'){return null;}return value;};}'],
 ['completion','export function make(value){return ()=>{const saved=value;};}'],
 ['old-completion','export function owner(captured){const callback=()=>{const value=captured;};}'],
];
const values=()=>{const revoked=Proxy.revocable({},{});revoked.revoke();return [undefined,null,false,true,0,-0,NaN,Infinity,-Infinity,42,'',' \ud800x\udc00\t','\ud800','\udc00',String.fromCodePoint(0x1f600),0n,2n**4096n,Symbol('opaque'),()=>{},new String('box'),new Number(1),{},[],revoked.proxy,{get value(){throw Error('getter');},[Symbol.toPrimitive](){throw Error('coercion');}}];};
function same(actual,want){if(Object.is(actual,want))return;if(Array.isArray(want)){assert.ok(Array.isArray(actual));assert.equal(actual.length,want.length);want.forEach((v,i)=>same(actual[i],v));}else if(want&&typeof want==='object'&&Object.getPrototypeOf(want)===Object.prototype&&Object.keys(want).join(',')==='first,second'){assert.equal(Object.getPrototypeOf(actual),Object.prototype);assert.deepEqual(Object.keys(actual),['first','second']);same(actual.first,want.first);same(actual.second,want.second);}else assert.ok(Object.is(actual,want));}
async function compile(typescript,dir,name){const ts=loadTypeScript(ROOT),path=join(dir,name+'.ts'),runtime=join(dir,name+'.mjs');writeFileSync(path,typescript);const program=ts.createProgram([path],{strict:true,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,skipLibCheck:true});assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[]);writeFileSync(runtime,ts.transpileModule(typescript,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);return import(pathToFileURL(runtime).href);}

test('source-bound environments preserve the original call arity, lossless payloads and fresh closure/aggregate allocation',{timeout:60000},async()=>{
 const dir=mkdtempSync(join(tmpdir(),'router-closure-tests-'));
 try{for(const [label,source]of positives){const analysis=analyzeJavaScript(source,{sourcePath:'fixtures/closure.mjs'});const fn=analysis.scopedFunctions.program.find(fn=>fn.kind==='closure');assert.ok(fn,label);assert.equal(analysis.program.length,0);const meta=toLino(fn),program=parseMeta(meta);assert.deepEqual(program,[fn]);assert.equal(fn.captures.every(capture=>capture.type==='value'),true);const name=fn.name.replace(/_([a-z])/g,(_,c)=>c.toUpperCase());const typescript=emitTypeScript(program)+'\nexport { '+name+' as factory };\n',rust=emitRust(program),typed=(await compile(typescript,dir,label)).factory;const originalPath=join(dir,label+'-original.mjs');writeFileSync(originalPath,source);const original=label==='old-completion'?Function('captured','return ('+source.slice(fn.environment.start,fn.environment.end)+');'):(await import(pathToFileURL(originalPath).href)).make;const observations=[];
 for(const captured of values())for(const arg of [undefined,null,true,Symbol('call'),2n**4096n,'\ud800']){
   const second=Symbol('second');let native=original(captured,second);if(label==='twoAncestors'||label==='shadow')native=native(second);
   const environment=fn.captures.map(capture=>capture.name==='second'||capture.name==='other'?second:captured),ir=evaluate(program,fn.name,environment),target=typed(...environment),args=fn.params.length?[arg]:[];
   const authored=label==='pair'?{first:captured,second:arg}:label==='array'?[captured,second,captured,null,undefined]:label==='twoAncestors'?[captured,second,arg]:label==='multiple'?[captured,arg,captured]:label==='shadow'?second:['completion','old-completion'].includes(label)?undefined:label==='branch'?(arg===true?captured:undefined):label==='null'?(captured===undefined?null:captured):label==='primitive'&&typeof captured==='string'?(captured===' \ud800x\udc00\t'?'\ud800x\udc00':captured):captured;
   const want=native(...args);same(want,authored);assert.equal(target.length,native.length,label);assert.equal(typed.length,fn.captures.length,label);for(const invoke of [target,ir]){const actual=invoke(...args);same(actual,want);if(['pair','array','twoAncestors','multiple'].includes(label)){assert.notEqual(actual,invoke(...args));}}
   assert.notEqual(target,typed(...environment));assert.notEqual(ir,evaluate(program,fn.name,environment));observations.push({captureType:typeof captured,callType:typeof arg,expectedType:typeof want,captureIdentity:want===captured});
 }
 assert.match(rust,/pub struct JsClosureEnvironment0<'env>/);assert.match(rust,/pub fn call<'a>\(&self/);assert.match(rust,/where 'env: 'a/);assert.match(rust,/let .*: JsPayload<'a> = self\./);assert.equal(/fn .*\(.*capture.*map/i.test(rust),false);vectors.positive.push({label,source,fn,meta,typescript,rust,observations});save();}
 }finally{rmSync(dir,{recursive:true,force:true});}
});

const negativeSources=[
 ['unbraced-if','export function make(value){return ()=>{if(typeof value===\'undefined\')return null;return value;};}'],
 ['nested-construction','export function make(value){return ()=>[value,[value]];}'],
 ['reassign-before','export function make(value){value=1;return ()=>value;}'],
 ['reassign-after','export function make(value){const fn=()=>value;value=1;return fn;}'],
 ['nested-write','export function make(value){function change(){value++;}return ()=>value;}'],
 ['destructuring-write','export function make(value){({value}=other);return ()=>value;}'],
 ['loop-write','export function make(value){for(value of other){}return ()=>value;}'],
 ['argument-alias','export function make(value){arguments[0]=1;return ()=>value;}'],
 ['eval','export function make(value){eval("value=1");return ()=>value;}'],
 ['with','function make(value){with(other){}return ()=>value;}'],
 ['constructor','export function make(value){Function("return 1")();return ()=>value;}'],
 ['effectful-default','export function make(value=sideEffect()){return ()=>value;}'],
 ['closed-default','export function make(value=1){return ()=>value;}'],
 ['default-tdz','export function make(fn=()=>value,value){return fn;}'],
 ['destructured-owner','export function make({value}){return ()=>value;}'],
 ['rest-owner','export function make(...value){return ()=>value;}'],
 ['async-owner','export async function make(value){return ()=>value;}'],
 ['async-closure','export function make(value){return async ()=>value;}'],
 ['generator','export function make(value){return function*(){return value;};}'],
 ['this','export function make(value){return ()=>this.value||value;}'],
 ['new-target','export function make(value){return ()=>new.target||value;}'],
 ['property','export function make(value){return ()=>value.field;}'],
 ['getter','export function make(value){return ()=>({get field(){return value;}});}'],
 ['method-unknown','export function make(value){return ()=>value.trim();}'],
 ['call','export function make(value){return ()=>value();}'],
 ['equality','export function make(value){return other=>value!==other;}'],
 ['coercion','export function make(value){return ()=>value+1;}'],
 ['truthiness','export function make(value){return ()=>value?1:0;}'],
 ['mutable-local','export function make(){let value=1;return ()=>value;}'],
 ['const-local','export function make(){const value=1;return ()=>value;}'],
 ['computed-prefix','export function make(key){const prefix=`export ${key}=`;return line=>line.startsWith(prefix);}'],
 ['import','import value from "foreign";export function make(){return ()=>value;}'],
 ['global','export function make(){return ()=>missing;}'],
 ['computed-alias-prototype','export function make(value){const key=\'prototype\';String[key].trim=evil;return ()=>typeof value===\'string\'?value.trim():value;}'],
 ['prototype','export function make(value){String.prototype.trim=evil;return ()=>typeof value===\'string\'?value.trim():value;}'],
 ['computed-prototype','export function make(value){String["proto"+"type"].trim=evil;return ()=>typeof value===\'string\'?value.trim():value;}'],
];
test('mutable, effectful, coercive, captured globals and unproved scalar equality remain refused',()=>{
 const nestedSource='export function make(value){return ()=>()=>value;}',nested=scoped(nestedSource);assert.equal(nested.items[0].status,'unsupported');assert.equal(nested.items[1].status,'translated');assert.equal(nested.program.length,1);assert.equal(nested.items[1].owner.status,'unsupported');vectors.negative.push({label:'nested-parent-stays-refused',source:nestedSource,census:nested});
 for(const [label,source]of negativeSources){const census=scoped(source);assert.equal(census.program.filter(fn=>fn.kind==='closure').length,0,label);vectors.negative.push({label,source,census});save();}
});

test('private issuance rejects copied/foreign handles and exact-source metadata and body forgeries',()=>{
 const source=positives[1][1],fn=scoped(source).program[0],proof=fn.environment,handle=reissueLexicalEnvironment(proof);
 assert.equal(Object.isFrozen(readLexicalEnvironment(handle)),true);assert.equal(Object.isFrozen(readLexicalEnvironment(handle).proof.captures),true);assert.throws(()=>{readLexicalEnvironment(handle).wrapper=()=>"forged";},TypeError);
 assert.equal(lexicalClosureName(handle),fn.name);assert.deepEqual(lowerSourceClosure(handle,fn.name),fn);let traps=0;
 for(const foreign of [{},Object.freeze({}),copy(handle),new Proxy(handle,{get(){traps++;},getOwnPropertyDescriptor(){traps++;}})])assert.throws(()=>readLexicalEnvironment(foreign),/copied or foreign/);
 assert.equal(traps,0);assert.throws(()=>lowerSourceClosure(handle,'foreign_name'),/foreign closure source/);
 const changes=[
   ['source',x=>{x.environment.sourceUtf16=x.environment.sourceUtf16.replace('first:value','first:other');}],
   ['source-lone-surrogate',x=>{x.environment.sourceUtf16+='\ud800';}],
   ['hash',x=>{x.environment.sourceUtf16Sha256='0'.repeat(64);}],
   ['path',x=>{x.environment.sourcePath='foreign.mjs';}],
   ['span',x=>{x.environment.start++;}],
   ['ancestor',x=>{x.environment.sourceScope[0].end--;}],
   ['binding',x=>{x.environment.captures[0].binding.start++;}],
   ['reference',x=>{x.environment.captures[0].references[0].end++;}],
   ['capture-type',x=>{x.captures[0].type='string';}],
   ['capture-name',x=>{x.captures[0].name='other';}],
   ['parent-admission',x=>{x.environment.parentCreationLowered=true;}],
   ['extra-proof',x=>{x.environment.authority=true;}],
   ['body',x=>{x.body[0].value.fields[0].value.name='other';}],
   ['mirrored-body',x=>{x.body[0].value.fields[0].value.name='other';x.environment.sourceUtf16=x.environment.sourceUtf16.replace('first:value','first:other');}],
   ['return',x=>{x.returns='value';}],
   ['params',x=>{x.params=[];}],
   ['export',x=>{x.exported=true;}],
   ['lossless',x=>{x.lossless=false;}],
   ['conditional',x=>{x.conditionalInputs=true;}],
 ];
 for(const [label,change]of changes){const changed=copy(fn);change(changed);assert.throws(()=>parseMeta(toLino(changed)),undefined,label);assert.throws(()=>emitTypeScript([changed]),undefined,label);assert.throws(()=>emitRust([changed]),undefined,label);vectors.negative.push({label,original:fn,changed});save();}
 const loneA='// \ud800\n'+source,loneB='// \ud801\n'+source;assert.deepEqual(Buffer.from(loneA),Buffer.from(loneB));
 const closureA=scoped(loneA).program[0],closureB=scoped(loneB).program[0];assert.notEqual(closureA.name,closureB.name);assert.notEqual(closureA.environment.sourceUtf16Sha256,closureB.environment.sourceUtf16Sha256);assert.deepEqual(parseMeta(toLino(closureA)),[closureA]);
 const hidden=copy(proof);Object.defineProperty(hidden,'authority',{value:true});assert.throws(()=>reissueLexicalEnvironment(hidden),/hidden/);
 const getter=copy(proof);Object.defineProperty(getter,'sourceUtf16',{get(){traps++;return source;},enumerable:true});assert.throws(()=>reissueLexicalEnvironment(getter),/accessor/);const proxy=new Proxy(proof,{ownKeys(){traps++;return []}});assert.throws(()=>reissueLexicalEnvironment(proxy),/non-data/);assert.equal(traps,0);
 for(const malformed of [toLino(fn).replace('(captures','(unknown-captures'),toLino(fn).replace('(lossless)','(lossless) (lossless)'),toLino(fn)+'\n'+toLino(fn),toLino(fn).replace('(returns','(unexpected) (returns')])assert.throws(()=>parseMeta(malformed));
 // Forged checked expression tags are recomputed from the original source.
 const caller={kind:'function',name:'caller',exported:false,params:[],returns:fn.returns,body:[{kind:'return',value:{kind:'call',name:fn.name,args:[]}}]};assert.throws(()=>parseMeta(toLino(fn)+'\n'+toLino(caller)),/unknown|call/);
 const typed=copy(fn);typed.body[0].value.fields[0].value.type='number';assert.deepEqual(check(typed,new Map()),fn);
});

test('all 52 complete native censuses preserve all original 73 top-level and 61 scoped programs',{timeout:60000},()=>{
 const manifest=JSON.parse(readFileSync(join(ROOT,'parity/js-native-portable-draft.json'),'utf8'));let top=0,scope=0,full=0,conditional=0;
 for(const module of manifest.modules){const source=readFileSync(join(ROOT,module.path),'utf8'),a=analyzeJavaScript(source,{sourcePath:module.path});assert.deepEqual(a.items,module.topLevel.items);assert.deepEqual(a.scopedFunctions.items,module.scopedFunctions.items);assert.equal(a.scopedFunctions.sourceItems,module.scopedFunctions.sourceItems);
 for(const [kind,program]of [['top-level',a.program],['scoped',a.scopedFunctions.program]]){const output=module.outputs.find(output=>output.scope===kind&&output.path.endsWith('.lino'));assert.ok(output,kind);assert.equal('# GENERATED: checked portable-router-v1 bodies; no source envelopes.\n'+program.map(toLino).join('\n')+'\n',readFileSync(join(ROOT,output.path),'utf8'));assert.deepEqual(parseMeta(program.map(toLino).join('\n')),program);}
 top+=a.program.length;scope+=a.scopedFunctions.program.length;full+=a.scopedFunctions.fullDomainTranslatedItems;conditional+=a.scopedFunctions.conditionalPrivateBodyDraftItems;vectors.census.push({path:module.path,source,analysis:a});save();
 }
 assert.equal(manifest.modules.length,52);assert.equal(manifest.topLevel.sourceItems,788);assert.equal(manifest.scopedFunctions.sourceItems,705);assert.equal(top,73);assert.equal(scope,63);assert.equal(full,54);assert.equal(conditional,9);
});
