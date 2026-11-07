// Finite genuine compiler callables; source comparison grants no runtime permit.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {ownershipCompiler,ownershipCompilerRuntimeNativeCurrent} from '../../tools/translation/js-to-rust/vendor/module-syntax.mjs';
import {createCompilerCallableSourceData} from './compiler-callable-source-data.mjs';
const require=createRequire(new URL('../../js/package.json',import.meta.url)),ts=ownershipCompiler(),path=require.resolve('typescript'),source=readFileSync(path,'utf8');
assert.equal(createHash('sha256').update(source).digest('hex'),'3ae902c92cc44dace175c0e69e13a4b0899f6983c6121d76b9ab8dd5795e7675');
const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),select=createCompilerCallableSourceData(ts,source,file);
const before=ownershipCompilerRuntimeNativeCurrent(ts),rows=[];
for(const [name,fn]of [['Debug.shouldLog',ts.Debug.shouldLog],['createSourceFile',ts.createSourceFile],['forEachChild',ts.forEachChild]]){
 let result;
 try{result=select(fn);}catch(error){
  const candidates=[];
  function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text===fn.name)candidates.push(node.getText(file));ts.forEachChild(node,visit);}
  visit(file);console.log(JSON.stringify({name,observed:Function.prototype.toString.call(fn),completeCandidates:candidates}));throw error;
 }
 assert.equal(source.slice(...result.span),result.source);assert.equal(result.runtimeIdentityAuthority,false);
 rows.push({name,...result});
}
assert.equal(ownershipCompilerRuntimeNativeCurrent(ts),before);
console.log(JSON.stringify({engine:process.versions,rows,nativeAuthorityBefore:before,nativeAuthorityAfter:ownershipCompilerRuntimeNativeCurrent(ts),sourceDataOnly:true}));
