import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {readNativeOutputRetentionPredecessors} from '../prepare-current-native-output-text-retention.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
import {relocateSourceModule} from './relocate-source-module.mjs';

// Test-only complete physical copies expose both real private codecs. The old
// source is authenticated by the committed archive; neither body is rewritten.
async function codecs(t){
 const path='tools/translation/private-output-text.mjs',origin=pathToFileURL(join(process.cwd(),path)).href;
 const old=readNativeOutputRetentionPredecessors().files.find(row=>row.path===path).source;
 const directory=mkdtempSync(join(tmpdir(),'router-decoder-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const modules=[],ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');
 for(const [index,source]of [old,readFileSync(path,'utf8')].entries()){
  const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.deepEqual(file.parseDiagnostics,[]);
  for(const name of ['encode','decode'])assert.equal(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name).length,1);
  const relocated=relocateSourceModule(source,origin);assert.equal(relocated.inverse,source);
  const before=relocated.text,after=before+'\nexport {encode as fixtureEncode,decode as fixtureDecode};\n';
  const apply=(value,expected,replacement,id)=>{
   const meta=serializeConcreteSyntaxMeta(transportConcreteSyntaxSource(value,{language:'JavaScript'}).document);
   assert.equal(transportConcreteSyntaxMeta(meta).source,value);
   return transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applyConcreteSyntaxSubstitutions(transportConcreteSyntaxMeta(meta).document,{languageRules:[],repositoryRules:[{id,edits:[{span:[0,value.length],expected,replacement}]}]}).value)).source;
  };
  assert.equal(apply(before,before,after,'test:expose-complete-private-codecs'),after);
  assert.equal(apply(after,after,before,'test:inverse-complete-private-codecs'),before);
  const target=join(directory,index+'.mjs');writeFileSync(target,after);assert.equal(readFileSync(target,'utf8'),after);modules.push(await import(pathToFileURL(target).href));
 }
 return modules;
}
const character=String.fromCharCode;
test('current private decoder retains original wire bytes for every code unit and overlapping match',{timeout:60000},async t=>{
 const [old,current]=await codecs(t);let alphabet='';for(let at=0;at<65536;at++)alphabet+=character(at);
 for(const text of ['',alphabet,'\ud800\0\udfff'.repeat(21000),'z'.repeat(65536),'abcd'.repeat(16384)]){
  const packed=old.fixtureEncode(text,0,text.length);assert.equal(current.fixtureEncode(text,0,text.length),packed);
  assert.equal(old.fixtureDecode(packed,text.length),text);assert.equal(current.fixtureDecode(packed,text.length),text);
 }
 const literal=text=>character(0,text.length)+text;
 for(const [packed,text]of [[literal('abcd')+character(1,4,65532),'abcd'.repeat(16384)],[literal(alphabet.slice(0,65535))+character(1,65535,4),alphabet.slice(0,65535)+alphabet.slice(0,4)],[literal('\ud800')+character(1,1,65535),'\ud800'.repeat(65536)]]){
  assert.equal(old.fixtureDecode(packed,text.length),text);assert.equal(current.fixtureDecode(packed,text.length),text);
 }
});
test('current private decoder preserves every original malformed-record refusal',{timeout:60000},async t=>{
 const [old,current]=await codecs(t),rows=[['',1],[character(0),1],[character(0,0),1],[character(0,2)+'a',2],[character(0,1)+'a',0],[character(1,1),4],[character(1,0,4),4],[character(1,1,4),4],[character(0,1)+'a'+character(1,1,3),4],[character(0,1)+'a'+character(1,1,4),4],[character(2,1),1]];
 for(const [packed,units]of rows){let expected;try{old.fixtureDecode(packed,units);}catch(error){expected={name:error.name,message:error.message};}assert.ok(expected);assert.throws(()=>current.fixtureDecode(packed,units),error=>error.name===expected.name&&error.message===expected.message);}
});
test('private overlapping decode reads no inherited numeric cells',{timeout:60000},async t=>{
 const [,current]=await codecs(t),packed=character(0,1)+'x'+character(1,1,65535),descriptor=Object.getOwnPropertyDescriptor(Object.prototype,'0');let calls=0,restored;
 try{Object.defineProperty(Object.prototype,'0',{configurable:true,get(){calls++;throw Error('public numeric prototype read');},set(){calls++;throw Error('public numeric prototype write');}});restored=current.fixtureDecode(packed,65536);}finally{if(descriptor)Object.defineProperty(Object.prototype,'0',descriptor);else delete Object.prototype[0];}
 assert.equal(calls,0);assert.equal(restored,'x'.repeat(65536));
});
