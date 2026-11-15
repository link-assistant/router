import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {proposeRuntimeCompilerSelections} from '../prepare-runtime-compiler-selections.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const ts=ownershipCompiler(),path='tools/translation/prepare-owned-runtime-import-edges.mjs';
const before=readFileSync(new URL('../prepare-owned-runtime-import-edges.mjs',import.meta.url),'utf8');
const select=(text,name)=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),rows=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);assert.equal(rows.length,1);return rows[0].getText(file);};
const fail=message=>{throw TypeError(message);},one=(rows,label)=>{if(rows.length!==1)fail('unique '+label);return rows[0];};
function checkers(){
 const proposal=proposeRuntimeCompilerSelections(ts,path,before),find=select(before,'find');
 const original=Function('one','fail',find+'\nreturn '+select(before,'nativeLazyAssertions'))(one,fail);
 const indexed=Function('one','fail',find+'\n'+select(proposal.after,'nativeCompilerSelections')+'\nconst lazy='+select(proposal.after,'nativeLazyAssertions')+';return (ts,file)=>lazy(ts,file,nativeCompilerSelections(ts,file));')(one,fail);
 return {proposal,original,indexed};
}
test('one complete compiler walk retains original lazy bindings and source inverses',{timeout:60000},()=>{
 const {proposal,original,indexed}=checkers(),require=createRequire(new URL('../../../js/package.json',import.meta.url)),compiler=require.resolve('typescript'),source=readFileSync(compiler,'utf8');
 assert.equal(Buffer.byteLength(source),9112572);assert.equal(createHash('sha256').update(source).digest('hex'),'3ae902c92cc44dace175c0e69e13a4b0899f6983c6121d76b9ab8dd5795e7675');
 let expected,oldVisits,newVisits;
 for(const [name,run]of [['original',original],['indexed',indexed]]){
  let visits=0;const observed={...ts,forEachChild(node,visitor){visits++;return ts.forEachChild(node,visitor);}};
  const file=ts.createSourceFile(compiler,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),value=run(observed,file);
  if(name==='original'){expected=value;oldVisits=visits;}else{assert.deepEqual(value,expected);newVisits=visits;}
 }
 assert.ok(newVisits<oldVisits/2);
 for(const source of [proposal.before,proposal.after])assert.equal(transportConcreteSyntaxMeta(transportConcreteSyntaxSource(source,{language:'JavaScript'}).meta).source,source);
 assert.equal(proposal.originalNativeBindingJoinPreserved,true);assert.equal(proposal.originalUniquenessChecksPreserved,true);assert.equal(proposal.retainedCompilerState,false);assert.equal(proposal.semanticAuthority,false);
 assert.equal(proposal.before,before);assert.equal(proposal.inverse,before);assert.equal(proposeRuntimeCompilerSelections(ts,path,before).after,proposal.after);
});
test('duplicate missing and shadowed native exports preserve original independent refusals',{timeout:60000},()=>{
 const {original,indexed}=checkers(),source=`var typescript_exports={};function __export(target,fields){}function __toCommonJS(value){}var Debug2={};function noop(value){}__export(typescript_exports,{noop:()=>noop});module.exports=__toCommonJS(typescript_exports);{
 function shouldAssertFunction(level,name){Debug2[name]=noop;}
 function shouldAssert(){}function getAssertionLevel(){}
 function assertNode(){if(shouldAssertFunction(1,'assertNode')){}}
 Debug2.assertNode=assertNode;
}`;
 const parse=text=>ts.createSourceFile('finite-compiler.js',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 assert.deepEqual(indexed(ts,parse(source)),original(ts,parse(source)));
 for(const changed of [
  source.replace('function shouldAssert(){}','function shouldAssertFunction(){}function shouldAssert(){}'),
  source.replace('module.exports=__toCommonJS(typescript_exports);',''),
  source.replace('module.exports=__toCommonJS(typescript_exports);','{const typescript_exports={};module.exports=__toCommonJS(typescript_exports);}'),
  source+'\nmodule.exports=__toCommonJS(typescript_exports);',
  source+'\n__export(typescript_exports,{noop:()=>noop});',
  source.replace('Debug2[name]=noop','Debug2[name]=shouldAssert'),
 ]){
  const message=run=>{try{run(ts,parse(changed));assert.fail('changed native source was admitted');}catch(error){return error.message;}};
  const expected=message(original);assert.match(expected,/unique|native lazy assignment/);assert.equal(message(indexed),expected);
 }
 assert.deepEqual(indexed(ts,parse(source)),original(ts,parse(source)));
});
test('source proposal refuses changed complete selection domains and native binding joins',{timeout:60000},()=>{
 for(const source of [
  before.replace('function nativeLazyAssertions(ts,file)','function nativeLazyAssertions(ts,file,other)'),
  before.replace('binding(node.right.arguments[0])===binding(exportCall.arguments[0])','binding(node.right.arguments[0])===null'),
  before.replace('find(ts,compilerFile,value=>','find(ts,otherFile,value=>'),
  before+'\nfunction nativeLazyAssertions(ts,file){}',
  before+'\nfunction incomplete(',
 ])assert.throws(()=>proposeRuntimeCompilerSelections(ts,path,source),/Runtime compiler selection source/);
 assert.throws(()=>proposeRuntimeCompilerSelections({...ts,version:'0'},path,before),/installed compiler/);
 assert.equal(proposeRuntimeCompilerSelections(ts,path,before).before,before);
});
