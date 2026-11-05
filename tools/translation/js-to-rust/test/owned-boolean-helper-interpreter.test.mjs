// Actual checked interpreter and independent Rust witness SOURCE; all UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {repositorySourceURL} from '../../test/fixtures/repository-paths.mjs';
import {translateOwnedBooleanHelperSource20261103,readOwnedBooleanHelperMeta20261103} from '../owned-boolean-helper-profile-20261103.mjs';
const root=new URL('../../../../',import.meta.url);
const oracle=readFileSync(repositorySourceURL('tests/translation_boolean_helper_oracle.rs',root),'utf8');
function witness(name){const matches=[...oracle.matchAll(new RegExp('const '+name+': &str = r###"([\\s\\S]*?)"###;','gu'))];assert.equal(matches.length,1);return matches[0][1];}
const caller=witness('CALLER_JS_WITNESS'),helper=witness('HELPER_JS_WITNESS');
for(const variant of ['core','vector'])test(variant+' checked interpreter uses original imported helper and survives independent meta read',{timeout:60000},async()=>{
 const prefix='owned-'+(variant==='core'?'core':'vector-candidate');
 const syntax=await import('../'+prefix+'-source.mjs'),operations=await import('../'+prefix+'-operations.mjs');
 const original=ownedStateReceivingData([{path:'caller.mjs',source:caller},{path:'helper.mjs',source:helper}]);
 const input={...original,files:original.files.filter(row=>!row.path.startsWith('runtime/')).concat(syntax.ownedCoreRuntimeSources()),...(variant==='vector'?{vectorBindings:[]}: {})};
 const result=translateOwnedBooleanHelperSource20261103(caller,{variant,sourcePath:'caller.mjs',input});
 const program=readOwnedBooleanHelperMeta20261103(result.meta,variant),token=await operations.prepareOwnedCoreRuntime(program);
 for(const [a,b,expected] of [[false,false,false],[false,true,true],[true,false,true],[true,true,false]])assert.equal(operations.evaluateOwnedCoreProgram(program,'caller',[a,b],token),expected);
 assert.throws(()=>operations.evaluateOwnedCoreProgram(structuredClone(program),'caller',[false,true],token),TypeError);
 const edited=structuredClone(program);edited[0].body[0].value={kind:'bool',value:true,type:'bool',root:null};
 assert.throws(()=>operations.checkOwnedCoreProgram(edited,syntax.createOwnedCoreBooleanHelperSourceContext(input)),TypeError);
 assert.match(result.rust,/fn caller/);assert.match(result.typescript,/function caller/);
});
