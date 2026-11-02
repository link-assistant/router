// Shared policy composition for original unit writers; never native authority.
import fs from 'node:fs';
import {resolve,relative,dirname,sep} from 'node:path';
import {types} from 'node:util';
import {captureExplicitSourceMutationPolicy} from './unit-runtime-materialization.mjs';
let active=null;
const fail=message=>{throw new TypeError('Protected original unit writer: '+message);};
function code(error){if(error===null||!['object','function'].includes(typeof error)||types.isProxy(error))return undefined;const field=Object.getOwnPropertyDescriptor(error,'code');return field&&Object.hasOwn(field,'value')?field.value:undefined;}
function secondary(primary,error){if(primary!==null&&['object','function'].includes(typeof primary)&&!types.isProxy(primary))try{Object.defineProperty(primary,'protectedUnitVariantClosingFailure',{value:error,enumerable:true});return;}catch{}try{process.stderr.write('{"schema":"protected-unit-variant-closing-20261102","closingFailed":true}\n');}catch{}}
export function withUnitVariantClosing(run,close){let result,failed=false,primary;try{result=run();}catch(error){failed=true;primary=error;}try{close();}catch(error){if(failed)secondary(primary,error);else{failed=true;primary=error;}}if(failed)throw primary;return result;}
export function retainUnitVariantRollbackFailures(primary,failures){
 if(primary!==null&&['object','function'].includes(typeof primary)&&!types.isProxy(primary))try{Object.defineProperty(primary,'rollbackFailures',{value:failures,enumerable:true,writable:true,configurable:true});return;}catch{}
 if(failures.length)try{process.stderr.write(JSON.stringify({schema:'protected-unit-variant-rollback-20261102',failures:failures.length})+'\n');}catch{}
}
export function unitVariantFailureText(error){if(error!==null&&['object','function'].includes(typeof error)&&!types.isProxy(error)){const field=Object.getOwnPropertyDescriptor(error,'message');if(field&&Object.hasOwn(field,'value')&&typeof field.value==='string')return field.value.slice(0,4096);}return 'opaque original rollback failure';}
export function protectedUnitVariantRetainedBytes(root){if(!active)return 0;const current=fs.realpathSync(resolve(root));let total=0;for(let frame=active;frame;frame=frame.parent)if(frame.root===current)total+=frame.policy.retainedBytes;return total;}
export function withProtectedUnitVariant(root,operation){
 if(active){const actual=fs.realpathSync(resolve(root));for(let frame=active;frame;frame=frame.parent)if(frame.root===actual)return frame.around(()=>operation(frame.scope));}
 const policy=captureExplicitSourceMutationPolicy(root),parent=active;let actual;try{actual=fs.realpathSync(resolve(root));}catch(primary){try{policy.close();}catch(error){secondary(primary,error);}throw primary;}const current={root:actual,policy,parent};active=current;
 let failed=false,primary,result;
 const around=run=>{let value,problem,broken=false;try{policy.verify();value=run();}catch(error){broken=true;problem=error;}try{policy.verify();}catch(error){if(broken)secondary(problem,error);else{broken=true;problem=error;}}if(broken)throw problem;return value;};
 const scope=Object.freeze({root:current.root,retainedBytes:policy.retainedBytes,verify:policy.verify,
  outputs(fresh){return policy.allow(fresh);},
  budget(fresh,limit){let bytes=0;const add=value=>{if(value!==null){if(typeof value!=='string')fail('original source budget requires full string/null bytes');bytes+=Buffer.byteLength(value);}if(bytes+protectedUnitVariantRetainedBytes(root)>limit)fail('complete source plus policy retention exceeds original byte budget');};for(const row of fresh.inputs)add(row.source);for(const row of fresh.outputs){add(row.before);add(row.after);}return bytes;},
  paths(names,run){policy.allowMutationPaths(names);return around(run);},
  direct(outputs,run){policy.allowDirectWrites({root,outputs});return around(run);},
  parents(path,run){
   const names=[],parts=relative(current.root,dirname(resolve(root,path))).split(sep);let full=current.root;
   for(const part of parts){if(!part)continue;full=resolve(full,part);try{fs.lstatSync(full);}catch(error){if(code(error)!=='ENOENT')throw error;names.push(relative(current.root,full).split(sep).join('/'));}}
   // Original root/path rules still establish containment. This policy only vetoes.
   policy.allowMutationPaths(names);return around(run);
  },
 });
 current.scope=scope;current.around=around;
 try{result=operation(scope);}catch(error){failed=true;primary=error;}
 try{policy.close();}catch(error){if(failed)secondary(primary,error);else{failed=true;primary=error;}}finally{active=parent;}
 if(failed)throw primary;return result;
}
