// One synchronous source transaction only. These shared complete native inputs
// are descriptive source DATA; no owner, body, semantic or result is cached.
import {types} from 'node:util';
import {originalActiveTextualConfigurationSourcePlan as freshActive,originalTextualConfigurationSourcePlan as freshConfigured} from './derive-ancestor-attribute-scope.mjs';
import {originalFreshConditionalAttributeSourceInputs as freshInputs} from './conditional-attributes.mjs';
import {originalLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';
import {originalDeriveHelperCryptoUnchanged} from './derive-footprints.mjs';
import {originalPrivateParserIngressUnchanged,originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged,throwOriginalCapturedTypeError} from './original-json-intrinsics.mjs';
const fail=message=>throwOriginalCapturedTypeError('Original conditional source operation: '+message);
const original=()=>originalLexingIntrinsicsUnchanged()&&originalDeriveHelperCryptoUnchanged()&&originalPrivateParserIngressUnchanged()&&originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
// Guard lazily: imported native guards already capture their original host
// operations, and no cyclic module initialization may call an unfinished peer.
function guard(){if(!original())fail('original source operations changed');}
let current=null,depth=0;
function source(kind,fresh){
 guard();if(!current)return fresh();if(++current.cells>200000)fail('complete conditional source-selection cell bound');if(current[kind]!==null)return current[kind];const value=fresh();guard();if(!Number.isSafeInteger(value.retainedSourceBytes)||value.retainedSourceBytes<0)fail('complete native source byte accounting required');current.retainedSourceBytes+=value.retainedSourceBytes;if(current.retainedSourceBytes>8388608)fail('complete selected conditional native source bound');current[kind]=value;return value;
}
export function originalActiveTextualConfigurationSourcePlan(){return source('active',freshActive);}
export function originalTextualConfigurationSourcePlan(){return source('configured',freshConfigured);}
export function originalFreshConditionalAttributeSourceInputs(){return source('inputs',freshInputs);}
export function withOriginalConditionalSourceOperation(operation){
 guard();if(typeof operation!=='function'||types.isProxy(operation)||types.isAsyncFunction(operation))fail('one ordinary synchronous source operation required');if(depth>=64)fail('conditional source-operation nesting bound');const prior=current,state={active:null,configured:null,inputs:null,cells:0,retainedSourceBytes:0};current=state;depth++;
 try{
  const result=operation();guard();if(types.isPromise(result)||result!==null&&['object','function'].includes(typeof result)&&types.isProxy(result))fail('source operation must finish synchronously with an ordinary result');if(result!==null&&['object','function'].includes(typeof result)){const then=Object.getOwnPropertyDescriptor(result,'then');if(then&&(!Object.hasOwn(then,'value')||typeof then.value==='function'))fail('source operation cannot return an own thenable/accessor');}return result;
 }finally{
  // Freshly reissue every actually selected complete input family, including
  // on callback errors. Clear and restore the private frame even if one fails.
  try{try{if(state.active!==null)freshActive();}finally{try{if(state.configured!==null)freshConfigured();}finally{try{if(state.inputs!==null)freshInputs();}finally{guard();}}}}
  finally{state.active=null;state.configured=null;state.inputs=null;current=prior;depth--;}
 }
}
