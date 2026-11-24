// Independent complete source epoch/receiving case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {knownProtectedCopyVariantSuccessor,proposeProtectedCopyVariantSources} from '../protected-copy-variants-20261102-history.mjs';
import {prepareNativeSubstitutionCopy as native} from '../failure-aware-native-substitution-copy.mjs';
import {prepareMixedNativeSubstitutionCopy as mixed} from '../failure-aware-mixed-native-substitution-copy.mjs';
import {prepareNativeTypedSubstitutionCopy as typed} from '../prepare-native-typed-substitution-copy.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url).pathname,base='tools/translation/source-profiles/protected-copy-variants-20261102/',read=path=>fs.readFileSync(new URL('../../../'+path,import.meta.url),'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
const names=['failure-aware-native-substitution-copy.mjs','failure-aware-mixed-native-substitution-copy.mjs','prepare-native-typed-substitution-copy.mjs'];
test('all three full original variants retain language then repository equations and complete inverses',{timeout:60000},()=>{
 const input=names.map(name=>({path:'tools/translation/'+name,source:read(base+name+'.before.txt')})),proposal=proposeProtectedCopyVariantSources(input,{root});assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.verification,'UNRUN');
 for(const [index,name]of names.entries()){const row=proposal.files[index];assert.equal(row.before,input[index].source);assert.equal(row.after,read('tools/translation/'+name));assert.equal(row.inverse,row.before);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}const actual=knownProtectedCopyVariantSuccessor({root,path:row.path,before:row.before});assert.equal(actual.currentAfter,row.after);assert.equal(knownProtectedCopyVariantSuccessor({root,path:row.path,before:row.before+'
'}),null);}
 assert.throws(()=>proposeProtectedCopyVariantSources(input.slice(1),{root}),/all three/u);assert.equal(knownProtectedCopyVariantSuccessor({root,path:'foreign.mjs',before:''}),null);
});
for(const [label,prepare]of [['native',native],['mixed',mixed],['typed',typed]])test(label+' actual original native preparer admits only exact named physical successor through fresh checks',{timeout:60000},t=>{
 const receiving=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'copy-variants-receiving-')));t.after(()=>fs.rmSync(receiving,{recursive:true,force:true}));const put=(path,source)=>{fs.mkdirSync(dirname(join(receiving,path)),{recursive:true});fs.writeFileSync(join(receiving,path),source);};
 const name=names[0],path='tools/translation/'+name,before=read(base+name+'.before.txt'),after=read(path),id='independent:copy-variant-current-source',archive='profile/complete.json.gz';put(path,after);for(const suffix of ['before','after'])put(base+name+'.'+suffix+'.txt',read(base+name+'.'+suffix+'.txt'));
 function input(source){const packed=gzipSync(JSON.stringify({schema:'native-substitution-source-copy-v1',id,files:[{path,source,bytes:Buffer.byteLength(source),sha256:hash(source),languageEdits:[],repositoryEdits:[]}]}));put(archive,packed);return {root:receiving,archive,id,pin:hash(packed)};}
 const result=prepare(input(before)),row=result.files[0];assert.equal(row.before,before);assert.equal(row.after,before);assert.equal(row.current,after);assert.equal(row.currentAfter,after);assert.equal(row.laterHistories[0].inverse,before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(result.sourceAuthority,false);assert.equal(result.semanticAuthority,false);assert.throws(()=>prepare(input(before+'
')),/unknown physical copied implementation/u);
});
