import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createConcreteSyntaxMeta,serializeConcreteSyntaxMeta,parseConcreteSyntaxMeta,
  reconstructConcreteSyntax,applyConcreteSyntaxSubstitutions,CONCRETE_SYNTAX_SCHEMA} from '../concrete-syntax-meta.mjs';
import {RepresentationLevel} from '../vendor/meta-language/language-support.js';
import {verifyTypedTargets} from './typed-targets.mjs';

const json=JSON.stringify,define=Object.defineProperty,descriptor=Object.getOwnPropertyDescriptor;
const hash=value=>createHash('sha256').update(value).digest('hex');
function retain(name,value){
  const directory=process.env.ROUTER_CONCRETE_SYNTAX_VECTOR_DIR;if(!directory)return;
  mkdirSync(directory,{recursive:true});writeFileSync(join(directory,name+'.json'),json(value)+'\n',{flag:'wx'});
}
function complete(source,language,label){
  const original=createConcreteSyntaxMeta(source,{language}),serialized=serializeConcreteSyntaxMeta(original);
  const reparsed=parseConcreteSyntaxMeta(serialized),reconstructed=reconstructConcreteSyntax(reparsed);
  const independent=reparsed.nodes.filter(node=>!['root','group'].includes(node[0])).map(node=>source.slice(node[2],node[3])).join('');
  const result={source,language,original,serialized,reparsed,reconstructed,independent};retain(label,result);
  assert.equal(reconstructed,source);assert.equal(independent,source);assert.equal(serialized,serializeConcreteSyntaxMeta(reparsed));
  assert.deepEqual(reparsed,original);assert.notEqual(reparsed,original);assert.equal(original.source,source);
  assert.equal(original.schema,CONCRETE_SYNTAX_SCHEMA);assert.equal(original.representationLevel,RepresentationLevel.ConcreteSyntax);
  assert.deepEqual(original.authority,{type:false,owner:false,executable:false});assert.ok(Object.isFrozen(original));
  assert.ok(Object.isFrozen(original.nodes));for(const node of original.nodes)assert.ok(Object.isFrozen(node));
  assert.equal(original.sourceEncoding.utf16CodeUnits,source.length);
  assert.equal(original.sourceEncoding.utf8Bytes,new TextEncoder().encode(source).length);
  for(const node of original.nodes){
    assert.equal(node[4],new TextEncoder().encode(source.slice(0,node[2])).length);
    assert.equal(node[5],new TextEncoder().encode(source.slice(0,node[3])).length);
  }
  return result;
}
const outcome=read=>{try{return {value:read()};}catch(error){return {error:{name:error.name,message:error.message}};}};

test('Rust concrete tokens retain full macro bodies raw strings nested comments trivia and delimiter structure',{timeout:60000},()=>{
  const source='\ufeff// Ω😀 original CRLF\r\n/* outer { /* inner ] */ end */\r\n'+
    'macro_rules! wrap { ($x:expr) => {{ let text = br###"raw } ] /* 😀"###; ($x, text) }}; }\r\n'+
    "pub fn pick<'a>(value: &'a str) -> &'a str { let mark = '\\u{1f600}'; wrap!(value); value }\r\n";
  const {original}=complete(source,'Rust','01-complete-rust');assert.equal(original.status,'lexical');
  assert.ok(original.nodes.filter(node=>node[0]==='group').length>=6);
  const leaves=original.nodes.filter(node=>node[0]!=='group'&&node[0]!=='root');
  assert.ok(leaves.some(node=>node[0]==='trivia'&&source.slice(node[2],node[3]).includes('/* inner ] */')));
  assert.ok(leaves.some(node=>node[0]==='token'&&source.slice(node[2],node[3]).startsWith('br###')));
  const covering=leaves.find(node=>source.slice(node[2],node[3]).startsWith('br###'));
  assert.equal(original.nodes.filter(node=>node[2]>covering[2]&&node[3]<covering[3]).length,0);
  assert.equal(original.sourceEncoding.utf8BytePreservation,true);
});

