import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {prepareNativePortableHistoricalLayout,historicalNativePortableAssemblerSource} from '../prepare-native-portable-historical-layout.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url);
function restored(source,edits){for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){assert.equal(source.slice(...edit.span),edit.expected);source=source.slice(0,edit.span[0])+edit.replacement+source.slice(edit.span[1]);}return source;}
function guard(source){const ts=ownershipCompiler(),file=ts.createSourceFile('actual-historical-layout.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);const declaration=file.statements.flatMap(node=>ts.isVariableStatement(node)?[...node.declarationList.declarations]:[]).find(node=>node.name.text==='safeSource'),text=declaration.initializer.getText(file),end=text.lastIndexOf('/');return new RegExp(text.slice(1,end),text.slice(end+1));}

test('both complete old assemblers retain their frozen literals while exactly adapting known guard and output-stem roots',{timeout:60000},()=>{
 const plan=prepareNativePortableHistoricalLayout();assert.equal(plan.files.length,2);assert.equal(plan.assemblies.length,2);assert.equal(plan.sourceAuthority,false);assert.equal(plan.performanceQualified,false);assert.deepStrictEqual(plan.assemblies.map(row=>row.selection.length),[1,2]);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.frozenAssemblerLiteralUnchanged,true);assert.equal(row.originalPhysicalHelperUnchanged,true);assert.equal(row.originalDeadlinesRetained,true);assert.equal(row.edits.length,2);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);}
 const suffixes=['a.mjs','dir/two-parts.mjs','api.mjs/extra','../escape.mjs','Upper.mjs','a..mjs','a_b.mjs','dir//a.mjs','.mjs','deep/valid/a1.mjs'];
 for(const row of plan.assemblies){const old=guard(row.before),current=guard(row.after);assert.equal(row.edits.length,1+row.selection.filter(selected=>!selected.stemAlreadyCurrent).length);for(const selected of row.selection){assert.equal(typeof selected.stemAlreadyCurrent,'boolean');assert.equal(row.before.slice(...selected.stemSpan),selected.stemPrefix);if(selected.stemAlreadyCurrent)assert.equal(row.edits.some(edit=>edit.span[0]<selected.stemSpan[1]&&edit.span[1]>selected.stemSpan[0]),false);}for(const suffix of suffixes){assert.equal(old.test(row.oldRoot+suffix),current.test(row.currentRoot+suffix));assert.equal(current.test(row.oldRoot+suffix),false);}assert.equal(restored(row.after,row.inverseEdits),row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);}
});

test('all receiving and literal-copy stages retain complete serialized reparsed CST and independent native whole inverses',{timeout:60000},()=>{
 const plan=prepareNativePortableHistoricalLayout();for(const row of [...plan.files,...plan.assemblies]){assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.deepStrictEqual(row.stages.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages)assert.equal(transportConcreteSyntaxMeta(stage.meta).source,stage.phase==='language'?row.before:row.after);const inverse=applyConcreteSyntaxSubstitutions(transportConcreteSyntaxMeta(row.afterMeta).document,row.inverseSequence);assert.equal(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source,row.before);assert.equal(restored(row.before,row.edits),row.after);assert.equal(restored(row.after,row.inverseEdits),row.inverse);}
 for(const row of plan.inputs)assert.equal(readFileSync(new URL(row.path,root),'utf8'),row.source);
});

test('fresh historical adapter rejects altered source and fabricated layout-compatible assemblers before retaining a proposal',{timeout:60000},()=>{
 const plan=prepareNativePortableHistoricalLayout();let calls=0;for(const row of plan.assemblies){assert.throws(()=>historicalNativePortableAssemblerSource(row.before+'\n',()=>calls++),/fresh complete original assembler input/u);assert.throws(()=>historicalNativePortableAssemblerSource(row.after,()=>calls++),/fresh complete original assembler input/u);}assert.equal(calls,0);
 const source='const safeSource=/^packages\\/javascript\\/native\\/[a-z]+\\.mjs$/u; export function buildNativePortableArtifacts(){return new Map();}';assert.throws(()=>historicalNativePortableAssemblerSource(source,()=>calls++),/fresh complete original assembler input/u);assert.equal(calls,0);
 for(const row of plan.assemblies){const records=[];assert.equal(historicalNativePortableAssemblerSource(row.before,(name,value)=>records.push({name,value})),row.after);assert.equal(records.length,1);assert.equal(records[0].value.inverse,row.before);assert.equal(records[0].value.after,row.after);}
});

test('complete current receiving files must rejoin pinned originals and callback source mutations refuse before returning source',{timeout:60000},t=>{
 const plan=prepareNativePortableHistoricalLayout(),directory=mkdtempSync(join(tmpdir(),'router-native-portable-layout-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));for(const row of plan.inputs){const path=join(directory,row.path);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,row.source);}
 assert.deepStrictEqual(prepareNativePortableHistoricalLayout({root:directory}).assemblies.map(row=>row.after),plan.assemblies.map(row=>row.after));const input=plan.inputs.find(row=>row.path.endsWith('/native-portable-artifacts.mjs')),target=join(directory,input.path);let calls=0;
 assert.throws(()=>historicalNativePortableAssemblerSource(plan.assemblies[0].before,()=>{calls++;writeFileSync(target,input.source+'\n// callback-mutated complete source\n');},{root:directory}),/complete physical source changed/u);assert.equal(calls,1);writeFileSync(target,input.source);
 const receiving=plan.files[0];writeFileSync(join(directory,receiving.path),receiving.after+'\n// unregistered complete test change\n');assert.throws(()=>prepareNativePortableHistoricalLayout({root:directory}),/whole original receiving source differs/u);for(const row of plan.inputs)assert.equal(readFileSync(new URL(row.path,root),'utf8'),row.source);
});
