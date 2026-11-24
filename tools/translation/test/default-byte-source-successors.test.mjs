import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {prepareDefaultByteHistoryExtension} from '../prepare-default-byte-history-extension.mjs';
import {defaultByteHistoryOriginals,qualifyDefaultBytePrerequisites,qualifyDefaultByteSourceSuccessors,isKnownDefaultByteReceivingPredecessor,tryDefaultByteSourceEquation} from '../default-byte-source-successors.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from '../concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../../',import.meta.url));
const SCOPE='tools/translation/operation-proof-byte-consumer-scope.mjs',NAME='operation-proof-byte-consumer-scope.mjs',RECEIVING='tools/translation/test/fixtures/current-receiving-source-history.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(t){const root=mkdtempSync(join(tmpdir(),'router-default-byte-successor-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;}
function write(root,path,source){mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),source);}
function oldScope(){return JSON.parse(gunzipSync(readFileSync(join(ROOT,'tools/translation/source-profiles/default-proof-byte-adoption/complete-original-inputs.json.gz')))).files.find(row=>row.path===SCOPE);}
test('complete preparer extension retains native selections both CST stages and whole inverses',{timeout:60000},()=>{
 const plan=prepareDefaultByteHistoryExtension();assert.equal(plan.files.length,2);assert.equal(plan.runtimeSourceChanged,false);assert.equal(plan.originalCaseBodiesChanged,false);assert.equal(plan.originalDeadlinesChanged,false);assert.equal(plan.newAcrossInvocationCache,false);
 for(const row of plan.files){assert.equal(row.current,row.after);assert.equal(row.inverse,row.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);assert.equal(row.stages[0].inverse,row.before);assert.equal(row.stages[1].inverse,row.language);}
});
test('original complete prerequisite source preserves its exact original record',{timeout:60000},t=>{
 const root=fixture(t),original=oldScope();write(root,SCOPE,original.source);const rows=qualifyDefaultBytePrerequisites(root,new Map([[SCOPE,original]]),[NAME]);assert.equal(rows.length,1);assert.equal(rows[0],original);assert.equal(readFileSync(join(root,SCOPE),'utf8'),original.source);
});
test('one unknown source byte is refused before an absent guarded dependency can qualify',{timeout:60000},t=>{
 const root=fixture(t),original=oldScope();write(root,SCOPE,original.source+'\n// unregistered source\n');assert.throws(()=>qualifyDefaultBytePrerequisites(root,new Map([[SCOPE,original]]),[NAME]),/unknown complete prerequisite body/);
});
test('a copied guarded import alone does not qualify its actual dependency closure',{timeout:60000},t=>{
 const root=fixture(t),original=oldScope(),current=original.source.replace("'./original-lexing-intrinsics.mjs'","'./guarded-proof-lexing-intrinsics.mjs'");assert.notEqual(current,original.source);write(root,SCOPE,current);assert.throws(()=>qualifyDefaultBytePrerequisites(root,new Map([[SCOPE,original]]),[NAME]),/ENOENT|bounded|complete/);
});
test('unknown successor families retain the original producer refusal rather than a source permit',{timeout:60000},t=>{
 const root=fixture(t),path='tools/translation/unregistered.mjs';write(root,path,'export const actual=1;\n');const rows=qualifyDefaultByteSourceSuccessors({root,files:[{path,before:'old',after:'new'}]});assert.equal(rows.size,0);
});
test('only the complete captured receiving predecessor is recognized',{timeout:60000},()=>{
 const original=defaultByteHistoryOriginals(ROOT).files.find(row=>row.path===RECEIVING);assert.ok(original);assert.equal(hash(original.source),original.sha256);assert.equal(isKnownDefaultByteReceivingPredecessor(ROOT,RECEIVING,original.source),true);assert.equal(isKnownDefaultByteReceivingPredecessor(ROOT,RECEIVING,original.source+'\n'),false);assert.equal(isKnownDefaultByteReceivingPredecessor('/absent','unrelated.mjs',original.source),false);
});
test('corrupt complete history archive refuses before producing any source equation',{timeout:60000},t=>{
 const root=fixture(t),path='tools/translation/source-profiles/default-byte-history-extension/complete-originals.json.gz',packed=Buffer.from(readFileSync(join(ROOT,path)));packed[packed.length-12]^=1;write(root,path,packed);assert.throws(()=>defaultByteHistoryOriginals(root),/complete original archive/);
});
test('every prerequisite call freshly observes a later source edit',{timeout:60000},t=>{
 const root=fixture(t),original=oldScope(),map=new Map([[SCOPE,original]]);write(root,SCOPE,original.source);assert.equal(qualifyDefaultBytePrerequisites(root,map,[NAME])[0],original);write(root,SCOPE,original.source+'\n// changed after prior call\n');assert.throws(()=>qualifyDefaultBytePrerequisites(root,map,[NAME]),/unknown complete prerequisite body/);
});
test('existing batched operation preserves full independent public-CST source and trace results',{timeout:60000},()=>{
 const before='const first=1;\n',language='const first=2;\n',after='export const first=2;\n',rule=(from,to,id)=>({id,edits:[{span:[0,from.length],expected:from,replacement:to}]}),sequence={languageRules:[rule(before,language,'javascript:retain-existing-issuer-and-compose-only-proof-DATA-bytes')],repositoryRules:[rule(language,after,'router:bind-existing-operation-byte-bridge-and-internal-scope')]};
 const native=tryDefaultByteSourceEquation(before,language,after,sequence);assert.ok(native);const first=transportConcreteSyntaxSource(before,{language:'JavaScript'}),a=applyConcreteSyntaxSubstitutions(first.document,{languageRules:sequence.languageRules,repositoryRules:[]}),middle=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(a.value)),b=applyConcreteSyntaxSubstitutions(middle.document,{languageRules:[],repositoryRules:sequence.repositoryRules}),last=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(b.value));
 assert.equal(native.beforeMeta,first.meta);assert.equal(native.afterMeta,last.meta);assert.equal(native.inverse,before);assert.equal(native.stages[0].beforeMeta,first.meta);assert.equal(native.stages[0].afterMeta,middle.meta);assert.equal(native.stages[1].beforeMeta,middle.meta);assert.equal(native.stages[1].afterMeta,last.meta);assert.deepEqual(native.trace,[...a.trace,...b.trace]);
});
test('large source equations retain the complete original fallback without raising operation limits',{timeout:60000},()=>{
 const source=' '.repeat(65537);assert.equal(tryDefaultByteSourceEquation(source,source,source,{languageRules:[],repositoryRules:[]}),null);
});