test('JavaScript and TypeScript preserve template regex comments ASI BOM and Unicode source independently of grammar acceptance',{timeout:60000},()=>{
  const javascript='\ufeff// original Ω😀\r\nconst pattern = /[{}\\/]/gu;\r\n'+
    'const text = `outer ${flag ? `inner ${1}` : /[}]/.source} end`;\r\n'+
    'export function choose(flag) { /* keep */ if (flag) return\r\n  ({ value: text }); return pattern; }\r\n';
  const typed='// types stay source; CST does not erase them\nexport function choose(value: readonly [number, string]): number {\n  const label: string = `value=${value[1]}`; return value[0];\n}\n';
  for(const [source,language,label]of [[javascript,'JavaScript','02-javascript'],[typed,'TypeScript','02-typescript']]){
    const {original}=complete(source,language,label);assert.equal(original.status,'lexical');
    assert.ok(original.nodes.some(node=>node[0]==='group'));
    assert.ok(original.nodes.some(node=>node[1]==='template'));
  }
  const {original}=complete('function quotient(a,b) { return a / b; }','JavaScript','02-division-conservative');
  assert.equal(original.status,'opaque');assert.equal(original.diagnostics[0][0],'slash-context');
  const asi=complete('function value() { return\r\n{ retained: 1 }; }','JavaScript','02-asi');
  assert.ok(asi.reconstructed.includes('return\r\n{'));
});

test('unsupported malformed whole sources remain honest opaque or error data with exact UTF16 reconstruction',{timeout:60000},()=>{
  const examples=[['Rust','/* outer /* nested */'],['Rust','fn broken() { let raw = r###"never closed; }'],
    ['Rust','fn broken(] {}'],['JavaScript','const value = `unterminated ${1};'],
    ['TypeScript','function broken(value: string) { return "unterminated; }'],['Rust','fn missing() {'],
    ['Rust','fn unknown() { `unsupported`; }']];
  for(const [index,[language,source]]of examples.entries()){
    const {original}=complete(source,language,'03-whole-refusal-'+index);
    assert.ok(original.status==='opaque'||original.status==='error');assert.equal(original.nodes.length,2);
    assert.deepEqual(original.nodes[1].slice(2,4),[0,source.length]);assert.equal(original.diagnostics.length,1);
  }
  const source='// retained unpaired '+String.fromCharCode(0xd800)+' '+String.fromCharCode(0xdfff)+'\nfn value() {}';
  const {original}=complete(source,'Rust','03-unpaired-utf16');
  assert.equal(original.sourceEncoding.wellFormedUnicode,false);assert.equal(original.sourceEncoding.utf8BytePreservation,false);
  assert.equal(original.sourceEncoding.utf8Mapping,'unicode-replacement');
  complete('','Rust','03-empty');complete(' \t\r\n\ufeff','JavaScript','03-trivia-only');
  const deep='('.repeat(256)+'value'+')'.repeat(256),row=complete(deep,'Rust','03-depth-opaque');
  assert.equal(row.original.status,'opaque');assert.equal(row.original.diagnostics[0][0],'delimiter-depth');
});

