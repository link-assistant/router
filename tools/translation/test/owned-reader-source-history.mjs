// Frozen producer output is historical test DATA, never runtime permission.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
const PATH='tools/translation/js-to-rust/owned-core-source.mjs';
const PACKED_SHA256='92dc04dfd0d069b879b32fb5ebfa05bb90ce59ad9d901a985bfb93b572b15629',RAW_SHA256='90bedcea34c80d92a47c3a8688a66ebd5b0dc85a0563cb81cad335c80ddcb29b';
const CHAIN=[
 '55360b1050e9f317d099f1a9ccccb753bbbe4c52a91329e3d4116a83001c7b5f',
 '768ace5077fd1febbe6d9cd1c5938b218020360d238d96a3d0ac0153b2d7787b',
 'c540d7adada5db73d6147b7a11aa2773424652729f45cfa3df7f0c648d49eca0',
 '35a0e04d97a25c343735ddd2ba6ddf9b06eb6c4415fc426d34961ade3de140f9',
 'ebd45c97808dbe473fcbc77c1663bcd0168953dfa25e16c305878f5736e6d2d9',
];
const SCHEMAS=['router-owned-ascii-reverse-sources-v1','router-owned-ascii-assets-v1','router-owned-ascii-base-assets-v1','owned-runtime-import-parent-link-source-v1'];
const hash=value=>createHash('sha256').update(value).digest('hex');
const rule=(before,after,id)=>({id,edits:[{span:[0,before.length],expected:before,replacement:after}]});
function nativeCopy(ts,row,source,path){
 const parse=text=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.deepEqual(file.parseDiagnostics,[]);return file;};
 const shape=node=>{const children=[];ts.forEachChild(node,child=>{children.push(shape(child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];};
 assert.equal(row.source,source);assert.equal(row.completeNativeAstCopy,true);
 assert.deepEqual(shape(parse(source)),shape(parse(row.copy)));
}
function readHistory(source,{path,chain,schemas,archive,schema,packedPin,rawPin,limit}){
 assert.equal(typeof source,'string','complete primitive current reader');
 assert.equal(hash(source),chain.at(-1),'complete current reader differs');
 const packed=readFileSync(archive);assert.equal(hash(packed),packedPin,'complete historical producer archive differs');
 const raw=gunzipSync(packed,{maxOutputLength:limit});assert.equal(hash(raw),rawPin,'complete historical producer bytes differ');
 const packet=JSON.parse(raw.toString('utf8'));assert.equal(packet.schema,schema);
 assert.equal(packet.sourceHead,'94367657f8086dfb23d0d43f6584f15eb4a42346');assert.equal(packet.path,path);assert.equal(packet.semanticAuthority,false);
 assert.deepEqual(packet.layers.map(layer=>layer.schema),schemas);const ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');
 for(let at=0;at<packet.layers.length;at++){
  const {row}=packet.layers[at];assert.equal(row.path,path);assert.equal(hash(row.before),chain[at]);assert.equal(hash(row.after),chain[at+1]);
  assert.equal(row.beforeSha256,chain[at]);assert.equal(row.afterSha256,chain[at+1]);assert.equal(row.inverse,row.before);
  assert.equal(transportConcreteSyntaxMeta(row.beforeMeta).source,row.before);assert.equal(transportConcreteSyntaxMeta(row.afterMeta).source,row.after);
  assert.equal(row.nativeCopies.length,2);nativeCopy(ts,row.nativeCopies[0],row.before,path);nativeCopy(ts,row.nativeCopies[1],row.after,path);
  assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);let current=row.before;
  for(const stage of row.stages){
   assert.equal(stage.before,current);const before=transportConcreteSyntaxMeta(stage.beforeMeta),after=transportConcreteSyntaxMeta(stage.afterMeta);
   assert.equal(before.source,stage.before);assert.equal(after.source,stage.after);
   const sequences={languageRules:[],repositoryRules:[]},field=stage.phase==='language'?'languageRules':'repositoryRules';
   sequences[field]=[rule(stage.before,stage.after,'history:complete-'+stage.phase)];
   const forward=applyConcreteSyntaxSubstitutions(before.document,sequences);
   assert.equal(serializeConcreteSyntaxMeta(forward.value),stage.afterMeta);
   sequences[field]=[rule(stage.after,stage.before,'history:restore-'+stage.phase)];
   assert.equal(serializeConcreteSyntaxMeta(applyConcreteSyntaxSubstitutions(after.document,sequences).value),stage.beforeMeta);
   assert.equal(stage.completeInverse,true);current=stage.after;
  }
  assert.equal(current,row.after);
 }
 assert.equal(packet.layers.at(-1).row.after,source);let value=source;
 for(const {row}of [...packet.layers].reverse()){assert.equal(value,row.after);value=row.before;}
 let inverse=value;for(const {row}of packet.layers){assert.equal(inverse,row.before);inverse=row.after;}assert.equal(inverse,source);
 return {source:value,actual:source,inverse,layers:packet.layers,semanticAuthority:false};
}
export function readOwnedReaderSourceHistory(source){return readHistory(source,{path:PATH,chain:CHAIN,schemas:SCHEMAS,archive:new URL('./fixtures/owned-reader-history/layers.json.gz',import.meta.url),schema:'owned-reader-complete-source-history-v1',packedPin:PACKED_SHA256,rawPin:RAW_SHA256,limit:64*1024*1024});}
export function readHostAssetSourceHistory(source){return readHistory(source,{path:'tools/translation/host-assets.mjs',chain:['827e58ded491be3800483d7ff51a79ee1126b4a1cc436a74116e591861c09f6f','4a8687ebac94667d0d0a6e56e654f05e3b0297ac774f9a2af30d9774bc28db5e'],schemas:['router-owned-ascii-sources-v1'],archive:new URL('./fixtures/owned-reader-history/host.json.gz',import.meta.url),schema:'host-asset-complete-source-history-v1',packedPin:'924e2a3b96e2de986fbca9622d8b8e3e97b9a072cfde1dbb8d54132f93af3758',rawPin:'75d964c748a084cb2df0f848ebca7cb998d50a91c5b28bf1c638caa026f8c576',limit:8*1024*1024});}
