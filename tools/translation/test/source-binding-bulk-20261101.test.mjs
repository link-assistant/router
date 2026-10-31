// Independent physical-source closure/lifecycle regression SOURCE. All UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync,renameSync,statSync,utimesSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {withSourceBindingBulk20261101} from '../source-binding-bulk-20261101.mjs';
import {withSourceFailureOperation} from '../source-failure-operations.mjs';
import {withOriginalPrimitiveOwnedVectorSourceOperation as vectorSourceScope} from '../failure-aware-primitive-owned-vector-source.mjs';
const limits={timeout:60000};
function fixture(t,overrides={}){
 const root=mkdtempSync(join(tmpdir(),'router-binding-batch-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const source={
  'src/lib.rs':'mod model; mod api; mod consumer;\n',
  'src/model.rs':'pub struct Value { pub amount: u8 }\npub const COUNT: u8 = 7;\n',
  'src/api.rs':'pub use crate::model::{Value as Item, COUNT as count};\n',
  'src/consumer.rs':'use crate::api::{Item as Alias, count as total};\n',
  ...overrides,
 };
 const write=(path,value)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),value);};for(const [path,value]of Object.entries(source))write(path,value);
 return {root,source,write,options:{root,sourceDirectory:'src',entry:'src/lib.rs'},read:path=>readFileSync(join(root,path),'utf8')};
}
test('one actual closure configures both renamed type and value forwarding across full files',limits,t=>{
 const api=fixture(t);let expired;
 const value=withSourceBindingBulk20261101(api.options,operation=>{
  expired=operation;assert.deepEqual(operation.evidence.graphDiagnostics,[]);assert.deepEqual(operation.evidence.bindingDiagnostics,[]);
  assert.deepEqual([...new Set(operation.trace.map(row=>row.phase))],['language','repository']);
  assert.equal(operation.evidence.sources.length,4);assert.ok(operation.evidence.sources.every(row=>row.source===api.source[row.path]&&typeof row.concreteSyntax==='string'));
  const caller=operation.configure({},['consumer']),facade=operation.configure({},['api']);
  assert.deepEqual(caller.sourceNamespaceAliases.type.get('consumer').get('Alias'),['crate','model','Value']);
  assert.deepEqual(caller.sourceNamespaceAliases.value.get('consumer').get('total'),['crate','model','COUNT']);
  assert.deepEqual(facade.sourceNamespaceAliases.type.get('api').get('Item'),['crate','model','Value']);
  // Each parser owns separate native maps, while the genuine source closure
  // supplies the same complete source identity within this synchronous batch.
  caller.sourceNamespaceAliases.type.get('consumer').set('Alias',['forged']);
  assert.deepEqual(operation.configure({},['consumer']).sourceNamespaceAliases.type.get('consumer').get('Alias'),['crate','model','Value']);
  operation.assertCurrent();return 17;
 });
 assert.equal(value,17);assert.throws(()=>expired.configure({},['consumer']),/expired/u);assert.throws(()=>expired.assertCurrent(),/expired/u);
});
test('inline source modules share whole physical originals and exact original coordinates',limits,t=>{
 const api=fixture(t,{'src/consumer.rs':'mod nested { use crate::api::Item as Local; }\n'});
 withSourceBindingBulk20261101(api.options,operation=>{
  const parser=operation.configure({},['consumer','nested']);assert.deepEqual(parser.sourceNamespaceAliases.type.get('consumer.nested').get('Local'),['crate','model','Value']);
  assert.equal(operation.evidence.sources.filter(row=>row.path==='src/consumer.rs').length,1);
 });
});
test('original duplicate alias unknown producer and unproved external refusals survive batching',limits,t=>{
 for(const source of [
  'use crate::api::Item as Alias; use crate::api::Item as Alias;',
  'producer!(); use crate::api::Item as Alias;',
  'use unknown_dependency::*;',
  '#[unknown_attribute] struct Local; use crate::api::Item as Alias;',
 ]){
  const api=fixture(t,{'src/consumer.rs':source});
  withSourceBindingBulk20261101(api.options,operation=>{
   const parser=operation.configure({},['consumer']);
   assert.ok(operation.evidence.bindingDiagnostics.length||parser.unresolvedImportScope||parser.unresolvedMacroScope||parser.unresolvedAttributeMacroScope);
   if(source.includes('unknown_dependency'))assert.equal(parser.unresolvedImportScope,true);
   if(source.startsWith('use crate'))assert.ok(parser.sourceNamespaceAliases.type.get('consumer').get('Alias').includes('ml_unresolved_source_binding'));
  });
 }
});
test('physical changes caught inside a callback poison the whole operation even after bytes are restored',limits,t=>{
 const api=fixture(t);let caught;
 assert.throws(()=>withSourceBindingBulk20261101(api.options,operation=>{
  api.write('src/model.rs',api.source['src/model.rs']+'\n// changed\n');
  try{operation.configure({},['consumer']);}catch(error){caught=error;}
  api.write('src/model.rs',api.source['src/model.rs']);return 'caught';
 }),error=>error===caught);
 // A later independent operation must reissue fresh complete source evidence.
 withSourceBindingBulk20261101(api.options,operation=>operation.assertCurrent());
});
test('closing source census detects a new competing module while preserving primary callback failure',limits,t=>{
 const api=fixture(t);
 assert.throws(()=>withSourceBindingBulk20261101(api.options,()=>{api.write('src/model/mod.rs','pub struct Different;');}),/census changed/u);
 rmSync(join(api.root,'src/model'),{recursive:true});
 const primary={reason:'application callback'};
 assert.throws(()=>withSourceBindingBulk20261101(api.options,()=>{api.write('src/model.rs','pub struct Changed;');throw primary;}),error=>error===primary);
 api.write('src/model.rs',api.source['src/model.rs']);
 withSourceBindingBulk20261101(api.options,operation=>operation.assertCurrent());
});
test('nested caught source failure poisons all active source scopes and later reissue stays independent',limits,t=>{
 const api=fixture(t);let original;
 assert.throws(()=>withSourceBindingBulk20261101(api.options,()=>{
  try{withSourceBindingBulk20261101(api.options,operation=>{
   api.write('src/consumer.rs','use missing::*;');
   try{operation.assertCurrent();}catch(error){original=error;}
   api.write('src/consumer.rs',api.source['src/consumer.rs']);
  });}catch(error){assert.equal(error,original);}
 }),error=>error===original);
 withSourceBindingBulk20261101(api.options,operation=>operation.configure({},['consumer']));
});
test('new unreferenced Rust source bytes are closing inputs and symlinks do not grant source ownership',limits,t=>{
 const api=fixture(t,{'src/unused.rs':'pub struct Before;'});
 assert.throws(()=>withSourceBindingBulk20261101(api.options,()=>api.write('src/unused.rs','pub struct After;')),/source input(?: identity)? changed/u);
 api.write('src/unused.rs','pub struct Before;');symlinkSync(join(api.root,'src/model.rs'),join(api.root,'src/linked.rs'));
 assert.throws(()=>withSourceBindingBulk20261101(api.options,()=>{}),/symlinked/u);
});
test('asynchronous continuations accessors and arbitrary authority inputs remain refused',limits,t=>{
 const api=fixture(t);let invoked=false;
 assert.throws(()=>withSourceBindingBulk20261101(api.options,async()=>{}),/synchronous/u);
 assert.throws(()=>withSourceBindingBulk20261101(api.options,()=>({then(){}})),/synchronously/u);
 const accessor={...api.options};Object.defineProperty(accessor,'entry',{get(){invoked=true;return 'src/lib.rs';}});
 assert.throws(()=>withSourceBindingBulk20261101(accessor,()=>{}),/accessor/u);assert.equal(invoked,false);
 assert.throws(()=>withSourceBindingBulk20261101({...api.options,namespaceAuthority:true},()=>{}));
 assert.throws(()=>withSourceBindingBulk20261101({...api.options,entry:'outside/lib.rs'},()=>{}));
});

