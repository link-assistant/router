// Independent filesystem-boundary cases. SOURCE ONLY; UNRUN.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';import {tmpdir} from 'node:os';import {createHash} from 'node:crypto';
import {readPinnedNativeSourceProvenanceInputs,assertNativeSourceProvenanceCurrent} from '../native-source-history.mjs';
import {prepareNativeInputProvenanceSources} from '../prepare-native-input-provenance-sources.mjs';
const limits={timeout:60000},hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(t,change=row=>row){
 const root=mkdtempSync(join(tmpdir(),'router-native-input-receipt-'));t.after(()=>rmSync(root,{recursive:true,force:true}));mkdirSync(join(root,'profile'));mkdirSync(join(root,'rust','src'),{recursive:true});
 const source='// 🦀 lossless source\npub fn selected()->u64{1}\n',row=change({path:'rust/src/lib.rs',originalPath:'profile/original.rs.txt',language:'Rust',bytes:Buffer.byteLength(source),sha256:hash(source)}),path='profile/inputs.json';
 writeFileSync(join(root,'profile/original.rs.txt'),source);writeFileSync(join(root,'rust/src/lib.rs'),source);const bytes=Buffer.from(JSON.stringify({schema:'receiving-native-inputs-v1',files:[row]}));writeFileSync(join(root,path),bytes);return {root,path,pin:hash(bytes),bytes,source};
}
test('receiving native input metadata retains physical complete original and current source with detached CST DATA',limits,t=>{
 const f=fixture(t),rows=readPinnedNativeSourceProvenanceInputs(f.root,f);assert.equal(rows.length,1);const row=rows[0];assert.equal(row.originalSource,f.source);assert.equal(row.source,f.source);assert.equal(row.originalBytes,Buffer.byteLength(f.source));assert.equal(row.bytes,row.originalBytes);assert.equal(row.sha256,hash(f.source));assert.equal(row.originalSha256,row.sha256);assert.equal(row.nativeSourceHistory,null);assert.deepEqual(row.nativeInputArchive,{path:f.path,pin:f.pin,bytes:f.bytes.length});for(const key of ['sourceAuthority','semanticAuthority','namespaceAuthority'])assert.equal(row[key],false);assertNativeSourceProvenanceCurrent(f.root,row);assert.equal(readFileSync(join(f.root,row.path),'utf8'),f.source);
});
test('metadata JSON with identical meaning but different complete bytes refuses before construction and at final receipt boundary',limits,t=>{
 const f=fixture(t),row=readPinnedNativeSourceProvenanceInputs(f.root,f)[0];writeFileSync(join(f.root,f.path),Buffer.concat([f.bytes,Buffer.from(' ')]));assert.throws(()=>assertNativeSourceProvenanceCurrent(f.root,row),/metadata archive changed/);assert.throws(()=>readPinnedNativeSourceProvenanceInputs(f.root,f),/metadata differs/);
});
for(const target of ['rust/src/lib.rs','profile/original.rs.txt'])test('same-length complete source changes refuse at final boundary: '+target,limits,t=>{
 const f=fixture(t),row=readPinnedNativeSourceProvenanceInputs(f.root,f)[0];writeFileSync(join(f.root,target),f.source.replace('{1}','{2}'));assert.throws(()=>assertNativeSourceProvenanceCurrent(f.root,row),/provenance changed/);
});
test('original file growth and nonregular metadata refuse before source processing',limits,t=>{
 const f=fixture(t);writeFileSync(join(f.root,'profile/original.rs.txt'),f.source+'\n');assert.throws(()=>readPinnedNativeSourceProvenanceInputs(f.root,f),/original size\/type/);rmSync(join(f.root,f.path));mkdirSync(join(f.root,f.path));assert.throws(()=>readPinnedNativeSourceProvenanceInputs(f.root,f),/regular native metadata/);
});
test('declared oversized native originals refuse without creating oversized fixtures',limits,t=>{
 const f=fixture(t,row=>({...row,bytes:2097153}));assert.throws(()=>readPinnedNativeSourceProvenanceInputs(f.root,f),/source rows/);
});
test('eight complete constructor equations preserve both phases originals current source and exact inverses',limits,()=>{
 const plan=prepareNativeInputProvenanceSources();assert.equal(plan.files.length,8);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);assert.equal(plan.rustExecuted,false);
});
