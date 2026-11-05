import {tupleName,sourceQualifiers,tupleInferenceKind} from './tuples.mjs';
import {sameType} from '../checked-types.mjs';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
// A borrowed standard method keeps the issuer of every original AST node.
// Tuple/pattern helpers can query this private interval, never a public flag.
import {requireOriginalPrimitiveTryFromChecker} from './host-contracts.mjs';
import {metadataDigest} from './source-links.mjs';
import {parsedPinnedBodyEvidence,pinnedOptionPartialEqBody} from './standard-body-source.mjs';
import {freeNames,optionPayload} from './standard-body-checker.mjs';
import {originalStandardCallContext} from './original-standard-calls.mjs';
import {checkOriginalSourceFrame,hasOriginalCallbackLoan} from './standard-source-frame.mjs';
import {SHARED_REFERENCE_COPY_SOURCE,sharedReferenceCopyIdentity} from '../shared-reference-copy-source.mjs';
const active=new WeakMap(),contexts=new WeakMap();
const fail=message=>{throw new TypeError('Original standard borrowed method: '+message);};
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
function associate(original,mapped,origins,budget={cells:16000},depth=0){
 if(--budget.cells<0||depth>128)fail('complete source association bound');
 if(!original||typeof original!=='object')return;
 if(!mapped||typeof mapped!=='object'||Array.isArray(original)!==Array.isArray(mapped))fail('source association changed kind');
 const keys=Object.keys(original),actual=Object.keys(mapped);if(keys.length!==actual.length||keys.some((key,index)=>key!==actual[index]))fail('source association lost or added fields');
 if(origins.has(mapped)&&origins.get(mapped)!==original)fail('source association is alias-ambiguous');origins.set(mapped,original);for(const key of keys)associate(original[key],mapped[key],origins,budget,depth+1);
}
export function checkPinnedBorrowedMethod(checker,caller,original,operands,resultType,callerEnvironment){
 requireOriginalPrimitiveTryFromChecker(checker);
 const evidence=parsedPinnedBodyEvidence(original),selection=pinnedOptionPartialEqBody(),context=originalStandardCallContext(checker,caller),parameters=selection.method.parameters;
 if(evidence.selection!==selection||caller.k!=='binary'||caller.op!=='eq'||operands.length!==parameters.length||resultType?.kind!=='bool')fail('actual complete selected equality method required');
 const names=new Map(),bindings=[],types=[],reserved=new Set(callerEnvironment.keys());
 for(let index=0;index<parameters.length;index++){
  const operand=operands[index];if(!hasOriginalCallbackLoan(operand)||operand.originalLoanProof?.profile!=='original-standard-operator-shared-loan-v1'||operand.originalLoanProof.parameter!==index||!sharedReferenceCopyIdentity(operand.type)||operand.type.rustReference?.kind!=='shared')fail('genuine original signature loan required');
  if(optionPayload(checker,operand.type.rustReference.pointee,[],caller.span).owner!=='&str')fail('the selected specialization requires its actual borrowed-str payload');
  let name;do{name=checker.freshName('ml_standard_reference_');}while(checker.items.has(name)||reserved.has(name));reserved.add(name);names.set(parameters[index].name,name);bindings.push([name,operand.type]);types.push(operand.type);
 }
 const syntax=structuredClone(freeNames(original,names)),exact=new WeakMap();associate(original,syntax,exact);
 const entry=checker.items.get(operands[0].type.name),constructors=new Set(entry.ctors.map(ctor=>ctor.name));
 const qualify=value=>{if(!value||typeof value!=='object')return;const origin=exact.get(value),name=origin?.k==='ctor'&&origin.path?.length===1?origin.path[0]:origin?.k==='bindOrCtor'?origin.name:null;if(constructors.has(name))value.registeredGenericOwner=entry.standardGeneric.kind;for(const [key,child]of Object.entries(value))if(key!=='registeredGenericOwner')Array.isArray(child)?child.forEach(qualify):qualify(child);};qualify(syntax);
 const state={original,evidence,context,origins:exact,bindings:new Map(bindings),names,types,tuples:new Map()},previous=active.get(checker);active.set(checker,state);
 try{return {body:checkOriginalSourceFrame(checker,syntax,bindings,resultType,original),bindings:bindings.map(([name],index)=>({name,value:operands[index]}))};}
 finally{if(previous)active.set(checker,previous);else active.delete(checker);parsedPinnedBodyEvidence(original);}
}
export function originalStandardMatchOrigin(checker,node){const state=active.get(checker),origin=state?.origins.get(node);if(origin?.k!=='match')return null;return {digest:metadataDigest(node),evidence:freeze({caller:state.context.evidence,originalMethod:state.evidence}),owner:state.context.owner};}
export function originalStandardTupleContext(checker,node,args){
 const state=active.get(checker),origin=state?.origins.get(node);if(origin?.k!=='routerTuple')return null;
 if(origin.items.length!==args.length||args.length!==state.types.length)fail('complete original parameter tuple required');
 for(let index=0;index<args.length;index++){const written=origin.items[index];if(written.k!=='name'||written.path.length!==1||state.names.get(written.path[0])!==node.items[index]?.path?.[0]||metadataDigest(args[index].type)!==metadataDigest(state.types[index]))fail('tuple field differs from its genuine original shared parameter');}
 const token=Object.freeze({});contexts.set(token,{state,checker,types:args.map(arg=>arg.type),origin});return token;
}
export function originalStandardTupleIdentity(checker,token,args){const record=contexts.get(token);if(!record||active.get(checker)!==record.state||record.checker!==checker)return null;if(args.length!==record.types.length||args.some((arg,index)=>arg.type!==record.types[index]))fail('tuple identity lacks exact checked source fields');return metadataDigest({caller:record.state.context.evidence,originalTuple:record.origin,fieldTypes:record.types});}
export function originalStandardTupleField(checker,token,type,depth){const record=contexts.get(token);return !!(record&&active.get(checker)===record.state&&record.checker===checker&&depth===0&&record.types.includes(type)&&sharedReferenceCopyIdentity(type));}
export function recordOriginalStandardTuple(checker,token,entry,type){
 const record=contexts.get(token);if(!record||active.get(checker)!==record.state||record.checker!==checker||checker.items.get(entry.fullName)!==entry||entry.ctors?.length!==1||!entry.tuple||entry.generated!=='router-tuple-type')fail('actual inferred source tuple layout required');
 const fields=entry.ctors[0].fields;if(fields.length!==record.types.length||fields.some((field,index)=>metadataDigest(field.type)!==metadataDigest(record.types[index])))fail('inferred source tuple field identity differs');
 record.state.tuples.set(type.name,{entry,digest:metadataDigest(entry),type:structuredClone(type),proof:freeze({kind:'original-standard-method-shared-parameter-product',source:record.state.evidence,originalTuple:structuredClone(record.origin),sharedReferenceCopy:SHARED_REFERENCE_COPY_SOURCE,byValueProduct:true,pointeeMoveAuthority:false,pointeeDropAuthority:false})});
}
export function originalStandardTupleLayout(checker,type,entry){const record=active.get(checker)?.tuples.get(type?.name);if(!record)return null;if(record.entry!==entry||metadataDigest(entry)!==record.digest||metadataDigest(type)!==metadataDigest(record.type))fail('original shared tuple layout changed');return record.proof;}

