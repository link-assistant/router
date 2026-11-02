// Independent real-filesystem operational veto cases SOURCE; all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {syncBuiltinESMExports} from 'node:module';
import {captureExplicitSourceMutationPolicy} from '../unit-runtime-materialization.mjs';
import {withProtectedNativeWriter,mutateProtectedNativeDirectWriter} from '../protected-native-writers-20261102.mjs';
import {assertProtectedDirectWriteTargets} from '../protected-preparer-writers-20261102-alias.mjs';
const limits={timeout:60000,concurrency:false};
function fixture(t,authored=null){const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-direct-policy-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.mkdirSync(join(root,'translation'));if(authored!==null)fs.writeFileSync(join(root,'translation/source-ownership.json'),JSON.stringify({schema:'router-explicit-source-ownership-v1',authored,unmanaged:[]})+'\n');return root;}
function operation(root,name,after,observe=()=>{}){const full=join(root,name),before=fs.readFileSync(full,'utf8'),mode=fs.statSync(full).mode&0o777;return withProtectedNativeWriter(root,()=>mutateProtectedNativeDirectWriter(root,[{path:name,before,after,mode}],()=>{observe();fs.writeFileSync(full,after);}));}
for(const alias of ['symbolic','hard'])test('real '+alias+' alias cannot truncate a protected ordinary source',limits,t=>{
 const root=fixture(t,['authored.txt']);fs.writeFileSync(join(root,'authored.txt'),'independent original');if(alias==='symbolic')fs.symlinkSync('authored.txt',join(root,'alias.txt'));else fs.linkSync(join(root,'authored.txt'),join(root,'alias.txt'));
 const before=fs.statSync(join(root,'authored.txt'),{bigint:true});let wrote=false;assert.throws(()=>operation(root,'alias.txt','changed',()=>{wrote=true;}),/alias|authored|unmanaged/);assert.equal(wrote,false);assert.equal(fs.readFileSync(join(root,'authored.txt'),'utf8'),'independent original');const after=fs.statSync(join(root,'authored.txt'),{bigint:true});for(const key of ['dev','ino','mode','size','mtimeNs','ctimeNs'])assert.equal(after[key],before[key]);
});
for(const alias of ['symbolic','hard'])test('real unprotected '+alias+' alias retains the original direct writer behavior',limits,t=>{
 const root=fixture(t,[]);fs.writeFileSync(join(root,'ordinary.txt'),'before');if(alias==='symbolic')fs.symlinkSync('ordinary.txt',join(root,'alias.txt'));else fs.linkSync(join(root,'ordinary.txt'),join(root,'alias.txt'));operation(root,'alias.txt','after');assert.equal(fs.readFileSync(join(root,'ordinary.txt'),'utf8'),'after');
});
test('an equal empty protected write is a mutation while staged no-op permission remains distinct',limits,t=>{
 const root=fixture(t,['empty.txt']);fs.writeFileSync(join(root,'empty.txt'),'');const scope=captureExplicitSourceMutationPolicy(root),fresh={root,outputs:[{path:'empty.txt',before:'',after:'',mode:fs.statSync(join(root,'empty.txt')).mode&0o777}]};scope.allow(fresh);assert.throws(()=>scope.allowDirectWrites(fresh),/mutation|authored/);assert.throws(()=>scope.verify(),/revoked/);assert.throws(()=>scope.close(),/revoked/);assert.equal(fs.readFileSync(join(root,'empty.txt'),'utf8'),'');
});
test('dangling symbolic policy-self alias cannot create an absent policy',limits,t=>{
 const root=fixture(t);fs.symlinkSync('translation/source-ownership.json',join(root,'alias.txt'));const scope=captureExplicitSourceMutationPolicy(root);assert.throws(()=>scope.allowDirectWrites({root,outputs:[{path:'alias.txt'}]}),/alias|policy/);assert.throws(()=>scope.close(),/revoked/);assert.equal(fs.existsSync(join(root,'translation/source-ownership.json')),false);assert.equal(fs.lstatSync(join(root,'alias.txt')).isSymbolicLink(),true);
});
test('caught staged path veto permanently revokes the same operation scope',limits,t=>{
 const root=fixture(t,['authored.txt']),scope=captureExplicitSourceMutationPolicy(root);assert.throws(()=>scope.allowMutationPaths(['authored.txt']),/mutation|authored/);assert.throws(()=>scope.allowMutationPaths(['ordinary.txt']),/revoked/);assert.throws(()=>scope.close(),/revoked/);
});
test('caught source-row veto permanently revokes existing staged permission too',limits,t=>{
 const root=fixture(t,['authored.txt']);fs.writeFileSync(join(root,'authored.txt'),'before');const scope=captureExplicitSourceMutationPolicy(root);assert.throws(()=>scope.allow({root,outputs:[{path:'authored.txt',before:'before',after:'after',mode:0o644}]}),/retained/);assert.throws(()=>scope.allow({root,outputs:[]}),/revoked/);assert.throws(()=>scope.close(),/revoked/);
});
for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('frozen alias lookup'))])test('alias lookup retains exact primary '+String(primary),limits,t=>{
 const root=fixture(t,[]),scope=captureExplicitSourceMutationPolicy(root),original=fs.lstatSync;let caught=false;const mock=t.mock.method(fs,'lstatSync',(file,...args)=>{if(String(file)===join(root,'candidate.txt'))throw primary;return original(file,...args);});syncBuiltinESMExports();
 try{try{scope.allowDirectWrites({root,outputs:[{path:'candidate.txt'}]});}catch(error){caught=true;assert.strictEqual(error,primary);}assert.equal(caught,true);assert.throws(()=>scope.verify(),/revoked/);}finally{mock.mock.restore();syncBuiltinESMExports();assert.throws(()=>scope.close(),/revoked/);}
});
test('array subclass custom iterator cannot enter the alias walk',limits,t=>{
 const root=fixture(t);let invoked=0;class Paths extends Array{*[Symbol.iterator](){invoked++;throw Error('custom iterator must not run');}}const names=new Paths();names.push('protected.txt');const paths=new Paths();paths.push('ordinary.txt');assertProtectedDirectWriteTargets({root,protectedNames:names,paths});assert.equal(invoked,0);
});
