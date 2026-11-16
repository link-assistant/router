// Run only the "unsupported commands fail closed" loop of
// js/test/native-operation-fixtures.mjs and print each operation's diagnostics.
// Usage: node|bun experiments/merge-main-20261115/unsupported-operations.mjs
import {mkdtemp,realpath,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {NativeRouter,catalog} from '../../js/src/operations.mjs';import {fixtureOperations,partialNativeRefusals} from '../../js/test/native-operation-fixtures.mjs';
const directory=await realpath(await mkdtemp(join(tmpdir(),'router-unsupported-')));
const router=new NativeRouter({config:{token_secret:'native-operation-fixture-secret',storage_policy:'memory',data_dir:directory,providers:[],accounts:[{name:'fixture-account',provider:'fixture',policy:{weight:2}}]},env:{},oauth:{validateCatalog:async()=>['fixture-model']}});
try{for(const operation of catalog.operations.filter(operation=>!fixtureOperations.includes(operation.name))){
 const options=Object.fromEntries(operation.options.filter(option=>option.required&&!option.secret).map(option=>[option.name,'fixture']));
 const result=await router.execute(operation.name,options);const expected=partialNativeRefusals[operation.name];const ok=!result.success&&result.exit_code===1&&(expected?JSON.stringify(result.diagnostics)===JSON.stringify([expected]):result.diagnostics.some(d=>d.includes('not implemented')));
 console.log(ok?'ok  ':'BAD ',operation.name,ok?'':JSON.stringify({success:result.success,exit:result.exit_code,diagnostics:result.diagnostics}).slice(0,400));}}
finally{await router.close();await rm(directory,{recursive:true,force:true});}
