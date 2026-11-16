// Independent full source ancestry/receiving cases. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {proposeProtectedUnitVariantSources,knownProtectedUnitVariantSuccessor} from '../protected-unit-variants-20261102-history.mjs';
import {knownProtectedPreparerWriterSuccessor} from '../protected-preparer-writers-20261102-history.mjs';
import {proposeProtectedUnitVariantPriorCase} from '../protected-unit-variants-20261102-case-successor.mjs';
import {prepareNativeSubstitutionCopy} from '../prepare-native-substitution-copy.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const root=new URL('../../../',import.meta.url).pathname,base='tools/translation/source-profiles/protected-unit-variants-20261102/',read=path=>fs.readFileSync(new URL('../../../'+path,import.meta.url),'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
const names=['synchronize-units.mjs','synchronize-owned-project-units.mjs','owned-project-runtime-materialization.mjs','protected-preparer-writers-20261102-history.mjs'];
test('all four complete modules retain exact language/repository source equations and physical-current joins',{timeout:60000},()=>{
 const input=names.map(name=>({path:'tools/translation/'+name,source:read(base+name+'.before.txt')})),proposal=proposeProtectedUnitVariantSources(input,{root});assert.equal(proposal.sourceInstalled,false);assert.equal(proposal.verification,'UNRUN');
 for(const [index,name]of names.entries()){const row=proposal.files[index];assert.equal(row.before,input[index].source);assert.equal(row.after,read('tools/translation/'+name));assert.equal(row.inverse,row.before);assert.deepEqual(row.trace.map(stage=>stage.phase),['language','repository']);for(const stage of row.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}assert.equal(knownProtectedUnitVariantSuccessor({root,path:row.path,before:row.before}).currentAfter,row.after);assert.equal(knownProtectedUnitVariantSuccessor({root,path:row.path,before:row.before+'
'}),null);}
 assert.throws(()=>proposeProtectedUnitVariantSources(input.slice(1),{root}),/all four/u);assert.equal(knownProtectedUnitVariantSuccessor({root,path:'tools/translation/foreign.mjs',before:''}),null);
});
test('finite bridge preserves three original sink histories and adds only the four named unit/history paths',{timeout:60000},()=>{
 for(const name of names){const path='tools/translation/'+name,before=read(base+name+'.before.txt'),step=knownProtectedPreparerWriterSuccessor({root,path,before});assert.equal(step.before,before);assert.equal(step.after,read(path));assert.equal(step.currentAfter,read(path));assert.equal(step.inverse,before);}
 const prior='tools/translation/source-profiles/protected-preparer-writers-20261102/',path='tools/translation/prepare-native-substitution-copy.mjs',before=read(prior+path.replaceAll('/','__')+'.before.txt'),old=knownProtectedPreparerWriterSuccessor({root,path,before});assert.equal(old.after,read(prior+path.replaceAll('/','__')+'.after.txt'));assert.equal(old.currentAfter,read(path));assert.equal(old.inverse,before);assert.equal(knownProtectedPreparerWriterSuccessor({root,path:'tools/translation/unassigned-unit.mjs',before:''}),null);
});
for(const name of names.slice(0,3))test('actual original native preparer retains complete original unit→current unit source join '+name,{timeout:60000},t=>{
 const receiving=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'unit-variant-receiving-')));t.after(()=>fs.rmSync(receiving,{recursive:true,force:true}));const put=(path,text)=>{fs.mkdirSync(dirname(join(receiving,path)),{recursive:true});fs.writeFileSync(join(receiving,path),text);},path='tools/translation/'+name,before=read(base+name+'.before.txt'),after=read(path),id='independent:unit-variant-source-epoch',archive='profile/complete.json.gz';put(path,after);for(const suffix of ['before','after'])put(base+name+'.'+suffix+'.txt',read(base+name+'.'+suffix+'.txt'));
 const packed=gzipSync(JSON.stringify({schema:'native-substitution-source-copy-v1',id,files:[{path,source:before,bytes:Buffer.byteLength(before),sha256:hash(before),languageEdits:[],repositoryEdits:[]}]}));put(archive,packed);const result=prepareNativeSubstitutionCopy({root:receiving,archive,id,pin:hash(packed)}),row=result.files[0];assert.equal(row.before,before);assert.equal(row.after,before);assert.equal(row.currentAfter,after);assert.equal(row.laterHistories[0].inverse,before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(result.sourceAuthority,false);assert.equal(result.semanticAuthority,false);
});
test('prior malformed regexp source is retained whole and corrected through exactly two raw source phases',{timeout:60000},()=>{const result=proposeProtectedUnitVariantPriorCase({root});assert.equal(result.before,read(base+'prior-copy-case.before.txt'));assert.equal(result.after,read('tools/translation/test/protected-copy-variants-20261102.test.mjs'));assert.equal(result.inverse,result.before);assert.equal(result.originalGrammar,'MALFORMED_REGEXP_DELIMITER');assert.deepEqual(result.trace.map(row=>row.phase),['language','repository']);assert.equal(transportConcreteSyntaxMeta(result.correctedConcreteSyntax).source,result.after);assert.equal(result.sourceInstalled,false);assert.equal(result.sourceAuthority,false);});
