// Actual native/mixed preparer receiving case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {prepareNativeSubstitutionCopy} from '../prepare-native-substitution-copy.mjs';
import {prepareMixedNativeSubstitutionCopy} from '../prepare-mixed-native-substitution-copy.mjs';
const limits={timeout:60000},path='tools/translation/prepare-native-substitution-copy.mjs',base='tools/translation/source-profiles/protected-preparer-writers-20261102/',oldBase='tools/translation/source-profiles/protected-source-installation-20261102/';
const read=name=>fs.readFileSync(new URL('../../../'+name,import.meta.url),'utf8'),hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(t,{old=false,foreign=false,changed=false}={}){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'protected-preparer-receiving-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));const put=(name,value)=>{fs.mkdirSync(dirname(join(root,name)),{recursive:true});fs.writeFileSync(join(root,name),value);};
 const target=foreign?'tools/translation/unassigned-preparer.mjs':path,before=read(old?oldBase+'preparer-before.mjs.txt':base+path.replaceAll('/','__')+'.before.txt')+(changed?'\n// independent changed original\n':''),after=read(path);
 put(target,after);for(const suffix of ['before','after']){const name=path.replaceAll('/','__')+'.'+suffix+'.txt';put(base+name,read(base+name));}const contained='tools/translation/source-profiles/protected-contained-direct-20261102/';for(const suffix of ['before','after'])put(contained+'preparer-native.'+suffix+'.txt',read(contained+'preparer-native.'+suffix+'.txt'));
 for(const name of ['unit-before.mjs.txt','successor-before.mjs.txt','preparer-before.mjs.txt','preparer-after.mjs.txt'])put(oldBase+name,read(oldBase+name));
 const id='independent:protected-preparer-current-source',archive='profile/source.json.gz',packed=gzipSync(JSON.stringify({schema:'native-substitution-source-copy-v1',id,files:[{path:target,source:before,bytes:Buffer.byteLength(before),sha256:hash(before),languageEdits:[],repositoryEdits:[]}]}));put(archive,packed);return {root,archive,id,pin:hash(packed),before,after};
}
for(const [name,prepare]of [['native',prepareNativeSubstitutionCopy],['mixed',prepareMixedNativeSubstitutionCopy]])for(const old of [false,true])test(name+' actual physical-current join retains '+(old?'complete earlier protected-installer chronology':'immediate complete protection successor'),limits,t=>{
 const input=fixture(t,{old}),result=prepare(input),row=result.files[0];assert.equal(row.before,input.before);assert.equal(row.after,input.before);assert.equal(row.current,input.after);assert.equal(row.currentAfter,input.after);assert.equal(row.inverse,input.before);assert.equal(row.laterHistories.length,1);assert.equal(row.laterHistories[0].currentAfter,input.after);assert.equal(row.laterHistories[0].inverse,input.before);assert.equal(row.nativeBindings.nativeSemanticScopeChecked,true);assert.equal(row.nativeBindings.strictTypecheck,false);assert.equal(result.sourceAuthority,false);assert.equal(result.semanticAuthority,false);assert.equal(result.receivingExecuted,false);
 if(old){assert.equal(row.laterHistories[0].laterHistories.length,1);assert.equal(row.laterHistories[0].laterHistories[0].before,read(oldBase+'preparer-after.mjs.txt'));}
});
for(const [name,prepare]of [['native',prepareNativeSubstitutionCopy],['mixed',prepareMixedNativeSubstitutionCopy]])test(name+' unknown path and altered original bytes cannot inherit a named successor',limits,t=>{
 assert.throws(()=>prepare(fixture(t,{foreign:true})),/unknown physical copied implementation/u);assert.throws(()=>prepare(fixture(t,{changed:true})),/unknown physical copied implementation/u);
});
