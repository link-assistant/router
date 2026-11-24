// Independent relocation and legacy-domain case source; all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {hostRuntimeAssets,hostRuntimeAssetsNamedDataAliases} from '../host-assets.mjs';
import {borrowedJsonToolPredicateRuntimeAssets,relocateBorrowedJsonRuntimeSource} from '../borrowed-json-tool-predicate-20261103-packaging.mjs';
import {proposeBorrowedJsonToolPredicateSourceSuccessors} from '../borrowed-json-tool-predicate-20261103-profile.mjs';
import {proposeBorrowedJsonToolPackagingInstalledSources} from '../borrowed-json-tool-packaging-installed-20261103-profile.mjs';
import {proposeBorrowedJsonToolProjectSources} from '../borrowed-json-tool-project-20261103-profile.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),str=field0=>({$:'String',field0}),object=fields=>({$:'Object',field0:{$:'Map',entries:Object.keys(fields).sort().map(key=>({$:'MapEntry',key,value:fields[key]}))}});
test('both actual asset producers import from a complete independent relocated runtime directory',{timeout:120000,concurrency:false},async t=>{
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'json-packaging-receiving-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));for(const [ordinal,producer]of [hostRuntimeAssets,hostRuntimeAssetsNamedDataAliases].entries()){
  const target=join(root,String(ordinal)),assets=producer();for(const [name,source]of assets){const path=join(target,name);fs.mkdirSync(dirname(path),{recursive:true});fs.writeFileSync(path,source);}const json=await import(pathToFileURL(join(target,'json-runtime.mjs')).href),direct=await import(pathToFileURL(join(target,'borrowed-json-tool-predicate-20261103-runtime.mjs')).href);assert.equal(json.borrowedJsonToolIsTranslatable,direct.borrowedJsonToolIsTranslatable);
  assert.equal(json.borrowedJsonToolIsTranslatable(object({name:str('name')})),true);assert.equal(json.borrowedJsonToolIsTranslatable(object({name:str('name'),function:{$:'Null'}})),false);const unused={};Object.defineProperty(unused,'$',{get(){throw Error('unselected subtree observed');}});assert.equal(json.borrowedJsonToolIsTranslatable(object({type:str('web_search'),function:unused})),true);assert.equal(json.borrowedJsonToolIsTranslatable(object({name:str('x'.repeat(1048577))})),true);
  // Existing APIs keep their original full-tree admission and large text domain.
  const parsed=json.serde_json_from_str('{"name":"a"}');assert.equal(parsed.$,'Ok');assert.equal(json.serde_json_value_get_string(parsed.field0,'name').field0.field0,'a');assert.equal(json.serde_json_to_string(object({name:str('x'.repeat(1048577))})).$,'Ok');const invalidUnused=object({name:str('ok'),unused:{$:'Number',field0:{$:'Float',field0:NaN}}});assert.equal(json.borrowedJsonToolIsTranslatable(invalidUnused),true);assert.throws(()=>json.serde_json_to_string(invalidUnused),TypeError);
 }
});
test('relocation applies to the actual JSON facade while unrelated asset sources stay byte exact',()=>{
 const original="export {borrowedJsonToolIsTranslatable} from '../borrowed-json-tool-predicate-20261103-runtime.mjs';\n";assert.equal(relocateBorrowedJsonRuntimeSource('json-runtime.mjs',original),"export {borrowedJsonToolIsTranslatable} from './borrowed-json-tool-predicate-20261103-runtime.mjs';\n");assert.equal(relocateBorrowedJsonRuntimeSource('another-runtime.mjs',original),original);const assets=borrowedJsonToolPredicateRuntimeAssets();assert.equal(assets.size,2);for(const [name,source]of assets)assert.equal(source,fs.readFileSync(join(ROOT,'tools/translation',name.slice('runtime/'.length)),'utf8'));
});
test('installed source records retain all four complete parents and both uninstalled proposal afterimages',{timeout:60000},()=>{
 const proposal=proposeBorrowedJsonToolPackagingInstalledSources(),joins=proposeBorrowedJsonToolProjectSources(),old=proposeBorrowedJsonToolPredicateSourceSuccessors();assert.equal(proposal.files.length,4);for(const row of proposal.files){const actual=fs.readFileSync(join(ROOT,row.path),'utf8'),later=joins.files.find(later=>later.path===row.path&&later.before===row.after);assert.equal(row.inverse,row.before);assert.equal(actual,later?later.after:row.after);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.semanticAuthority,false);}for(const row of old.files){const current=proposal.files.find(value=>value.path===row.path);assert.equal(current.before,row.before);assert.equal(current.proposedAfter,row.after);assert.equal(row.currentAfter,current.after);assert.equal(row.laterHistories.length,1);assert.equal(row.laterHistories[0].before,row.after);assert.equal(row.laterHistories[0].inverse,row.after);assert.equal(row.laterHistories[0].currentAfter,current.after);}assert.equal(old.privateCallerQualified,false);assert.equal(old.allChecks,'UNRUN');
});