// Only this higher checker layer can consult the existing private source frame.
// Bare TupleChecker never reads optional public proof hooks or their getters.
export function withOriginalStandardTupleChecker(Base){return class extends Base {
  inferredTupleField(type,location,depth,active,verified,budget,referenceContext){
    if(originalStandardTupleField(this,referenceContext,type,depth)){if(--budget.cells<0)throw unsupported('original shared tuple budget','exceeds the existing checked product bound',location);return;}
    return super.inferredTupleField(type,location,depth,active,verified,budget,referenceContext);
  }
  inferTuple(args,location,referenceContext,sourceNode){
    const context=originalStandardTupleContext(this,sourceNode,args);
    if(!context)return super.inferTuple(args,location,referenceContext);
    referenceContext=context;
    if(args.length<1||args.length>32)throw unsupported('inferred tuple arity','requires one to thirty-two actual checked fields',location);
    const active=new Set(),verified=new Set(),budget={cells:16000};
    for(const argument of args)this.inferredTupleField(argument.type,location,0,active,verified,budget,referenceContext);
    const fields=args.map((argument,index)=>({name:'field'+index,type:argument.type})),sourceIdentity=originalStandardTupleIdentity(this,referenceContext,args),name=tupleName(fields)+(sourceIdentity?'_source_'+sourceIdentity:'');
    if(Buffer.byteLength(name)>8192)throw unsupported('inferred tuple identity budget','the source-qualified product name exceeds the checked bound',location);
    let entry=this.items.get(name);
    if(entry) {
      const actual=entry.ctors?.[0]?.fields;
      if(!entry.tuple||entry.generated!=='router-tuple-type'||entry.ctors.length!==1||actual.length!==fields.length||actual.some((field,index)=>field.name!==fields[index].name||!sameType(field.type,fields[index].type)||JSON.stringify(sourceQualifiers(field.type))!==JSON.stringify(sourceQualifiers(fields[index].type))))throw typeError('inferred tuple has a conflicting actual source-qualified layout',location);
    }else {
      if(this.inferredTupleLayouts.size>=1024)throw unsupported('inferred tuple layout budget','a source program exceeds the checked product bound',location);
      this.declare([{k:'data',name,tuple:true,generated:'router-tuple-type',ctors:[{name:'Tuple',fields,ctorStyle:'tuple'}],span:location,tupleInference:{kind:tupleInferenceKind(referenceContext),sourceSpan:location,fieldTypes:fields.map(field=>structuredClone(field.type)),defaultedFields:false}}],[]);
      entry=this.items.get(name);this.inferredTupleLayouts.set(name,entry);
    }
    const result={entry,type:{kind:'data',name:entry.fullName,rustGeneratedTypeOwner:{name,generated:'router-tuple-type'},rustTupleLifetimeFields:fields.map(field=>structuredClone(field.type))}};
    recordOriginalStandardTuple(this,referenceContext,entry,result.type);return result;
  }
};}
