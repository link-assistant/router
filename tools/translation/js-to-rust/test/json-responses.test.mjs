import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {analyzeJavaScript,translateJavaScript,parseMeta,emitRust,emitTypeScript,TranslationError} from '../translator.mjs';
import {toLino} from '../vendor/ir.mjs';
import {jsonResponseOwnership} from '../vendor/json-responses.mjs';
import {evaluate} from '../interpreter.mjs';
import {loadTypeScript} from '../native-typescript.mjs';

const EXPECTED_CONTENT_TYPE=process.versions.bun?'application/json;charset=utf-8':'application/json';
const ROOT=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
async function runtimes(source,typescript,directory,name) {
  const ts=loadTypeScript(ROOT),original=join(directory,name+'-original.mjs'),typed=join(directory,name+'.ts'),target=join(directory,name+'-target.mjs');
  writeFileSync(original,source);writeFileSync(typed,typescript);
  const program=ts.createProgram([typed],{strict:true,noEmit:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,skipLibCheck:true});
  assert.deepEqual(ts.getPreEmitDiagnostics(program).map(d=>ts.flattenDiagnosticMessageText(d.messageText,'\n')),[]);
  writeFileSync(target,ts.transpileModule(typescript,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
  return [await import(pathToFileURL(original).href),await import(pathToFileURL(target).href)];
}
async function responseGolden(invoke,status,text) {
  const first=invoke(),second=invoke();assert.notEqual(first,second);assert.notEqual(first.headers,second.headers);
  assert.ok(first instanceof Response);assert.equal(Object.getPrototypeOf(first),Response.prototype);
  assert.equal(first.status,status);assert.equal(first.statusText,'');assert.equal(first.ok,status>=200&&status<300);
  assert.equal(first.headers.get('content-type'),EXPECTED_CONTENT_TYPE);assert.equal(first.url,'');assert.equal(first.redirected,false);assert.equal(first.type,'default');
  const reference=Response.json(null),own=response=>Reflect.ownKeys(response).map(key=>{const d=Object.getOwnPropertyDescriptor(response,key);return [typeof key==='symbol'?'symbol:'+key.description:key,{writable:d.writable,enumerable:d.enumerable,configurable:d.configurable,get:Boolean(d.get),set:Boolean(d.set)}];});
  assert.deepEqual(own(first),own(reference));
  for(const key of ['status','statusText','ok','headers','body','bodyUsed','url','redirected','type'])assert.deepEqual(Object.getOwnPropertyDescriptor(Object.getPrototypeOf(first),key),Object.getOwnPropertyDescriptor(Object.getPrototypeOf(reference),key));
  first.headers.set('x-golden','one');assert.equal(second.headers.get('x-golden'),null);
  assert.equal(first.bodyUsed,false);assert.ok(first.body instanceof ReadableStream);
  const clone=first.clone();assert.equal(first.bodyUsed,false);assert.equal(await clone.text(),text);assert.equal(first.bodyUsed,false);
  assert.equal(await first.text(),text);assert.equal(first.bodyUsed,true);await assert.rejects(()=>first.text(),TypeError);
  assert.deepEqual([...new Uint8Array(await second.arrayBuffer())],[...Buffer.from(text,'utf8')]);
}
function rustBytes(rust) {
  return [...rust.matchAll(/body_utf8: vec!\[([^\]]*)\]/gu)].map(match=>match[1]?match[1].split(',').map(byte=>Number(byte.trim())):[]);
}

test('five original closed JSON Response bodies retain real Response behavior and explicit Rust projections',async()=>{
  const source=readFileSync(join(ROOT,'js/src/response-contracts.mjs'),'utf8');assert.equal(jsonResponseOwnership(source).owned,true);
  const analyzed=analyzeJavaScript(source),directory=mkdtempSync(join(tmpdir(),'router-json-responses-'));
  const fixtures=[
    ['responseNotFound',404,'{"error":{"message":"Response not found","type":"invalid_request_error","param":null,"code":"response_not_found"}}'],
    ['responseReferenceMissing',404,'{"error":{"type":"not_found_error","message":"the referenced response resource is unavailable"}}'],
    ['responseReferenceConflict',409,'{"error":{"type":"invalid_request_error","message":"the referenced response resources do not share one provider account"}}'],
    ['conversationUnsupported',400,'{"error":{"type":"invalid_request_error","message":"the selected service does not support native Conversations resources"}}'],
    ['conversationMethodNotAllowed',405,'{"error":{"type":"invalid_request_error","message":"the requested Conversations operation is not supported"}}'],
  ];
  try {
    for(const [name,status,text]of fixtures) {
      const snake=name.replace(/[A-Z]/g,c=>'_'+c.toLowerCase()),item=analyzed.items.find(item=>item.name===snake&&item.status==='translated'),fn=analyzed.program.find(fn=>fn.name===snake);
      assert.ok(item,name);assert.equal(fn.params.length,0);assert.equal(fn.returns,'json-response');const program=parseMeta(toLino(fn));assert.deepEqual(program,[fn]);
      const rust=emitRust(program),typescript=emitTypeScript(program),[original,typed]=await runtimes(source.slice(item.start,item.end),typescript,directory,name);
      for(const invoke of [original[name],typed[name],()=>evaluate(program,snake,[])])await responseGolden(invoke,status,text);
      assert.deepEqual(rustBytes(rust),[[...Buffer.from(text,'utf8')]]);assert.match(rust,/JsonResponseProjection/u);assert.match(rust,/pub status: u16/u);assert.match(rust,/pub body_utf8: Vec<u8>/u);assert.match(rust,/pub default_content_type: JsonResponseDefaultContentType/u);assert.doesNotMatch(rust,/pub headers|pub stream|pub body_used|impl Response/u);assert.match(rust,/fn content_type_for\(&self, host: JsonResponseHost\)/u);assert.match(rust,/JsonResponseHost::Node20\) => "application\/json"/u);assert.match(rust,/JsonResponseHost::Bun1_4_3\) => "application\/json;charset=utf-8"/u);assert.match(rust,/runtimeParity: false/u);
    }
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('closed JSON preserves raw duplicate AST fields, numeric property order, UTF16 escaping, and default status',async()=>{
  const source=String.raw`export function json(){return Response.json({"10":"ten","2":"two",z:0,"01":"leading","4294967295":"large",dup:"old",a:-0,dup:"last",constructor:"ordinary",nested:[null,true,false,1.5,1e22,"\uD800","\uDC00","\uD800x\uDC00","\u{1F600}","\x00\b\f\n\r\t",{"\uD800":"key"}]});}`;
  const expected=String.raw`{"2":"two","10":"ten","z":0,"01":"leading","4294967295":"large","dup":"last","a":0,"constructor":"ordinary","nested":[null,true,false,1.5,1e+22,"\ud800","\udc00","\ud800x\udc00","<astral>","\u0000\b\f\n\r\t",{"\ud800":"key"}]}`.replace('<astral>',String.fromCodePoint(0x1f600));
  const translated=translateJavaScript(source),directory=mkdtempSync(join(tmpdir(),'router-json-order-'));
  try {
    assert.deepEqual(parseMeta(translated.meta),translated.program);const body=translated.program[0].body[0].value.body;
    assert.equal(body.fields.filter(field=>field.name==='dup').length,2);assert.equal(body.fields[0].name,'10');assert.equal(body.fields[1].name,'2');assert.match(translated.meta,/units 55296/u);assert.match(translated.meta,/units 56320/u);
    const [original,typed]=await runtimes(source,translated.typescript,directory,'json');
    for(const invoke of [original.json,typed.json,()=>evaluate(translated.program,'json',[])])await responseGolden(invoke,200,expected);
    assert.deepEqual(rustBytes(translated.rust),[[...Buffer.from(expected,'utf8')]]);
    const options=translateJavaScript('export function json(){return Response.json([], {status:400,status:409});}');
    const [optionOriginal,optionTyped]=await runtimes('export function json(){return Response.json([], {status:400,status:409});}',options.typescript,directory,'options');
    for(const invoke of [optionOriginal.json,optionTyped.json,()=>evaluate(options.program,'json',[])])await responseGolden(invoke,409,'[]');
  } finally {rmSync(directory,{recursive:true,force:true});}
});

test('JSON Response ownership, effectful data, throwing statuses, observers and payload crossings remain refused',()=>{
  const factory='export function json(){return Response.json({ok:true},{status:200});}';
  const defects=[
    'const Response=custom;','import {Custom as Response} from "custom";','class Response {}','function nested(Response){return Response;}',
    'Response.json=custom;','(Response.json)=custom;','[Response.json]=[custom];','delete Response.json;',
    'const owner=Response;','const alias=Response.json;','const hidden=`${Response.json}`;',
    'globalThis["Res"+"ponse"]=custom;','const hidden=`${globalThis.Response=custom}`;',
    'Object.prototype.toJSON=custom;','Object["defineProperty"](Object.prototype,"toJSON",{});','JSON.stringify=custom;',
    '[Object.fromEntries]=[custom];','delete(JSON.stringify);','const JSON=custom;','function nested(Object){return 1;}',
    'const hidden=`${Object.prototype.toJSON=custom}`;','const owner=globalThis;','eval("Response=custom");','Function("Response=custom")();',
  ];
  for(const defect of defects) {
    const source=factory+defect;assert.equal(analyzeJavaScript(source).program.some(fn=>fn.name==='json'),false,defect);assert.throws(()=>translateJavaScript(source),TranslationError,defect);
  }
  for(const body of ['unknown','{field:unknown}','{get field(){return 1;}}','{...unknown}','{[unknown]:1}','{__proto__:null}','{toJSON:1}','{toJSON(){return 1;}}','[1,,2]','undefined','NaN','Infinity','1n','sideEffect()'])assert.throws(()=>translateJavaScript(`export function json(){return Response.json(${body});}`),TranslationError,body);
  for(const status of ['0','199','600','204','205','304','null','true','"404"','200.5','unknown','sideEffect()'])assert.throws(()=>translateJavaScript(`export function json(){return Response.json({}, {status:${status}});}`),TranslationError,status);
  for(const options of ['{headers:{}}','{status:200,headers:{}}','{status:200,status:204}','{get status(){return 200;}}'])assert.throws(()=>translateJavaScript(`export function json(){return Response.json({}, ${options});}`),TranslationError,options);
  for(const expression of ['json().status','json().headers','json().body','json().clone()','json().text()','typeof json()','json()===json()','{response:json()}','[json()]']) {
    const source=factory+`export function observer(){return ${expression};}`;assert.equal(analyzeJavaScript(source).program.some(fn=>fn.name==='json'),true,expression);assert.throws(()=>translateJavaScript(source),TranslationError,expression);
  }
  assert.throws(()=>translateJavaScript('export function json(value){return Response.json({ok:true});}'),TranslationError);
  const valid=translateJavaScript(factory),wrongReturn=structuredClone(valid.program);wrongReturn[0].returns='value';assert.throws(()=>parseMeta(wrongReturn.map(toLino).join('\n')));
  assert.throws(()=>parseMeta(valid.meta.replace('(json-boolean true)','(json-boolean maybe)')));
  assert.throws(()=>parseMeta(valid.meta.replace('(units 111 107)','(units 65536)')));
});
