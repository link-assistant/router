// Generated storage and historical comparison DATA must remain reproducible.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {renderClassProgramStorage} from '../class-program-storage.mjs';
import {prepareClassBirthEntrySource} from '../prepare-class-birth-entry.mjs';
import {prepareOriginalClassBirthPlan} from '../prepare-original-class-birth.mjs';
import {prepareCompilerAliasHistory} from '../prepare-compiler-alias-history.mjs';
import {prepareCoreBase64SourceData} from '../prepare-core-base64-sources.mjs';
import {prepareLexicalParentHistorySources} from '../prepare-lexical-parent-history.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');

test('the actual guarded class DATA storage renderer reproduces the complete installed leaf',{timeout:60000},()=>{
 const source=read('tools/translation/extensions/original-class-definition-birth.mjs'),plan=renderClassProgramStorage({source});
 assert.equal(plan.text,source);assert.equal(plan.inverse,source);assert.equal(plan.beforeProgramJson,plan.programJson);
 assert.equal(transportConcreteSyntaxMeta(plan.beforeMeta).source,source);assert.equal(transportConcreteSyntaxMeta(plan.afterMeta).source,source);
 assert.equal(plan.sourceAuthority,false);assert.equal(plan.runtimeAuthority,false);
});

test('the untransformed Host entry pin joins the complete current physical and normal Git source',{timeout:60000},()=>{
 const plan=prepareClassBirthEntrySource({root:fileURLToPath(root)});assert.equal(plan.before,plan.after);assert.equal(plan.entry.source,read(plan.entry.path));
 assert.equal(plan.classDefinitionsChanged,false);assert.equal(plan.registeredClassDomainExpanded,false);assert.equal(plan.runtimeAuthority,false);
 assert.deepEqual(plan.trace.map(row=>row.phase),['language','repository']);
});

test('the actual class producer reproduces every registered class source and the complete stored PROGRAM',{timeout:60000},()=>{
 const plan=prepareOriginalClassBirthPlan({sourceRoot:fileURLToPath(root)});assert.equal(plan.files.length,13);assert.equal(plan.selections.length,24);
 for(const row of plan.files)assert.equal(row.afterSource,read('tools/translation/'+row.path));assert.equal(plan.leaf.afterSource,read(plan.leaf.path));
 assert.deepEqual(plan.authority,{type:false,owner:false,executable:false});
});

test('the complete historical compiler readers equal their actual current source producer output',{timeout:60000},()=>{
 const plan=prepareCompilerAliasHistory({root:fileURLToPath(root)});assert.equal(plan.files.length,1);assert.equal(plan.records.length,4);
 for(const row of plan.files){assert.equal(row.before,row.after);assert.equal(row.after,read(row.path));assert.equal(row.inverse,row.before);}
 assert.equal(plan.sourceAuthority,false);assert.equal(plan.runtimeAuthority,false);
});

test('the base64 library DATA extension reproduces all current source bytes and its whole inverse',{timeout:60000},()=>{
 const source=read('tools/translation/router-core-source-data.mjs'),at=source.indexOf('\nexport const ROUTER_CORE_BASE64_SOURCE=');assert.ok(at>0);
 const plan=prepareCoreBase64SourceData({sourceData:source.slice(0,at),base64:read('rust/src/translation_core/base64.rs')});assert.equal(plan.value.after,source);assert.equal(plan.value.inverse,source.slice(0,at));
 assert.deepEqual(plan.trace.map(row=>row.phase),['language','repository']);assert.deepEqual(plan.value.authority,{source:false,type:false,executable:false});
});

test('the copied Git history helper and complete original controls equal the actual source rule producer',{timeout:60000},()=>{
 const manifest=JSON.parse(read('tools/translation/test/fixtures/portable-lexical-parent/manifest.json')),plan=prepareLexicalParentHistorySources({archiveSha256:manifest.sha256,objectCount:manifest.objects});assert.equal(plan.files.length,2);
 for(const row of plan.files){assert.equal(row.source,read(row.path));assert.equal(row.inverse,row.template);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.template);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.source);assert.deepEqual(row.trace.map(item=>item.phase),['language','repository']);}
 assert.equal(plan.originalObjectAndSourceBoundsUnchanged,true);assert.equal(plan.runtimeAuthority,false);
});
