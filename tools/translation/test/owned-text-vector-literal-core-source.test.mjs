// Independent literal runtime/source/strict declaration case SOURCE. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {router_owned_text_vec_literal as literal} from '../extensions/owned-text-vector-literal-runtime.mjs';
import {withFreshOwnedTextVectorLiteralInputs as fresh} from '../fresh-owned-text-vector-literal-inputs.mjs';
import {ownedTextVectorLiteralRuntimeSources as assets} from '../owned-text-vector-literal-runtime-sources.mjs';
import {withOriginalOwnedTextVectorLiteralSourceOperation as scope,requireCurrentOwnedTextVectorLiteralOriginalOperationSource as original,requireCurrentOwnedTextVectorLiteralOperationSource as receiving} from '../current-owned-text-vector-literal-source.mjs';
import {proposeOwnedTextVectorRootSource} from '../owned-text-vector-root-source.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {prepareOwnedTextVectorLiteralSources} from '../prepare-owned-text-vector-literal-sources.mjs';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../',import.meta.url));
test('literal strings preserve scalar Unicode, NUL, empty and large immutable vectors',limits,()=>{
 for(const values of [[],[''],['é','🦀\u0000文'],Array(64).fill('x'),Array(4096).fill('x')]){const result=literal(...values);assert.deepEqual(result,values);assert.notStrictEqual(result,values);assert.equal(Object.isFrozen(result),true);}
 assert.throws(()=>literal(...Array(4097).fill('x')));for(const value of [0,0n,null,undefined,{},new String('x'),'\ud800','\udfff'])assert.throws(()=>literal(value));
});
test('fresh complete literal inputs retain full CST inverses and every pinned physical source',limits,()=>{
 fresh(frame=>{assert.equal(frame.sources.length,2);assert.equal(frame.inputFiles.length,2);assert.equal(frame.crossInvocationCache,false);for(const row of frame.sources){assert.equal(transportConcreteSyntaxMeta(row.concreteSyntax).source,row.source);assert.equal(row.sourceAuthority,false);assert.equal(typeof row.sha256,'string');}});
 const directory=mkdtempSync(join(tmpdir(),'router-text-literal-fresh-'));try{
  const paths=fresh(frame=>frame.inputFiles);for(const path of paths){mkdirSync(dirname(join(directory,path)),{recursive:true});writeFileSync(join(directory,path),readFileSync(join(root,path)));}
  assert.equal(fresh(frame=>frame.sources.length,{directory}),2);const path=paths[0],bytes=readFileSync(join(directory,path));writeFileSync(join(directory,path),Buffer.concat([bytes,Buffer.from('\n')]));assert.throws(()=>fresh(()=>true,{directory}));writeFileSync(join(directory,path),bytes);
  rmSync(join(directory,path));symlinkSync(join(root,path),join(directory,path));assert.throws(()=>fresh(()=>true,{directory}));
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test('source operands stop at 64 while runtime capacity remains 4096 and complete receiving joins include mirrors',limits,()=>{
 for(const separate of [false,true]){const config={runtimeRoot:'runtime',declarationRoot:separate?'types':'runtime'},proposal=proposeOwnedTextVectorRootSource('// source root\n',config),files=new Map(proposal.files.map(row=>[row.path,row.after??row.source]));for(const row of assets(config.runtimeRoot,config.declarationRoot))files.set(row.path,row.source);
  for(const count of [0,1,64]){const row=receiving(files,config,'router_owned_text_vec_literal',count);assert.equal(row.parameters.length,count);assert.ok(row.parameters.every(type=>type==='text-owned'));assert.equal(row.returns,'vec:text-owned');assert.equal(row.maxSourceArguments,64);assert.equal(row.maxValues,4096);assert.equal(row.returnedLoan,false);assert.equal(row.clonesOwnedText,true);assert.equal(row.sourceRecords.length,separate?18:10);assert.equal(row.nativeTypeOwnerQualified,false);assert.equal(row.privateCallerBindingQualified,false);assert.equal(row.crossInvocationCache,false);}
  for(const count of [-1,65,4096,0.5])assert.throws(()=>receiving(files,config,'router_owned_text_vec_literal',count));const missing=new Map(files);missing.delete(config.declarationRoot+'/owned-text-vector-literal-runtime.d.mts');assert.throws(()=>receiving(missing,config,'router_owned_text_vec_literal',1));
 }
});
test('public literal observations cannot mutate later source or ABI verdicts within a scope',limits,()=>scope(()=>{
 const row=original('router_owned_text_vec_literal',1);assert.equal(Reflect.set(row.literalSources[0],'source','export function router_owned_text_vec_literal(){return []; }'),false);assert.equal(Reflect.set(row.nativeOperation,'returns','bool'),false);row.parameters[0]='bool';row.privateCallerBindingQualified=true;const next=original('router_owned_text_vec_literal',1);assert.deepEqual(next.parameters,['text-owned']);assert.equal(next.privateCallerBindingQualified,false);assert.match(next.literalSources[0].source,/copied_text\(freeze\(values\)\)/u);assert.equal(next.nativeOperation.returns,'vec:text-owned');
}));
test('paired variadic declarations type-check empty and nonempty String carriers strictly',limits,()=>{
 const directory=mkdtempSync(join(tmpdir(),'router-text-literal-types-'));try{for(const row of assets('runtime')){mkdirSync(dirname(join(directory,row.path)),{recursive:true});writeFileSync(join(directory,row.path),row.source);}writeFileSync(join(directory,'check.mts'),"import {router_owned_text_vec_literal as literal} from './runtime/owned-text-vector-literal-runtime.mjs';\nconst empty: readonly string[]=literal();\nconst values: readonly string[]=literal('é','🦀');\n// @ts-expect-error native String payload is required\nliteral(1n);\n// @ts-expect-error result remains readonly\nvalues.push('x');\nvoid empty;\n");
  execFileSync(process.execPath,[join(root,'js/node_modules/typescript/bin/tsc'),'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--noEmit',join(directory,'check.mts')],{timeout:20000,stdio:'pipe'});
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test('whole literal source equations retain both rule phases and original source inverses',limits,()=>{const plan=prepareOwnedTextVectorLiteralSources();assert.ok(plan.files.length>=30);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.ok(row.after.split('\n').length-1<1000);}assert.equal(plan.receivingExecuted,false);});
