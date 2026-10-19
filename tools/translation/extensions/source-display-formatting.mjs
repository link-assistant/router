// Nominal Display depends on original project methods and the genuine Host
// parser. Keep it above the low primitive format/data layers so importing those
// layers cannot evaluate Host while TextRustParser is still initializing.
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {metadataDigest} from './source-links.mjs';
import {captureSourceDisplayScope,sourceNominalDisplayClosure,sourceNominalDisplayClosureFacts,verifySourceNominalDisplayMethod} from '../format-display-source.mjs';
import {originalMethodSemanticFacts} from '../source-method-admission.mjs';
const sourceDisplayMethods=new WeakMap();
export function withOriginalFormatDisplayParser(Base){return class extends Base{
  originalFormatDisplayScope(range,names){return captureSourceDisplayScope(this,range,names);}
};}
export function withOriginalFormatDisplayChecker(Base){return class extends Base{
  program(surface){sourceDisplayMethods.set(this,new WeakMap());return super.program(surface);}
  originalFormatDisplayMethod(item,entry){originalMethodSemanticFacts(item);sourceDisplayMethods.get(this)?.set(entry,item);}
  originalFormatDisplayValue(node,piece,value,env,path,bind,displayClosures){
    let closure;
    try{closure=sourceNominalDisplayClosure(node.sourceDisplayScope,['crate',...value.type.name.split('.')]);sourceNominalDisplayClosureFacts(closure);}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('source Display closure',error.message,node.span);}
    const method=this.resolvedMethod?.(value.type,closure.inherentMethod,'shared');
    if(!method||method.generated!=='router-checked-inherent-method'||!method.sourceMethodProof)throw unsupported('source Display inherent method','requires the checked original source method for this exact nominal owner',node.span);
    let sourceJoin;
    try{sourceJoin=verifySourceNominalDisplayMethod(closure,sourceDisplayMethods.get(this)?.get(method),method);}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('source Display inherent method origin',error.message,node.span);}
    const methodEnv=new Map(env);methodEnv.set(value.name,value.type);
    const checked=this.methodCall(method,{k:'name',path:[value.name],span:value.span},[],methodEnv,path,undefined,node.span);
    if(checked.type.kind!=='string'||checked.type.rustReference||checked.type.rustOwnership?.kind!=='borrowed'||checked.type.rustOwnership.source!=='str')throw unsupported('source Display string result','requires the original method checked as a borrowed str result',node.span);
    value=bind(checked);
    const namespaceJoin=closure.namespaceJoins,typeOrigin=proof=>({source:proof.source,module:proof.module,sourceViewDigest:proof.sourceViewDigest,written:proof.written,target:proof.target,originalContextDigest:proof.originalContextDigest,scopeDigest:proof.scopeDigest,originalStandardTypeDigest:proof.originalStandardType.digest,proofDigest:metadataDigest(proof)});
    displayClosures.push({nominal:closure.nominal,implementation:closure.implementation,originalMethod:closure.method,sourceJoin,typeNamespaceJoin:{trait:typeOrigin(namespaceJoin.trait),formatter:typeOrigin(namespaceJoin.signature.formatter),result:typeOrigin(namespaceJoin.signature.result),signatureSpan:namespaceJoin.signature.signatureSpan,originalSignature:namespaceJoin.signature.originalSignature,signatureDigest:metadataDigest(namespaceJoin.signature),coherenceExclusions:namespaceJoin.coherenceExclusions,namespaceAuthority:false},standardSourceDigest:metadataDigest(closure.standard),sourceProgramDigest:metadataDigest(closure.forwarder),inherentMethod:method.fullName,formatterControlTrace:closure.execution.formatterControlTrace,allocatorEffectsVerified:false,ioEffectsVerified:false,runtimeParity:false});
    return value;
  }
};}
