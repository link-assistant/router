import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {capturePrivateParserDataSourceHistory,PRIVATE_DATA_EXECUTOR} from '../private-parser-data-source-history.mjs';
import {prepareCurrentPrivateParserDataAdoption} from '../private-parser-data-current-sources.mjs';
import {composePrivateParserEquationSourceHistory} from '../private-parser-equation-source-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),hash=value=>createHash('sha256').update(value).digest('hex');

test('complete later executor history retains the old DATA adoption and independently generated full source equation',{timeout:60000},()=>{
 const history=capturePrivateParserDataSourceHistory({root}),row=history.rows.find(row=>row.path===PRIVATE_DATA_EXECUTOR);assert.equal(history.laterSourceLayers.length,1);assert.equal(history.inputs.length,3);assert.equal(history.executorInstalled,true);assert.equal(history.installed,true);
 const layer=history.laterSourceLayers[0],equation=layer.equation;assert.equal(row.dataAdoptionAfter,equation.before);assert.equal(row.after,equation.after);assert.equal(row.after,readFileSync(resolve(root,row.path),'utf8'));assert.ok(row.after.startsWith(row.dataAdoptionAfter));assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(layer.sourceAuthority,false);assert.equal(layer.runtimeAuthority,false);assert.equal(equation.inverse,equation.before);
 assert.equal(layer.inputs.length,3);for(const input of layer.inputs){const bytes=readFileSync(resolve(root,input.path));assert.equal(hash(bytes),input.sha256);assert.equal(bytes.length,input.bytes);assert.equal(bytes.toString(input.encoding),input.source);}
 for(const stage of equation.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}history.verify();
});

test('existing adoption proposal preserves every byte of the already installed later API without installing source',{timeout:60000},()=>{
 const before=readFileSync(resolve(root,PRIVATE_DATA_EXECUTOR),'utf8'),plan=prepareCurrentPrivateParserDataAdoption({root}),row=plan.files.find(row=>row.path===PRIVATE_DATA_EXECUTOR);assert.equal(plan.files.length,3);assert.equal(plan.installed,true);assert.equal(plan.defaultChanged,false);assert.equal(plan.receivingQualified,false);assert.equal(plan.sourceAuthority,false);assert.equal(plan.runtimeAuthority,false);assert.equal(plan.laterSourceLayers.length,1);assert.equal(row.after,before);assert.equal(row.current,before);assert.ok(row.after.includes('export function transportPrivateConcreteEquations(input)'));assert.equal(readFileSync(resolve(root,PRIVATE_DATA_EXECUTOR),'utf8'),before);
});

test('unknown or copied later-source spellings cannot be substituted for the full physical producer equation',{timeout:60000},()=>{
 const history=capturePrivateParserDataSourceHistory({root}),row=history.rows.find(row=>row.path===PRIVATE_DATA_EXECUTOR),original={...row,after:row.dataAdoptionAfter},input=history.physical(PRIVATE_DATA_EXECUTOR);
 assert.throws(()=>composePrivateParserEquationSourceHistory(original,{...input,source:input.source+'\n// unknown source\n'},{root}),/complete original\/later source equation differs/);assert.throws(()=>composePrivateParserEquationSourceHistory({...original,path:'unknown.mjs'},input,{root}),/one exact original executor/);history.verify();
});
