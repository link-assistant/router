// Independent actual three-variant sink case SOURCE. All execution UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {syncBuiltinESMExports} from 'node:module';
import {writeNativeSubstitutionCopy as native} from '../failure-aware-native-substitution-copy.mjs';
import {writeMixedNativeSubstitutionCopy as mixed} from '../failure-aware-mixed-native-substitution-copy.mjs';
import {writeNativeSubstitutionCopy as typed} from '../prepare-native-typed-substitution-copy.mjs';
import {withSourceFailureOperation} from '../source-failure-operations.mjs';
const limits={timeout:60000,concurrency:false};
function fixture(t){
 const root=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'protected-copy-variants-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const put=(path,source)=>{fs.mkdirSync(dirname(join(root,path)),{recursive:true});fs.writeFileSync(join(root,path),source);},read=path=>fs.readFileSync(join(root,path),'utf8');
 const policy=(authored=[],unmanaged=[])=>put('translation/source-ownership.json',JSON.stringify({schema:'router-explicit-source-ownership-v1',authored,unmanaged}));
 put('source/first.mjs','first');put('source/second.ts','second');return {root,put,read,policy,row:(path,after)=>({path,current:read(path),after})};
}
for(const [label,write]of [['failure-aware native',native],['failure-aware mixed',mixed],['typed',typed]]){
 test(label+' whole public plan preflight vetoes a protected later row before earlier writes',limits,t=>{const a=fixture(t);a.policy([],['source/second.ts']);assert.throws(()=>write({files:[a.row('source/first.mjs','changed'),a.row('source/second.ts','blocked')]},{root:a.root,force:true}),/authored\/unmanaged/u);assert.equal(a.read('source/first.mjs'),'first');assert.equal(a.read('source/second.ts'),'second');});
 test(label+' direct equal-byte and empty writes remain mutations on protected paths',limits,t=>{const a=fixture(t);for(const body of ['first','']){a.put('source/first.mjs',body);a.policy(['source/first.mjs']);assert.throws(()=>write({files:[a.row('source/first.mjs',body)]},{root:a.root}),/authored\/unmanaged/u);assert.equal(a.read('source/first.mjs'),body);}});
 for(const link of ['symlink','hardlink'])test(label+' refuses actual '+link+' aliases to protected bytes',limits,t=>{const a=fixture(t);a.policy(['source/first.mjs']);if(link==='symlink')fs.symlinkSync('first.mjs',join(a.root,'source/alias.mjs'));else fs.linkSync(join(a.root,'source/first.mjs'),join(a.root,'source/alias.mjs'));assert.throws(()=>write({files:[a.row('source/alias.mjs','changed')]},{root:a.root}),/policy alias/u);assert.equal(a.read('source/first.mjs'),'first');});
 test(label+' public rows remain uncapped iterable and preserve duplicate inode-alias order and byte APIs',limits,t=>{const a=fixture(t);a.policy();fs.linkSync(join(a.root,'source/first.mjs'),join(a.root,'source/alias.mjs'));const rows=Array.from({length:4100},()=>a.row('source/first.mjs','intermediate'));rows.push(a.row('source/alias.mjs',new Uint8Array([0,255,9])),{...a.row('source/first.mjs','unused'),currentAfter:Buffer.from([128,17,0])});write({files:new Set(rows)},{root:a.root});assert.deepEqual(fs.readFileSync(join(a.root,'source/first.mjs')),Buffer.from([128,17,0]));assert.deepEqual(fs.readFileSync(join(a.root,'source/alias.mjs')),Buffer.from([128,17,0]));});
 test(label+' original stale checks and modes are retained',limits,t=>{const a=fixture(t);a.policy();fs.chmodSync(join(a.root,'source/first.mjs'),0o600);const row=a.row('source/first.mjs','changed');write({files:[row]},{root:a.root});assert.equal(fs.statSync(join(a.root,'source/first.mjs')).mode&0o777,0o600);assert.throws(()=>write({files:[row]},{root:a.root}),/stale copy proposal/u);});
 for(const primary of [undefined,null,false,0,'',Object.freeze(new Error('original exact variant write failure'))])test(label+' retains exact original FS failure '+String(primary),limits,t=>{const a=fixture(t);a.policy();const original=fs.writeFileSync;let hit=false;const mock=t.mock.method(fs,'writeFileSync',(path,...rest)=>{if(path===join(a.root,'source/first.mjs')){hit=true;throw primary;}return original(path,...rest);});syncBuiltinESMExports();let caught=false;try{write({files:[a.row('source/first.mjs','changed')]},{root:a.root});}catch(error){caught=true;assert.equal(error,primary);}finally{mock.mock.restore();syncBuiltinESMExports();}assert.equal(hit,true);assert.equal(caught,true);assert.equal(a.read('source/first.mjs'),'first');});
}
for(const [label,write]of [['native',native],['mixed',mixed]])test(label+' original failure-aware frame stays invalid after caught nested policy denial',limits,t=>{const a=fixture(t);a.policy(['source/first.mjs']);let caught=false;assert.throws(()=>withSourceFailureOperation(()=>{try{write({files:[a.row('source/first.mjs','changed')]},{root:a.root});}catch(error){caught=true;assert.match(error.message,/authored\/unmanaged/u);}return 'caught application result';}),/invalidated/u);assert.equal(caught,true);assert.equal(a.read('source/first.mjs'),'first');a.policy();write({files:[a.row('source/first.mjs','fresh')]},{root:a.root});assert.equal(a.read('source/first.mjs'),'fresh');});
