import {repositorySourceURL} from "./fixtures/repository-paths.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadDeriveDependencyProof} from '../derive-dependencies.mjs';
import {builtinDeriveAstSourceProfile,builtinAstOriginal,originalAstFunction,astStructLiteral,astStructLiterals,astSyntaxText} from '../builtin-derive-ast-meta.mjs';
const root=new URL('../../../',import.meta.url),dependencies=()=>loadDeriveDependencyProof({manifest:readFileSync(repositorySourceURL('Cargo.toml',root),'utf8'),lock:readFileSync(repositorySourceURL('Cargo.lock',root),'utf8')}),profile=builtinDeriveAstSourceProfile(dependencies());
const path='compiler/rustc_builtin_macros/src/deriving/cmp/partial_eq.rs',entry=originalAstFunction(profile,path,'expand_deriving_partial_eq');
test('original PartialEq retains both complete TraitDef literals in original lexical order',()=>{
 const source=builtinAstOriginal(profile,path).source,rows=astStructLiterals(profile,entry,'TraitDef');assert.equal(rows.length,2);
 assert.deepEqual(rows.map(row=>astSyntaxText(row.fields.find(field=>field.name==='path').expression)),['path_std ! (marker :: StructuralPartialEq)','path_std ! (cmp :: PartialEq)']);
 for(const row of rows){assert.equal(source.slice(row.span.start,row.span.start+1),'{');assert.equal(source.slice(row.span.end-1,row.span.end),'}');assert.equal(row.fragmentDigest,entry.digest);assert.equal(row.sourceSha256,entry.sourceSha256);assert.equal(row.fields.length,9);assert.ok(Object.isFrozen(row.fields));assert.equal(row.generatedImplBehavior,false);}
 assert.ok(rows[0].span.end<rows[1].span.start);assert.throws(()=>astStructLiteral(profile,entry,'TraitDef'),{name:'TypeError',message:'Original AST struct recipe is not unique: TraitDef'});
 const method=astStructLiteral(profile,entry,'MethodDef');assert.deepEqual(astStructLiterals(profile,entry,'MethodDef'),[method]);assert.deepEqual(astStructLiterals(profile,entry,'Absent'),[]);assert.throws(()=>astStructLiteral(profile,entry,'Absent'),/not unique/);
});
test('plural literal reader cannot borrow copied foreign getter proxy or changed source authority',()=>{
 const foreign=builtinDeriveAstSourceProfile(dependencies());let traps=0;const guarded=new Proxy(entry,{get(){traps++;throw Error('unexpected getter');},ownKeys(){traps++;throw Error('unexpected ownKeys');}}),getter=Object.defineProperty({},'syntax',{get(){traps++;throw Error('unexpected getter');}});
 for(const value of [structuredClone(entry),Object.freeze({...entry}),{...entry,sourceSha256:'0'.repeat(64)},{...entry,syntax:[...entry.syntax]},guarded,getter,null])assert.throws(()=>astStructLiterals(profile,value,'TraitDef'),/Unsealed/);
 assert.throws(()=>astStructLiterals(foreign,entry,'TraitDef'),/Unsealed/);assert.throws(()=>astStructLiterals({...profile},entry,'TraitDef'),/Unsealed/);assert.equal(traps,0);assert.throws(()=>entry.syntax.at(-1).children.push({text:'macro_rules'}),TypeError);
 const rows=astStructLiterals(profile,entry,'TraitDef');assert.throws(()=>rows.push({}),TypeError);assert.throws(()=>rows[0].fields[0].expression.push({text:'forged'}),TypeError);assert.equal(rows.length,2);
});
