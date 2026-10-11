import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {captureSourceModuleViews,isSourceModuleView,originalModuleViewItems,originalModuleViewParent,originalSourceModuleItems,moduleScopeKey,SOURCE_MODULE_VIEW_PROFILE} from '../source-module-views.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const capture=(source,profile=null)=>captureSourceModuleViews({source,sourcePath:'src/lib.rs',compilationProfile:profile});
const viewAt=(result,path)=>result.views.find(view=>JSON.stringify(view.modulePath)===JSON.stringify(path));
const original=path=>readFileSync(new URL('../../../'+path,import.meta.url),'utf8');

test('unchanged Router diagnostic reason module preserves every original constant and absolute token span',()=>{
  const source=original('src/auth_diagnostics.rs');assert.equal(hash(source),'4adfdd83495f6cadeb33c3c17658134c4e6a3a7947cb1c733f92bde63dd9690a');
  const result=captureSourceModuleViews({source,sourcePath:'src/auth_diagnostics.rs'}),root=viewAt(result,[]),reason=viewAt(result,['reason']);
  assert.ok(reason);assert.equal(originalModuleViewParent(reason),root);assert.equal(reason.sourceSha256,hash(source));
  const items=originalModuleViewItems(reason,source);assert.equal(items.length,18);assert.ok(items.every(item=>item.term==='const'));
  assert.equal(items[0].name,'MISSING_CREDENTIAL');assert.equal(items.at(-1).name,'NOT_FOUND');
  for(const item of items){assert.ok(item.start>=reason.bodySpan.start&&item.end<=reason.bodySpan.end);for(const token of item.tokens)assert.equal(source.slice(token.start,token.end),token.text);}
  assert.equal(reason.bodySha256,hash(source.slice(reason.bodySpan.start,reason.bodySpan.end)));
  assert.equal(reason.declaration.sha256,hash(source.slice(reason.declaration.span.start,reason.declaration.span.end)));
  assert.equal(reason.namespaceAuthority,false);assert.equal(reason.attributeOwnerAuthority,false);assert.equal(reason.runtimeAuthority,false);
});

test('unchanged deployment module views retain explicit original reexports without granting their owners',()=>{
  const source=original('src/deploy.rs');assert.equal(hash(source),'0acc07b144b6b63a32e337d38c4d74685b04c83d0f202b193ba999f160f9435a');
  const result=captureSourceModuleViews({source,sourcePath:'src/deploy.rs'});
  assert.deepEqual(result.views.slice(1).map(view=>view.modulePath),[['local'],['host'],['remote'],['staging'],['checkpoint']]);
  for(const view of result.views.slice(1)){const items=originalModuleViewItems(view,source);assert.ok(items.length);assert.ok(items.every(item=>item.term==='use'));assert.equal(view.namespaceAuthority,false);}
  assert.ok(result.diagnostics.some(entry=>entry.message.includes('external-file')));
});

test('nested raw identifiers and opaque braces retain complete file lineage and UTF-16 offsets',()=>{
  const source='// Unicode 🌍 changes offsets\nmod outer { /* { /* } */ } */ pub mod r#type { pub const TEXT:&str=r##"{🌍}"##; pub fn letter()->char { \'}\' } } }';
  const result=capture(source),outer=viewAt(result,['outer']),child=viewAt(result,['outer','type']);
  assert.ok(child);assert.equal(originalModuleViewParent(child),outer);assert.equal(originalModuleViewParent(outer),viewAt(result,[]));
  const items=originalModuleViewItems(child,source);assert.deepEqual(items.map(item=>item.name),['TEXT','letter']);
  for(const item of items)for(const token of item.tokens)assert.equal(source.slice(token.start,token.end),token.text);
  assert.ok(source.slice(items[0].start,items[0].end).includes('r##"{🌍}"##'));
});

test('outer and inner compilation evidence keeps inactive and unknown module ancestry',()=>{
  const source='#[cfg(test)] mod tests { mod child {} } #[cfg(unix)] mod platform { mod child {} } mod hidden { #![cfg(test)] mod child {} }';
  const result=capture(source,{flags:{test:false}});
  for(const path of [['tests'],['tests','child'],['hidden'],['hidden','child']])assert.equal(viewAt(result,path).configurationCondition,'inactive');
  for(const path of [['platform'],['platform','child']])assert.equal(viewAt(result,path).configurationCondition,'unknown');
  assert.ok(viewAt(result,['hidden']).configurationEvidence.some(evidence=>evidence.attributes.some(attribute=>attribute.name==='cfg')));
  const active=capture(source,{flags:{test:true,unix:true}});assert.ok(active.views.every(view=>view.configurationCondition==='active'));
});

