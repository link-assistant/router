// Complete producer/runtime integration SOURCE. Unrun during bulk drafting.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {hostRuntimeAssets,hostRuntimeAssetsNamedDataAliases} from '../text-host-assets.mjs';
import {TEXT_CONTRACTS} from '../text-contracts.mjs';
import {INTEGER_CONTRACTS} from '../integer-contracts.mjs';
import {prepareTextBulkRuntimeSources} from '../prepare-text-bulk-runtime-sources.mjs';
import {prepareOwnedTextFlowSources} from '../prepare-owned-text-flow-sources.mjs';
import {deriveOwnedDefinitionBulkSources} from '../prepare-owned-definition-bulk.mjs';
import {prepareOwnedFieldBulkSources} from '../prepare-owned-field-bulk.mjs';
import {prepareNativeOutputTextRetention} from '../prepare-native-output-text-retention.mjs';
import {prepareFlatNativeOutputTextRetention} from '../prepare-flat-native-output-text-retention.mjs';
const limits={timeout:60000},read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
test('both complete receiving runtime providers preserve legacy numeric parsing and all new operation exports',limits,async t=>{
 for(const build of [hostRuntimeAssets,hostRuntimeAssetsNamedDataAliases]){
  const directory=mkdtempSync(join(tmpdir(),'router-shared-assets-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));const assets=build();for(const [name,source]of assets)writeFileSync(join(directory,name),source);const text=await import(pathToFileURL(join(directory,'text-runtime.mjs')).href),integer=await import(pathToFileURL(join(directory,'integer-runtime.mjs')).href);for(const row of TEXT_CONTRACTS)assert.equal(typeof text[row.javascriptName],'function');for(const row of INTEGER_CONTRACTS)assert.equal(typeof integer[row.javascriptName],'function');assert.equal(text.router_text_trim('\u0085😀\u3000'),'😀');assert.deepEqual(text.router_text_find('a😀é','é'),{$:'Some',field0:5n});assert.equal(integer.router_integer_u64_saturating_add(18446744073709551615n,1n),18446744073709551615n);assert.deepEqual(integer.createIntegerRuntime({kind:'fixed',bits:64,signed:false}).rust_integer_parse('18446744073709551615'),{$:'Ok',field0:18446744073709551615n});assert.deepEqual(integer.createIntegerRuntime({kind:'fixed',bits:8,signed:true}).rust_integer_parse('-128'),{$:'Ok',field0:-128n});
 }
});
test('all six bulk schedules reproduce from their actual complete original producers',limits,async()=>{
 const definitions=deriveOwnedDefinitionBulkSources({bulk:read('bulk.mjs'),matrix:read('matrix-bulk.mjs')});for(const row of definitions.files)assert.equal(readFileSync(new URL('../../../'+row.path,import.meta.url),'utf8'),row.text);
 for(const plan of [prepareOwnedFieldBulkSources(),await prepareNativeOutputTextRetention(),await prepareFlatNativeOutputTextRetention()])for(const row of plan.files){const source=row.text??row.after;assert.equal(readFileSync(new URL('../../../'+row.path,import.meta.url),'utf8'),source);if(row.path.endsWith('-bulk.mjs')&&source.includes('hostRuntimeAssets}'))assert.ok(source.includes("'./text-host-assets.mjs'"));}assert.ok(read('flat-native-retained-owned-field-bulk.mjs').includes("from './text-host-assets.mjs'"));
});
test('full text/stream flow and bulk producer predecessors retain every ordered source inverse',limits,()=>{
 const bulk=prepareTextBulkRuntimeSources();assert.equal(bulk.files.length,10);for(const plan of [bulk,prepareOwnedTextFlowSources()])for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(bulk.receivingExecuted,false);
});
