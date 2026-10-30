// Complete actual native literal checking; the original parent remains the
// private source/ownership/emission issuer. No temporary array loan escapes.
import {withOriginalOwnedTextVectorLiteralSourceOperation,requireCurrentOwnedTextVectorLiteralOriginalOperationSource} from './current-owned-text-vector-literal-source.mjs';
import {ownedTextVectorLiteralOperationShape} from './owned-text-vector-literal-call-shape.mjs';
import {forwardOwnedString} from './owned-forward-domain.mjs';
import {SOURCE_STRING,sourceVector} from './extensions/source-contract-types.mjs';
import {sameType} from './checked-types.mjs';
import {requireOriginalPrimitiveTryFromChecker} from './extensions/host-contracts.mjs';
import {unsupported,typeError} from './vendor/meta-language/translation/diagnostics.js';
export function checkForwardOwnedTextVectorLiteral(checker,node,env,path,expected,{current}){return withOriginalOwnedTextVectorLiteralSourceOperation(()=>{
 requireOriginalPrimitiveTryFromChecker(checker);current();const temporary=node.args?.[0],array=temporary?.value;
 const token=temporary?.sourceArrayBorrow?.tokens?.[0];if(node.operation!=='router_owned_text_vec_from_slice'||node.args.length!==1||temporary?.k!=='routerSharedArrayLiteral'||array?.k!=='array'||array.sourceRustOwnership||array.items.length>64||array.items.some(item=>item.spread)||token?.value!=='&'||token.span?.end-token.span?.start!==1)throw unsupported('owned String literal slice','requires its actual bounded written single shared temporary array',node.span);
 const row=requireCurrentOwnedTextVectorLiteralOriginalOperationSource('router_owned_text_vec_literal',array.items.length),args=[];
 for(const item of array.items){const value=checker.expr(item.value,env,path,SOURCE_STRING);current();if(!forwardOwnedString(value.type))throw unsupported('owned String literal element','requires its actual standard String by-value operand',item.value.span);checker.expectedOwnership(value.type,SOURCE_STRING,path,item.value.span);args.push(value);}
 const type={...sourceVector({...SOURCE_STRING,rustSourceType:true}),rustSourceType:true};if(expected){if(!sameType(type,expected))throw typeError('Actual owned String literal result differs',node.span);checker.expectedOwnership(type,expected,path,node.span);checker.expectedPrimitiveIdentity(type,expected,path,node.span);}
 requireOriginalPrimitiveTryFromChecker(checker);current();return {k:'routerHostCall',id:row.javascriptName,args,type,span:node.span,constEligible:false};
});}
export function emitForwardOwnedTextVectorLiteral(emitter,node){return withOriginalOwnedTextVectorLiteralSourceOperation(()=>{const row=ownedTextVectorLiteralOperationShape(node.id,node.args?.length);if(node.k!=='routerHostCall'||!row)throw new TypeError('Actual privately issued owned String literal call required');requireCurrentOwnedTextVectorLiteralOriginalOperationSource(row.javascriptName,node.args.length);(emitter.ownedTextVectorLiterals??=new Set()).add(row.javascriptName);return 'ml_host_'+row.javascriptName+'('+node.args.map(argument=>emitter.expr(argument)).join(', ')+')';});}
export function ownedTextVectorLiteralForwardImports(names,runtimeModule='./runtime/effects.mjs'){if(!names?.size)return [];if(names.size!==1||!names.has('router_owned_text_vec_literal'))throw new TypeError('Actual finite owned String literal import required');return ['import { router_owned_text_vec_literal as ml_host_router_owned_text_vec_literal } from '+JSON.stringify(runtimeModule.replace(/effects\.mjs$/u,'owned-text-vector-literal-runtime.mjs'))+';'];}
