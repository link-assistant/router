import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareStaticSourceLifecycleProposal,prepareStaticSourceLifecycleProposalReleased,transportStaticSourceLifecycleCanonicals,transportStaticSourceLifecycleCanonicalsShared} from '../prepare-real-source-fixtures.mjs';
import {prepareStaticSourceRelease} from '../prepare-static-source-release.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),historyArchive=fileURLToPath(new URL('../source-profiles/static-source-lifecycle/',import.meta.url));

test('actual allocation source producer retains every original body and complete native CST inverse',{timeout:60000},()=>{
 const result=prepareStaticSourceRelease(),ts=ownershipCompiler();assert.equal(result.files.length,2);
 for(const row of result.files){assert.equal(row.before,row.after);assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.original);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);assert.equal(row.inverse,row.original);assert.deepEqual(row.trace.map(x=>x.phase),['language','repository']);
  const functions=text=>{const sf=ts.createSourceFile(row.path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(sf.parseDiagnostics.length,0);return new Map(sf.statements.filter(ts.isFunctionDeclaration).map(n=>[n.name.text,n.getText(sf)]));};const old=functions(row.original),current=functions(row.after);for(const [name,body]of old)assert.equal(current.get(name),body,name);
 }
 assert.equal(result.originalProducerBodyUnchanged,true);assert.equal(result.allSourceAndCstPassesRemain,true);assert.equal(result.originalLimitsUnchanged,true);assert.equal(result.newAcrossInvocationCaches,false);assert.equal(result.invocationLocalImmutableNodeSharing,true);
});

test('equal immutable node rows share only DATA while each complete source and root remain independent',{timeout:60000},()=>{
 const source='pub fn original(){'+Array.from({length:300},(_,at)=>'let value_'+at+'='+at+'u64;').join('')+'}\n',changed=source+'pub fn added()->u8{7}\n',rows=[['before',{source,canonical:transportConcreteSyntaxSource(source,{language:'Rust'}).meta}],['after',{source:changed,canonical:transportConcreteSyntaxSource(changed,{language:'Rust'}).meta}]],old=transportStaticSourceLifecycleCanonicals(rows),current=transportStaticSourceLifecycleCanonicalsShared(rows);
 for(const [id,document]of current){assert.equal(JSON.stringify(document),JSON.stringify(old.get(id)));assert.ok(Object.isFrozen(document));assert.ok(Object.isFrozen(document.nodes));assert.deepEqual(document.authority,{type:false,owner:false,executable:false});}
 const first=current.get('before'),second=current.get('after');assert.equal(first.source,source);assert.equal(second.source,changed);assert.notEqual(first.nodes[0],second.nodes[0]);let shared=0;for(let at=1;at<Math.min(first.nodes.length,second.nodes.length);at++)if(first.nodes[at]===second.nodes[at])shared++;assert.ok(shared>first.nodes.length/2);
});

test('original option getters throws and invalid physical roots retain exact boundaries',{timeout:60000},t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-static-release-refusal-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 for(const make of [()=>null,()=>({root:directory}),()=>({root,historyArchive:directory}),()=>({get root(){throw new RangeError('exact original getter');}})]){
  const rows=[];for(const create of [prepareStaticSourceLifecycleProposal,prepareStaticSourceLifecycleProposalReleased]){try{create(make());assert.fail('invalid complete inputs must refuse');}catch(error){rows.push({name:error.name,message:error.message});}}assert.deepEqual(rows[1],rows[0]);
 }
 assert.equal(prepareStaticSourceLifecycleProposal.length,prepareStaticSourceLifecycleProposalReleased.length);
});

test('one complete original and released producer emit identical artifacts and complete source vectors',{timeout:60000},()=>{
 const options={root,historyArchive},before=prepareStaticSourceLifecycleProposal(options),current=prepareStaticSourceLifecycleProposalReleased(options);
 assert.deepEqual(current,before);assert.equal(current.completeInverse,true);assert.equal(current.files.length,3);assert.deepEqual(current.before,current.after);
 assert.deepEqual(current.trace.map(row=>row.phase),['language','repository']);for(const row of current.files)assert.ok(row.content.length>0);
 assert.deepEqual(current.authority,{namespace:false,dispatch:false,ownership:false,semantic:false,executable:false});
});