test('canonical serialized CST rejects fabricated classification shape partitions coordinates and semantic authority',{timeout:60000},()=>{
  const source='fn original() { /* keep */ 12 }',doc=createConcreteSyntaxMeta(source,{language:'Rust'}),serialized=serializeConcreteSyntaxMeta(doc);
  const altered=[];
  function reject(label,change){const copy=JSON.parse(serialized);change(copy);const result=outcome(()=>serializeConcreteSyntaxMeta(copy));altered.push({label,copy,result});assert.ok(result.error,label);}
  reject('semantic-owner',copy=>{copy.authority.owner=true;});reject('extra-field',copy=>{copy.injected=true;});
  reject('root-span',copy=>{copy.nodes[0][3]--;});reject('wrong-parent',copy=>{copy.nodes[1][6]=1;});
  reject('classification',copy=>{copy.nodes.find(node=>node[1]==='number')[1]='identifier';});
  reject('utf8-map',copy=>{copy.nodes[1][4]++;});reject('missing-node',copy=>{copy.nodes.splice(2,1);});
  reject('status-lie',copy=>{copy.status='opaque';});reject('source-only-mutation',copy=>{copy.source='fn changed() {}';});
  reject('sparse-row',copy=>{delete copy.nodes[1][1];});reject('symbol',copy=>{copy[Symbol('hidden')]=1;});
  const noncanonical=[' '+serialized,serialized+'\n',serialized.replace('{','{"schema":"ignored",'),serialized.replace('"utf16CodeUnits":','"utf16CodeUnits":-')];
  for(const encoded of noncanonical)assert.throws(()=>parseConcreteSyntaxMeta(encoded));
  assert.throws(()=>parseConcreteSyntaxMeta('['.repeat(20)+'0'+']'.repeat(20)),/nesting budget/u);
  const copy=structuredClone(doc),copied=serializeConcreteSyntaxMeta(copy);assert.equal(copied,serialized);
  assert.deepEqual(parseConcreteSyntaxMeta(copied).authority,{type:false,owner:false,executable:false});
  assert.throws(()=>{doc.nodes[0][2]=99;},TypeError);assert.equal(serializeConcreteSyntaxMeta(doc),serialized);
  retain('04-full-tamper-controls',{source,doc,serialized,altered,noncanonical,copied});
});

test('exact node and span substitutions run language then repository and reparse the changed full source',{timeout:60000},()=>{
  const source='pub fn original() -> u32 { 1 }\n',doc=createConcreteSyntaxMeta(source,{language:'Rust'});
  const numberNode=doc.nodes.findIndex(node=>node[1]==='number'),nameStart=source.indexOf('original');
  const rules={languageRules:[{id:'literal-two',edits:[{node:numberNode,expected:'1',replacement:'2'}]},
    {id:'language-name',edits:[{span:[nameStart,nameStart+8],expected:'original',replacement:'renamed'}]}],
    repositoryRules:[{id:'trailing-note',edits:[{span:[source.length-1,source.length-1],expected:'',replacement:' // repository'}]}]};
  const result=applyConcreteSyntaxSubstitutions(doc,rules),actual=reconstructConcreteSyntax(result.value);
  // The name shrinks by one code unit, so the original final-newline boundary
  // becomes the new EOF. Later rules deliberately address the preceding text.
  retain('05-ordered-full-source',{source,doc,rules,result,actual});
  assert.equal(actual,'pub fn renamed() -> u32 { 2 }\n // repository');
  assert.deepEqual(result.trace.map(row=>row.phase),['language','repository']);
  assert.deepEqual(result.trace.flatMap(row=>row.rules.map(rule=>rule.id)),['literal-two','language-name','trailing-note']);
  assert.equal(reconstructConcreteSyntax(doc),source);assert.equal(result.value.status,'lexical');
  const identity=applyConcreteSyntaxSubstitutions(doc,{languageRules:[],repositoryRules:[]});
  assert.equal(reconstructConcreteSyntax(identity.value),source);assert.deepEqual(identity.trace,[{phase:'language',rules:[]},{phase:'repository',rules:[]}]);
  const invalid=[{id:'stale',edits:[{node:numberNode,expected:'9',replacement:'2'}]},
    {id:'inside-token',edits:[{span:[nameStart+1,nameStart+3],expected:'ri',replacement:'x'}]},
    {id:'overlap',edits:[{span:[nameStart,nameStart+8],expected:'original',replacement:'x'},{node:0,expected:source,replacement:source}]},
    {id:'callback',edits:[],apply(){throw Error('must not execute');}}];
  for(const rule of invalid)assert.throws(()=>applyConcreteSyntaxSubstitutions(doc,{languageRules:[rule],repositoryRules:[]}));
  assert.throws(()=>applyConcreteSyntaxSubstitutions(doc,{languageRules:[{id:'same',edits:[]}],repositoryRules:[{id:'same',edits:[]}]}));
});

