import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {readNativePortableLayoutHistory} from '../native-portable-layout-history.mjs';
import {ownershipCompiler} from '../js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url)),PREFIX='tools/translation/source-profiles/native-portable-layout-history/',hash=value=>createHash('sha256').update(value).digest('hex');
function copy(t){const packet=readNativePortableLayoutHistory({root:ROOT}),root=mkdtempSync(join(tmpdir(),'router-native-portable-original-history-'));t.after(()=>rmSync(root,{recursive:true,force:true}));for(const input of packet.inputs){const path=join(root,input.path);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,input.encoding==='base64'?Buffer.from(input.source,'base64'):input.source);}return {root,packet};}
function repack(root,packet){const raw=Buffer.from(JSON.stringify(packet)+'\n'),packed=gzipSync(raw),manifest={schema:packet.schema,archive:'originals.json.gz',bytes:packed.length,sha256:hash(packed),rawBytes:raw.length,rawSha256:hash(raw)};writeFileSync(join(root,PREFIX+'originals.json.gz'),packed);writeFileSync(join(root,PREFIX+'manifest.json'),JSON.stringify(manifest,null,2)+'\n');}

test('both complete genuine Git sources retain original literal hashes and full mixed migration bytes',{timeout:60000},()=>{
 const history=readNativePortableLayoutHistory({root:ROOT}),ts=ownershipCompiler();assert.equal(ts.version,'5.9.3');assert.equal(history.files.length,2);assert.deepStrictEqual(history.authority,{source:false,semantic:false,execution:false});assert.equal(history.files[0].genuineAssemblerSha256,'8f8dfc0abfc8350b32144253c507d35c09d440cf0b2f478497f7847c00a15547');
 for(const row of history.files){assert.equal(hash(row.genuineSource),row.genuineSha256);assert.equal(hash(row.mixedSource),row.mixedSha256);assert.equal(hash(row.genuineAssembler),row.genuineAssemblerSha256);assert.equal(hash(row.mixedAssembler),row.mixedAssemblerSha256);assert.notEqual(row.genuineAssembler,row.mixedAssembler);for(const kind of ['genuine','mixed']){const source=row[kind+'Source'],file=ts.createSourceFile(row.path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(file.parseDiagnostics.length,0);const nodes=file.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations]).filter(node=>ts.isIdentifier(node.name)&&node.name.text==='beforeAssembler');assert.equal(nodes.length,1);assert.equal(nodes[0].initializer.text,row[kind+'Assembler']);assert.equal(nodes[0].initializer.getText(file),row[kind+'LiteralSource']);}}
 assert.deepStrictEqual(readNativePortableLayoutHistory({root:ROOT}),history);
});

test('validly recompressed whole-source mutations cannot forge genuine or mixed source history',{timeout:60000},t=>{
 const {root}=copy(t),original=JSON.parse(gunzipSync(readFileSync(join(root,PREFIX+'originals.json.gz'))));for(const version of ['genuineSource','mixedSource'])for(let at=0;at<2;at++){const changed=structuredClone(original);changed.files[at][version]+='\n// changed complete source\n';repack(root,changed);assert.throws(()=>readNativePortableLayoutHistory({root}),/full pinned Git source differs/u);}repack(root,original);assert.equal(readNativePortableLayoutHistory({root}).files.length,2);
 const changed=structuredClone(original);changed.files[1]=structuredClone(changed.files[0]);repack(root,changed);assert.throws(()=>readNativePortableLayoutHistory({root}),/complete unique original\/mixed sources required/u);
});

test('archive identity canonical schema complete field census and original notices remain mandatory',{timeout:60000},t=>{
 const {root}=copy(t),packed=readFileSync(join(root,PREFIX+'originals.json.gz')),original=JSON.parse(gunzipSync(packed)),manifest=readFileSync(join(root,PREFIX+'manifest.json'),'utf8');
 const changed=structuredClone(original);changed.extra='unrecognized original packet field';repack(root,changed);assert.throws(()=>readNativePortableLayoutHistory({root}),/complete exact record fields/u);repack(root,original);
 const wrong=JSON.parse(manifest);wrong.sha256='0'.repeat(64);writeFileSync(join(root,PREFIX+'manifest.json'),JSON.stringify(wrong));assert.throws(()=>readNativePortableLayoutHistory({root}),/full archive manifest differs/u);writeFileSync(join(root,PREFIX+'manifest.json'),manifest);
 writeFileSync(join(root,PREFIX+'NOTICE'),'not the complete original notice');assert.throws(()=>readNativePortableLayoutHistory({root}),/archive\/notice required/u);
});

test('complete original sources and authored history reader retain full serialized reparsed CST and whole inverses',{timeout:60000},()=>{
 const history=readNativePortableLayoutHistory({root:ROOT}),sources=history.files.flatMap(row=>[row.genuineSource,row.mixedSource]),reader=history.inputs.find(row=>row.path.endsWith('/native-portable-layout-history.mjs'));sources.push(reader.source);
 for(const source of sources){const first=transportConcreteSyntaxSource(source,{language:'JavaScript'}),run=applyConcreteSyntaxSubstitutions(first.document,{languageRules:[{id:'javascript:complete-original-Git-history-source',edits:[]}],repositoryRules:[{id:'router:retain-original-literal-pins-and-mixed-state',edits:[]}]}),wire=serializeConcreteSyntaxMeta(run.value);assert.equal(transportConcreteSyntaxMeta(wire).source,source);const inverse=applyConcreteSyntaxSubstitutions(transportConcreteSyntaxMeta(wire).document,{languageRules:[],repositoryRules:[{id:'router:complete-original-history-inverse',edits:[]}]});assert.equal(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source,source);}
 for(const input of history.inputs)assert.equal(readFileSync(join(ROOT,input.path)).toString(input.encoding==='base64'?'base64':'utf8'),input.source);
});
