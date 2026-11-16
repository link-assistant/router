// Private invocation-local actual nominal map-result join. No project/parser
// root import or public owner/certificate registration operation.
import {types} from 'node:util';
import {checkedOptionNominal} from './extensions/option-nominal-proof.mjs';
import * as clones from './extensions/clone-source-body.mjs';
import {TranslationError,unsupported} from './vendor/meta-language/translation/diagnostics.js';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const fail=message=>{throw new TypeError('Edited nominal collection domain: '+message);};
function notify(frame,error){if(frame.sourceFailure)try{frame.sourceFailure(error);}catch{} }
let active=null;
export function withNominalEditedOperation(run,sourceFailure=null){
 if(sourceFailure!==null&&(typeof sourceFailure!=='function'||types.isProxy(sourceFailure)||types.isAsyncFunction(sourceFailure)))fail('ordinary source-failure observer required');if(active||typeof run!=='function'||types.isProxy(run)||types.isAsyncFunction(run))fail('one ordinary synchronous edited-source operation required');const frame={closers:[],poisonFailed:false,poison:undefined,sourceFailure};active=frame;
 return withCompleteSourceClosingFence(()=>{try{const result=run();if(frame.poisonFailed)throw frame.poison;return result;}catch(error){if(!(error instanceof TranslationError))notify(frame,error);throw error;}},[()=>{let failed=false,first;for(const close of frame.closers)try{close();}catch(error){if(!failed){failed=true;first=error;}}if(frame.poisonFailed)throw frame.poison;if(failed)throw first;},()=>{frame.closers.length=0;active=null;}]);
}
function owned(type){return type?.kind==='data'&&!type.rustReference&&!type.rustOwnership&&!type.patternOwnershipRefusal&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved;}
// Exact additive iterator map hook. It grants nothing outside the new frame;
// the complete predecessor scalar/anonymous-product map branch remains exact.
export function checkedNominalEditedMapResult(checker,input,result,span){
 if(!active)return false;if(!owned(input)||!owned(result)||input.name!==result.name)throw unsupported('nominal map move','requires the same actual owned unit Copy owner',span);
 const frame=active,check=()=>{try{
  const owner=clones.requireOriginalUnitCopyIteratorOwner(checker,result,span),copy=checkedOptionNominal(checker,result,span);
  checker.expectedOwnership(input,result,[],span);checker.expectedPrimitiveIdentity(input,result,[],span);
  if(owner.variants.length!==copy.proof.layout.ctors.length||copy.proof.layout.ctors.some((ctor,index)=>ctor.name!==owner.variants[index].name||ctor.fields.length))fail('actual complete unit Copy map layout differs');return true;
 }catch(error){if(!(error instanceof TranslationError)){notify(frame,error);if(!frame.poisonFailed){frame.poisonFailed=true;frame.poison=error;}}throw error;}};
 const resultChecked=check();if(frame.closers.length>=4096)fail('bounded complete original nominal map proof checks required');frame.closers.push(check);return resultChecked;
}
