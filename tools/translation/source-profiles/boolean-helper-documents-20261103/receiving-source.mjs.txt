// Install together with all Boolean helper readers/documents. SOURCE UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {ownedStateReceivingData} from './owned-state-receiving-data.mjs';
import {translateOwnedBooleanHelperSource20261103,translateOwnedBooleanHelperConcreteMeta20261103,readOwnedBooleanHelperMeta20261103} from '../owned-boolean-helper-profile-20261103.mjs';
import {parseLinks,textOf,encodeWord,writeLink} from '../vendor/lino.mjs';
const doc='/** @param {boolean} a @param {boolean} b @returns {boolean} */\n';
const timeout={timeout:60000};
function rewriteFirstRow(meta,edit){const links=parseLinks(meta),data=JSON.parse(textOf(links[0][1]));edit(data);return writeLink([links[0][0],encodeWord(JSON.stringify(data))])+'\n'+meta.slice(meta.indexOf('\n')+1);}
for(const variant of ['core','vector'])for(const typed of [false,true])test(variant+' independent helper document reconstruction '+(typed?'TS':'JS'),timeout,async()=>{
 const syntax=await import('../owned-'+(variant==='core'?'core':'vector-candidate')+'-source.mjs'),ext=typed?'mts':'mjs';
 const caller='import {chosen} from "./barrel.'+ext+'";\n'+(typed?'':doc)+'export function caller(a'+(typed?':boolean':'')+',b'+(typed?':boolean':'')+')'+(typed?':boolean':'')+'{return chosen(a,b);}';
 const helper=(typed?'':doc)+'export function predicate(a'+(typed?':boolean':'')+',b'+(typed?':boolean':'')+')'+(typed?':boolean':'')+'{return a && b;}';
 const sourceFiles=[{path:'caller.'+ext,source:caller},{path:'helper.'+ext,source:helper},{path:'barrel.'+ext,source:'export {predicate as chosen} from "./helper.'+ext+'";'}];
 const original=ownedStateReceivingData(sourceFiles),input={...original,files:original.files.filter(row=>!row.path.startsWith('runtime/')).concat(syntax.ownedCoreRuntimeSources()),...(variant==='vector'?{vectorBindings:[]}: {})};
 const options={variant,sourcePath:'caller.'+ext,input};
 const result=translateOwnedBooleanHelperSource20261103(caller,options);
 const decoded=readOwnedBooleanHelperMeta20261103(result.meta,variant);
 assert.ok(isDeepStrictEqual(decoded,result.program));assert.equal(decoded.length,1);
 assert.equal(decoded[0].booleanHelperCalls[0].declaration.source,helper);
 assert.deepEqual(decoded[0].booleanHelperCalls[0].links.map(row=>row.path),['barrel.'+ext,'helper.'+ext]);
 const cstPaths=parseLinks(result.meta).filter(row=>row[0]==='owned-source-cst').map(row=>JSON.parse(textOf(row[1])).path);
 assert.deepEqual(new Set(cstPaths),new Set(['caller.'+ext,'barrel.'+ext,'helper.'+ext]));
 const repeated=translateOwnedBooleanHelperConcreteMeta20261103(result.concreteSyntax.meta,options);
 assert.equal(repeated.meta,result.meta);assert.equal(repeated.rust,result.rust);assert.equal(repeated.typescript,result.typescript);
 const changed=rewriteFirstRow(result.meta,header=>{header.context.files.find(row=>row.path==='helper.'+ext).source=helper.replace('a && b','a || b');});
 assert.throws(()=>readOwnedBooleanHelperMeta20261103(changed,variant),TypeError);
 assert.throws(()=>readOwnedBooleanHelperMeta20261103(result.meta,variant==='core'?'vector':'core'),TypeError);
 const copy=structuredClone(decoded);copy[0].booleanHelperCalls[0].declaration.span[1]--;
 const document=await import('../owned-'+(variant==='core'?'core':'vector-candidate')+'-boolean-helper-document.mjs');
 assert.throws(()=>document.serializeOwnedBooleanHelperDocument(copy,{context:syntax.createOwnedCoreBooleanHelperSourceContext(input)}),TypeError);
 assert.equal(result.runtimeParity,false);assert.equal(result.rustExecuted,false);
});
