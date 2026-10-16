import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync,realpathSync,symlinkSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {createConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {lexPrivateConcreteSource,transportPrivateConcreteSource,originalPrivateParserSourceInputs} from '../private-parser-execution.mjs';
import {independentParserSha256} from '../private-parser-sha256.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {tokenize} from '../vendor/meta-language/translation/lexer.js';
import {isCompilerSourceInputPath} from '../compiler-source-inputs.mjs';

const base=fileURLToPath(new URL('../',import.meta.url)),json=JSON.stringify,parse=JSON.parse;
const descriptor=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply;
const nativeHash=value=>createHash('sha256').update(value).digest('hex');
const profilePath=join(base,'source-profiles/private-parser-execution/manifest.json');
const manifestSource=readFileSync(profilePath,'utf8'),manifest=parse(manifestSource);
function retain(name,value){const root=process.env.ROUTER_PRIVATE_PARSER_VECTOR_DIR;if(root){mkdirSync(root,{recursive:true});writeFileSync(join(root,name+'.json'),json(value)+'\n',{flag:'wx'});}}
function outcome(action){try{return {value:action()};}catch(error){
  const field=error&&typeof error==='object'?descriptor(error,'message'):null;let name='non-data failure';
  for(let owner=error;owner&&typeof owner==='object';owner=Object.getPrototypeOf(owner)){
    const own=descriptor(owner,'name');if(own){name=Object.hasOwn(own,'value')?own.value:'accessor-not-read';break;}
  }
  return {error:{name,message:field&&Object.hasOwn(field,'value')?field.value:'non-data failure'}};
}}
function scratch(t){const root=realpathSync(mkdtempSync(join(tmpdir(),'router-private-parser-')));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;}
function fixture(t,label){
  const root=scratch(t),files=[],rows=[...manifest.sources,...manifest.licenses,...manifest.notices,...manifest.hostInputs];
  mkdirSync(join(root,'source-profiles/private-parser-execution'),{recursive:true});writeFileSync(join(root,'source-profiles/private-parser-execution/manifest.json'),manifestSource);
  for(const row of rows){const bytes=readFileSync(join(base,row.path));mkdirSync(dirname(join(root,row.path)),{recursive:true});writeFileSync(join(root,row.path),bytes);files.push({row,source:bytes.toString('utf8')});}
  const original=readFileSync(join(base,'private-parser-execution.mjs'),'utf8');let copied=original;const relocations=[];
  for(const path of ['./original-json-intrinsics.mjs','./private-parser-sha256.mjs']){
    const before="from '"+path+"'",after="from '"+new URL(path,pathToFileURL(join(base,'private-parser-execution.mjs'))).href+"'";
    assert.equal(copied.split(before).length,2);copied=copied.replace(before,after);relocations.push({before,after});
  }
  let reversed=copied;for(const row of [...relocations].reverse())reversed=reversed.replace(row.after,row.before);
  const path=join(root,'private-parser-execution.mjs');writeFileSync(path,copied);
  const record={label,root,manifestSource,files,original,copied,relocations,reversed,readback:readFileSync(path,'utf8')};retain(label+'-fixture',record);
  assert.equal(reversed,original);assert.equal(record.readback,copied);return {...record,path};
}
const examples=[
  ['Rust','\ufeff// Ω😀\r\n/* outer /* inner */ end */\r\nmacro_rules! take { ($x:expr)=>{{ $x }} }\npub fn value<\'a>(s: &\'a str) { let r=br###"}] /* 😀"###; let c=\'x\'; take!(s); }'],
  ['JavaScript','\ufeff// Ω😀\r\nexport function value(x) { const r=/[}\\/]/gu; return `outer ${x ? `inner ${1}` : r.source}`; }'],
  ['TypeScript','export function value(x: readonly [number,string]): number { return x[0]; }'],
];

test('complete private provider outputs equal complete original outputs over full sources and lexical edges',{timeout:60000},()=>{
  const inputs=[...examples,...manifest.sources.filter(row=>row.id!=='concrete').map(row=>['JavaScript',readFileSync(join(base,row.path),'utf8')])];
  const results=[];
  for(const [language,source]of inputs){
    const before=outcome(()=>language==='Rust'?rustTokens(source):tokenize(source,'JavaScript'));
    const current=outcome(()=>lexPrivateConcreteSource(source,language));results.push({source,language,before,current});
  }
  retain('01-complete-input-output',{manifestSource,inputs,results});
  for(const row of results){
    if(row.before.error){assert.ok(row.current.error);assert.equal(row.current.error.message,row.before.error.message);}
    else assert.deepEqual(row.current,row.before);
  }
  const tokens=lexPrivateConcreteSource('pub fn add(a:u32,b:u32)->u32 { a+b }','Rust');
  assert.ok(tokens.some(row=>row.text==='+'));for(const row of tokens)assert.equal(row.text,'pub fn add(a:u32,b:u32)->u32 { a+b }'.slice(row.start,row.end));
});

test('a real escaped public punctuator table remains distinct from the qualified private graph',{timeout:60000},async t=>{
  const legacy=[];
  for(const input of ['{}','']){
    const f=fixture(t,'02-first-compile-'+(input?'braces':'empty'));
    const original=readFileSync(join(base,'private-parser-inputs/concrete-syntax-original.mjs'),'utf8');let copied=original;const relocations=[];
    for(const path of ['./rust-structure.mjs','./vendor/meta-language/translation/lexer.js','./original-json-intrinsics.mjs']){
      const before="from '"+path+"'",after="from '"+new URL(path,pathToFileURL(join(base,'concrete-syntax-meta.mjs'))).href+"'";
      assert.equal(copied.split(before).length,2);copied=copied.replace(before,after);relocations.push({before,after});
    }
    const path=join(f.root,'original-concrete.mjs');writeFileSync(path,copied);let reversed=copied;
    for(const row of [...relocations].reverse())reversed=reversed.replace(row.after,row.before);
    const old=await import(pathToFileURL(path).href),current=await import(pathToFileURL(f.path).href);
    const names=['$1','$2','$3','$4','$5','$6','$7','$8','$9','input','lastMatch','lastParen','leftContext','rightContext'];
    const captures=()=>Object.fromEntries(names.map(name=>[name,RegExp[name]]));
    /(one)(two)/.exec('beforeonetwoafter');const before=captures();
    const first=old.createConcreteSyntaxMeta(input,{language:'Rust'}),applied=old.applyConcreteSyntaxSubstitutions(first,{languageRules:[],repositoryRules:[]});
    const wire=old.serializeConcreteSyntaxMeta(applied.value),document=old.parseConcreteSyntaxMeta(wire),source=old.reconstructConcreteSyntax(document),afterOld=captures();
    /(one)(two)/.exec('beforeonetwoafter');const beforeCurrent=captures();
    const actual=current.transportPrivateConcreteSource(input,'Rust'),afterCurrent=captures();
    legacy.push({input,original,copied,relocations,reversed,readback:readFileSync(path,'utf8'),before,afterOld,beforeCurrent,afterCurrent,expected:{source,document,meta:wire,trace:applied.trace},actual});
  }
  retain('02-first-private-regexp-state',legacy);
  for(const row of legacy){assert.equal(row.reversed,row.original);assert.equal(row.readback,row.copied);assert.deepEqual(row.before,row.beforeCurrent);assert.deepEqual(row.afterOld,row.before);assert.deepEqual(row.afterCurrent,row.before);assert.deepEqual(row.actual,row.expected);}
  const source='pub fn value()->u32 { 1+2 }',expected=rustTokens(source),oldFind=Array.prototype.find;
  let receiver=null,oldOwn=null,escapedCalls=0;const tapes=[];
  try{
    define(Array.prototype,'find',{...descriptor(Array.prototype,'find'),value:function(callback,thisArg){
      if(this.length>40&&this[0]==='>>>=')receiver=this;
      return apply(oldFind,this,[callback,thisArg]);
    }});
    rustTokens(source);
  }finally{define(Array.prototype,'find',{...descriptor(Array.prototype,'find'),value:oldFind});}
  assert.ok(receiver);oldOwn=descriptor(receiver,'find');
  let old,current;
  try{
    define(receiver,'find',{value:function(){escapedCalls++;throw Error('escaped original punctuator table invoked');},configurable:true});
    old=outcome(()=>rustTokens(source));tapes.push({phase:'original',calls:escapedCalls});escapedCalls=0;
    current=outcome(()=>lexPrivateConcreteSource(source,'Rust'));tapes.push({phase:'private',calls:escapedCalls});
  }finally{if(oldOwn)define(receiver,'find',oldOwn);else delete receiver.find;}
  retain('02-actual-table-escape',{source,expected,old,current,tapes});
  assert.equal(old.error.message,'escaped original punctuator table invoked');assert.ok(tapes[0].calls>0);assert.equal(tapes[1].calls,0);assert.deepEqual(current.value,expected);
});

test('native transitive read write species iterator and diagnostic hooks refuse before callbacks',{timeout:60000},async t=>{
  const source='export function value() { return "\\q"; }',records=[];
  const iteratorPrototype=Object.getPrototypeOf([][Symbol.iterator]());
  const cases=[[Array.prototype,'constructor'],[Array,Symbol.species],[iteratorPrototype,'return'],[Object.prototype,Symbol.iterator],
    [String.prototype,Symbol.replace],[Object.prototype,'q'],[Object.prototype,'undefined'],[Error.prototype,'kind'],[Error.prototype,'span'],[Object.prototype,'units']];
  for(const [owner,key]of cases){
    const prior=descriptor(owner,key);let calls=0,result;
    try{define(owner,key,{get(){calls++;throw Error('unqualified hook ran');},configurable:true});result=outcome(()=>lexPrivateConcreteSource(source,'JavaScript'));}
    finally{if(prior)define(owner,key,prior);else delete owner[key];}
    const restored=outcome(()=>lexPrivateConcreteSource('export function value(){return 1;}','JavaScript'));
    records.push({key:typeof key==='symbol'?key.toString():key,result,calls,restored});
  }
  const cold=[];
  for(const mode of ['object-name','getter-name','readonly-name']){
    const f=fixture(t,'03-cold-diagnostic-'+mode),prior=descriptor(Error.prototype,'name');let calls=0,result;
    try{
      const field=mode==='object-name'?{...prior,value:{toString(){calls++;throw Error('diagnostic coercion');}}}:mode==='getter-name'?{get(){calls++;throw Error('diagnostic getter');},configurable:true,enumerable:false}:{...prior,writable:false};
      define(Error.prototype,'name',field);const current=await import(pathToFileURL(f.path).href);result=outcome(()=>current.lexPrivateConcreteSource('pub fn original() {}','Rust'));
    }finally{define(Error.prototype,'name',prior);}
    const current=await import(pathToFileURL(f.path).href),restored=outcome(()=>current.lexPrivateConcreteSource('pub fn original() {}','Rust'));
    cold.push({mode,calls,result,restored});
  }
  const early=[];
  for(const mode of ['object-iterator','paired-refusal']){
    const f=fixture(t,'03-early-core-'+mode),source=readFileSync(join(base,'concrete-syntax-meta.mjs'),'utf8'),relocations=[];let copied=source;
    for(const path of ['./private-parser-execution.mjs','./original-json-intrinsics.mjs']){
      const before="from '"+path+"'",after="from '"+new URL(path,pathToFileURL(join(base,'concrete-syntax-meta.mjs'))).href+"'";
      assert.equal(copied.split(before).length,2);copied=copied.replace(before,after);relocations.push({before,after});
    }
    let reversed=copied;for(const row of [...relocations].reverse())reversed=reversed.replace(row.after,row.before);
    const path=join(f.root,'fresh-public-core.mjs');writeFileSync(path,copied);
    const iterator=Object.getPrototypeOf([][Symbol.iterator]()),oldReturn=descriptor(iterator,'return'),oldNumber=descriptor(globalThis,'Number'),oldObjectIterator=descriptor(Object.prototype,Symbol.iterator);
    let calls=0,result,coldResult;
    try{
      if(mode==='object-iterator')define(Object.prototype,Symbol.iterator,{get(){calls++;throw Error('array-like iterator getter');},configurable:true});
      else{define(iterator,'return',{get(){calls++;throw Error('unqualified IteratorClose getter');},configurable:true});define(globalThis,'Number',{get(){calls++;throw Error('unqualified Number getter');},configurable:true});}
      const current=await import(pathToFileURL(path).href);result=outcome(()=>current.createConcreteSyntaxMeta('{}',{language:'Rust'}));
      const cold=await import(pathToFileURL(f.path).href);coldResult=outcome(()=>cold.lexPrivateConcreteSource('{}','Rust'));
    }finally{if(oldReturn)define(iterator,'return',oldReturn);else delete iterator.return;define(globalThis,'Number',oldNumber);if(oldObjectIterator)define(Object.prototype,Symbol.iterator,oldObjectIterator);else delete Object.prototype[Symbol.iterator];}
    early.push({mode,source,copied,relocations,reversed,readback:readFileSync(path,'utf8'),calls,result,coldResult,restored:outcome(()=>lexPrivateConcreteSource('pub fn restored() {}','Rust'))});
  }
  retain('03-transitive-hook-outcomes',{source,records,cold,early});
  for(const row of records){assert.ok(row.result.error,row.key);assert.equal(row.calls,0,row.key);assert.ok(row.restored.value,row.key);}
  for(const row of cold){assert.ok(row.result.error,row.mode);assert.equal(row.calls,0,row.mode);assert.ok(row.restored.value,row.mode);}
  for(const row of early){assert.ok(row.result.error,row.mode);assert.ok(row.coldResult.error,row.mode);assert.equal(row.calls,0,row.mode);assert.ok(row.restored.value,row.mode);assert.equal(row.readback,row.copied);assert.equal(row.reversed,row.source);}
});

test('all complete source manifest license notice and path identities are freshly authenticated',{timeout:60000},async t=>{
  const f=fixture(t,'04-fresh-source-identity'),subject=await import(pathToFileURL(f.path).href),source='pub fn value()->u32 { 7 }';
  const initial=subject.lexPrivateConcreteSource(source,'Rust'),records=[];
  const paths=['source-profiles/private-parser-execution/manifest.json',manifest.sources[0].path,manifest.licenses[0].path,manifest.notices[0].path,manifest.hostInputs[0].path];
  for(const relative of paths){
    const path=join(f.root,relative),before=readFileSync(path);let changed,restored;
    try{writeFileSync(path,Buffer.concat([before,Buffer.from(' ')]));changed=outcome(()=>subject.lexPrivateConcreteSource(source,'Rust'));}
    finally{writeFileSync(path,before);}
    restored=outcome(()=>subject.lexPrivateConcreteSource(source,'Rust'));records.push({relative,before:before.toString('utf8'),changed,restored});
  }
  const relative=manifest.sources[1].path,path=join(f.root,relative),before=readFileSync(path),target=join(f.root,'exact-source-copy.txt');writeFileSync(target,before);
  let linked;
  try{unlinkSync(path);symlinkSync(target,path);linked=outcome(()=>subject.lexPrivateConcreteSource(source,'Rust'));}
  finally{unlinkSync(path);writeFileSync(path,before);}
  const restored=subject.lexPrivateConcreteSource(source,'Rust');retain('04-all-source-mutations',{source,initial,records,linked,restored});
  for(const row of records){assert.ok(row.changed.error,row.relative);assert.deepEqual(row.restored.value,initial,row.relative);}assert.ok(linked.error);assert.deepEqual(restored,initial);
});

test('independent SHA256 and strict Unicode binding do not trust decoder or Node hash returns',{timeout:60000},async t=>{
  const vectors=[['','e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'],['abc','ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'],
    ['abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq','248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1']];
  const actual=vectors.map(([source,expected])=>({source,expected,independent:independentParserSha256(source),native:nativeHash(source)}));
  for(const row of manifest.sources){const source=readFileSync(join(base,row.path),'utf8');actual.push({source,expected:row.sha256,independent:independentParserSha256(source),native:nativeHash(source)});}
  const unicode='Ω😀\ufeff\r\n';actual.push({source:unicode,expected:nativeHash(unicode),independent:independentParserSha256(unicode),native:nativeHash(unicode)});
  const prior=descriptor(globalThis,'TextDecoder');let decoderCalls=0,decoderResult;
  try{define(globalThis,'TextDecoder',{value:function(){decoderCalls++;return {decode(){return 'forged original';}};},configurable:true,writable:true});decoderResult=outcome(()=>lexPrivateConcreteSource('pub fn value() {}','Rust'));}
  finally{if(prior)define(globalThis,'TextDecoder',prior);else delete globalThis.TextDecoder;}
  const records=[];
  for(const mode of ['provider','manifest']){
    const f=fixture(t,'05-cold-spoof-'+mode),provider=join(f.root,manifest.sources[0].path),profile=join(f.root,'source-profiles/private-parser-execution/manifest.json');
    const original=readFileSync(provider,'utf8'),lineEnd=original.indexOf('\n'),probe='globalThis.__privateParserSpoofProbe();';
    const poison=probe+' '.repeat(lineEnd-probe.length)+original.slice(lineEnd);assert.equal(poison.length,original.length);
    writeFileSync(provider,poison);
    let forged=manifestSource;if(mode==='manifest'){const copy=parse(manifestSource);copy.sources[0].sha256=nativeHash(poison);forged=json(copy,null,2)+'\n';assert.equal(forged.length,manifestSource.length);writeFileSync(profile,forged);}
    const parent=Object.getPrototypeOf(createHash('sha256')),oldUpdate=descriptor(parent,'update'),oldDigest=descriptor(parent,'digest'),oldProbe=descriptor(globalThis,'__privateParserSpoofProbe');
    const seen=new WeakMap(),tape=[];let probeCalls=0,result;
    try{
      define(globalThis,'__privateParserSpoofProbe',{value(){probeCalls++;},configurable:true});
      define(parent,'update',{...oldUpdate,value:function(input,...rest){const value=typeof input==='string'?input:Buffer.from(input).toString('utf8');seen.set(this,value);tape.push({phase:'update',input:value});return apply(oldUpdate.value,this,[input,...rest]);}});
      define(parent,'digest',{...oldDigest,value:function(...args){const result=apply(oldDigest.value,this,args),input=seen.get(this);let returned=result;
        if(input===poison)returned=manifest.sources[0].sha256;if(input===forged&&mode==='manifest')returned=nativeHash(manifestSource);
        tape.push({phase:'digest',input,result,returned});return returned;}});
      const subject=await import(pathToFileURL(f.path).href);result=outcome(()=>subject.lexPrivateConcreteSource('pub fn value() {}','Rust'));
    }finally{define(parent,'update',oldUpdate);define(parent,'digest',oldDigest);if(oldProbe)define(globalThis,'__privateParserSpoofProbe',oldProbe);else delete globalThis.__privateParserSpoofProbe;writeFileSync(provider,original);writeFileSync(profile,manifestSource);}
    const restored=await import(pathToFileURL(f.path).href);const positive=outcome(()=>restored.lexPrivateConcreteSource('pub fn value() {}','Rust'));
    records.push({mode,original,poison,forged,tape,probeCalls,result,positive});
  }
  retain('05-independent-authentication',{actual,unicode,decoderCalls,decoderResult,records});
  for(const row of actual){assert.equal(row.independent,row.expected);assert.equal(row.native,row.expected);}assert.equal(decoderCalls,0);assert.ok(decoderResult.value);
  for(const row of records){assert.ok(row.result.error,row.mode);assert.equal(row.probeCalls,0,row.mode);assert.ok(row.tape.some(event=>event.phase==='digest'&&event.returned!==event.result));assert.ok(row.positive.value);}
  assert.throws(()=>independentParserSha256(String.fromCharCode(0xd800)),/well-formed/u);
});

test('hash-time native mutation and recursive entry cannot expose or initialize private code',{timeout:60000},()=>{
  const parent=Object.getPrototypeOf(createHash('sha256')),prior=descriptor(parent,'update'),find=descriptor(Array.prototype,'find'),records=[];
  const iterator=Object.getPrototypeOf([][Symbol.iterator]()),oldReturn=descriptor(iterator,'return'),oldRead=descriptor(fs.default,'readSync');
  const publicSource='pub fn original()->u32 { 1 }',publicDoc=createConcreteSyntaxMeta(publicSource,{language:'Rust'}),number=publicDoc.nodes.findIndex(row=>row[1]==='number');
  for(const mode of ['hook','reentry','length','prototype','detach','mutate','hash-dual','read-dual']){
    let callbackCalls=0,readCalls=0,findCalls=0,rawHooks=0,nested,result;const tape=[],hashTape=[],readTape=[];
    const probe={hashTape:[],readTape:[],result:null};
    if(mode.endsWith('-dual')){
      try{
        define(parent,'update',{...prior,value:function(input,...args){const value=apply(prior.value,this,[input,...args]);probe.hashTape.push(typeof input==='string'?input:Buffer.from(input).toString('utf8'));return value;}});
        define(fs.default,'readSync',{...oldRead,value:function(...args){const count=apply(oldRead.value,this,args);probe.readTape.push({count,source:Buffer.from(args[1]).toString('utf8')});return count;}});syncBuiltinESMExports();
        probe.result=outcome(()=>serializeConcreteSyntaxMeta(publicDoc));
      }finally{define(parent,'update',prior);define(fs.default,'readSync',oldRead);syncBuiltinESMExports();}
    }
    const armHash=mode==='hash-dual'?probe.hashTape.length+1:1,armRead=probe.readTape.length+1;
    function dual(){define(iterator,'return',{get(){rawHooks++;throw Error('callback-installed IteratorClose getter');},configurable:true});define(Array.prototype,'find',{...find,value:function(){findCalls++;throw Error('callback-installed find');}});}
    try{define(parent,'update',{...prior,value:function(input,...args){
      const value=apply(prior.value,this,[input,...args]);callbackCalls++;const observed=typeof input==='string'?input:Buffer.from(input).toString('utf8');hashTape.push(observed);tape.push({phase:'hash',source:observed});
      if(callbackCalls===armHash){
        if(mode==='hook')define(Array.prototype,'find',{...find,value:function(){findCalls++;throw Error('hash-installed find');}});
        else if(mode==='reentry')nested=outcome(()=>lexPrivateConcreteSource('pub fn nested() {}','Rust'));
        else if(mode==='length')define(input,'length',{get(){rawHooks++;throw Error('raw length getter');},configurable:true});
        else if(mode==='prototype')Object.setPrototypeOf(input,new Proxy(Object.getPrototypeOf(input),{get(){rawHooks++;throw Error('raw prototype get');}}));
        else if(mode==='detach')structuredClone(input.buffer,{transfer:[input.buffer]});
        else if(mode==='mutate')input[0]^=1;
        else if(mode==='hash-dual')dual();
      }
      return value;
    }});
      if(mode==='read-dual'){define(fs.default,'readSync',{...oldRead,value:function(...args){const count=apply(oldRead.value,this,args);readCalls++;const observed={count,source:Buffer.from(args[1]).toString('utf8')};readTape.push(observed);tape.push({phase:'read',...observed});if(readCalls===armRead)dual();return count;}});syncBuiltinESMExports();}
      result=outcome(()=>mode.endsWith('-dual')?applyConcreteSyntaxSubstitutions(publicDoc,{languageRules:[{id:'change-original',edits:[{node:number,expected:'1',replacement:'2'}]}],repositoryRules:[]}):lexPrivateConcreteSource('pub fn value() {}','Rust'));
    }
    finally{define(parent,'update',prior);define(Array.prototype,'find',find);if(oldReturn)define(iterator,'return',oldReturn);else delete iterator.return;define(fs.default,'readSync',oldRead);syncBuiltinESMExports();}
    const positive=outcome(()=>lexPrivateConcreteSource('pub fn value() {}','Rust'));records.push({mode,publicSource,editedSource:publicSource.replace('1','2'),number,probe,armHash,armRead,callbackCalls,readCalls,findCalls,rawHooks,nested,result,positive,tape,hashTape,readTape});
  }
  retain('06-hash-native-reentry',records);
  assert.ok(records[0].result.error);assert.equal(records[0].findCalls,0);assert.ok(records[1].nested.error);assert.match(records[1].nested.error.message,/recursive source transaction/u);
  for(const row of records){assert.ok(row.mode==='read-dual'?row.readCalls>0:row.callbackCalls>0);assert.ok(row.positive.value);assert.equal(row.rawHooks,0);}
  for(const row of records.filter(row=>['length','prototype'].includes(row.mode)))assert.ok(row.result.value,row.mode);
  for(const row of records.filter(row=>['detach','mutate'].includes(row.mode)))assert.ok(row.result.error,row.mode);
  for(const row of records.filter(row=>row.mode.endsWith('-dual'))){assert.ok(row.probe.result.value);assert.ok(row.probe.hashTape.length>0);assert.ok(row.probe.readTape.length>0);assert.ok(row.result.error,row.mode);assert.equal(row.findCalls,0);
    assert.deepEqual(row.hashTape.slice(0,row.probe.hashTape.length),row.probe.hashTape);
    if(row.mode==='hash-dual')assert.equal(row.callbackCalls,row.armHash);else{assert.deepEqual(row.readTape.slice(0,row.probe.readTape.length),row.probe.readTape);assert.equal(row.readCalls,row.armRead);}
  }
});

test('primitive bounds detached output mutation and private constructor boundaries remain explicit',{timeout:60000},()=>{
  let reads=0;const hostile={get source(){reads++;throw Error('source getter');},toString(){reads++;return 'pub fn forged(){}';}};
  const failures=[outcome(()=>lexPrivateConcreteSource(hostile,'Rust')),outcome(()=>lexPrivateConcreteSource('x',hostile)),outcome(()=>lexPrivateConcreteSource('x'.repeat(2097153),'Rust'))];
  const source='pub fn value()->u32 { 11 }',first=lexPrivateConcreteSource(source,'Rust'),snapshot=json(first);first[0].text='changed';first.push({injected:1});
  const next=lexPrivateConcreteSource(source,'Rust'),transport=transportPrivateConcreteSource(source,'Rust');
  const classes=[];function walk(value){if(typeof value==='function'||typeof value==='symbol')classes.push(typeof value);else if(value&&typeof value==='object')for(const key of Reflect.ownKeys(value)){const field=descriptor(value,key);assert.ok(Object.hasOwn(field,'value'));if(key!=='length')walk(field.value);}}
  walk(next);walk(transport);retain('07-detached-and-bounds',{failures,reads,source,snapshot,mutated:first,next,transport,classes});
  for(const row of failures)assert.ok(row.error);assert.equal(reads,0);assert.equal(json(next),snapshot);assert.deepEqual(classes,[]);assert.equal(transport.source,source);
  assert.deepEqual(transport.document.authority,{type:false,owner:false,executable:false});assert.ok(Object.isFrozen(transport.document));
});

test('executed source substitutions retain both ordered phases complete originals and export closure',{timeout:60000},()=>{
  const recipes=originalPrivateParserSourceInputs(),records=[];
  for(const recipe of recipes){
    const row=manifest.sources.find(row=>row.id===recipe.id),original=readFileSync(join(base,row.path),'utf8');
    let current=recipe.rewritten,removed=0;const positions=[];
    for(const edit of recipe.edits){positions.push({at:edit.start-removed,text:edit.expected,replacement:edit.replacement});removed+=edit.end-edit.start-edit.replacement.length;}
    for(const edit of positions.reverse())current=current.slice(0,edit.at)+edit.text+current.slice(edit.at+edit.replacement.length);
    records.push({row,recipe,original,reconstructed:current,fingerprint:isCompilerSourceInputPath('tools/translation/'+row.path)});
  }
  retain('08-complete-executed-normalization',{manifestSource,recipes,records});assert.equal(records.length,7);
  for(const record of records){assert.equal(record.recipe.original,record.original);assert.equal(record.reconstructed,record.original);assert.equal(nativeHash(record.original),record.row.sha256);assert.equal(record.fingerprint,true);
    assert.deepEqual(record.recipe.trace,[{phase:'language',id:'exact-private-source-substitutions'},{phase:'language',id:'explicit-strict-wrapper'},{phase:'repository',id:'closed-registered-import-bindings'},{phase:'repository',id:'instantiate-registered-module'}]);}
});