test('proxy accessor foreign sparse inherited and callback rule inputs refuse before user code executes',{timeout:60000},()=>{
  const source='fn value() { 1 }',doc=createConcreteSyntaxMeta(source,{language:'Rust'}),observations=[];let calls=0;
  const proxy=new Proxy(doc,{ownKeys(){calls++;throw Error('proxy keys');},getOwnPropertyDescriptor(){calls++;throw Error('proxy descriptor');},get(){calls++;throw Error('proxy get');}});
  const accessor=structuredClone(doc);define(accessor,'source',{enumerable:true,get(){calls++;throw Error('source getter');}});
  const unknown=structuredClone(doc);define(unknown,'stack',{enumerable:true,get(){calls++;throw Error('lazy stack');}});
  const inherited=Object.create({language:'Rust'}),options={get language(){calls++;throw Error('language getter');}};
  const foreign=Object.assign(Object.create({}),structuredClone(doc));
  for(const [label,read]of [['proxy',()=>serializeConcreteSyntaxMeta(proxy)],['accessor',()=>reconstructConcreteSyntax(accessor)],
    ['unknown-before-descriptor',()=>serializeConcreteSyntaxMeta(unknown)],['inherited',()=>createConcreteSyntaxMeta(source,inherited)],
    ['options-accessor',()=>createConcreteSyntaxMeta(source,options)],['foreign',()=>serializeConcreteSyntaxMeta(foreign)],
    ['boxed-source',()=>createConcreteSyntaxMeta(new String(source),{language:'Rust'})],
    ['rule-accessor',()=>applyConcreteSyntaxSubstitutions(doc,{get languageRules(){calls++;throw Error('rules getter');},repositoryRules:[]})]]){
    const result=outcome(read);observations.push({label,result});assert.ok(result.error,label);
  }
  assert.equal(calls,0);
  const escapeSlot=descriptor(Object.prototype,'e');let escapeCalls=0,escapeResult;
  try{
    define(Object.prototype,'e',{configurable:true,get(){escapeCalls++;throw Error('escape-map getter');}});
    escapeResult=outcome(()=>createConcreteSyntaxMeta('const value = "\\e";',{language:'JavaScript'}));
  }finally{if(escapeSlot)define(Object.prototype,'e',escapeSlot);else delete Object.prototype.e;}
  assert.ok(escapeResult.error);assert.equal(escapeCalls,0);
  const previous=descriptor(Object.prototype,'get');let inheritedCalls=0,result;
  try{
    define(Object.prototype,'get',{configurable:true,get(){inheritedCalls++;throw Error('inherited descriptor get');}});
    result=createConcreteSyntaxMeta(source,{language:'Rust'});
  }finally{if(previous)define(Object.prototype,'get',previous);else delete Object.prototype.get;}
  retain('06-own-data-ingress',{source,observations,calls,result,inheritedCalls,escapeResult,escapeCalls});assert.equal(inheritedCalls,0);assert.equal(result.source,source);
});

