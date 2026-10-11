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

test('actual timeout parsers preserve zero-disable, fallback and full u64 seconds',async()=>{
  const {apis}=await checkedModule('timeout-parser');
  for(const translated of apis){
  const none=tagged('None'),some=value=>tagged('Some',{field0:value}),duration=seconds=>tagged('Duration',{secs:seconds,nanos:0n});
  for(const [input,fallback,expected] of [[none,10n,some(duration(10n))],[some('0'),10n,none],[some(' 3 '),10n,some(duration(3n))],[some('\u00853'),10n,some(duration(3n))],[some('\uFEFF3'),10n,some(duration(10n))],[some('not-a-number'),10n,some(duration(10n))],[some('-1'),10n,some(duration(10n))],[some(''),10n,some(duration(10n))],[none,0n,none],[some('9007199254740993'),10n,some(duration(9007199254740993n))],[some('18446744073709551615'),10n,some(duration(18446744073709551615n))],[some('18446744073709551616'),10n,some(duration(10n))]])assert.deepEqual(translated.parse_timeout_secs(input,fallback),expected);
  assert.equal(translated.DEFAULT_UPSTREAM_READ_TIMEOUT_SECS,120n);
  assert.deepEqual(translated.parse_upstream_read_timeout(none),some(duration(120n)));
  assert.deepEqual(translated.parse_upstream_read_timeout(some('30')),some(duration(30n)));
  assert.deepEqual(translated.parse_upstream_read_timeout(some('0')),none);
  assert.deepEqual(translated.parse_upstream_read_timeout(some('not-a-number')),some(duration(120n)));
  }
});

test('actual output limiter constructor saturates token budgets and preserves uncapped zero distinction',async()=>{
  const {apis,result}=await checkedModule('output-limiter-constructor');
  const declarations=new Map(result.meta.checkedSemanticProgram.program.declarations.$map),record=declarations.get('OutputTokenLimiter');
  assert.ok(record,'original output limiter must have a checked declaration');
  assert.deepEqual(record.deriveTraits,['Clone','Debug','Default']);
  assert.equal(record.ctors[0].ctorStyle,'named');
  assert.deepEqual(record.ctors[0].fields.map(field=>field.name),['remaining','stopped']);
  assert.deepEqual(record.ctors[0].fields[1].type,{kind:'bool',rustSourceType:true});
  const option=declarations.get(record.ctors[0].fields[0].type.name);
  assert.equal(option.standardGeneric.kind,'Option');
  assert.deepEqual(option.ctors.find(ctor=>ctor.name==='Some').fields[0].type,{kind:'fixed',signed:false,bits:64,rustPrimitiveName:'u64',rustSourceType:true});
  assert.ok(![...declarations.values()].some(entry=>entry.k==='fn'&&entry.name==='default'),'layout evidence must not synthesize a Default implementation');
  const none=tagged('None'),some=value=>tagged('Some',{field0:value}),limiter=remaining=>tagged('OutputTokenLimiter',{remaining,stopped:false});
  for(const translated of apis){
  assert.equal(translated.CHARS_PER_TOKEN,4n);
  for(const [limit,remaining] of [[none,none],[some(0n),some(0n)],[some(2n),some(8n)],[some(4611686018427387903n),some(18446744073709551612n)],[some(4611686018427387904n),some(18446744073709551615n)],[some(18446744073709551615n),some(18446744073709551615n)]])assert.deepEqual(translated.fixture_limiter(limit),limiter(remaining));
  }
});