test('complete physical UTF8 byte and source-size bounds stay enforced before binding',limits,t=>{
 const api=fixture(t);
 api.write('src/model.rs',Buffer.from([0xff]));
 assert.throws(()=>withSourceBindingBulk20261101(api.options,()=>assert.fail('invalid UTF8 must not reach callback')),/exact UTF8/u);
 api.write('src/model.rs',' '.repeat(2097153));
 assert.throws(()=>withSourceBindingBulk20261101(api.options,()=>assert.fail('oversized input must not reach callback')),/byte bound/u);
});

test('missing and competing physical module candidates never configure a successful partial graph',limits,t=>{
 for(const missing of [true,false]){
  const api=fixture(t);
  if(missing)rmSync(join(api.root,'src/model.rs'));else api.write('src/model/mod.rs','pub struct Other;');
  assert.throws(()=>withSourceBindingBulk20261101(api.options,operation=>{
   assert.ok(operation.evidence.graphDiagnostics.length);
   operation.configure({},['consumer']);
  }),/module graph retains unresolved diagnostics/u);
 }
});

test('same-name byte-identical file replacement refuses even with restored modification time',limits,t=>{
 const api=fixture(t),original=statSync(join(api.root,'src/model.rs'));
 assert.throws(()=>withSourceBindingBulk20261101(api.options,()=>{
  api.write('src/replacement.tmp',api.source['src/model.rs']);renameSync(join(api.root,'src/replacement.tmp'),join(api.root,'src/model.rs'));
  utimesSync(join(api.root,'src/model.rs'),original.atime,original.mtime);
 }),/physical source (?:census|input identity) changed/u);
});
test('same-name directories and renamed non-Rust entries remain closing identities',limits,t=>{
 const api=fixture(t,{'src/group/mod.rs':'pub struct Unused;','src/README.txt':'retained name'});
 assert.throws(()=>withSourceBindingBulk20261101(api.options,()=>{
  renameSync(join(api.root,'src/group'),join(api.root,'src/old-group'));
  api.write('src/group/mod.rs','pub struct Unused;');rmSync(join(api.root,'src/old-group'),{recursive:true});
 }),/physical source (?:census|input identity) changed/u);
 assert.throws(()=>withSourceBindingBulk20261101(api.options,()=>renameSync(join(api.root,'src/README.txt'),join(api.root,'src/NOTES.txt'))),/census changed/u);
});
test('changing a declared root alias refuses even when it resolves to the same source bytes',limits,t=>{
 const api=fixture(t),alias=join(api.root,'root-alias');symlinkSync(api.root,alias);
 const options={...api.options,root:alias};
 assert.throws(()=>withSourceBindingBulk20261101(options,()=>{
  rmSync(alias);symlinkSync(api.root,alias);
 }),/physical source (?:census|input identity) changed/u);
});

