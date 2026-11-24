// Independent filesystem/resource composition SOURCE. Every case is unrun.
import test from 'node:test';
import assert from 'node:assert/strict';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from '../http-resource-callers.mjs';
import {translateHttpResourceCallerRust} from '../http-resource-rust.mjs';
import {httpResourceReceivingData,verifyHttpResourceTargets} from './http-resource-receiving-data.mjs';
import {sameRustSourceSyntax} from '../../rust-syntax-cells.mjs';
import {prepareHttpResourceFilesystemSources} from '../../prepare-http-resource-filesystem-sources.mjs';
const limits={timeout:60000},imports=`import {std_fs_read_to_string as read,tokio_fs_read_to_string as asyncRead,std_fs_write as write,tokio_fs_write as asyncWrite,std_fs_create_dir_all as mkdir,std_fs_rename as rename,deferFilesystemFlow as defer} from './runtime/extensions/filesystem-effects-runtime.mjs';
import {router_text_trim as trim} from './runtime/text-runtime.mjs';
import {router_owned_result_text_ok as textOk} from './runtime/owned-result-runtime.mjs';
`;
const source=imports+`/** @param {string} origin @param {string} destination */ export function copied(origin,destination){const selected=read(origin);if(selected.$==='Err'){return selected;}const contents=selected.field0;return write(destination,trim(contents));}
/** @param {string} origin @param {string} destination */ export function asyncCopied(origin,destination){return defer(async()=>{const selected=await asyncRead(origin);if(selected.$==='Err'){return selected;}const contents=selected.field0;return await asyncWrite(destination,contents);});}
/** @param {string} directory @param {string} destination */ export function renamed(directory,destination){const made=mkdir(directory);if(made.$==='Err'){return made;}return rename(directory,destination);}
/** @param {string} path */ export function loaded(path){return read(path);}
`;
function input(value,sourcePath='caller.mjs'){return {sourcePath,...httpResourceReceivingData([{path:sourcePath,source:value}])};}
test('actual std tokio filesystem values preserve order Unicode ownership and cold polling',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.match(result.rust,/Result<String, ::std::io::Error>/u);assert.match(result.rust,/::tokio::fs::read_to_string/u);assert.equal(result.rustExecuted,false);assert.equal(result.receivingExecuted,false);
 await verifyHttpResourceTargets(result,async(api,{filesystem})=>{const calls=[],bytes=new TextEncoder().encode(' é😀 '),capabilities={fs:{sync:{readFileSync(path){calls.push(['read',path]);return bytes;},writeFileSync(path,value){calls.push(['write',path,new TextDecoder().decode(value)]);},mkdirSync(path,options){calls.push(['mkdir',path,options.recursive]);},renameSync(from,to){calls.push(['rename',from,to]);}},async:{async readFile(path){calls.push(['async-read',path]);return bytes;},async writeFile(path,value){calls.push(['async-write',path,new TextDecoder().decode(value)]);}}}};
  await filesystem.withEffectCapabilities(capabilities,async()=>{assert.deepEqual(api.copied('origin','destination'),{$:'Ok',field0:null});assert.deepEqual(calls,[['read','origin'],['write','destination','é😀']]);calls.length=0;const pending=api.asyncCopied('origin','destination');assert.deepEqual(calls,[]);assert.deepEqual(await pending,{$:'Ok',field0:null});assert.deepEqual(calls,[['async-read','origin'],['async-write','destination',' é😀 ']]);calls.length=0;assert.deepEqual(api.renamed('directory','target'),{$:'Ok',field0:null});assert.deepEqual(calls,[['mkdir','directory',true],['rename','directory','target']]);});
 });
});
test('I/O failures remain whole structured errors and do not execute later effects',limits,async()=>{
 const result=translateHttpResourceCallerJavaScript(source,input(source));await verifyHttpResourceTargets(result,async(api,{filesystem})=>{let writes=0;const failure=Object.assign(new Error('missing'),{code:'ENOENT'});await filesystem.withEffectCapabilities({fs:{sync:{readFileSync(){throw failure;},writeFileSync(){writes++;}},async:{async readFile(){throw failure;},async writeFile(){writes++;}}}},async()=>{for(const value of [api.copied('missing','destination'),await api.asyncCopied('missing','destination')]){assert.equal(value.$,'Err');assert.equal(value.field0.$,'IoError');assert.equal(value.field0.kind,'NotFound');}assert.equal(writes,0);const invalid=api.loaded('bad\0path');assert.equal(invalid.$,'Err');assert.equal(invalid.field0.kind,'InvalidInput');});});
});
test('all remaining string-path operations retain their original complete signatures and inverses',limits,()=>{
 const operations=[['std_fs_create_dir',1],['tokio_fs_create_dir',1],['std_fs_remove_dir',1],['tokio_fs_remove_dir',1],['std_fs_remove_dir_all',1],['tokio_fs_remove_dir_all',1],['std_fs_remove_file',1],['tokio_fs_remove_file',1],['std_fs_hard_link',2],['tokio_fs_hard_link',2],['tokio_fs_create_dir_all',1],['tokio_fs_rename',2]],value="import {deferFilesystemFlow as defer,"+operations.map(row=>row[0]).join(',')+"} from './runtime/extensions/filesystem-effects-runtime.mjs';\n"+operations.map(([name,count],index)=>{const parameters=count===1?['path']:['origin','destination'],call=name+'('+parameters.join(',')+')',body=name.startsWith('tokio_')?'defer(async()=>{return await '+call+';})':call;return '/** '+parameters.map(name=>'@param {string} '+name).join(' ')+' */ export function operation_'+index+'('+parameters.join(',')+'){return '+body+';}';}).join('\n'),result=translateHttpResourceCallerJavaScript(value,input(value)),typed=translateHttpResourceCallerTypeScript(result.typescript,input(result.typescript,'caller.mts'));assert.ok(sameRustSourceSyntax(result.rust,typed.rust));assert.equal(result.mappings.length,operations.length);
});
test('whole handwritten canonical native filesystem functions reproduce every original token',limits,()=>{
 for(const native of [
  'pub fn loaded(path: &str) -> Result<String, ::std::io::Error> { ::std::fs::read_to_string(path) }\n',
  'pub async fn removed(path: &str) -> Result<(), ::std::io::Error> { ::tokio::fs::remove_file(path).await }\n',
 ]){const result=translateHttpResourceCallerRust(native,{...input(native,'src/caller.rs'),javascriptPath:'caller.mjs'});assert.ok(sameRustSourceSyntax(native,result.rust));}
});
test('eager async tails error-family changes false declarations extra capabilities and forged meta refuse',limits,()=>{
 for(const body of [
  '/** @param {string} path */ export function bad(path){return asyncRead(path);}',
  '/** @param {string} path */ export function bad(path){const selected=read(path);if(selected.$===\'Err\'){return selected;}return textOk(\'done\');}',
  '/** @param {string} path */ export function bad(path){return read(path,null);}',
 ]){const value=imports+body;assert.throws(()=>translateHttpResourceCallerJavaScript(value,input(value)),body);}
 for(const mode of ['missing','changed']){const options=input(source),path='runtime/extensions/filesystem-effects-runtime.d.mts';options.files=options.files.flatMap(row=>row.path===path?mode==='missing'?[]:[{path,source:row.source+'\nexport declare const fake: true;\n'}]:[row]);assert.throws(()=>translateHttpResourceCallerJavaScript(source,options),mode);}
 const result=translateHttpResourceCallerJavaScript(source,input(source)),meta=JSON.parse(result.meta);meta.functions.find(row=>row.name==='loaded').returns='http-result:text-owned';assert.throws(()=>readHttpResourceCallerMeta(JSON.stringify(meta),source,input(source)));
});
test('complete original contracts flow namespace joins runtime closure and receiving helpers retain inverses',limits,()=>{
 const plan=prepareHttpResourceFilesystemSources();assert.equal(plan.files.length,7);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
