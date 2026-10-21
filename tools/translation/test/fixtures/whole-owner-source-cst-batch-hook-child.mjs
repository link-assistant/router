// Independent cold observation process: both source modules initialize before hooks.
import {Hash} from 'node:crypto';
import {ownershipCompiler} from '../../js-to-rust/vendor/module-syntax.mjs';
import {prepareWholeOwnerDeriveCandidate as old} from '../../prepare-whole-owner-derive-candidate.mjs';
import {prepareWholeOwnerDeriveCandidate as next} from '../../cst-batched-whole-owner-derive-producer.mjs';
import {wholeOwnerSourceCstBatchReady} from '../../whole-owner-source-cst-batch-support.mjs';
const [which,hook]=process.argv.slice(2),get=Object.getOwnPropertyDescriptor,define=Object.defineProperty,apply=Reflect.apply,json=JSON.stringify,hashField=get(Hash.prototype,'update'),jsonField=get(JSON,'stringify'),tape=[];
if(!['old','next'].includes(which)||!['Hash','JSON','HashInputJSON','HashInputTS','TS'].includes(hook))throw TypeError('complete declared observation required');
// The stock shared compiler is initialized explicitly in BOTH observations.
// It is not moved outside only one receiving workload to manufacture equality.
const compiler=ownershipCompiler(),allocator=compiler.objectAllocator,tsField=get(allocator,'getSourceFileConstructor');
let result=null,error=null,ready,hashCount=0,installed=false,restored=false;
function argument(value){return typeof value==='string'?{string:value}:Buffer.isBuffer(value)?{bytes:value.toString('base64')}:{type:typeof value,value};}
function install(){if(installed)return;installed=true;tape.push({kind:hook,operation:'install'});
 if(hook==='HashInputJSON')define(JSON,'stringify',{...jsonField,value:function(...args){try{const value=apply(json,this,args);tape.push({kind:hook,arguments:apply(json,JSON,[args]),result:value});return value;}finally{define(JSON,'stringify',jsonField);restored=true;}}});
 else define(allocator,'getSourceFileConstructor',{...tsField,value:function(...args){try{tape.push({kind:hook,arguments:args.map(argument)});return apply(tsField.value,this,args);}finally{define(allocator,'getSourceFileConstructor',tsField);restored=true;}}});
}
try{
 if(hook==='TS')install();
 else if(hook==='Hash'||hook.startsWith('HashInput'))define(Hash.prototype,'update',{...hashField,value:function(...args){hashCount++;tape.push({kind:'Hash',arguments:args.map(argument)});if(hook.startsWith('HashInput'))install();return apply(hashField.value,this,args);}});
 else define(JSON,'stringify',{...jsonField,value:function(...args){tape.push(apply(json,JSON,[args]));return apply(json,this,args);}});
 ready=wholeOwnerSourceCstBatchReady();try{result=(which==='old'?old:next)();}catch(caught){error={name:caught.name,message:caught.message};}
}finally{define(Hash.prototype,'update',hashField);define(JSON,'stringify',jsonField);define(allocator,'getSourceFileConstructor',tsField);if(installed&&!restored){tape.push({kind:hook,operation:'restore-finally'});restored=true;}}
process.stdout.write(json({ready,result,error,tape,hashCount,restored}));
