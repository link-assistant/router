import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash,Hash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {prepareCurrentReceivingSourceHistory} from '../prepare-current-receiving-source-history.mjs';
import {restoreReceivingSourceHistory} from './fixtures/current-receiving-source-history.mjs';
import {legacyProofConsumerSource,restoreCurrentEnclosingNamespaceSource} from './fixtures/native-proof-json-format.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const archiveURL=new URL('../source-profiles/current-receiving-source-history/complete-originals.json.gz',import.meta.url);
function archive(){return JSON.parse(gunzipSync(readFileSync(archiveURL)));}
function records(){const ts=ownershipCompiler(),source=readFileSync(new URL('./fixtures/current-receiving-source-history.mjs',import.meta.url),'utf8'),file=ts.createSourceFile('history.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),selected=[];for(const node of file.statements)if(ts.isVariableStatement(node))for(const declaration of node.declarationList.declarations)if(declaration.name.getText(file)==='RECORDS')selected.push(declaration.initializer);assert.equal(selected.length,1);return JSON.parse(selected[0].getText(file));}
function cases(source){const ts=ownershipCompiler(),file=ts.createSourceFile('whole.test.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),rows=[];assert.equal(file.parseDiagnostics.length,0);function visit(node){if(ts.isCallExpression(node)&&['test','testCase','nodeTest'].includes(node.expression.getText(file))&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0]))rows.push(node.getText(file));ts.forEachChild(node,visit);}visit(file);return rows;}

test('one complete proposal retains all original sources, two phases and every native/CST inverse',{timeout:60000},()=>{
 const plan=prepareCurrentReceivingSourceHistory();assert.equal(plan.files.length,5);assert.equal(plan.records.length,8);assert.equal(plan.history.length,3);
 assert.equal(plan.runtimeImplementationChanged,false);assert.equal(plan.sourceAuthority,false);assert.equal(plan.receivingExecuted,false);
 for(const row of plan.files){assert.equal(row.inverse,row.before);assert.equal(row.beforeSha256,hash(row.before));assert.equal(row.afterSha256,hash(row.after));assert.deepEqual(row.stages.map(value=>value.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}}
 for(const row of plan.history){assert.equal(row.equation.inverse,row.before);assert.equal(row.equation.after,row.after);assert.ok(row.nativeSelections.length);}
 for(const row of plan.files.filter(row=>row.path.endsWith('.test.mjs')))assert.deepEqual(cases(row.after),cases(row.before),'every whole original case body/options/name must remain byte exact');
});

test('all complete later-source records restore their exact preceding layer and retain the full inverse',{timeout:60000},()=>{
 const rows=records();assert.equal(rows.length,8);for(const row of rows){const retained=[];assert.equal(restoreReceivingSourceHistory(row.current,row.lane,(name,value)=>retained.push({name,value})),row.historical);assert.equal(retained.length,1);assert.equal(retained[0].value.current,row.current);assert.equal(retained[0].value.historical,row.historical);assert.equal(retained[0].value.inverse,row.current);assert.deepEqual(retained[0].value.provenance,row.provenance);assert.equal(restoreReceivingSourceHistory(row.historical,row.lane),row.historical);}
});

test('unknown copied extensions, forged lanes and one changed nested source byte never gain a history',{timeout:60000},()=>{
 for(const row of records()){
  assert.throws(()=>restoreReceivingSourceHistory(row.current+'\n// foreign source extension\n',row.lane),/unregistered complete current source/);
  const changed=row.current.replace('function','functioN');assert.notEqual(changed,row.current);assert.throws(()=>restoreReceivingSourceHistory(changed,row.lane),/unregistered complete current source/);
 }
 assert.throws(()=>restoreReceivingSourceHistory('export const x=1;','foreign-lane'),/unknown exact comparison lane/);assert.throws(()=>restoreReceivingSourceHistory({},'proof-consumer'),/primitive complete source/);
 assert.equal(restoreReceivingSourceHistory('export const unrelated=1;','proof-consumer'),'export const unrelated=1;','unselected original legacy source remains available');
});

test('genuine current Debug/builtin and Core parent sources preserve their original independently pinned assertions',{timeout:60000},()=>{
 const pins=[['builtin-debug-ast-route.mjs','1ffa9517fd5cadbbb26aa5578db1074e9900017601f2188a4077662507f59e75'],['builtin-derive-bang-footprints.mjs','11372586893462cd262c55902b268f71568d237eceb12283cd9b9724b36c1514']];
 for(const [name,pin]of pins){const current=readFileSync(new URL('../'+name,import.meta.url),'utf8');const historical=legacyProofConsumerSource(current);assert.equal(hash(historical),pin);if(name==='builtin-derive-bang-footprints.mjs'){assert.ok(historical.includes('privateFrozenJsonEqualHint'));assert.ok(historical.includes('if(privateFrozenJsonEqualHint(fresh,proof)!==true&&composeJson(fresh)'));}}
 const core=readFileSync(new URL('../core-adoption-producer-context.mjs',import.meta.url),'utf8'),historical=restoreCurrentEnclosingNamespaceSource(core);assert.equal(hash(historical.slice(0,17319)),'f8da5aceca5bfada1b92dbf9c4617cbdfbbcb3123c0278ef7d602c0830b2d65a');assert.equal(historical.length,18997);
});

test('complete binary source history corruption refuses before any producer or output can be issued',{timeout:60000},t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-receiving-history-corruption-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const target=join(directory,'tools/translation/source-profiles/current-receiving-source-history/complete-originals.json.gz');mkdirSync(dirname(target),{recursive:true});const packed=Buffer.from(readFileSync(archiveURL));packed[packed.length-12]^=1;writeFileSync(target,packed);assert.throws(()=>prepareCurrentReceivingSourceHistory({root:directory}),/complete historical archive differs/);
 const data=archive();assert.equal(data.rows.length,3);assert.equal(data.templates.length,5);for(const row of data.rows){assert.equal(hash(row.before),row.beforeSha256);assert.equal(hash(row.after),row.afterSha256);}
});

test('literal history restoration adds no JSON or Hash callbacks and keeps every retained source payload',{timeout:60000},()=>{
 const rows=records(),json=JSON.stringify,update=Hash.prototype.update,apply=Reflect.apply,retained=[];let jsonCalls=0,hashCalls=0;
 try{JSON.stringify=function(...args){jsonCalls++;return apply(json,this,args);};Hash.prototype.update=function(...args){hashCalls++;return apply(update,this,args);};for(const row of rows)assert.equal(restoreReceivingSourceHistory(row.current,row.lane,(name,value)=>retained.push({name,value})),row.historical);}finally{JSON.stringify=json;Hash.prototype.update=update;}
 assert.equal(jsonCalls,0);assert.equal(hashCalls,0);assert.equal(retained.length,rows.length);for(let at=0;at<rows.length;at++){assert.equal(retained[at].value.current,rows[at].current);assert.equal(retained[at].value.inverse,rows[at].current);assert.equal(retained[at].value.historical,rows[at].historical);}
});