test('changed lexical natives refuse with zero callbacks and cold failed captures remain refused after restoration',{timeout:60000},()=>{
  const source='export const value = "\\u{1f600}";',doc=createConcreteSyntaxMeta(source,{language:'JavaScript'}),observations=[];
  for(const [owner,key]of [[JSON,'parse'],[String,'fromCodePoint'],[Math,'min'],[Array,'from'],[globalThis,'Number'],[globalThis,'BigInt']]){
    const old=descriptor(owner,key);let calls=0,result;
    try{define(owner,key,{...old,value:function changedNative(){calls++;throw Error('must not execute');}});result=outcome(()=>serializeConcreteSyntaxMeta(doc));}
    finally{define(owner,key,old);}
    observations.push({key,result,calls,restored:serializeConcreteSyntaxMeta(doc)});assert.ok(result.error);assert.equal(calls,0);
  }
  const malformed='const value = "unterminated;',errorLimit=descriptor(Error,'stackTraceLimit'),functionPrototype=Object.getPrototypeOf(Error),inheritedLimit=descriptor(functionPrototype,'stackTraceLimit');
  const diagnosticControls=[];
  for(const kind of ['accessor','object','inherited-accessor']){
    let calls=0,result;
    try{
      if(kind==='inherited-accessor'){
        delete Error.stackTraceLimit;define(functionPrototype,'stackTraceLimit',{configurable:true,get(){calls++;return 10;}});
      }else if(kind==='accessor')define(Error,'stackTraceLimit',{configurable:true,get(){calls++;return 10;}});
      else define(Error,'stackTraceLimit',{configurable:true,value:{valueOf(){calls++;return 10;}}});
      result=outcome(()=>createConcreteSyntaxMeta(malformed,{language:'JavaScript'}));
    }finally{
      if(errorLimit)define(Error,'stackTraceLimit',errorLimit);else delete Error.stackTraceLimit;
      if(inheritedLimit)define(functionPrototype,'stackTraceLimit',inheritedLimit);else delete functionPrototype.stackTraceLimit;
    }
    const restored=createConcreteSyntaxMeta(malformed,{language:'JavaScript'});
    diagnosticControls.push({kind,malformed,result,calls,restored,executedProviderErrorCounterexample:false});
    assert.ok(result.error);assert.equal(calls,0);assert.equal(restored.status,'error');
  }
  const directory=realpathSync(mkdtempSync(join(tmpdir(),'router-cst-cold-'))),origin=new URL('../concrete-syntax-meta.mjs',import.meta.url),original=readFileSync(origin,'utf8');
  try{
    const relocations=[];const relocated=original.replace(/from (['"])(\.\.?\/[^'"]+)\1/gu,(whole,quote,path)=>{
      const replacement='from '+json(new URL(path,origin).href);relocations.push({whole,replacement});return replacement;
    });
    let reversed=relocated;for(const row of [...relocations].reverse())reversed=reversed.replace(row.replacement,row.whole);assert.equal(reversed,original);
    const cold=join(directory,'cold.mjs'),coldLimit=join(directory,'cold-limit.mjs'),fresh=join(directory,'fresh.mjs');writeFileSync(cold,relocated);writeFileSync(coldLimit,relocated);writeFileSync(fresh,relocated);
    assert.equal(readFileSync(cold,'utf8'),relocated);assert.equal(readFileSync(fresh,'utf8'),relocated);
    const common=new URL('../original-json-intrinsics.mjs',import.meta.url).href;
    const providers=['../rust-structure.mjs','../vendor/meta-language/translation/lexer.js','../vendor/meta-language/language-support.js'].map(path=>new URL(path,import.meta.url).href);
    const code=`await import(${json(common)});for(const url of ${json(providers)})await import(url);const define=Object.defineProperty,descriptor=Object.getOwnPropertyDescriptor,old=descriptor(JSON,'parse');let calls=0,cold;try{define(JSON,'parse',{...old,value:function changedParse(){calls++;throw Error('must not execute');}});cold=await import(${json(pathToFileURL(cold).href)});}finally{define(JSON,'parse',old);}const outcome=read=>{try{return {value:read()};}catch(error){return {error:{name:error.name,message:error.message}};}};const failed=outcome(()=>cold.createConcreteSyntaxMeta('const value = 1;',{language:'JavaScript'}));const oldLimit=descriptor(Error,'stackTraceLimit');let limitCalls=0,coldLimit;try{define(Error,'stackTraceLimit',{configurable:true,get(){limitCalls++;return 10;}});coldLimit=await import(${json(pathToFileURL(coldLimit).href)});}finally{if(oldLimit)define(Error,'stackTraceLimit',oldLimit);else delete Error.stackTraceLimit;}const limitFailed=outcome(()=>coldLimit.createConcreteSyntaxMeta(${json(malformed)},{language:'JavaScript'}));const fresh=await import(${json(pathToFileURL(fresh).href)});const positive=fresh.createConcreteSyntaxMeta('const value = 1;',{language:'JavaScript'});process.stdout.write(JSON.stringify({calls,failed,limitCalls,limitFailed,positive,versions:process.versions}));`;
    let raw;try{raw=execFileSync(process.execPath,['--input-type=module','--eval',code],{encoding:'utf8',timeout:10000,maxBuffer:8*1024*1024});}
    catch(error){retain('07-cold-partial-failure',{code,original,relocated,relocations,error:{name:error.name,message:error.message},stdout:Buffer.from(error.stdout??[]).toString('base64'),stderr:Buffer.from(error.stderr??[]).toString('base64'),partial:true});throw error;}
    retain('07-cold-full-wire',{code,original,originalSha256:hash(original),relocated,relocations,raw});const result=JSON.parse(raw);
    retain('07-complete-native-controls',{observations,diagnosticControls,result,raw});assert.equal(result.calls,0);assert.ok(result.failed.error);assert.equal(result.limitCalls,0);assert.ok(result.limitFailed.error);assert.equal(result.positive.status,'lexical');
  }finally{rmSync(directory,{recursive:true,force:true});}
});

test('bounded CST edits affect independently executed JavaScript and strict TypeScript without granting semantic authority',{timeout:60000},async()=>{
  const javascript='export function compute(value) { return value + 1; }\nexport const translated = { compute };\n';
  const typescript='export function compute(value: number): number { return value + 1; }\nexport const translated = { compute };\n';
  const sources=[];
  for(const [source,language]of [[javascript,'JavaScript'],[typescript,'TypeScript']]){
    const doc=createConcreteSyntaxMeta(source,{language}),node=doc.nodes.findIndex(row=>row[1]==='number');
    const result=applyConcreteSyntaxSubstitutions(doc,{languageRules:[{id:'add-two',edits:[{node,expected:'1',replacement:'2'}]}],repositoryRules:[]});
    const serialized=serializeConcreteSyntaxMeta(result.value),reparsed=parseConcreteSyntaxMeta(serialized),actual=reconstructConcreteSyntax(reparsed);
    sources.push({source,language,doc,result,serialized,reparsed,actual});
    assert.equal(actual,source.replace(' + 1;',' + 2;'));assert.deepEqual(reparsed.authority,{type:false,owner:false,executable:false});
  }
  retain('08-complete-typed-sources-before-execution',sources);
  const actuals=[];await verifyTypedTargets({javascript:sources[0].actual,typescript:sources[1].actual},translated=>{actuals.push(translated.compute(3));assert.equal(translated.compute(3),5);},{childTimeoutMs:20000});
  assert.deepEqual(actuals,[5,5]);
  const source=' '.repeat(2097152),limit=createConcreteSyntaxMeta(source,{language:'Rust'});assert.equal(limit.source.length,2097152);
  assert.throws(()=>createConcreteSyntaxMeta(source+' ',{language:'Rust'}),/bounded primitive text/u);
  assert.throws(()=>parseConcreteSyntaxMeta(' '.repeat(33554433)),/bounded primitive text/u);
  const rules=Array.from({length:257},(_,index)=>({id:'r'+index,edits:[]}));
  assert.throws(()=>applyConcreteSyntaxSubstitutions(sources[0].doc,{languageRules:rules,repositoryRules:[]}),/bounded dense array/u);
  retain('08-executed-and-budgets',{actuals,source,sourceCodeUnits:source.length,limitEncoding:limit.sourceEncoding,limitNodes:limit.nodes,ruleCount:rules.length,strictChildTimeoutMs:20000});
});