test('unknown procedural and tool attributes remain original evidence with no phase or namespace grant',()=>{
  const source='#[unknown_transform] pub mod child { #![allow(clippy::all)] #[rustfmt::skip] pub const VALUE:u8=7; }';
  const result=capture(source),root=viewAt(result,[]),child=viewAt(result,['child']);
  assert.ok(root.configurationEvidence.some(evidence=>evidence.attributes.some(attribute=>attribute.name==='unknown_transform')));
  assert.ok(child.configurationEvidence.some(evidence=>evidence.attributes.some(attribute=>attribute.name==='rustfmt')));
  for(const view of result.views)for(const flag of ['namespaceAuthority','attributeOwnerAuthority','runtimeAuthority'])assert.equal(view[flag],false);
});

test('clones changed complete files fragments and mutation cannot acquire private original module identity',()=>{
  const source='mod child {pub const VALUE:u8=1;}',result=capture(source),child=viewAt(result,['child']);
  assert.equal(isSourceModuleView(child),true);assert.equal(isSourceModuleView(structuredClone(child)),false);
  assert.throws(()=>originalModuleViewItems(structuredClone(child),source),/unsealed/);
  assert.throws(()=>originalModuleViewParent({...child}),/unsealed/);
  assert.throws(()=>originalModuleViewItems(child,source+' '),/changed/);
  assert.throws(()=>originalModuleViewItems(child,source.slice(child.bodySpan.start,child.bodySpan.end)),/changed/);
  assert.throws(()=>{child.bodySpan.start++;},TypeError);assert.throws(()=>{originalModuleViewItems(child,source)[0].tokens[0].text='fn';},TypeError);
});

test('ambiguous module paths and unsafe source locations fail without fabricated evidence',()=>{
  assert.throws(()=>capture('mod child {} mod child {}'),/duplicate/);
  for(const path of ['/src/lib.rs','../lib.rs','src/../lib.rs','src//lib.rs','src\\lib.rs','C:lib.rs','src/lib.js'])assert.throws(()=>captureSourceModuleViews({source:'',sourcePath:path}),/relative/);
  const result=capture('mod external;');assert.equal(result.views.length,1);assert.equal(result.diagnostics.length,1);
});

test('source module traversal bounds source bytes items depth and module count',()=>{
  assert.throws(()=>capture(' '.repeat(SOURCE_MODULE_VIEW_PROFILE.maxSourceBytes+1)),/byte bound/);
  assert.throws(()=>capture('const A:u8=0;'.repeat(SOURCE_MODULE_VIEW_PROFILE.maxItems+1)),/item bound/);
  const deep='mod child {'.repeat(SOURCE_MODULE_VIEW_PROFILE.maxDepth+1)+'}'.repeat(SOURCE_MODULE_VIEW_PROFILE.maxDepth+1);
  assert.throws(()=>capture(deep),/module\/depth bound/);
  const wide=Array.from({length:SOURCE_MODULE_VIEW_PROFILE.maxModules},(_,index)=>`mod child${index} {}`).join(' ');
  assert.throws(()=>capture(wide),/module\/depth bound/);
});

test('module consumers validate original file path profile and relative view identity',()=>{
  const source='mod child {pub const VALUE:u8=1;}',result=capture(source),sourceView=viewAt(result,['child']);
  const module={file:'src/lib.rs',source,path:['external','child'],sourceView,compilationProfile:null};
  assert.equal(originalSourceModuleItems(module)[0].name,'VALUE');
  for(const changes of [{file:'src/other.rs'},{path:['external','sibling']},{source:source+' '},{sourceView:structuredClone(sourceView)},{compilationProfile:{flags:{test:false}}}])assert.throws(()=>originalSourceModuleItems({...module,...changes}),/match|changed|unsealed/);
  assert.notEqual(moduleScopeKey(module),moduleScopeKey({...module,path:['child']}));
});

test('view-aware original consumers ignore invented caller item lists',()=>{
  const source='mod child {pub const VALUE:u8=1;}',sourceView=viewAt(capture(source),['child']);
  const module={file:'src/lib.rs',source,path:['child'],sourceView,items:[],allItems:[]};
  assert.equal(originalSourceModuleItems(module).length,1);
  assert.equal(originalSourceModuleItems({source:'pub const ROOT:u8=2;'}).length,1);
});