test('actual stream failure message uses its checked Copy receiver and exact original strings',async()=>{
  const {apis,result}=await checkedModule('failure-message');
  const declarations=new Map(result.meta.checkedSemanticProgram.program.declarations.$map);
  assert.deepEqual(declarations.get('FailureKind').deriveTraits,['Debug','Clone','Copy','PartialEq','Eq']);
  const method=[...declarations.values()].find(entry=>entry.impl?.method==='message');
  assert.ok(method,'the original by-value method must supply checked executable evidence');
  assert.equal(method.constFunction,true);
  assert.equal(method.impl.receiver,'value');
  const certificate=method.impl.copyCertificate,{digest,...evidence}=certificate;
  assert.equal(certificate.profile,'checked-rust-copy-layout-v1');
  assert.equal(certificate.verified,true);
  assert.deepEqual(certificate.type,{kind:'data',name:'FailureKind'});
  assert.deepEqual(certificate.diagnostics,[]);
  assert.equal(hash(JSON.stringify(evidence)),digest);
  assert.equal(method.impl.rewrites[0].kind,'copy-receiver');
  assert.equal(method.impl.rewrites[0].certificate,digest);
  for(const translated of apis){
    for(const [kind,expected] of [['Stalled','upstream stream stalled past the idle timeout before completion'],['Interrupted','upstream stream was interrupted before completion'],['Truncated','upstream stream ended before completion']])assert.equal(translated.fixture_failure_message(tagged(kind)),expected);
    assert.equal(translated.INCOMPLETE_STREAM_MESSAGE,'upstream stream ended before completion');
    assert.throws(()=>translated.fixture_failure_message({$:'Stalled'}),TypeError);
    let reads=0;
    const accessor=Object.freeze(Object.defineProperty({},'$',{get(){reads++;return 'Stalled';}}));
    assert.throws(()=>translated.fixture_failure_message(accessor),TypeError);assert.equal(reads,0);
    const proxy=new Proxy(tagged('Stalled'),{get(target,key){reads++;return Reflect.get(target,key);}});
    assert.throws(()=>translated.fixture_failure_message(proxy),TypeError);assert.equal(reads,0);
    assert.throws(()=>translated.fixture_failure_message(tagged('Unrecognized')),TypeError);
  }
});


function assertFormatProvenance(id,result,expected) {
  const {source,entry}=exactModule(id),declarations=new Map(result.meta.checkedSemanticProgram.program.declarations.$map);
  const proofs=[];
  const visit=node=>{
    if(!node||typeof node!=='object')return;
    if(node.formatProvenance)proofs.push(node.formatProvenance);
    for(const [key,value] of Object.entries(node))if(!['type','formatProvenance'].includes(key)){
      if(Array.isArray(value))value.forEach(visit);else visit(value);
    }
  };
  for(const name of entry.bodyNames)visit(declarations.get(name).body);
  assert.deepEqual(proofs.sort((a,b)=>a.sourceTemplateSpan.start-b.sourceTemplateSpan.start).map(proof=>{
    assert.equal(proof.profile,'checked-primitive-format-v1');
    return {template:source.slice(proof.sourceTemplateSpan.start,proof.sourceTemplateSpan.end),macro:source.slice(proof.sourceMacroSpan.start,proof.sourceMacroSpan.end),arguments:proof.explicitArgumentCount};
  }),expected);
}

test('actual account resume message formats each original branch without interpreting captured braces',async()=>{
  const {apis,result}=await checkedModule('format-resume_message');
  assertFormatProvenance('format-resume_message',result,[{template:'"resumed {name}"',macro:'format!("resumed {name}")',arguments:0},{template:'"{name} was not paused"',macro:'format!("{name} was not paused")',arguments:0}]);
  for(const api of apis){
    for(const [name,paused,expected] of [['primary',true,'resumed primary'],['primary',false,'primary was not paused'],['Ω/😀',true,'resumed Ω/😀'],['Ω/😀',false,'Ω/😀 was not paused'],['',true,'resumed '],['',false,' was not paused'],['{name}',true,'resumed {name}'],['{name}',false,'{name} was not paused']])assert.equal(api.resume_message(name,paused),expected);
    assert.throws(()=>api.resume_message('primary',1n),TypeError);
  }
});

test('actual humanized duration preserves documented test boundaries and signed integer extremes',async()=>{
  const {apis,result}=await checkedModule('format-humanize_minutes');
  assertFormatProvenance('format-humanize_minutes',result,[{template:'"{minutes} minutes"',macro:'format!("{minutes} minutes")',arguments:0},{template:'"{hours} hours"',macro:'format!("{hours} hours")',arguments:0},{template:'"{} days"',macro:'format!("{} days", hours / 24)',arguments:1}]);
  for(const api of apis){
    for(const [minutes,expected] of [[-9223372036854775808n,'-9223372036854775808 minutes'],[-1n,'-1 minutes'],[0n,'0 minutes'],[45n,'45 minutes'],[89n,'89 minutes'],[90n,'1 hours'],[119n,'1 hours'],[120n,'2 hours'],[2819n,'46 hours'],[2820n,'47 hours'],[2879n,'47 hours'],[2880n,'2 days'],[4319n,'2 days'],[4320n,'3 days'],[9223372036854775807n,'6405119470038038 days']])assert.equal(api.humanize_minutes(minutes),expected);
    assert.throws(()=>api.humanize_minutes(-9223372036854775809n),RangeError);
    assert.throws(()=>api.humanize_minutes(9223372036854775808n),RangeError);
  }
});
