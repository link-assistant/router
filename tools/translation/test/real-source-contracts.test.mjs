import assert from 'node:assert/strict';
import test from 'node:test';
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {sourceItems} from '../rust-structure.mjs';
import {extractImplDeclarations} from '../impl-resolver.mjs';
import {translateProject} from '../project.mjs';
import {loadJavaScript,writeRuntimeAssets} from './artifact-loader.mjs';

const root=new URL('../../../',import.meta.url);
const fixture=JSON.parse(readFileSync(new URL('../fixtures/real-source-provenance.json',import.meta.url),'utf8'));
const hash=text=>createHash('sha256').update(text).digest('hex');
const tagged=($,fields={})=>Object.freeze({$,...fields});
// Independent input construction from the checked serde_json algebraic ABI.
// Expected routing decisions below are literal source contracts, not adapters.
function jsonValue(value) {
  if(value===null)return tagged('Null');
  if(typeof value==='string')return tagged('String',{field0:value});
  if(typeof value==='boolean')return tagged('Bool',{field0:value});
  if(typeof value==='bigint')return tagged('Number',{field0:tagged(value<0n?'NegInt':'PosInt',{field0:value})});
  if(Array.isArray(value))return tagged('Array',{field0:Object.freeze(value.map(jsonValue))});
  assert.equal(typeof value,'object');
  const entries=Object.keys(value).sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b))).map(key=>tagged('MapEntry',{key,value:jsonValue(value[key])}));
  return tagged('Object',{field0:tagged('Map',{entries:Object.freeze(entries)})});
}
function exactModule(id) {
  const entry=fixture.entries.find(entry=>entry.id===id);assert.ok(entry,`unknown source evidence ${id}`);
  const source=readFileSync(new URL(entry.path,root),'utf8');assert.equal(hash(source),entry.sourceSha256,`${entry.path}: source pin changed`);
  const items=sourceItems(source);
  const declarations=entry.declarations.map(pin=>{
    const matches=items.filter(item=>item.start===pin.start && item.end===pin.end && item.name===pin.name && item.term===pin.term);
    assert.equal(matches.length,1,`${entry.path}:${pin.name}: exact structural declaration missing`);
    const text=source.slice(pin.start,pin.end);assert.equal(hash(text),pin.sha256);return text;
  });
  for(const pin of entry.methodPins??[]){
    const methods=extractImplDeclarations(source).implementations.filter(implementation=>implementation.typePath.join('::')===pin.owner).flatMap(implementation=>implementation.methods);
    const matches=methods.filter(method=>method.name===pin.name && method.span.start===pin.start && method.span.end===pin.end);
    assert.equal(matches.length,1,'original production method must be structurally selected');
    assert.equal(matches[0].source,source.slice(pin.start,pin.end));assert.equal(hash(matches[0].source),pin.sha256);
    declarations.push(`impl ${pin.owner} {\n${matches[0].source}\n}`);
  }
  if(entry.carrier)declarations.push(entry.carrier.source);
  return {entry,source:declarations.join('\n')};
}
async function loadTypeScript(text) {
  const directory=mkdtempSync(join(tmpdir(),'router-real-source-ts-'));
  try {writeRuntimeAssets(directory);const sourcePath=join(directory,'src/module.ts');writeFileSync(sourcePath,text);
    execFileSync(process.env.ROUTER_TRANSLATION_TSC??'tsc',['--strict','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext',sourcePath],{encoding:'utf8',timeout:30000});
    return await import(pathToFileURL(join(directory,'src/module.js')).href);
  }finally{rmSync(directory,{recursive:true,force:true});}
}
async function checkedModule(id) {
  const {entry,source}=exactModule(id);
  const result=translateProject({entry:entry.path,paths:[entry.path],readSource:path=>{assert.equal(path,entry.path);return source;}});
  assert.deepEqual(result.meta.moduleDiagnostics,[]);
  assert.deepEqual(result.meta.refused,[],`${id}: a refused source declaration supplies no executable evidence`);
  assert.deepEqual(result.meta.executable.filter(item=>item.term==='fn').map(item=>item.name).sort(),[...entry.bodyNames,...(entry.carrier?[entry.carrier.name]:[])].sort());
  const compiledItems=sourceItems(source);
  for(const emitted of result.meta.executable.filter(item=>item.term==='fn')){
    if(entry.carrier?.name===emitted.name)continue;
    const original=entry.declarations.find(pin=>pin.term==='fn' && pin.name===emitted.name);
    const selected=compiledItems.find(item=>item.term==='fn' && item.name===emitted.name);
    assert.deepEqual(emitted.span,{start:selected.start,end:selected.end});
    assert.equal(hash(source.slice(selected.start,selected.end)),original.sha256,'checked declaration must be the selected original production body');
  }
  const methods=extractImplDeclarations(source).implementations.flatMap(implementation=>implementation.methods);
  assert.equal((result.meta.checkedMethods??[]).length,(entry.methodPins??[]).length);
  for(const pin of entry.methodPins??[]){
    const emitted=result.meta.checkedMethods.find(method=>method.name===`${pin.owner}.${pin.name}`);
    const selected=methods.find(method=>method.name===pin.name);
    assert.deepEqual(emitted.span,selected.span);assert.equal(hash(source.slice(selected.span.start,selected.span.end)),pin.sha256);
  }
  assert.equal(result.meta.runtimeParity,false);
  execFileSync('node',['--input-type=module','--check'],{input:result.javascript,encoding:'utf8',timeout:10000});
  const javaScript=(await loadJavaScript(result.javascript)).translated,typeScript=(await loadTypeScript(result.typescript)).translated;
  return {apis:[javaScript,typeScript],result};
}