test('a complete bounded parser batch keeps independent original namespace maps',limits,t=>{
 const api=fixture(t);let expired;
 withSourceBindingBulk20261101(api.options,operation=>{
  expired=operation;const consumer={},facade={};
  const configured=operation.configureMany([{parser:consumer,modulePath:['consumer']},{parser:facade,modulePath:['api']}]);
  assert.equal(configured[0],consumer);assert.equal(configured[1],facade);
  assert.deepEqual(consumer.sourceNamespaceAliases.type.get('consumer').get('Alias'),['crate','model','Value']);
  assert.deepEqual(facade.sourceNamespaceAliases.value.get('api').get('count'),['crate','model','COUNT']);
  consumer.sourceNamespaceAliases.type.get('consumer').set('Alias',['forged']);
  assert.deepEqual(facade.sourceNamespaceAliases.type.get('consumer').get('Alias'),['crate','model','Value']);
 });
 assert.throws(()=>expired.configureMany([{parser:{},modulePath:[]}]),/expired/u);
});
test('batch entry holes accessors excess rows unknown modules and bypass fields refuse',limits,t=>{
 const api=fixture(t);let invoked=false;const accessor={modulePath:['consumer']};Object.defineProperty(accessor,'parser',{get(){invoked=true;return {};}});
 for(const requests of [[],Array(1),Array.from({length:513},()=>({parser:{},modulePath:[]})),[accessor],[{parser:{},modulePath:['not_a_module']}],[{parser:{},modulePath:[],skipClosing:true}]]){
  assert.throws(()=>withSourceBindingBulk20261101(api.options,operation=>operation.configureMany(requests)));
 }
 assert.equal(invoked,false);
});
test('batch closing catches parser-induced source changes and preserves the first caught failure',limits,t=>{
 const api=fixture(t),primary={reason:'original parser setter'},parser={};
 Object.defineProperty(parser,'compilationProfile',{set(){api.write('src/model.rs',api.source['src/model.rs']+'\n// changed by parser\n');throw primary;}});
 assert.throws(()=>withSourceBindingBulk20261101(api.options,operation=>{
  try{operation.configureMany([{parser,modulePath:['consumer']},{parser:{},modulePath:['api']}]);}catch(error){assert.equal(error,primary);}
  api.write('src/model.rs',api.source['src/model.rs']);
 }),error=>error===primary);
});
test('batch closing rejects silent source changes while unrelated root siblings remain outside source scope',limits,t=>{
 const api=fixture(t),parser={};
 Object.defineProperty(parser,'compilationProfile',{set(){api.write('src/model.rs',api.source['src/model.rs']+'\n// changed\n');}});
 assert.throws(()=>withSourceBindingBulk20261101(api.options,operation=>operation.configureMany([{parser,modulePath:['consumer']}])),/physical source (?:census|input identity) changed/u);
 api.write('src/model.rs',api.source['src/model.rs']);
 withSourceBindingBulk20261101(api.options,operation=>{
  const siblingWriter={};Object.defineProperty(siblingWriter,'compilationProfile',{set(){api.write('outside-source.txt','unrelated sibling');}});
  operation.configureMany([{parser:siblingWriter,modulePath:['consumer']},{parser:{},modulePath:['api']}]);
 });
});

test('caught binding input failure invalidates an enclosing original vector family after source restoration',limits,t=>{
 const api=fixture(t);
 assert.throws(()=>vectorSourceScope(()=>{
  try{withSourceBindingBulk20261101(api.options,operation=>{
   api.write('src/model.rs',api.source['src/model.rs']+'\n// changed\n');
   try{operation.assertCurrent();}catch{}
   api.write('src/model.rs',api.source['src/model.rs']);
  });}catch{}
  return 1;
 }),/invalidated.*source-input failure/u);
 assert.equal(withSourceFailureOperation(()=>23),23);
});
test('ordinary binding callback exceptions remain exact without invalidating an enclosing source operation',limits,t=>{
 const api=fixture(t),primary=Symbol('ordinary callback');
 assert.equal(withSourceFailureOperation(()=>{
  assert.throws(()=>withSourceBindingBulk20261101(api.options,()=>{throw primary;}),error=>error===primary);
  return 29;
 }),29);
});
