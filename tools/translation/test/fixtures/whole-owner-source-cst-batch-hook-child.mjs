// Independent cold observation process: both source modules initialize before hooks.
import {Hash} from 'node:crypto';
import {prepareWholeOwnerDeriveCandidate as old} from '../../prepare-whole-owner-derive-candidate.mjs';
import {prepareWholeOwnerDeriveCandidate as next} from '../../cst-batched-whole-owner-derive-producer.mjs';
import {wholeOwnerSourceCstBatchReady} from '../../whole-owner-source-cst-batch-support.mjs';
const [which,hook]=process.argv.slice(2),get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,json=JSON.stringify,hashField=get(Hash.prototype,'update'),jsonField=get(JSON,'stringify'),tape=[];
if(!['old','next'].includes(which)||!['Hash','JSON'].includes(hook))throw TypeError('complete declared observation required');
let result=null,error=null,ready;
try{
 if(hook==='Hash')define(Hash.prototype,'update',{...hashField,value:function(...args){tape.push(args.map(value=>typeof value==='string'?{string:value}:Buffer.isBuffer(value)?{bytes:value.toString('base64')}:{type:typeof value,value}));return apply(hashField.value,this,args);}});
 else define(JSON,'stringify',{...jsonField,value:function(...args){tape.push(apply(json,JSON,[args]));return apply(json,this,args);}});
 ready=wholeOwnerSourceCstBatchReady();try{result=(which==='old'?old:next)();}catch(caught){error={name:caught.name,message:caught.message};}
}finally{define(Hash.prototype,'update',hashField);define(JSON,'stringify',jsonField);}
process.stdout.write(json({ready,result,error,tape}));