test('production source pins select complete original declarations without body substitutions',()=>{
  assert.equal(fixture.fullParity,false);assert.equal(fixture.rustExecution,false);
  for(const entry of fixture.entries){
    exactModule(entry.id);
    if(entry.testSource && entry.testName){const tests=readFileSync(new URL(entry.testSource,root),'utf8');assert.match(tests,new RegExp(`fn ${entry.testName}\\(`));}
  }
  assert.ok(fixture.obligations.length>0,'unresolved source obligations must remain visible');
});

test('actual Claude credential predicate executes its checked original production body',async()=>{
  const {apis}=await checkedModule('identity-token');
  for(const translated of apis){
  for(const [token,expected] of [['sk-ant-oat01-abc',true],['sk-ant-api03-abc',false],['',false],['sk-ant-oat',true],[' sk-ant-oat01-abc',false],['SK-ANT-OAT01-abc',false]])assert.equal(translated.is_oauth_credential(token),expected,token);
  }
});

test('actual login status reader preserves string statuses and rejects wrong JSON field kinds',async()=>{
  const {apis}=await checkedModule('login-status');
  for(const translated of apis){
  for(const [value,expected] of [[{status:'authorized'},'authorized'],[{status:'failed'},'failed'],[{status:''},''],[{status:null},'unknown'],[{status:false},'unknown'],[{status:4n},'unknown'],[{},'unknown'],[null,'unknown'],[[],'unknown']])assert.equal(translated.status_of(jsonValue(value)),expected);
  assert.throws(()=>translated.status_of(Object.freeze({status:'authorized'})),TypeError);
  }
});

test('actual retry bound uses its checked Duration constant without losing nanosecond precision',async()=>{
  const {apis}=await checkedModule('bounded-retry');
  for(const translated of apis){
  const duration=(secs,nanos)=>tagged('Duration',{secs,nanos});
  assert.deepEqual(translated.MAX_RETRY_AFTER,duration(86400n,0n));
  for(const [input,expected] of [[duration(0n,0n),duration(0n,0n)],[duration(1n,123456789n),duration(1n,123456789n)],[duration(86399n,999999999n),duration(86399n,999999999n)],[duration(86400n,0n),duration(86400n,0n)],[duration(86400n,1n),duration(86400n,0n)],[duration(18446744073709551615n,999999999n),duration(86400n,0n)]])assert.deepEqual(translated.bounded_retry_after(input),expected);
  assert.throws(()=>translated.bounded_retry_after(duration(0n,1000000000n)),RangeError);
  }
});

test('actual stream failure classifier preserves nested-code precedence through its checked method body',async()=>{
  const {apis}=await checkedModule('in-band-failure');
  for(const translated of apis){
  const some=kind=>tagged('Some',{field0:tagged(kind)}),none=tagged('None');
  for(const [event,expected] of [[{error:{code:'upstream_timeout'}},some('Stalled')],[{error:{code:'upstream_interrupted'}},some('Interrupted')],[{error:{code:'upstream_incomplete'}},some('Truncated')],[{code:'upstream_timeout'},some('Stalled')],[{code:'upstream_interrupted'},some('Interrupted')],[{code:'upstream_incomplete'},some('Truncated')],[{error:{code:'upstream_incomplete'},code:'upstream_timeout'},some('Truncated')],[{error:{code:'unknown'},code:'upstream_timeout'},none],[{error:{code:null},code:'upstream_timeout'},none],[{error:{code:4n},code:'upstream_timeout'},none],[{error:null,code:'upstream_timeout'},some('Stalled')],[{},none]])assert.deepEqual(translated.fixture_classifier(jsonValue(event)),expected);
  }
});

test('actual Claude first-block identity reader uses only the first checked vector element',async()=>{
  const {apis}=await checkedModule('identity-first-block');
  for(const translated of apis){
  const identity="You are Claude Code, Anthropic's official CLI for Claude.";
  for(const [blocks,expected] of [[[],false],[[{text:identity}],true],[[{text:identity+' additional instructions'}],true],[[{text:'project instructions'},{text:identity}],false],[[{text:identity},{text:'project instructions'}],true],[[{text:null}],false],[[{text:false}],false],[[{}],false],[[null],false],[[{text:' '+identity}],false]])assert.equal(translated.first_block_is_identity(Object.freeze(blocks.map(jsonValue))),expected);
  assert.equal(translated.CLAUDE_CODE_SYSTEM_PROMPT,identity);
  assert.throws(()=>translated.first_block_is_identity(Object.freeze([{text:identity}])),TypeError);
  }
});
