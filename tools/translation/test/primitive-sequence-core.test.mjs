// Independent paired primitive sequence core cases. ALL UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as core from '../extensions/primitive-sequence-runtime.mjs';
import {PRIMITIVE_SEQUENCE_CONTRACTS,PRIMITIVE_SEQUENCE_RULE_SEQUENCES} from '../primitive-sequence-contracts.mjs';
import {preparePrimitiveSequenceCoreSources} from '../prepare-primitive-sequence-core-sources.mjs';
import {readFileSync,mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const limits={timeout:60000},root=fileURLToPath(new URL('../../../',import.meta.url));
const domains=[
 ['bool',false,true],['u8',0n,255n],['i8',-128n,127n],
 ['u16',0n,65535n],['i16',-32768n,32767n],['u32',0n,4294967295n],['i32',-2147483648n,2147483647n],
 ['u64',0n,18446744073709551615n],['i64',-9223372036854775808n,9223372036854775807n],
 ['u128',0n,340282366920938463463374607431768211455n],['i128',-170141183460469231731687303715884105728n,170141183460469231731687303715884105727n],
];
test('all thirty-three operations preserve length emptiness first/last values falsy Some and wide missing indices',limits,()=>{
 for(const [name,minimum,maximum]of domains){const len=core['router_slice_'+name+'_len'],empty=core['router_slice_'+name+'_is_empty'],get=core['router_slice_'+name+'_get'],values=Object.freeze([minimum,maximum]),none=get(values,2n),some=get(values,0n);assert.equal(len(Object.freeze([])),0n);assert.equal(empty(Object.freeze([])),true);assert.equal(len(values),2n);assert.equal(empty(values),false);assert.deepEqual(some,{$:'Some',field0:minimum});assert.equal(Object.isFrozen(some),true);assert.deepEqual(get(values,1n),{$:'Some',field0:maximum});assert.deepEqual(none,{$:'None'});assert.equal(Object.isFrozen(none),true);assert.deepEqual(get(values,18446744073709551615n),{$:'None'});for(const index of [-1n,18446744073709551616n,0,'0',true])assert.throws(()=>get(values,index),TypeError,name);}
 const many=Object.freeze(Array(5001).fill(false));assert.equal(core.router_slice_bool_len(many),5001n);assert.deepEqual(core.router_slice_bool_get(many,5000n),{$:'Some',field0:false});
});
test('invalid immutable domains and getter/proxy/sparse/mutable carriers refuse without callbacks',limits,()=>{
 let gets=0,traps=0;const accessor=[];Object.defineProperty(accessor,'0',{enumerable:true,configurable:true,get(){gets++;return false;}});Object.freeze(accessor);const proxy=new Proxy(Object.freeze([false]),{getOwnPropertyDescriptor(){traps++;throw new Error('must not inspect');}});
 for(const values of [[false],Object.freeze(Array(1)),accessor,proxy,Object.freeze([0n]),Object.freeze([undefined]),Object.freeze(Object.assign([false],{extra:true}))])for(const name of ['router_slice_bool_len','router_slice_bool_is_empty'])assert.throws(()=>core[name](values));assert.equal(gets,0);assert.equal(traps,0);
 assert.throws(()=>core.router_slice_u8_len(Object.freeze([256n])));assert.throws(()=>core.router_slice_i128_get(Object.freeze([-170141183460469231731687303715884105729n]),0n));
});
test('strict declarations retain Boolean payloads fixed-width aliases and exact option tags in receiving output',limits,async t=>{
 const directory=mkdtempSync(join(tmpdir(),'router-primitive-sequence-types-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));for(const name of ['primitive-sequence-runtime.mjs','primitive-sequence-runtime.d.mts','primitive-operator-runtime.mjs','primitive-operator-runtime.d.mts'])writeFileSync(join(directory,name),readFileSync(new URL('../extensions/'+name,import.meta.url),'utf8'));
 const source=`import {router_slice_bool_get as flag,router_slice_u128_get as wide,router_slice_i128_len as length} from './primitive-sequence-runtime.mjs';
const first=flag(Object.freeze([false]),0n);if(first.$!=='Some'){throw new Error('missing Boolean');}const bool:boolean=first.field0;if(bool!==false){throw new Error('wrong Boolean');}
const last=wide(Object.freeze([340282366920938463463374607431768211455n]),0n);if(last.$!=='Some'){throw new Error('missing integer');}const integer:bigint=last.field0;if(integer!==340282366920938463463374607431768211455n){throw new Error('wrong integer');}
if(length(Object.freeze([-170141183460469231731687303715884105728n]))!==1n){throw new Error('wrong length');}
`;
 writeFileSync(join(directory,'case.mts'),source);const compiler=join(root,'js/node_modules/typescript/bin/tsc');t.diagnostic(execFileSync(process.execPath,[compiler,'--version'],{encoding:'utf8',timeout:20000}).trim());execFileSync(process.execPath,[compiler,'--strict','--skipLibCheck','--target','ES2022','--module','NodeNext','--moduleResolution','NodeNext','--outDir',join(directory,'out'),join(directory,'case.mts')],{cwd:root,stdio:'pipe',timeout:20000});mkdirSync(join(directory,'out'),{recursive:true});for(const name of ['primitive-sequence-runtime.mjs','primitive-operator-runtime.mjs'])writeFileSync(join(directory,'out',name),readFileSync(join(directory,name),'utf8'));await import(pathToFileURL(join(directory,'out/case.mjs')).href);
});
test('rule sequences describe every domain in both fixed phases and retain unqualified caller/root obligations',limits,()=>{
 assert.equal(PRIMITIVE_SEQUENCE_CONTRACTS.length,33);assert.deepEqual(PRIMITIVE_SEQUENCE_RULE_SEQUENCES.map(row=>row.phase),['language','repository']);for(const sequence of PRIMITIVE_SEQUENCE_RULE_SEQUENCES)assert.equal(sequence.rules.length,33);for(const row of PRIMITIVE_SEQUENCE_CONTRACTS){assert.equal(row.receiverMode,'shared');assert.equal(row.returnedLoan,false);assert.equal(row.sourceAuthority,false);assert.equal(row.semanticAuthority,false);assert.equal(row.namespaceAuthority,false);}for(const row of PRIMITIVE_SEQUENCE_RULE_SEQUENCES[1].rules){assert.equal(row.nativeRootActivated,false);assert.equal(row.callerBindingQualified,false);}
});
test('six complete source equations retain whole seed programs current texts exact inverses and both phases',limits,()=>{
 const plan=preparePrimitiveSequenceCoreSources();assert.equal(plan.files.length,6);for(const row of plan.files){assert.equal(row.current,row.currentAfter);assert.equal(row.inverse,row.before);assert.deepEqual(row.stages.map(stage=>stage.phase),['language','repository']);}assert.equal(plan.receivingExecuted,false);
});
