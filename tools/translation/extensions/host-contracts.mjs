import {parseCharacterType,checkedCharacterType,assertCharacterBoundary,checkCharacterExpression,emitCharacterExpression,needsCharacterValueGuard} from './character-scalars.mjs';
import {parseRouterCoreRangeCall,checkRouterCoreRangeCall,captureRouterCoreRangeCalls,ROUTER_CORE_RANGE_CONTRACT} from '../router-core-ranges.mjs';
import {parseRouterCoreStrReference} from '../router-core-primitives.mjs';
import {parseRouterCoreFormatting,parseRouterCoreText} from '../router-core-formatting.mjs';
import {withOriginalFormatDisplayParser,withOriginalFormatDisplayChecker} from './source-display-formatting.mjs';
import {checkOriginalMappedBody,checkOriginalMappedApplication,prepareOriginalMappedBodies,requireOriginalMappedEmission,finalizeOriginalMappedBodies} from './standard-mapped-body.mjs';
import {createOriginalSharedPatternAdapter} from './shared-source-patterns.mjs';
import {withOriginalStandardTupleChecker} from './standard-method-context.mjs';
import {captureOriginalMoveTuples} from './standard-move-payload.mjs';
import {captureConstMatchSources} from './const-match-source-context.mjs';
import {prepareOriginalSourceFrames,requireOriginalSourceFrameEmission,assertOriginalSourceFrameEnvelope,originalSourceFramePatternRead} from './standard-source-frame.mjs';
import {checkPinnedOptionCallbackBody,checkOriginalCallbackApplication,requirePinnedOptionCallbackBody,prepareOriginalOptionCallbacks,requireOriginalOptionCallbackEmission} from './standard-option-callback-body.mjs';
import {captureOriginalStandardCalls,hasOriginalStandardCall} from './original-standard-calls.mjs';
import {contextualIntegerParseReceiver,contextualIntegerParseTarget} from './contextual-integer-parse.mjs';
import {checkPinnedSharedBody,checkedSharedMatchPlace,requirePinnedSharedBody,originalStandardRefField,prepareOriginalSharedBodies,requireOriginalSharedEmission} from './standard-borrowed-body.mjs';
import {STANDARD_OPTION_COPY_SOURCE,SHARED_REFERENCE_COPY_SOURCE,sharedReferenceCopyIdentity,originalPrimitiveCopySource} from '../shared-reference-copy-source.mjs';
import {pinnedPrimitiveIdentityFrom,parsePrimitiveIdentityFromBody,requirePrimitiveIdentityFromBody,requirePrimitiveIdentityFromEvidence} from './primitive-identity-from-source.mjs';
import {pinnedPrimitiveFrom,parsePrimitiveFromBody,requirePrimitiveFromBody,hasSourceFixedFrom} from './primitive-from-source.mjs';
import {parsePrimitiveComparison,checkedPrimitiveCast,checkedPrimitiveShift,requirePrimitiveOperator} from './primitive-operators.mjs';
import {sourcePrimitiveAlias} from './primitive-type-aliases.mjs';
import {capturePrimitiveBoolFromScope,requirePrimitiveBoolFromScope,pinnedPrimitiveBoolFrom,parsePrimitiveBoolFromBody,requirePrimitiveBoolFromBody} from './primitive-bool-from-source.mjs';
import {captureSourceConversionScope} from './source-conversion-scope.mjs';
import {captureOriginalConversions,checkOriginalSourceInto,requireOriginalConversionEmission,prepareOriginalConversionFunction,finalizeOriginalConversions,hasOriginalConversionIssuance} from './source-conversion-body.mjs';
import {capturePrimitiveTryFromScope} from './primitive-try-from-scope.mjs';
import {captureOriginalPrimitiveTryFrom,originalPrimitiveTryFromSelfType,checkOriginalPrimitiveTryFrom,checkOriginalPrimitiveConstant,finalizeOriginalPrimitiveTryFrom,prepareOriginalPrimitiveTryFrom,requireOriginalPrimitiveTryFromBody} from './primitive-try-from-body.mjs';
import {captureOriginalCloneBodies,checkOriginalCloneBody,checkOriginalCloneFieldBorrow,prepareOriginalCloneEmission,requireOriginalCloneEmission,requireOriginalCloneFieldEmission,originalCloneReceiverParameter} from './clone-source-body.mjs';
import {iteratorReceiverExpected} from './iterators.mjs';
import {itemConfiguration} from '../cfg-profile.mjs';
import {createHash} from 'node:crypto';
import {types as nodeTypes} from 'node:util';
// Crate contracts select operations by resolved paths and checked value types.
// They never supply a repository function body or waive a body obligation.
import {MethodRustParser,MethodChecker} from './methods.mjs';
import {withNestedMatchPatternsParser,withNestedMatchPatternsChecker} from './match-patterns.mjs';
import {parseStandardMatches,emitOrderedMatch,checkOrderedMatch} from './ordered-matches.mjs';
import {withSourceOwnershipParser,withSourceOwnershipChecker} from './ownership.mjs';
import {withSourceLifetimeChecker} from './source-lifetimes.mjs';
import {normalizeGeneratedTypeOwner} from './generated-type-owners.mjs';
import {withNamedLifetimeParser} from './named-lifetimes.mjs';
import {withSharedArrayBorrowChecker} from './array-borrows.mjs';
import {withFixedArrayParser,withFixedArrayChecker,fixedArrayCopyCells} from './fixed-arrays.mjs';
import {EffectEmitter,effectData} from './effects.mjs';
import {JSON_DATA,JSON_CONTRACTS,JSON_TYPES} from './json-contracts.mjs';
import {INTEGER_DATA,INTEGER_ERROR_CONTRACTS} from './integer-contracts.mjs';
import {planStandardMethod,completeStandardMethod,mappedStandardFamily} from './standard-method-plans.mjs';
import {rustFixedType} from '../checked-types.mjs';
import {checkOriginalOptionEquality} from './option-equality.mjs';
import {decodeRustFloat,RUST_FLOAT_LITERAL_PROFILE} from './rust-float.mjs';
import {FLOAT_CONTRACTS,SOURCE_F64,primitiveFloatContract,primitiveFloatConstant,requirePrimitiveFloat,qualifyPrimitiveFloatResult,checkedPrimitiveFloatConstant} from './primitive-float-contracts.mjs';
import {sharedF64Pointee,originalSharedF64CopySource} from './shared-f64-copy-source.mjs';
import {floatSignObligation,withFloatZeroSignChecker} from './float-zero-refinements.mjs';
import {checkedUtf16Iterator,checkedFixedF64Cast,prepareTemporaryStringCall,consumeTemporaryStringCallBorrow,prepareOriginalStringPatternBorrow} from './utf16-fixed-f64.mjs';
import {checkStringIteratorOperation,requireBorrowedString} from './string-iterators.mjs';
import {checkedStringBytes,requireStringBytesProof} from './string-bytes.mjs';
import {sourceByteLiteral,requireByteLiteral} from './rust-byte-character.mjs';
import {captureStaticArrays,finalizeStaticArrays,checkStaticArrayElement,requireStaticArrayElement} from './static-array-element.mjs';
import {checkUnitEnumCast,requireUnitEnumCast} from './unit-enum-cast.mjs';
import {captureOptionNominals,bindCheckedNominalNoDrop,checkedOptionNominal}  from './option-nominal-proof.mjs';
import {checkPinnedOptionBody,requirePinnedStandardBody,checkPinnedCallbackApplication,contextualOptionMapResultReceiver,contextualOptionMapExpected,contextualOptionMapConstructor,preparePinnedStandardFunction,requirePinnedStandardEmission} from './standard-body-checker.mjs';
import {CSV_STRING_PROFILE,checkCharacterSplit,checkCharacterSplitNext,allocatingStringFunctionItem,checkedAllocatingStringItem,requireCsvEmitterProof} from './csv-strings.mjs';
import {canonicalResult,checkResultMapError,requireResultIteratorProof} from './result-iterators.mjs';
import {checkedOptionAsDeref,requireOptionDerefProof} from './option-deref.mjs';
import {checkedReverseSplitFind,requireReverseStringProof} from './reverse-string-iterators.mjs';
import {TIME_DATA,TIME_CONTRACTS} from './time-contracts.mjs';
import {EFFECT_CONTRACTS} from './effects-contracts.mjs';
import {emitWith} from './core.mjs';
import {tokenizeRust} from './lexical.mjs';
import {sameType,fixedBounds,fixedArrayLength} from '../checked-types.mjs';
import {coerce} from '../checked-coercions.mjs';
import {TranslationError,typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {valueSchema} from '../type-layout.mjs';
import {BOOL,FLOAT} from '../checked-types.mjs';
import {HostInstantiations} from './host-instantiations.mjs';
import {macroProvenance} from '../macro-provenance.mjs';
import {configureParserSourceScope} from '../source-scopes.mjs';
import {withSourceNamespaceParser} from './source-namespaces.mjs';
import {withCapturedSourceParser,linkParsedFile,withCheckedSourceLinks,checkedSourceContext,bindCheckedSourceLinks} from './source-links.mjs';
import {evaluateCheckedConstant,CONSTANT_EVALUATION_PROFILE} from './constant-evaluation.mjs';
import {DEFAULT_JSON_PARSER_PROFILE,configureJsonCapabilities,assertJsonParserCapability} from '../json-capabilities.mjs';
import {withDeclarationRefusalCollection,checkCollectedDeclarationTypes,checkConstEligibilityRefusals} from './declaration-refusals.mjs';
import {withJsonMacroParser,withJsonMacroChecker,withJsonMacroEmitter} from './json-macros.mjs';
import {configureJsonMacroParser} from '../json-macro-context.mjs';
import {parseOriginalMatchesCandidate} from '../matches-source-bridge.mjs';
import {standaloneMatchesMacroContext,configureMatchesMacroParser,configureMatchesParserFromSourceScope,originalMatchesImport} from '../matches-macro-context.mjs';
import {captureOriginalCargoEdition} from '../cargo-edition-context.mjs';
import {originalMethodSnapshot,assertOriginalParserIdentity} from '../original-parser-identity.mjs';
import {TokenCursor} from '../vendor/meta-language/translation/lexer.js';
import {validateOriginalMethodAssociations,withCheckedMethodCopyReceivers} from '../source-method-admission.mjs';
import {withSharedNullaryEnumChecker} from '../shared-nullary-enum.mjs';
import {parseRouterCoreAlgebraicType,parseRouterCoreAlgebraicExpression,parseRouterCoreAlgebraicPattern,routerCoreAlgebraicControlPatternOwner} from '../router-core-algebraic.mjs';
import {parseRouterCoreScalarCall,checkRouterCoreScalarCall,captureRouterCoreScalarCalls,ROUTER_CORE_SCALAR_CONTRACT} from '../router-core-scalars.mjs';
import {parseRouterCoreJson,captureRouterCoreJsonCalls,checkRouterCoreJson} from '../router-core-json.mjs';
import {checkOriginalOwnedJsonLetElse,parseRouterCoreJsonUpdate,captureRouterCoreJsonUpdates,checkRouterCoreJsonUpdate,visitOriginalJsonCollectionTextMatch,observeOriginalJsonErrorFormat,finalizeOriginalJsonErrorFlow,visitRouterCoreJsonUpdateFunction,checkRouterCoreJsonMutableLet,prepareOriginalJsonProjectionEmission,requireOriginalJsonProjectionEmission,ROUTER_CORE_JSON_UPDATE_CONTRACTS} from '../router-core-json-updates.mjs';
import {originalDataFreezeIntrinsicsUnchanged} from '../original-json-intrinsics.mjs'; import {ROUTER_CORE_BASE64_CONTRACTS,ROUTER_CORE_BASE64_DATA,parseRouterCoreBase64Type,parseRouterCoreBase64Call,captureRouterCoreBase64Calls,checkRouterCoreBase64Call,visitRouterCoreBase64Function,prepareRouterCoreBase64Emission,requireRouterCoreBase64Emission,originalBase64ErrorDisplay,finalizeRouterCoreBase64Program} from '../router-core-base64.mjs';
export const HOST_CONTRACTS=[...ROUTER_CORE_BASE64_CONTRACTS,...ROUTER_CORE_JSON_UPDATE_CONTRACTS,ROUTER_CORE_SCALAR_CONTRACT,ROUTER_CORE_RANGE_CONTRACT,...FLOAT_CONTRACTS,...JSON_CONTRACTS.map(contract=>({...contract,family:'json',pure:true,constEligible:false})),...TIME_CONTRACTS.map(contract=>({...contract,family:'time'})),...INTEGER_ERROR_CONTRACTS.map(contract=>({...contract,family:'integer',assumptions:['Registered standard ParseIntError layout and source-derived diagnostic behavior.']}))];
const pathKey=path=>path.filter((part,index)=>index!==0||part!=='crate').join('::'); const jsonCheckerOriginQualified=originalDataFreezeIntrinsicsUnchanged(),jsonCheckerOrigins=jsonCheckerOriginQualified?new WeakSet():null,jsonCheckerHas=jsonCheckerOriginQualified?WeakSet.prototype.has:null,jsonCheckerAdd=jsonCheckerOriginQualified?WeakSet.prototype.add:null,jsonCheckerApply=jsonCheckerOriginQualified?Reflect.apply:null;
const span=(start,end)=>({start:start.start,end:end.end});
const runtimeValueType=type=>type.kind==='fixed'?{kind:'fixed',bits:type.bits,signed:type.signed}:type.kind==='array'?{kind:'array',element:runtimeValueType(type.element),...(type.rustFixedArray?{rustFixedArray:{length:type.rustFixedArray.length}}:{})}:type.kind==='named'?{kind:'data',name:(type.path[0]==='crate'?type.path.slice(1):type.path).join('.')}:type.kind==='data'?{kind:'data',name:type.name}:{kind:type.kind};
const nonlocalDefault=node=>node&&typeof node==='object'&&(['routerReturn','routerBreak','routerContinue','routerTry','routerAwait'].includes(node.k)||Object.entries(node).some(([key,value])=>key!=='type'&&(Array.isArray(value)?value.some(nonlocalDefault):nonlocalDefault(value))));
const INHERENT_FIXED_COPY=new Set(['checked_add','checked_sub','checked_mul','wrapping_add','wrapping_sub','saturating_add','saturating_sub','saturating_mul']);
// Built-in shared primitive reads copy an immutable BigInt value. Trait Deref,
// raw pointers, aggregate copies and reference creation need separate proofs.
export function sharedFixedPointee(type,range) {
  const reference=type?.rustReference,pointee=reference?.pointee;
  let leaf=type,depth=0;
  while(leaf?.rustReference){const next=leaf.rustReference.pointee;if(++depth>32||leaf.rustReference.kind!=='shared'||leaf.kind!=='fixed'||leaf.rustGenericIdentityUnresolved||!next||next.kind!=='fixed'||leaf.bits!==next.bits||leaf.signed!==next.signed||leaf.rustPrimitiveName!==next.rustPrimitiveName)throw unsupported('shared primitive dereference','requires a bounded checked shared fixed-integer reference chain',range);leaf=next;}
  const primitive=rustFixedType(leaf?.rustPrimitiveName);
  if(reference?.kind!=='shared'||!pointee||leaf?.kind!=='fixed'||!primitive||primitive.bits!==leaf.bits||primitive.signed!==leaf.signed||leaf.patternOwnershipRefusal||leaf.rustGenericIdentityUnresolved)throw unsupported('shared primitive dereference','requires an actual checked shared reference to a by-value standard fixed integer',range);
  return pointee;
}
export function sharedBooleanPointee(type,range) {
  const reference=type?.rustReference,pointee=reference?.pointee;
  let leaf=type,depth=0;
  while(leaf?.rustReference) {
    const next=leaf.rustReference.pointee;
    if(++depth>32||leaf.rustReference.kind!=='shared'||leaf.kind!=='bool'||leaf.rustOwnership||leaf.rustGenericIdentityUnresolved||leaf.rustBorrowingUnresolved||leaf.patternOwnershipRefusal!=='shared source reference'||!next||next.kind!=='bool')throw unsupported('shared boolean dereference','requires a bounded actual checked shared boolean reference chain',range);
    leaf=next;
  }
  if(reference?.kind!=='shared'||!pointee||leaf?.kind!=='bool'||leaf.rustOwnership||leaf.patternOwnershipRefusal||leaf.rustGenericIdentityUnresolved||leaf.rustBorrowingUnresolved)throw unsupported('shared boolean dereference','requires an actual checked shared reference to a by-value standard bool',range);
  return pointee;
}
export const INTEGER_FROM_PROFILE=Object.freeze({rust:'1.89.0',source:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/convert/num.rs',sha256:'270e0801e5e23cba89fec51eed416be60743034a6f02c5fe64be2e8f2e8ca958',lines:[99,141],identity:{source:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/convert/mod.rs',sha256:'0b05be0bc9c7d92d788abd6817d648b4479ed6e29ffe24cfd6879e09ee9fbdab',line:774}});
// Stage1 leaves these five pointer conversions and reflexive primitives at
// their existing legacy admission; no new pointer/domain/blanket proof is given.
const legacyPointerFromSources=Object.freeze({usize:['u8','u16'],isize:['i8','i16','u8']});
export const hasIntegerFrom=(source,target)=>/^[iu](8|16|32|64|128)$/u.test(source)&&/^[iu](8|16|32|64|128)$/u.test(target)&&source!==target?hasSourceFixedFrom(source,target):source===target&&!!rustFixedType(target)||Object.hasOwn(legacyPointerFromSources,target)&&legacyPointerFromSources[target].includes(source);
// Portable widths are runtime domains, not proofs of Rust source type identity.
// Missing metadata stays missing; contextual literal typing owns inference.
export function assertRustPrimitiveIdentity(actual,expected,range,{declarations,resolveType=type=>type}={},active=new Set()) {
  if(!actual||!expected)return;
  if(actual.kind==='fixed'&&expected.kind==='fixed') {
    if(actual.rustPrimitiveName&&expected.rustPrimitiveName&&actual.rustPrimitiveName!==expected.rustPrimitiveName)throw typeError('distinct Rust primitive integer identities require an explicit checked cast',range);
    if((actual.patternOwnershipRefusal??null)!==(expected.patternOwnershipRefusal??null))throw typeError('Rust integer reference ownership differs from the expected value type',range);
    if(actual.rustReference||expected.rustReference){
      if(actual.rustReference?.kind!=='shared'||expected.rustReference?.kind!=='shared'||!actual.rustReference.pointee||!expected.rustReference.pointee)throw typeError('Rust integer references require the same actual checked pointee identity',range);
      assertRustPrimitiveIdentity(actual.rustReference.pointee,expected.rustReference.pointee,range,{declarations,resolveType},active);
    }
  }
  if(actual.kind==='array'&&expected.kind==='array')assertRustPrimitiveIdentity(actual.element,expected.element,range,{declarations,resolveType},active);
  if(actual.kind==='data'&&expected.kind==='data') {
    const key=actual.name+'|'+expected.name;if(active.has(key))return;active.add(key);
    const provenance=type=>{const entry=declarations?.get(type.name);return type.rustStandardGeneric??(entry?.standardGeneric?{...entry.standardGeneric,arguments:entry.standardGeneric.arguments.map(argument=>resolveType(argument,entry.modulePath,range))}:null);};
    const left=provenance(actual),right=provenance(expected);
    if(left&&right&&left.kind===right.kind&&left.arguments.length===right.arguments.length)for(let index=0;index<left.arguments.length;index++)assertRustPrimitiveIdentity(left.arguments[index],right.arguments[index],range,{declarations,resolveType},active);
    active.delete(key);
  }
}
export function hostData() {
  const result=[];
  const merge=(target,items,path=[])=>{for(const item of items){
    const existing=target.find(entry=>entry.name===item.name && entry.k===item.k);
    if(item.k==='module') {
      const module=existing??{...item,items:[]};if(!existing)target.push(module);
      merge(module.items,item.items,[...path,item.name]);
    } else if(!existing)target.push({...item,hostTypePath:[...path,item.name],generated:item.generated??'router-host-contract'});
  }};
  merge(result,effectData());merge(result,ROUTER_CORE_BASE64_DATA);merge(result,JSON_DATA);merge(result,TIME_DATA);merge(result,INTEGER_DATA);return result;
}
const builtins=()=>new Set([...HOST_CONTRACTS,...EFFECT_CONTRACTS].flatMap(contract=>contract.rustPath.map((_,index)=>pathKey(contract.rustPath.slice(0,index+1)))).concat(Object.values(JSON_TYPES).map(type=>pathKey(type.path)),['serde_json::json','std::str::FromStr','std::option::Option','std::result::Result']));
export class HostRustParser extends withOriginalFormatDisplayParser(withJsonMacroParser(withNamedLifetimeParser(withCapturedSourceParser(withSourceNamespaceParser(withNestedMatchPatternsParser(withSourceOwnershipParser(withFixedArrayParser(MethodRustParser)))))))) {
  comparison(path,options){return parsePrimitiveComparison(this,path,options);}
  tupleType(fields,location) {return {...super.tupleType(fields,location),rustTupleLifetimeFields:fields.map(field=>structuredClone(field.type))};}
  genericType(kind,types,range){
    const type=super.genericType(kind,types,range);
    // The monomorphic declaration shares a runtime layout, not the lifetimes
    // or source spans written at a later use of that same layout.
    return {...type,rustStandardGeneric:{kind,arguments:this.inSourceNamespace('type',()=>types.map(argument=>structuredClone(normalizeGeneratedTypeOwner(this,argument,this.modulePath,range))))}};
  }
  attributes(options={}) {
    if(!this.compilationProfile)return super.attributes(options);
    const c=this.cursor,result=[];
    while(c.is('#')&&c.is('[',1)){
      const start=c.index;let end=start+2,depth=1;
      for(;end<c.tokens.length;end++){if(c.tokens[end].value==='[')depth++;if(c.tokens[end].value===']')depth--;if(!depth)break;}
      if(depth)throw unsupported('configuration attribute','requires a balanced original token group',c.peek());
      const tokens=c.tokens.slice(start,end+1),condition=itemConfiguration(tokens,this.compilationProfile),name=tokens[2].value;
      if(['cfg','cfg_attr'].includes(name)){
        if(condition.status!=='active')throw unsupported('configuration attribute','requires an active checked compilation condition at this exact syntax position',c.peek());
        c.index=end+1;result.push({kind:'cfg',name,tokens:condition.attributes[0].tokens,span:condition.attributes[0].span,compilationProfile:this.compilationProfile,condition});continue;
      }
      const eof={kind:'eof',value:'',start:tokens.at(-1).end,end:tokens.at(-1).end};
      this.cursor=new c.constructor([...tokens,eof],c.language);
      try{result.push(...super.attributes(options));if(!this.cursor.atEnd())throw unsupported('attribute','requires complete original attribute parsing',c.peek());}finally{this.cursor=c;}
      c.index=end+1;
    }
    return result;
  }
  resolve(segments,path) {
    const resolved=super.resolve(segments,path);
    if(this.shadowedImportedBindings?.has(segments[0]) && resolved.length===segments.length && resolved.every((part,index)=>part===segments[index]))return ['crate','ml_unresolved_source_import',...segments];
    return resolved;
  }
  registeredPatternOwner(written,resolved,path,location) {return routerCoreAlgebraicControlPatternOwner(this,written,resolved,path,location)??super.registeredPatternOwner(written,resolved,path,location);}
  registeredGenericKind(segments,path=this.modulePath,sourceName=segments[0]) {
    const target=this.resolveSourceNamespace(segments,path,'type'),kind=target.join('::')==='std::option::Option'?'Option':target.join('::')==='std::result::Result'?'Result':null;
    if(!kind)return null;
    // Explicit aliases are resolved external identities, even when another
    // unknown glob exists. A raw std prefix needs an unshadowed crate scope.
    const alias=this.hasResolvedSourceAlias(sourceName,target,path);
    if(!alias&&(this.unresolvedImportScope||this.shadowedEffectRoots?.has('std')||this.shadowedPreludeTypes?.has('std')))return null;
    return kind;
  }
  builtinShadow(name,path=this.modulePath) {
    if(this.authorizedGenericKind===name||['Option','Result'].includes(name)&&this.registeredGenericKind([name],path)===name)return false;
    return super.builtinShadow(name,path);
  }
  expressionMacro(token,path) {
    if(token.value==='matches') {
      if((this.unresolvedBangMacroScope??this.unresolvedMacroScope)||this.unresolvedImportScope||this.shadowedBuiltinMacros?.has(token.value))throw unsupported('matches! owner','requires an actual unshadowed standard bang macro in this source scope',token);
      return parseStandardMatches(this,token,path);
    }
    if(this.unresolvedMacroScope || this.unresolvedImportScope || this.shadowedBuiltinMacros?.has(token.value))throw unsupported(`macro ${token.value}!`,'requires actual source macro expansion and binding resolution',token);
    const value=super.expressionMacro(token,path);return ['format','vec'].includes(token.value)?{k:'routerConstObligation',value,constEligible:false,sourceFeature:token.value+'!',span:value.span}:value;
  }
  pattern(path,aliases) {
    const algebraic=parseRouterCoreAlgebraicPattern(this,path,aliases);if(algebraic)return algebraic;
    const first=this.cursor.peek();if(first.kind!=='identifier')return super.pattern(path,aliases);
    const segments=[first.value];let offset=1;while(this.cursor.is('::',offset)&&this.cursor.peek(offset+1).kind==='identifier'){segments.push(this.cursor.peek(offset+1).value);offset+=2;}
    const resolved=this.resolve(segments,path);
    if(['Some','None','Ok','Err'].includes(first.value)&&resolved.length===1&&this.unresolvedImportScope)throw unsupported('unproven standard pattern owner','requires actual source namespace resolution',first);
    const pattern=super.pattern(path,aliases),kind=this.registeredGenericKind(resolved.slice(0,-1),path,segments[0]);
    return pattern.k==='ctor'&&kind?{...pattern,registeredGenericOwner:kind}:pattern;
  }
  methodInstantiation(name) {
    if(name.value!=='parse')return super.methodInstantiation(name);
    const c=this.cursor;c.expect('<','integer parse type');const type=this.type();c.expect('>','integer parse type');return type;
  }
  instantiatedMethod(object,name,args,instantiation,range) {
    if(name.value!=='parse')return super.instantiatedMethod(object,name,args,instantiation,range);
    if(this.shadowedEffectRoots?.has('std'))throw unsupported('shadowed integer error namespace','requires distinct checked standard type provenance',range);
    return {k:'routerIntegerParse',object,args,instantiation,span:range};
  }
  method(object,name,args,range) {
    if(name.value==='into'){
      let sourceConversionScope=null,sourceConversionRefusal=null;
      try{sourceConversionScope=captureSourceConversionScope(this,name.start);}catch(error){if(!(error instanceof TypeError))throw error;sourceConversionRefusal=error.message;}
      return {k:'routerSourceIntoCall',object,args,sourceConversionScope,sourceConversionRefusal,fallback:super.method(object,name,args,range),span:range};
    }
    if(['is_none_or','is_some_and','map_or_else'].includes(name.value))return {k:'routerPinnedOptionCallbackCall',method:name.value,object,args,span:range};
    if(name.value==='as_ref')return {k:'routerPinnedSharedBodyCall',object,args,span:range};
    if(['unwrap_or','unwrap_or_default','unwrap_or_else','or_else','ok_or','ok_or_else'].includes(name.value))return {k:'routerPinnedStandardBodyCall',method:name.value,object,args,span:range};
    if(name.value==='bytes')return {k:'routerStringBytesOperation',object,args,span:range};
    if(name.value==='rfind')return {k:'routerReverseStringFind',object,args,span:range};
    if(name.value==='split')return {k:'routerStringIteratorOperation',operation:'split',object,args,span:range};
    if(name.value==='encode_utf16')return {k:'routerUtf16Encode',object,args,span:range};
    if(['lines','split_whitespace','next','join'].includes(name.value))return {k:'routerStringIteratorOperation',operation:name.value,object,args,span:range};
    if(name.value!=='parse')return super.method(object,name,args,range);
    return this.instantiatedMethod(object,name,args,null,range);
  }
  unary(path,options) {
    if(this.cursor.is('&')&&this.cursor.is('[',1)) {
      const c=this.cursor,start=c.index,first=c.next(),value=this.unary(path,{noStruct:options.noStruct}),tokens=c.tokens.slice(start,c.index);
      return {k:'routerSharedArrayLiteral',value,span:{start:first.start,end:tokens.at(-1).end},sourceArrayBorrow:{tokens:tokens.map(token=>({kind:token.kind,value:token.value,span:{start:token.start,end:token.end}}))}};
    }
    if(this.cursor.is('&')&&!this.cursor.is('mut',1)) {
      const first=this.cursor.peek(),value=super.unary(path,options);
      // Preserve only written borrows of actual allocation candidates. Their
      // authority is checked later against an ordinary scalar-returning call.
      const operand=value.k==='routerTextReference'?value.value:null;
      if(operand?.k==='routerIndex')return {k:'routerStaticArrayElementBorrow',value:operand,sourceAmpersand:{kind:'punct',value:'&',span:{start:first.start,end:first.end}},span:value.span};
      const allocation=operand?.k==='routerDispatchMethod'&&!operand.args.length?operand.fallback:operand;
      if(allocation&&(allocation.k==='toString'||allocation.k==='routerStringOwnership'&&allocation.operation==='to_owned'||allocation.k==='routerBuiltinConversion'&&allocation.operation==='String::from'||allocation.k==='routerOwnedString'))return {...value,sourceAmpersand:{value:'&',span:{start:first.start,end:first.end}}};
      return value;
    }
    const first=this.cursor.peek();if(!this.cursor.eat('*'))return super.unary(path,options);
    const value=this.unary(path,{noStruct:options.noStruct});return {k:'routerPrimitiveDereference',value,sourceFeature:'explicit-dereference',span:{start:first.start,end:value.span.end}};
  }
  type(){
    const c=this.cursor,start=c.index,type=this.hostTypeSyntax();
    return this.qualifyOwnershipType?.(type,c.tokens.slice(start,c.index))??type;
  }
  hostTypeSyntax(){
    const base64=parseRouterCoreBase64Type(this);if(base64)return base64;const algebraic=parseRouterCoreAlgebraicType(this);if(algebraic)return algebraic;
    const coreText=parseRouterCoreText(this);if(coreText)return coreText;
    const coreStr=parseRouterCoreStrReference(this);if(coreStr)return coreStr;
    const character=parseCharacterType(this);if(character)return character;
    const c=this.cursor,originalSelf=originalPrimitiveTryFromSelfType(this);if(originalSelf)return originalSelf;
    // && is one lexer token, but two borrows only in a source type position.
    // Split its coordinates here; boolean expression tokens remain untouched.
    if(c.is('&&')){const token=c.peek();c.tokens=[...c.tokens.slice(0,c.index),{...token,value:'&',end:token.start+1},{...token,value:'&',start:token.start+1},...c.tokens.slice(c.index+1)];}
    const named=this.namedSourceReferenceType();if(named)return named;
    const first=c.peek();
    if(c.is('&')){
      const start=c.index;c.next();
      if(c.eat("'")){const lifetime=c.identifier('lifetime');if(lifetime.value!=='static')throw unsupported('lifetime parameter',"only 'static references are portable",span(first,lifetime));}
      if(c.is('mut'))throw unsupported('mutable reference','mutation is outside the portable core',span(first,c.peek()));
      // Keep the existing borrowed-str value profile. Other references retain
      // their actual parsed pointee, including nested ownership qualifiers.
      if(c.is('str')){c.index=start;return super.type();}
      const depth=this.referenceTypeDepth??0;if(depth>=32)throw unsupported('shared reference type nesting','exceeds the checked depth bound',first);
      const ownershipDepth=this.ownershipReferenceDepth??0;
      this.referenceTypeDepth=depth+1;this.ownershipReferenceDepth=ownershipDepth+1;let pointee;
      try{pointee=this.type();}finally{this.referenceTypeDepth=depth;this.ownershipReferenceDepth=ownershipDepth;}
      const tokens=c.tokens.slice(start,c.index);
      return {...pointee,patternOwnershipRefusal:'shared source reference',rustReference:{kind:'shared',pointee:structuredClone(pointee),span:span(tokens[0],tokens.at(-1)),tokens:tokens.map(token=>({value:token.value,kind:token.kind,span:{start:token.start,end:token.end}}))}};
    }
    if(first.kind==='identifier'){
      const segments=[first.value];let offset=1;while(c.is('::',offset)&&c.peek(offset+1).kind==='identifier'){segments.push(c.peek(offset+1).value);offset+=2;}
      if(this.builtinShadow(first.value)){
        const alias=sourcePrimitiveAlias(this,segments,{start:first.start,end:c.peek(offset-1).end});
        if(alias){for(let index=0;index<offset;index++)c.next();return alias;}
      }
      const kind=this.registeredGenericKind(segments);
      if(kind&&(c.is('<',offset)||c.is('::',offset)&&c.is('<',offset+1))){
        for(let index=0;index<offset;index++)c.next();c.eat('::');c.expect('<','registered standard generic');const types=[this.type()];if(kind==='Result'){c.expect(',','Result');types.push(this.type());}c.expect('>','registered standard generic');
        const previous=this.authorizedGenericKind;this.authorizedGenericKind=kind;try{return this.genericType(kind,types,span(first,c.peek()));}finally{this.authorizedGenericKind=previous;}
      }
    }
    const primitive=rustFixedType(this.cursor.peek().value);if(primitive&&!this.builtinShadow(this.cursor.peek().value)){const token=this.cursor.next();return {...primitive,rustPrimitiveName:token.value};}
    if(this.cursor.is('f64')&&!this.builtinShadow('f64')){this.cursor.next();return SOURCE_F64;}
    const start=this.cursor.peek(),type=super.type();
    const visit=type=>{if(type.kind==='array')return visit(type.element);if(type.kind==='named'&&(this.shadowedEffectRoots?.has(type.path[0]==='crate'?type.path[1]:type.path[0])||type.path[0]==='crate'&&['std','tokio','serde_json'].includes(type.path[1])))throw unsupported('shadowed host type namespace','requires actual crate type resolution',span(start,this.cursor.peek()));};visit(type);return start.value==='Box'&&!this.builtinShadow('Box')?{...type,rustGenericIdentityUnresolved:true}:type;
  }
  file() {
    const surface=super.file(),support=hostData();
    const generic=surface.items.filter(item=>!item.generated||!support.some(entry=>entry.name===item.name));
    return {...surface,items:[...generic,...support]};
  }
  use(path) {
    const c=this.cursor,start=c.next(),key=path.join('.');if(!this.aliases.has(key))this.aliases.set(key,new Map());const aliases=this.aliases.get(key);
    this.parsedUseAliases??=new Map();if(!this.parsedUseAliases.has(key))this.parsedUseAliases.set(key,new Set());const parsedAliases=this.parsedUseAliases.get(key);
    const registered=builtins();
    const resolve=full=>full[0]==='self'?['crate',...path,...full.slice(1)]:full[0]==='super'?['crate',...path.slice(0,-1),...full.slice(1)]:full;
    const tree=prefix=>{
      if(c.eat('{')){while(!c.is('}')){tree(prefix);if(!c.eat(','))break;}c.expect('}','use');return;}
      const segment=c.identifier('use').value,full=[...prefix,segment];if(c.eat('::')){tree(full);return;}
      const alias=c.eat('as')?c.identifier('alias').value:segment;
      if(!['crate','self','super'].includes(full[0]) && !originalMatchesImport(this,full) && !registered.has(pathKey(full)) && !['std::io::Error','std::io::Result','std::env::VarError'].includes(pathKey(full)))throw unsupported(`use ${pathKey(full)}`,'import requires a checked crate or registered host contract',span(start,c.peek()));
      const original=(this.sourceNamespaceBindingEvidence?.get(key)??this.sourceNamespaceEvidence?.bindings)?.find(binding=>binding.namespace==='type'&&binding.name===alias&&binding.status==='resolved'&&binding.via==='named-import'&&binding.target?.join('::')===resolve(full).join('::'));
      const preloaded=original&&aliases.get(alias)?.join('::')===original.target.join('::');
      if(parsedAliases.has(alias)||aliases.has(alias)&&!preloaded){aliases.set(alias,['crate','ml_unresolved_import_alias',alias]);throw typeError(`ambiguous import alias ${alias}`,span(start,c.peek()));}
      parsedAliases.add(alias);
      aliases.set(alias,resolve(full));
    };
    tree([]);c.expect(';','use');
  }
  primary(path,options) {
    const algebraic=parseRouterCoreAlgebraicExpression(this,path);if(algebraic)return algebraic;
    const coreScalar=parseRouterCoreScalarCall(this,path);if(coreScalar)return coreScalar;
    const coreBase64=parseRouterCoreBase64Call(this,path);if(coreBase64)return coreBase64;const coreRange=parseRouterCoreRangeCall(this,path);if(coreRange)return coreRange;
    const coreFormat=parseRouterCoreFormatting(this,path);if(coreFormat)return coreFormat;
    const coreJson=parseRouterCoreJson(this,path);if(coreJson)return coreJson;
    const coreJsonUpdate=parseRouterCoreJsonUpdate(this,path);if(coreJsonUpdate)return coreJsonUpdate;
    const expandedMatches=parseOriginalMatchesCandidate(this,path);if(expandedMatches)return expandedMatches;
    if(this.cursor.peek().kind==='rustFloat') {
      const token=this.cursor.next();
      return {k:'num',value:token.value,type:FLOAT,sourceFloatLiteral:{profile:RUST_FLOAT_LITERAL_PROFILE.id,raw:token.raw,bits:token.floatBits,suffix:token.suffix},span:{start:token.start,end:token.end}};
    }
    const c=this.cursor,first=c.peek();if(first.kind!=='identifier'){
      const value=super.primary(path,options);
      return first.kind==='number'&&rustFixedType(first.suffix)&&value.k==='num'?{...value,type:{...value.type,rustPrimitiveName:first.suffix},...(first.byteProfile?{sourceByteLiteral:sourceByteLiteral(first.raw,value.span)}:{})}:value;
    }
    let offset=1;const segments=[first.value];while(c.is('::',offset)&&c.peek(offset+1).kind==='identifier'){segments.push(c.peek(offset+1).value);offset+=2;}
    const resolved=this.resolve(segments,path),owner=segments.slice(0,-1),operation=segments.at(-1),fixed=rustFixedType(owner.at(-1));
    if(segments.length===2&&fixed&&/^[iu](8|16|32|64|128)$/u.test(owner[0])&&!this.builtinShadow(owner[0],path)&&(operation==='try_from'&&c.is('(',offset)||['MIN','MAX'].includes(operation)&&!c.is('(',offset)&&!c.is('::',offset))){
      const target={...fixed,rustPrimitiveName:owner[0]};let sourceConversionProof=null,sourceTryFromRefusal=null;
      try{sourceConversionProof=capturePrimitiveTryFromScope(this,target,first.start);}catch(error){if(!(error instanceof TypeError))throw error;sourceTryFromRefusal=error.message;}
      for(let index=0;index<offset;index++)c.next();
      if(operation!=='try_from')return {k:'routerPrimitiveSourceConstant',name:operation,target,sourceConversionProof,sourceTryFromRefusal,span:span(first,c.peek())};
      c.expect('(','original primitive TryFrom');const args=[];while(!c.is(')')){args.push(this.expr(path));if(!c.eat(','))break;}c.expect(')','original primitive TryFrom');
      return {k:'routerPrimitiveTryFromCall',target,args,sourceConversionProof,sourceTryFromRefusal,span:span(first,c.peek())};
    }
    const allocatingItem=allocatingStringFunctionItem(this,segments,path);
    if(allocatingItem&&!c.is('(',offset)&&!c.is('::',offset)){
      for(let index=0;index<offset;index++)c.next();
      return {k:'routerStandardFunctionItem',operation:allocatingItem,method:'to_string',sourceFunctionItem:{profile:CSV_STRING_PROFILE.id,path:resolved,span:span(first,c.peek())},span:span(first,c.peek())};
    }
    const floatOwner=owner.length===1&&owner[0]==='f64'&&!this.builtinShadow('f64',path)&&this.resolveSourceNamespace(owner,path,'type').join('::')==='f64';
    if(floatOwner&&primitiveFloatConstant(operation)&&!c.is('(',offset)&&!c.is('::',offset)) {
      for(let index=0;index<offset;index++)c.next();
      return {k:'routerPrimitiveFloatConstant',owner:[...owner],name:operation,span:span(first,c.peek())};
    }
    if(floatOwner&&primitiveFloatContract(operation)&&c.is('(',offset)) {
      for(let index=0;index<=offset;index++)c.next();const args=[];while(!c.is(')')){args.push(this.expr(path));if(!c.eat(','))break;}c.expect(')','primitive f64 operation');
      return {k:'routerPrimitiveFloatCall',owner:[...owner],method:operation,args,span:span(first,c.peek())};
    }
    const fixedItem=owner.length===1&&fixed&&!this.builtinShadow(owner[0],path)&&INHERENT_FIXED_COPY.has(operation);
    const stringItem=segments.length===2&&segments[0]==='str'&&['to_owned','trim','trim_start','trim_end','is_empty'].includes(operation)&&!this.builtinShadow('str',path)&&this.resolveSourceNamespace(['str'],path,'type').join('::')==='str';
    if((fixedItem||stringItem)&&!c.is('(',offset)&&!c.is('::',offset)) {
      for(let index=0;index<offset;index++)c.next();
      return {k:'routerStandardFunctionItem',operation:segments.join('::'),method:operation,...(fixedItem?{ownerType:{...fixed,rustPrimitiveName:owner[0]}}:{}),sourceFunctionItem:{profile:fixedItem?'rust-1.89-primitive-inherent-function-item':operation==='to_owned'?'rust-1.89-str-to-owned-function-item':operation==='is_empty'?'rust-1.89-str-is-empty-function-item':'rust-1.89-str-trim-function-item',path:resolved,span:span(first,c.peek())},span:span(first,c.peek())};
    }
    const constructor=resolved.at(-1),kind=this.registeredGenericKind(resolved.slice(0,-1),path,segments[0]);
    if(kind&&(kind==='Option'?['Some','None']:['Ok','Err']).includes(constructor)){
      for(let index=0;index<offset;index++)c.next();const args=[];if(c.eat('(')){while(!c.is(')')){args.push(this.expr(path));if(!c.eat(','))break;}c.expect(')','registered standard constructor');}
      return {k:'routerRegisteredConstructor',kind,constructor,args,span:span(first,c.peek())};
    }
    if((['Some','None','Ok','Err'].includes(first.value)&&resolved.length===1&&this.unresolvedImportScope)||(['Option','Result'].includes(first.value)&&this.builtinShadow(first.value,path)&&resolved.every((part,index)=>part===segments[index])))throw unsupported('unproven standard constructor owner','requires actual source namespace resolution',first);
    if(fixed&&['from_str','from_str_radix'].includes(operation)&&c.is('(',offset)&&((owner.length===1&&!this.builtinShadow(owner[0],path))||(owner.length===3&&owner[0]==='std'&&owner[1]==='primitive'&&!this.builtinShadow('std',path)))) {
      if(this.shadowedEffectRoots?.has('std'))throw unsupported('shadowed integer error namespace','requires distinct checked standard type provenance',first);
      if(operation==='from_str'&&this.resolveSourceNamespace(['FromStr'],path,'type').join('::')!=='std::str::FromStr')throw unsupported('FromStr trait call','requires the actual standard FromStr import',first);
      for(let index=0;index<offset;index++)c.next();c.expect('(','integer operation');const args=[];while(!c.is(')')){args.push(this.expr(path));if(!c.eat(','))break;}c.expect(')','integer operation');
      return {k:'routerIntegerAssociated',operation,args,instantiation:{...fixed,rustPrimitiveName:owner.at(-1)},span:span(first,c.peek())};
    }
    if(segments.length===2&&!this.builtinShadow(segments[0],path)&&c.is('(',offset)&&((segments[0]==='Box'&&operation==='new')||(segments[0]==='String'&&operation==='from')||((rustFixedType(segments[0])||segments[0]==='bool')&&operation==='from'))) {
      for(let index=0;index<offset;index++)c.next();c.expect('(','standard conversion');const args=[];while(!c.is(')')){args.push(this.expr(path));if(!c.eat(','))break;}c.expect(')','standard conversion');
      if(args.length!==1)throw typeError('standard conversion requires one argument',span(first,c.peek()));const target=rustFixedType(segments[0]),targetType=target?{...target,rustPrimitiveName:segments[0]}:segments[0]==='bool'?{kind:'bool',rustPrimitiveName:'bool'}:null;let sourceBoolFromScope=null,sourceBoolFromRefusal=null;
      if(targetType){try{sourceBoolFromScope=capturePrimitiveBoolFromScope(this,targetType,first.start);}catch(error){if(!(error instanceof TypeError))throw error;sourceBoolFromRefusal=error.message;}}
      return {k:'routerBuiltinConversion',operation:segments.join('::'),value:args[0],target:targetType,targetName:segments[0],sourceBoolFromScope,sourceBoolFromRefusal,constEligible:false,span:span(first,c.peek())};
    }
    const contracts=HOST_CONTRACTS.filter(contract=>!contract.requiresRefinement&&contract.family!=='float'&&pathKey(contract.rustPath)===pathKey(resolved));
    if(!contracts.length)return super.primary(path,options);
    if(!c.is('(',offset)&&!(c.is('::',offset)&&c.is('<',offset+1)))return super.primary(path,options);
    if(resolved[0]==='crate'||this.shadowedEffectRoots?.has(resolved[0]))throw unsupported('shadowed host namespace','requires actual crate resolution',span(first,c.peek()));
    for(let index=0;index<offset;index++)c.next();let instantiation;
    if(c.eat('::')){c.expect('<','host type instantiation');instantiation=this.type();c.expect('>','host type instantiation');}
    c.expect('(','host operation');const args=[];while(!c.is(')')){args.push(this.expr(path));if(!c.eat(','))break;}c.expect(')','host operation');
    return {k:'routerHostCall',path:resolved,args,instantiation,span:span(first,c.peek())};
  }
}
// Capture original methods when the actual source class is defined, before a
// caller can replace a prototype and have a lazy first-use guard endorse it.
// Arrays/rows are immutable; exposing a frozen Map would still allow set().
const originalHostParserIdentity=Object.freeze({
  parserMethods:Object.freeze([...originalMethodSnapshot(HostRustParser.prototype)].map(row=>Object.freeze(row))),
  cursorMethods:Object.freeze([...originalMethodSnapshot(TokenCursor.prototype)].map(row=>Object.freeze(row))),
});
export function originalHostParserIdentitySnapshot(){return originalHostParserIdentity;}
const sourcePatterns=createOriginalSharedPatternAdapter();
export class HostChecker extends withOriginalFormatDisplayChecker(withJsonMacroChecker(withDeclarationRefusalCollection(withSharedNullaryEnumChecker(withCheckedSourceLinks(withCheckedMethodCopyReceivers(withFloatZeroSignChecker(withSourceLifetimeChecker(withSharedArrayBorrowChecker(withNestedMatchPatternsChecker(withSourceOwnershipChecker(withFixedArrayChecker(withOriginalStandardTupleChecker(MethodChecker))))))))))))) {
  constructor(language,externals){super(language,externals);this.instantiations=new HostInstantiations(this);this.sourceLifetimeHostContracts=HOST_CONTRACTS;if(jsonCheckerOriginQualified&&new.target===HostChecker)jsonCheckerApply(jsonCheckerAdd,jsonCheckerOrigins,[this]);}
  originalFormatDisplayValue(node,piece,value,env,path,bind,closures){return originalBase64ErrorDisplay(this,node,piece,value,bind)??super.originalFormatDisplayValue(node,piece,value,env,path,bind,closures);} visitDeclaration(item,path,entry,visit,phase){return super.visitDeclaration(item,path,entry,visitRouterCoreBase64Function(this,item,path,entry,visitRouterCoreJsonUpdateFunction(this,item,path,entry,visit,phase),phase),phase);}
  resolveType(type,path,range){if(type?.kind==='char')return checkedCharacterType(type,range);const resolved=super.resolveType(type,path,range);return {...resolved,...(type?.rustTupleLifetimeFields?{rustTupleLifetimeFields:type.rustTupleLifetimeFields.map(field=>this.resolveType(field,path,range))}:{}),...(type?.patternOwnershipRefusal?{patternOwnershipRefusal:type.patternOwnershipRefusal}:{}),...(type?.rustReference?{rustReference:{...type.rustReference,...(type.rustReference.pointee?{pointee:this.resolveType(type.rustReference.pointee,path,range)}:{})}}:{}),...(type?.rustGenericIdentityUnresolved?{rustGenericIdentityUnresolved:true}:{}),...(type?.rustStandardGeneric?{rustStandardGeneric:{kind:type.rustStandardGeneric.kind,arguments:type.rustStandardGeneric.arguments.map(argument=>this.resolveType(argument,path,range))}}:{})};}
  normalisePattern(pattern,type,span) {
    if(pattern.registeredGenericOwner){
      const entry=type.kind==='data'?this.items.get(type.name):null;
      if(entry?.standardGeneric?.kind!==pattern.registeredGenericOwner)throw typeError('registered pattern owner differs from its checked generic layout',span);
      return super.normalisePattern({...pattern,path:[type.name,pattern.path.at(-1)]},type,span);
    }
    return super.normalisePattern(pattern,type,span);
  }
  binary(node,env,path,expected,allowLiteral){
    const equality=checkOriginalOptionEquality(this,node,env,path,HostRustParser);
    return equality??super.binary(node,env,path,expected,allowLiteral);
  }
  hostLambda(node,types,env,path,expected,context) {
    if(node.k==='routerLambda')return this.lambda(node,types,env,path,expected,context);
    if(node.k==='routerStandardFunctionItem') {
      const names=types.map((_,index)=>`ml_standard_callback_${this.fresh++}_${index}`),args=names.map(name=>({k:'name',path:[name],span:node.span}));
      let body;
      if(['str::to_string','ToString::to_string'].includes(node.operation)){
        if(types.length!==1||node.sourceFunctionItem?.profile!==CSV_STRING_PROFILE.id)throw typeError('allocating function item requires its actual standard str/ToString owner and one checked argument',node.span);
        checkedAllocatingStringItem(types[0],node.span);
        body={k:'routerAllocatingStringItem',object:args[0],sourceFunctionItem:node.sourceFunctionItem,span:node.span};
      } else if(node.operation==='str::to_owned') {
        if(types.length!==1||types[0].kind!=='string'||types[0].rustReference||types[0].rustOwnership?.kind!=='borrowed'||types[0].rustOwnership.source!=='str')throw typeError('str::to_owned function item needs its actual borrowed str argument',node.span);
        body={k:'routerStringOwnership',operation:'to_owned',object:args[0],span:node.span};
      } else if(['str::trim','str::trim_start','str::trim_end','str::is_empty'].includes(node.operation)) {
        if(node.operation==='str::is_empty'&&node.sourceFunctionItem?.profile!=='rust-1.89-str-is-empty-function-item')throw typeError('str is_empty function item requires its actual standard source operation',node.span);
        if(types.length!==1)throw typeError('str trim function item needs one actual borrowed str argument',node.span);
        requireBorrowedString(types[0],node.span);
        body={k:'routerStringOperation',op:node.method,object:args[0],args:[],span:node.span};
      } else {
        if(types.length!==2||types.some(type=>type.rustReference||type.rustOwnership||type.rustPrimitiveName!==node.ownerType.rustPrimitiveName||!sameType(type,node.ownerType)))throw typeError('standard fixed method function item needs actual by-value primitive arguments',node.span);
        body={k:'routerDispatchMethod',method:node.method,object:args[0],args:args.slice(1),span:node.span};
      }
      return this.lambda({k:'routerLambda',params:names.map(name=>({name,span:node.span})),body,span:node.span},types,env,path,expected,context);
    }
    if(node.k!=='name')throw unsupported('callback value','only checked closures or resolved function items are supported',node.span);
    const names=types.map((_,index)=>`ml_host_callback_${this.fresh++}_${index}`);
    return this.lambda({k:'routerLambda',params:names.map(name=>({name,span:node.span})),body:{k:'app',fn:node,args:names.map(name=>({k:'name',path:[name],span:node.span})),span:node.span},span:node.span},types,env,path,expected,context);
  }
  hostType(type,path,span) {
    const root=type=>type.kind==='named'?{...type,path:['crate',...type.path.filter((part,index)=>index!==0||part!=='crate')]}:type.kind==='array'?{...type,element:root(type.element)}:type;
    return this.resolveType(root(type),path,span);
  }
  hostCall(contracts,args,env,path,expected,range,instantiation) {
    assertJsonParserCapability(this,contracts,range);
    const checked=[],errors=[];
    for(const contract of contracts) {
      if(contract.params.length!==args.length)continue;
      try {
        if(instantiation && (!contract.instantiation||!sameType(this.hostType(contract.instantiation,path,range),this.resolveType(instantiation,path,range))))throw typeError('unsupported host generic instantiation',range);
        const values=args.map((arg,index)=>{
          const type=this.hostType(contract.params[index],path,range);
          if(index!==0||contract.kind!=='method'||type.rustReference?.kind!=='shared')return coerce(this.expr(arg,env,path,type),type,this.language,range);
          let value=this.expr(arg,env,path);
          // Shared references are Copy. Registered inherent method dispatch
          // may peel an actual &&receiver to its &receiver; no owned aggregate
          // move, custom Deref trait, or missing pointee is inferred here.
          while(value.type.rustReference?.kind==='shared'&&value.type.rustReference.pointee?.rustReference?.kind==='shared') {
            const pointee=value.type.rustReference.pointee;
            if(pointee.rustGenericIdentityUnresolved||!sameType(pointee,type))break;
            value={k:'routerStandardSharedReceiver',object:value,type:pointee,constEligible:false,sourceReceiverCopy:{profile:'rust-1.89-shared-reference-copy',contract:contract.id,span:range},span:range};
          }
          this.expectedOwnership?.(value.type,type,path,range);this.expectedPrimitiveIdentity(value.type,type,path,range);
          return coerce(value,type,this.language,range);
        });
        const type=this.hostType(contract.ret,path,range);if(expected && !sameType(type,expected))throw typeError('host operation return type mismatch',range);
        this.expectedPrimitiveIdentity(type,expected,path,range);
        const resolved=this.instantiations.contracts.has(contract.id)?{...contract,params:contract.params.map(type=>this.hostType(type,path,range)),ret:type,runtimeInstantiation:{...contract.runtimeInstantiation,...(contract.runtimeInstantiation?.validatorType?{validatorType:this.hostType(contract.runtimeInstantiation.validatorType,path,range)}:{})}}:null;
        checked.push({k:'routerHostCall',id:contract.id,args:values,type,span:range,...(resolved?{contract:resolved}:{})});
      }catch(error){if(!(error instanceof TranslationError))throw error;errors.push(error);}
    }
    if(checked.length>1)throw typeError('ambiguous registered host overload; an explicit argument type is required',range);
    if(!checked.length)throw errors[0]??typeError('no checked registered host overload',range);
    return checked[0];
  }
  application(head,args,env,path,expected,range) {
    if(args.some(arg=>arg.k==='routerTextReference'&&arg.sourceAmpersand)) {
      const entry=head.k==='name'?this.lookup(head.path,path,range):null;
      args=prepareTemporaryStringCall(this,entry,args,env,path,range);
    }
    const contracts=head.k==='name'?HOST_CONTRACTS.filter(contract=>!contract.requiresRefinement&&contract.family!=='float'&&pathKey(contract.rustPath)===pathKey(head.path)):[];
    return contracts.length?this.hostCall(contracts,args,env,path,expected,range):super.application(head,args,env,path,expected,range);
  }
  prepareOriginalStringPatternBorrow(node,env,path){requireOriginalPrimitiveTryFromChecker(this);return prepareOriginalStringPatternBorrow(this,node,env,path);}
  sourceSharedPatternProofOrigin(node){return sourcePatterns.hasOriginalSharedPatternFrame(node)?'frame':sourcePatterns.hasOriginalPatternProjection(node)?'projection':sourcePatterns.hasOriginalSharedPatternView(node)?'string-view':null;}
  sourceSharedPatternFunctionTail(node){return sourcePatterns.originalSharedPatternFunctionTail(this,node);}
  sourceSharedPatternDomain(type,span){return sourcePatterns.originalSharedPatternDomain(this,type,span);}
  sourceSharedPatternOwner(node,type,path,env){return sourcePatterns.originalSharedPatternOwner(this,node,type,path,env);}
  sourceSharedPatternFieldType(field,parent,ctor,span){return sourcePatterns.originalSharedPatternFieldType(this,field,parent,ctor,span);}
  sourceSharedPatternRecord(pattern,type){return sourcePatterns.originalSharedPatternRecord(this,pattern,type);}
  sourceSharedPatternBinding(binding){return sourcePatterns.originalSharedPatternBinding(this,binding);}
  sourceSharedPatternProjection(subject,projection,targetType,paths){return sourcePatterns.originalSharedPatternProjection(this,subject,projection,targetType,paths);}
  expr(node,env,path,expected,allowLiteral=false) {
    if(node.k==='routerPrimitiveTryFromCall')return checkOriginalPrimitiveTryFrom(this,node,env,path,expected);
    if(node.k==='routerPrimitiveSourceConstant')return checkOriginalPrimitiveConstant(this,node);
    if(node.k==='routerSourceIntoCall'){
      const receiver=this.expr(node.object,env,path),inherent=this.resolvedMethod(receiver.type,'into','shared');
      if(inherent)return this.methodCall(inherent,node.object,node.args,env,path,expected,node.span);
      return checkOriginalSourceInto(this,node,receiver,env,path,expected);
    }
    const view=sourcePatterns.originalSharedPatternCoercion(this,node,env,path,expected);if(view)return view;
    const sharedPattern=sourcePatterns.checkOriginalSharedPatternMatch(this,node,env,path,expected,allowLiteral,syntax=>checkOrderedMatch(this,syntax,env,path,expected,allowLiteral));if(sharedPattern)return sharedPattern;
    const sharedLetElse=node.k==='routerLetElse'&&hasOriginalStandardCall(this,node);
    if(sharedLetElse)assertOriginalCloneChecker(this);
    let value=(sharedLetElse?checkOriginalOwnedJsonLetElse(this,node,env,path,expected,allowLiteral):null)??this.hostExpression(node,env,path,expected,allowLiteral);
    if(sharedLetElse)assertOriginalCloneChecker(this);
    value=contextualOptionMapConstructor(this,value,expected,path,node.span);
    if(node.k==='routerTuple'&&expected?.rustTupleLifetimeFields&&value.type.kind==='data'&&value.type.name===expected.name)value={...value,type:{...value.type,rustTupleLifetimeFields:expected.rustTupleLifetimeFields}};
    value=this.qualifyOwnershipResult?.(node,value,expected,path)??value;
    value=qualifyPrimitiveFloatResult(value);
    if(node.k==='binary'&&value.k==='binary'&&value.op==='eq'&&value.domain?.rustPrimitiveName==='f64')value={...value,span:node.span};
    this.expectedOwnership?.(value.type,expected,path,node.span);
    this.expectedPrimitiveIdentity(value.type,expected,path,node.span);
    return observeOriginalJsonErrorFormat(this,node,value);
  }
  expectedPrimitiveIdentity(actual,expected,path,range) {
    assertCharacterBoundary(actual,expected,range);
    assertRustPrimitiveIdentity(actual,expected,range,{declarations:this.items,resolveType:(type,scope,span)=>this.resolveType(type,scope??path,span)});
  }
  hostExpression(node,env,path,expected,allowLiteral=false) {
    const mutableJson=checkRouterCoreJsonMutableLet(this,node,env,path,expected,allowLiteral);if(mutableJson)return mutableJson;
    const character=checkCharacterExpression(this,node,env,path,expected);if(character)return character;
    if(node.k==='routerTextPattern'&&['contains','starts_with'].includes(node.op)&&node.args?.length===1&&node.args[0].k==='routerTextReference'&&node.args[0].sourceAmpersand)return super.expr(this.prepareOriginalStringPatternBorrow(node,env,path),env,path,expected,allowLiteral);
    if(node.k==='routerStaticArrayElementBorrow')return checkStaticArrayElement(this,node,env,path,expected);
    if(node.k==='routerPrimitiveShift')return checkedPrimitiveShift(this,node,env,path,expected);
    if(node.k==='routerReverseStringFind'){
      const object=this.expr(node.object,env,path),inherent=this.resolvedMethod(object.type,'rfind','shared');
      if(inherent)return this.methodCall(inherent,node.object,node.args,env,path,expected,node.span);
      return checkedReverseSplitFind(this,node,object,env,path);
    }
    env=this.contextEnvironment(node,env,expected);
    if(node.k==='num'&&node.sourceByteLiteral){
      requireByteLiteral(node);
      if(expected?.rustReference||expected?.patternOwnershipRefusal)throw unsupported('byte character reference literal','requires actual checked borrowing or promotion',node.span);
      const value=super.expr(node,env,path,expected,allowLiteral),checked={...value,span:node.span,sourceByteLiteral:{...node.sourceByteLiteral,verified:true}};
      requireByteLiteral(checked,true);return checked;
    }
    if(node.k==='num'&&node.sourceFloatLiteral) {
      const source=node.sourceFloatLiteral,decoded=decodeRustFloat(source.raw,node.span);
      if(source.profile!==RUST_FLOAT_LITERAL_PROFILE.id||source.bits!==decoded.floatBits||source.suffix!==decoded.suffix||node.value!==decoded.value||node.type?.kind!=='float')throw typeError('floating literal differs from its original checked source token',node.span);
      if(expected?.rustReference||expected?.patternOwnershipRefusal)throw unsupported('floating reference literal','requires actual checked borrowing or promotion',node.span);
      const value=super.expr(node,env,path,expected,allowLiteral);
      return {...value,sourceFloatLiteral:{...source,verified:true}};
    }
    if(node.k==='routerPreparedStringCallBorrow')return consumeTemporaryStringCallBorrow(node);
    if(node.k==='routerTemporaryStringBorrow')throw unsupported('temporary String source borrow','only an actual checked ordinary scalar-returning &str call may consume it',node.span);
    if(node.k==='routerStringBytesOperation') {
      const object=this.expr(node.object,env,path),inherent=this.resolvedMethod(object.type,'bytes','shared');
      if(inherent)return this.methodCall(inherent,node.object,node.args,env,path,expected,node.span);
      if(node.args.length)throw typeError('str::bytes takes no arguments',node.span);
      return checkedStringBytes(object,node.span);
    }
    if(node.k==='routerUtf16Encode') {
      const object=this.expr(node.object,env,path),inherent=this.resolvedMethod(object.type,'encode_utf16','shared');
      if(inherent)return this.methodCall(inherent,node.object,node.args,env,path,expected,node.span);
      if(node.args.length)throw typeError('str::encode_utf16 takes no arguments',node.span);
      return checkedUtf16Iterator(object,node.span);
    }
    if(node.k==='routerStringIteratorOperation') {
      const object=this.expr(node.object,env,path),inherent=this.resolvedMethod(object.type,node.operation,'shared');
      if(inherent)return this.methodCall(inherent,node.object,node.args,env,path,expected,node.span);
      if(node.operation==='split')return checkCharacterSplit(this,node,object);
      if(node.operation==='next'&&object.k==='routerStringSplit')return checkCharacterSplitNext(this,node,object);
      return checkStringIteratorOperation(this,node,object,env,path);
    }
    if(node.k==='routerAllocatingStringItem'){
      if(node.sourceFunctionItem?.profile!==CSV_STRING_PROFILE.id)throw typeError('allocating function item requires its actual checked standard owner',node.span);
      const object=this.expr(node.object,env,path),type=checkedAllocatingStringItem(object.type,node.span);
      return {k:'routerAllocatingStringItem',object,type,csvStringProof:{profile:CSV_STRING_PROFILE.id,verified:true,operation:'to_string',constEligible:false,span:{...node.span}},constEligible:false,span:node.span};
    }
    if(node.k==='cast') {
      const target=this.resolveType(node.to,path,node.span);
      if(target.kind==='float')return checkedFixedF64Cast(this.expr(node.arg,env,path),target,node.span);
      if(target.kind==='fixed'){const object=this.expr(node.arg,env,path);if(object.type.kind==='data'&&!object.type.rustReference)return checkUnitEnumCast(this,node,object,target);}
      if(target.kind==='fixed'&&/^([iu])(8|16|32|64|128)$/u.test(target.rustPrimitiveName??'')){
        const value=this.expr(node.arg,env,path);
        if(value.type.kind==='fixed'&&/^([iu])(8|16|32|64|128)$/u.test(value.type.rustPrimitiveName??'')){
          const input=fixedBounds(value.type),output=fixedBounds(target);
          if(input.min<output.min||input.max>output.max)return checkedPrimitiveCast(value,target,node.span);
        }
      }
    }
    if(node.k==='routerCoreJsonCall')return checkRouterCoreJson(this,node,env,path,expected);
    if(node.k==='routerOrderedMatch')return visitOriginalJsonCollectionTextMatch(this,node,()=>super.expr(node,env,path,expected,allowLiteral));
    if(node.k==='routerCoreJsonUpdateCall')return checkRouterCoreJsonUpdate(this,node,env,path,expected);
    if(node.k==='routerCoreScalarCountCall')return checkRouterCoreScalarCall(this,node,env,path,expected);
    if(node.k==='routerCoreBase64Call')return checkRouterCoreBase64Call(this,node,env,path,expected);if(node.k==='routerCoreF64InclusiveCall')return checkRouterCoreRangeCall(this,node,env,path,expected);
    if(node.k==='routerPrimitiveFloatConstant')return checkedPrimitiveFloatConstant(node);
    if(node.k==='routerPrimitiveFloatCall') {
      const contract=primitiveFloatContract(node.method);
      if(!contract||node.owner?.join('::')!=='f64')throw typeError('primitive float call has no checked source owner',node.span);
      const call=this.hostCall([contract],node.args,env,path,expected,node.span);call.args.forEach(arg=>requirePrimitiveFloat(arg,node.span));return call;
    }
    if(node.k==='routerSharedArrayLiteral')return this.sharedArrayBorrow(node,env,path,expected);
    if(node.k==='routerOriginalCloneBody')return checkOriginalCloneBody(this,node,env,path,expected,HostChecker,(type,span)=>checkedOptionNominal(this,type,span),assertOriginalCloneChecker);
    if(node.k==='routerOriginalCloneFieldBorrow')return checkOriginalCloneFieldBorrow(this,node,env,path);
    if(node.k==='routerPrimitiveDereference') {
      if(nonlocalDefault(node.value))throw unsupported('dereference control','nonlocal exits require separately checked statement lowering',node.span);
      const value=this.expr(node.value,env,path),reference=value.type.rustReference,pointee=reference?.pointee;
      if(value.type.kind==='string'&&reference?.kind==='shared'&&pointee?.kind==='string'&&pointee.rustOwnership?.kind==='borrowed'&&pointee.rustOwnership.source==='str'&&!pointee.rustGenericIdentityUnresolved)return {...node,value,type:pointee,dereferenceProof:{kind:'shared-str-reference-copy',reference:structuredClone(reference),sourceFeature:node.sourceFeature,span:node.span}};
      if(value.type.kind==='bool')return {...node,value,type:sharedBooleanPointee(value.type,node.span),dereferenceProof:{kind:'shared-bool-copy',reference:structuredClone(reference),sourceFeature:node.sourceFeature,span:node.span}};
      if(value.type.kind==='float'){requireOriginalPrimitiveTryFromChecker(this);return {...node,value,type:sharedF64Pointee(value.type,node.span),dereferenceProof:{kind:'shared-f64-copy',source:originalSharedF64CopySource(),reference:structuredClone(reference),sourceFeature:node.sourceFeature,span:node.span}};}
      const type=sharedFixedPointee(value.type,node.span);
      return {...node,value,type,dereferenceProof:{kind:'shared-fixed-copy',primitiveName:type.rustPrimitiveName,reference:structuredClone(value.type.rustReference),sourceFeature:node.sourceFeature,span:node.span}};
    }
    if(node.k==='num'&&expected?.kind==='fixed'&&expected.patternOwnershipRefusal)throw unsupported('integer reference literal','a literal needs checked borrowing or promotion, not a portable integer domain',node.span);
    if(node.k==='num'&&node.type?.rustPrimitiveName){
      const value=super.expr(node,env,path,expected,allowLiteral),name=node.type.rustPrimitiveName;
      if(expected?.rustPrimitiveName&&expected.rustPrimitiveName!==name)throw typeError('explicit Rust integer suffix differs from the expected primitive identity',node.span);
      return {...value,type:{...value.type,rustPrimitiveName:name}};
    }
    if(node.k==='routerRegisteredConstructor'){
      const entry=expected?.kind==='data'?this.items.get(expected.name):null;
      if(entry?.standardGeneric?.kind!==node.kind)throw unsupported('registered standard constructor instantiation','requires the actual expected standard generic layout',node.span);
      return super.expr({k:'app',fn:{k:'name',path:[expected.name,node.constructor],span:node.span},args:node.args,span:node.span},env,path,expected,allowLiteral);
    }
    if(['routerConstObligation','routerBuiltinConversion'].includes(node.k)) {
      const value=this.expr(node.value,env,path,node.k==='routerConstObligation'?expected:undefined);
      if(node.operation==='String::from'&&value.type.kind!=='string')throw typeError('String::from requires the actual checked standard string conversion',node.span);
      if(node.target&&((node.target.kind==='bool'&&value.type.kind==='bool')||(node.target.kind==='fixed'&&value.type.kind==='fixed'&&/^[iu](8|16|32|64|128)$/u.test(node.targetName)&&value.type.rustPrimitiveName===node.targetName))){
        if(node.sourceBoolFromRefusal)throw unsupported('primitive identity From namespace',node.sourceBoolFromRefusal,node.span);
        let caller,body;try{caller=requirePrimitiveBoolFromScope(node.sourceBoolFromScope,node.target);body=parsePrimitiveIdentityFromBody(HostRustParser,this,pinnedPrimitiveIdentityFrom(value.type));requirePrimitiveIdentityFromBody(body,value.type);}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('primitive identity From source',error.message,node.span);}
        this.expectedPrimitiveIdentity(node.target,expected,path,node.span);
        return {k:'routerPrimitiveIdentityFrom',value,type:node.target,sourceCallerTraitScope:caller,sourcePrimitiveIdentityFromBody:body,constEligible:false,span:node.span};
      }
      if(node.target?.kind==='bool')throw unsupported('primitive bool identity From argument','requires the same actual by-value bool identity',node.span);
      if(node.target&&value.type.kind==='bool'){
        if(value.type.rustReference||value.type.rustOwnership||value.type.patternOwnershipRefusal||value.type.rustGenericIdentityUnresolved)throw unsupported('primitive bool From argument','requires an actual by-value bool; references and unresolved ownership remain refused',node.span);
        if(node.sourceBoolFromRefusal)throw unsupported('primitive bool From namespace',node.sourceBoolFromRefusal,node.span);
        let caller,body;try{caller=requirePrimitiveBoolFromScope(node.sourceBoolFromScope,node.target);body=parsePrimitiveBoolFromBody(HostRustParser,pinnedPrimitiveBoolFrom(node.target));requirePrimitiveBoolFromBody(body,node.target);}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('primitive bool From source',error.message,node.span);}
        this.expectedPrimitiveIdentity(node.target,expected,path,node.span);
        return {k:'routerPrimitiveBoolFrom',value,type:node.target,sourceBoolFromScope:caller,sourcePrimitiveBoolFromBody:body,constEligible:false,span:node.span};
      }
      if(node.target&&value.type.kind==='fixed'&&/^[iu](8|16|32|64|128)$/u.test(value.type.rustPrimitiveName)&&/^[iu](8|16|32|64|128)$/u.test(node.targetName)&&value.type.rustPrimitiveName!==node.targetName){
        if(value.type.rustReference||value.type.rustOwnership||value.type.patternOwnershipRefusal||value.type.rustGenericIdentityUnresolved||value.type.rustBorrowingUnresolved)throw unsupported('primitive fixed From argument','requires an actual by-value primitive domain',node.span);
        if(node.sourceBoolFromRefusal)throw unsupported('primitive fixed From namespace',node.sourceBoolFromRefusal,node.span);
        let caller,body;try{caller=requirePrimitiveBoolFromScope(node.sourceBoolFromScope,node.target);body=parsePrimitiveFromBody(HostRustParser,pinnedPrimitiveFrom(value.type,node.target));requirePrimitiveFromBody(body,value.type,node.target);}catch(error){if(!(error instanceof TypeError))throw error;throw unsupported('primitive fixed From source',error.message,node.span);}
        this.expectedPrimitiveIdentity(node.target,expected,path,node.span);
        return {k:'routerPrimitiveFixedFrom',value,type:node.target,sourceCallerTraitScope:caller,sourcePrimitiveFromBody:body,constEligible:false,span:node.span};
      }
      if(node.target){if(value.type.kind!=='fixed'||value.type.patternOwnershipRefusal||value.type.rustGenericIdentityUnresolved)throw unsupported('primitive From conversion','requires a checked infallible by-value fixed integer source',node.span);const inputName=value.type.rustPrimitiveName;if(!inputName)throw unsupported('primitive From source identity','requires the actual source integer type',node.span);if(!hasIntegerFrom(inputName,node.targetName))throw typeError(`no registered standard From<${inputName}> for ${node.targetName}`,node.span);const input=fixedBounds(value.type),output=fixedBounds(node.target);if(input.min<output.min||input.max>output.max)throw typeError('primitive From conversion is not infallible for the checked source type',node.span);}
      const type=node.operation==='String::from'?{...value.type,patternOwnershipRefusal:'owned String conversion'}:node.target??value.type;if(expected&&!sameType(type,expected))throw typeError('standard conversion return type mismatch',node.span);return {...node,value,type};
    }
    if(['routerIntegerParse','routerIntegerAssociated'].includes(node.k)) {
      if(node.object){const receiver=this.expr(node.object,env,path);const inherent=this.resolvedMethod(receiver.type,'parse','shared');if(inherent&&!node.instantiation)return this.methodCall(inherent,node.object,node.args,env,path,expected,node.span);if(receiver.type.kind!=='string')throw typeError('integer parse requires an actual checked str receiver',node.span);}
      const expectedEntry=expected?.kind==='data'?this.items.get(expected.name):null;
      const inferred=expectedEntry?.standardGeneric?.kind==='Result'?this.resolveType(expectedEntry.standardGeneric.arguments[0],expectedEntry.modulePath,node.span):null;
      const type=node.instantiation?this.resolveType(node.instantiation,path,node.span):inferred??contextualIntegerParseTarget(this,node);
      if(type?.kind!=='fixed')throw unsupported('integer parse target','requires an actual resolved fixed-integer instantiation',node.span);
      const instance=this.instantiations.integer(type,node.span),operation=node.k==='routerIntegerParse'?'rust_integer_parse':node.operation==='from_str'?'rust_integer_from_str':'rust_integer_from_str_radix';
      return this.hostCall(instance.contracts.filter(contract=>contract.id.startsWith(operation+'_')),(node.object?[node.object,...node.args]:node.args),env,path,expected,node.span,type);
    }
    if(node.k==='routerIteratorOperation'&&node.op==='filter'){const receiver=this.expr(node.object,env,path),inherent=this.resolvedMethod(receiver.type,'filter','shared');if(inherent)return this.methodCall(inherent,node.object,node.args,env,path,expected,node.span);if(receiver.type.kind==='data'&&this.items.get(receiver.type.name)?.standardGeneric?.kind==='Option')return checkPinnedOptionCallbackBody(this,node,receiver,env,path,expected,HostRustParser);}
    if(node.k==='routerOriginalMappedCallbackApplication')return checkOriginalMappedApplication(this,node,env,path);
    if(node.k==='routerOriginalCallbackApplication')return checkOriginalCallbackApplication(this,node,env,path);
    if(node.k==='routerPinnedOptionCallbackCall'){const receiver=this.expr(node.object,env,path),inherent=this.resolvedMethod(receiver.type,node.method,'shared');if(inherent)return this.methodCall(inherent,node.object,node.args,env,path,expected,node.span);return checkPinnedOptionCallbackBody(this,node,receiver,env,path,expected,HostRustParser);}
    if(node.k==='routerPinnedSharedMatchPlace')return checkedSharedMatchPlace(node);
    if(node.k==='routerPinnedSharedBodyCall'){const receiver=this.expr(node.object,env,path),inherent=this.resolvedMethod(receiver.type,'as_ref','shared');if(inherent)return this.methodCall(inherent,node.object,node.args,env,path,expected,node.span);return checkPinnedSharedBody(this,node,receiver,path,expected,HostRustParser);}
    if(node.k==='routerPinnedCallbackApplication')return checkPinnedCallbackApplication(this,node);
    if(node.k==='routerPinnedStandardBodyCall'){
      const receiver=contextualOptionMapResultReceiver(this,node,env,path,expected)??this.expr(node.object,env,path),inherent=this.resolvedMethod(receiver.type,node.method,'shared');
      if(inherent)return this.methodCall(inherent,node.object,node.args,env,path,expected,node.span);
      if(node.method==='unwrap_or'&&receiver.type.kind==='data'&&this.items.get(receiver.type.name)?.standardGeneric?.kind==='Result')return super.expr({k:'routerAlgebraicOperation',op:'unwrap_or',object:node.object,args:node.args,span:node.span},env,path,expected,allowLiteral);
      return checkPinnedOptionBody(this,node,receiver,env,path,expected,HostRustParser);
    }
    if(node.k==='routerHostCall')return this.hostCall(HOST_CONTRACTS.filter(contract=>!contract.requiresRefinement&&(node.id?contract.id===node.id:pathKey(contract.rustPath)===pathKey(node.path))),node.args,env,path,expected,node.span,node.instantiation);
    if(['routerDispatchMethod','routerIteratorOperation'].includes(node.k)) {
      if(node.k==='routerDispatchMethod'&&node.object.k==='routerDispatchMethod'&&node.object.fallback?.k==='routerStringView'&&this.expr(node.object.object,env,path).type.kind==='string')return super.expr(node,env,path,expected,allowLiteral);
      const receiver=contextualIntegerParseReceiver(this,node,env,path,expected)??this.expr(node.object,env,path,iteratorReceiverExpected(this,node,path,expected)),method=node.method??node.op;
      const inherent=this.resolvedMethod(receiver.type,method,'shared');if(inherent)return this.methodCall(inherent,node.object,node.args,env,path,expected,node.span);
      if(method==='as_deref')return checkedOptionAsDeref(this,node,receiver,path);
      if(receiver.type.kind==='float') {
        const contract=primitiveFloatContract(method);
        if(contract){requirePrimitiveFloat(receiver,node.span);return this.hostCall([contract],[node.object,...node.args],env,path,expected,node.span);}
        if(['is_sign_negative','is_sign_positive'].includes(method)){if(node.args.length)throw typeError('primitive f64 sign predicate takes no arguments',node.span);this.floatSignObligations=true;return floatSignObligation(method,receiver,node.span);}
      }
      const contracts=HOST_CONTRACTS.filter(contract=>contract.family!=='float'&&contract.kind==='method'&&contract.rustPath.at(-1)===method&&sameType(this.hostType(contract.receiver,path,node.span),receiver.type));
      if(contracts.length)return this.hostCall(contracts,[node.object,...node.args],env,path,expected,node.span);
      if(receiver.type.kind==='fixed'&&['checked_add','checked_sub','checked_mul','wrapping_add','wrapping_sub','saturating_add','saturating_sub','saturating_mul','min','max','clamp'].includes(method)){
        const borrowed=Boolean(receiver.type.rustReference);let type=receiver.type,object=node.object;
        if(borrowed&&!INHERENT_FIXED_COPY.has(method))throw unsupported('reference Ord method','reference trait selection is not primitive inherent autodereference',node.span);
        while(type.rustReference){type=sharedFixedPointee(type,node.span);object={k:'routerPrimitiveDereference',value:object,sourceFeature:'inherent-receiver-autoderef',span:node.object.span};}
        if(method.startsWith('wrapping_')){const primitive=rustFixedType(type.rustPrimitiveName);if(!primitive||!/^([iu])(8|16|32|64|128)$/u.test(type.rustPrimitiveName)||primitive.bits!==type.bits||primitive.signed!==type.signed||type.rustOwnership||type.rustGenericIdentityUnresolved)throw unsupported('primitive wrapping owner','requires an actual by-value checked fixed primitive; alternate pointer widths, custom ownership and unresolved generics remain refused',node.span);}
        const instance=this.instantiations.fixed(type,node.span);return this.hostCall(instance.contracts.filter(contract=>contract.rustPath.at(-1)===method),[object,...node.args],env,path,expected,node.span);
      }
      if(mappedStandardFamily(receiver.type,method,this.items)==='Result')return checkOriginalMappedBody(this,node,receiver,env,path,expected,HostRustParser,'Result');
      const mapOr=method==='map_or'&&receiver.type.kind==='data'&&this.items.get(receiver.type.name)?.standardGeneric?.kind==='Option';
      if(method==='map_err'&&canonicalResult(this,receiver.type,path,node.span,false))return checkResultMapError(this,node,receiver,env,path,expected);
      if(mapOr&&node.args.length!==2)throw typeError('standard map_or expects 2 arguments',node.span);
      if(mapOr&&nonlocalDefault(node.args[0]))throw unsupported('Option.map_or default control','nonlocal exits require separately checked statement lowering',node.args[0].span);
      const defaultValue=mapOr?this.expr(node.args[0],env,path,expected):null;
      if(mapOr&&defaultValue.type.kind==='data')return checkOriginalMappedBody(this,node,receiver,env,path,expected,HostRustParser,'Option',defaultValue);
      expected=contextualOptionMapExpected(this,node,receiver,path)??expected;
      const plan=['bool','data'].includes(receiver.type.kind)?planStandardMethod(receiver.type,method,{declarations:this.items,resolveType:(type,range)=>this.resolveType(type,path,range),expected,defaultType:defaultValue?.type,span:node.span,argumentCount:node.args.length}):null;
      if(plan?.operation==='bool_then_some'){
        if(nonlocalDefault(node.args[0]))throw unsupported('bool.then_some argument control','nonlocal exits require separately checked statement lowering',node.args[0].span);
        const argument=this.expr(node.args[0],env,path,plan.argumentExpected??undefined),type=completeStandardMethod(plan,argument.type,{optionType:(element,range)=>this.instantiations.option(element,range),span:node.span});
        return {k:'routerStandardMethod',operation:plan.operation,value:receiver,argument,type,constEligible:false,evaluationOrder:plan.evaluationOrder,sourceProfile:plan.sourceProfile,span:node.span};
      }
      if(plan){const context={source:plan.operation==='bool_then'?'standard-bool':plan.operation==='result_ok'?'standard-result':'standard-option',receiverType:receiver.type};const callback=plan.operation==='result_ok'?null:this.hostLambda(node.args[mapOr?1:0],plan.callbackParameters,env,path,plan.callbackExpected??undefined,context);const type=completeStandardMethod(plan,callback?.type.result??null,{optionType:(element,range)=>this.instantiations.option(element,range),span:node.span});return {k:'routerStandardMethod',operation:plan.operation,value:receiver,...(defaultValue?{defaultValue}:{}),callback,type,constEligible:false,span:node.span};}
      if(receiver.type.kind==='array'&&['get','first','last'].includes(method)) {
        const instance=this.instantiations.vector(receiver.type.element,node.span);
        return this.hostCall(instance.contracts.filter(contract=>contract.rustPath.at(-1)===method),[node.object,...node.args],env,path,expected,node.span);
      }
      if(receiver.type.kind==='data'&&['and_then','or_else','is_some_and'].includes(method)) {
        const data=this.items.get(receiver.type.name),some=data?.ctors.find(ctor=>ctor.name==='Some'),none=data?.ctors.find(ctor=>ctor.name==='None');
        if(data?.standardGeneric?.kind!=='Option'||!some||!none||data.ctors.length!==2||some.fields.length!==1||none.fields.length)throw typeError('checked Option callback receiver required',node.span);
        if(node.args.length!==1)throw typeError('Option callback needs one argument',node.span);
        const element=this.resolveType(some.fields[0].type,data.modulePath,node.span);
        const callback=this.hostLambda(node.args[0],method==='or_else'?[]:[element],env,path,method==='or_else'?receiver.type:method==='is_some_and'?BOOL:expected,{source:'standard-option',receiverType:receiver.type});
        const type=method==='is_some_and'?BOOL:callback.type.result;
        if(method==='and_then') {
          const result=type.kind==='data'?this.items.get(type.name):null;
          if(result?.standardGeneric?.kind!=='Option'||result.ctors.length!==2||!result.ctors.some(ctor=>ctor.name==='None'&&ctor.fields.length===0)||!result.ctors.some(ctor=>ctor.name==='Some'&&ctor.fields.length===1))throw typeError('Option and_then callback must return a checked Option',node.span);
        }
        return {k:'routerOptionCallback',op:method,value:receiver,callback,type,span:node.span};
      }
    }
    return super.expr(node,env,path,expected,allowLiteral);
  }
  sourceStandardFramePatternRead(type){return originalSourceFramePatternRead(this,type);}
  sourceStandardRefField(field,receiver){return originalStandardRefField(this,field,receiver);}
  sourceStandardFieldCopy(field,span){
    const type=field.type,entry=type.kind==='data'?this.items.get(type.name):null,source=type.rustStandardGeneric;
    if(type.rustReference||entry?.standardGeneric?.kind!=='Option'||source?.kind!=='Option'||entry.standardGeneric.arguments?.length!==1||source.arguments?.length!==1||entry.ctors.length!==2)return null;
    const some=entry.ctors.find(ctor=>ctor.name==='Some'),none=entry.ctors.find(ctor=>ctor.name==='None');if(some?.fields.length!==1||some.fields[0].name!=='field0'||none?.fields.length)return null;
    const actual=this.resolveType(some.fields[0].type,entry.modulePath,span),argument=this.resolveType(source.arguments[0],entry.modulePath,span),registered=this.resolveType(entry.standardGeneric.arguments[0],entry.modulePath,span);
    const primitive=actual.kind==='fixed'?rustFixedType(actual.rustPrimitiveName):null,shared=actual.rustReference?.kind==='shared'&&sharedReferenceCopyIdentity(actual),str=actual.kind==='string'&&!actual.rustReference&&actual.rustOwnership?.kind==='borrowed'&&actual.rustOwnership.source==='str',scalar=!actual.rustReference&&!actual.rustOwnership&&!actual.patternOwnershipRefusal&&!actual.rustGenericIdentityUnresolved&&(primitive&&primitive.bits===actual.bits&&primitive.signed===actual.signed||actual.kind==='bool'||actual.kind==='float'&&actual.rustPrimitiveName==='f64');if(!(str||shared||scalar&&originalPrimitiveCopySource(actual))||!sameType(actual,argument)||!sameType(actual,registered))return null;
    this.expectedOwnership(actual,argument,entry.modulePath,span);this.expectedOwnership(actual,registered,entry.modulePath,span);
    return {kind:str?'source-standard-option-borrowed-str-copy':'source-standard-option-payload-copy',type:structuredClone(type),owner:'core::option::Option',payload:structuredClone(actual),source:STANDARD_OPTION_COPY_SOURCE,referenceSource:shared||str?SHARED_REFERENCE_COPY_SOURCE:null,primitiveSource:scalar?originalPrimitiveCopySource(actual):null,referenceDepth:shared?1:str?1:0};
  }
  sourceFixedArrayCells(type,span){return fixedArrayCopyCells(type,span,0,(element,range)=>{checkedOptionNominal(this,element,range);const count=(type,active=new Set())=>{if(type.rustReference)return 1;if(type.kind==='array')return 1+(fixedArrayLength(type)??0)*count(type.element,active);if(type.kind!=='data')return 1;if(active.has(type.name))throw unsupported('static array cell budget','recursive owned layouts remain unproved',range);const entry=this.items.get(type.name),inner=new Set(active).add(type.name);return 1+Math.max(...entry.ctors.map(ctor=>ctor.fields.reduce((sum,field)=>sum+count(field.type,inner),0)));};return count(element);});}
  program(surface) {
    captureRouterCoreScalarCalls(this,surface);
    captureRouterCoreJsonCalls(this,surface);
    captureRouterCoreJsonUpdates(this,surface);
    captureRouterCoreBase64Calls(this,surface);captureRouterCoreRangeCalls(this,surface);
    captureConstMatchSources(this,surface);
    sourcePatterns.captureOriginalSharedPatterns(this,surface);
    captureOriginalMoveTuples(this,surface);
    captureOriginalStandardCalls(this,surface);
    captureOriginalConversions(this,surface);
    captureOriginalPrimitiveTryFrom(this,surface);
    captureOriginalCloneBodies(this,surface,assertOriginalCloneChecker);
    captureOptionNominals(this,surface);
    captureStaticArrays(this,surface);
    validateOriginalMethodAssociations(surface);
    this.floatSignObligations=false;
    const program=super.program(surface);
    const sourceContext=checkedSourceContext(program);
    sourcePatterns.finalizeOriginalSharedPatterns(this,program);
    finalizeOriginalMappedBodies(this,program);
    finalizeOriginalJsonErrorFlow(this,program,HostRustParser,HostChecker,node=>sourcePatterns.hasOriginalSharedPatternFrame(node));
    program.items.push(...this.instantiations.items);
    const forbidden=(node,seen=new Set(),runtimeConstFunction=false)=>{
      if(!node||typeof node!=='object')return false;
      if(node.k==='routerAlgebraicOperation'&&node.op==='unwrap_or'||node.k==='routerStringOperation')return true;
      if(node.constEligible===false&&!(runtimeConstFunction&&node.patternControl?.kind==='let-chain')||['routerEffectCall','routerFutureCall','routerAwait','routerOptionCallback','routerFor','routerIteratorOperation'].includes(node.k))return true;
      if(node.k==='routerHostCall'&&!(node.contract??HOST_CONTRACTS.find(contract=>contract.id===node.id))?.constEligible)return true;
      if(['call','routerFutureCall'].includes(node.k)&&!seen.has(node.fn)){seen.add(node.fn);const entry=program.declarations.get(node.fn);if(!entry||!entry.constant&&!entry.constFunction||forbidden(entry.body,seen))return true;}
      return Object.entries(node).some(([key,value])=>!['type','patternControl'].includes(key)&&(Array.isArray(value)?value.some(item=>forbidden(item,seen,runtimeConstFunction)):forbidden(value,seen,runtimeConstFunction)));
    };
    checkConstEligibilityRefusals(this,program,entry=>{if(forbidden(entry.body,new Set(),!entry.constant&&entry.constFunction))throw unsupported('non-const host operation','pure does not imply Rust const eligibility',entry.span);});
    bindCheckedNominalNoDrop(program,this);
    const sourceLinks=bindCheckedSourceLinks(program,sourceContext,{targetProfile:CONSTANT_EVALUATION_PROFILE});
    if(hasOriginalConversionIssuance(this))finalizeOriginalConversions(this,program,sourceLinks);
    finalizeOriginalPrimitiveTryFrom(this,program,sourceLinks);
    for(const entry of program.declarations.values())if(entry.constant){
      const result=evaluateCheckedConstant(program,entry.fullName,{sourceLinks,contracts:new Map(HOST_CONTRACTS.map(contract=>[contract.id,contract]))});
      if(result.status!=='value'||!result.proof.sourceLinksVerified)throw unsupported('constant evaluation',result.diagnostic?.reason??'requires fresh original parser source association',entry.span);
      entry.constantEvaluationProof=result.proof;
    }
    finalizeStaticArrays(this,program);finalizeRouterCoreBase64Program(this,program,sourceLinks);
    return program;
  }
}
const originalCloneCheckerMethods=originalMethodSnapshot(HostChecker.prototype);
function assertOriginalCloneChecker(checker){assertOriginalParserIdentity(checker,HostChecker.prototype,originalCloneCheckerMethods);}
// Reuse the definition-time complete Host checker method snapshot. This
// read-only guard issues no caller, type or checked-body capability.
export function requireOriginalPrimitiveTryFromChecker(checker){assertOriginalCloneChecker(checker);return checker;}
export function originalJsonCaptureCheckerEligible(checker){if(!jsonCheckerOriginQualified||!jsonCheckerApply(jsonCheckerHas,jsonCheckerOrigins,[checker]))return false;if(!originalDataFreezeIntrinsicsUnchanged())throw new TypeError('Owned JSON original checker native operations changed');requireOriginalPrimitiveTryFromChecker(checker);return true;}
export class HostEmitter extends withJsonMacroEmitter(EffectEmitter) {
  constructor(program,state){const reserve=node=>{if(!node||typeof node!=='object')return;if(node.k==='routerHostCall'&&node.contract)state.reserved.add('ml_host_'+node.id);for(const value of Object.values(node))Array.isArray(value)?value.forEach(reserve):reserve(value);};program.items.forEach(reserve);super(program,state);this.copyTypes=new Set(program.items.filter(entry=>entry.impl?.copyCertificate?.verified).map(entry=>entry.params.find(param=>param.copyReceiver)?.type.name));state.reserved.add('ml_host_router_core_json_map').add('ml_host_router_core_json_filter_map');this.hosts=new Set();this.schemas=new Map();this.instantiations=new Map();this.optionCallbacks=false;this.sharedGuardVariable='ml_shared_immutable_value';for(let index=2;state.claimed.has(this.sharedGuardVariable);index++)this.sharedGuardVariable='ml_shared_immutable_value_'+index;state.reserved.add(this.sharedGuardVariable);this.stringBytesHelper='ml_string_bytes';for(let index=2;state.claimed.has(this.stringBytesHelper);index++)this.stringBytesHelper='ml_string_bytes_'+index;state.reserved.add(this.stringBytesHelper);for(const name of ['ml_string_bytes','ml_reverse_split_find','ml_option_string_as_deref','ml_result_collect','ml_result_map_err','ml_csv_split','ml_csv_split_next','ml_csv_allocate','ml_str_lines','ml_str_split_whitespace','ml_str_next','ml_str_join','ml_copy_fixed_array','ml_assert_immutable_copy','ml_validate_rust_value','ml_validate_json_number','ml_validate_json_map','ml_validate_duration','ml_host_duration_as_secs','ml_host_option_bind','ml_create_vector_runtime','ml_create_integer_runtime','ml_create_fixed_integer_runtime','ml_host_option_map','ml_host_option_map_or','ml_host_result_ok','ml_host_bool_then','ml_host_bool_then_some','ml_primitive_bool_from','ml_integer_cast','ml_integer_shift','ml_static_array_values','ml_static_array_element'])state.reserved.add(name);for(const contract of HOST_CONTRACTS)state.reserved.add('ml_host_'+contract.id);}
  parameterGuard(param) {
    const constructorGuards=this.constructorParameterGuards(param);
    if(originalCloneReceiverParameter(this,param)){this.copyReceivers=true;return [...constructorGuards,`ml_assert_immutable_copy(${param.name});`,this.valueGuard(param.name,param.type)+';'];}
    if(param.type.kind==='array'&&param.type.rustFixedArray) {
      fixedArrayCopyCells(param.type,param.span);this.fixedArrays=true;
      return [...constructorGuards,`${param.name} = ml_copy_fixed_array(${param.name}, ${JSON.stringify(runtimeValueType(param.type))});`,this.valueGuard(param.name,param.type)+';'];
    }
    if(needsCharacterValueGuard(param.type))return [...constructorGuards,this.valueGuard(param.name,param.type)+';'];
    // The portable bounds helper compares values. Reject non-BigInts before
    // that helper can invoke a hostile object's conversion hooks.
    if(param.type.kind==='fixed')return [...constructorGuards,`if (typeof ${param.name} !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');`,...super.parameterGuard(param)];
    const hasData=type=>type.kind==='data'||type.kind==='named'||type.kind==='array'&&(type.rustFixedArray||hasData(type.element));
    if(!hasData(param.type)&&param.type.kind!=='float')return [...constructorGuards,...(this.iteratorParameterGuards?.(param)??[]),...super.parameterGuard(param)];
    // A helper's guard must depend only on its actual reachable parameter
    // layout, not on unrelated callers in another checked dependency closure.
    return [...constructorGuards,...(this.iteratorParameterGuards?.(param)??[]),...(this.patternParameterGuards?.(param)??[]),...((param.copyReceiver||param.type.kind==='data'&&this.copyTypes.has(param.type.name))?(this.copyReceivers=true,[`ml_assert_immutable_copy(${param.name});`]):[]),this.valueGuard(param.name,param.type)+';'];
  }
  valueGuard(value,type) {
    const all=valueSchema(this.program.declarations),types={};
    const visit=type=>{
      if(type.kind==='array')return visit(type.element);
      if(type.kind==='named')type={kind:'data',name:(type.path[0]==='crate'?type.path.slice(1):type.path).join('.')};
      if(type.kind!=='data'||types[type.name])return;
      const entry=all.types[type.name];if(!entry)throw new Error('missing checked value layout');types[type.name]=entry;
      for(const ctor of entry.ctors)for(const field of ctor.fields)visit(field.type);
    };visit(type);
    const schema={schemaVersion:1,types:Object.fromEntries(Object.entries(types).sort(([a],[b])=>a.localeCompare(b)))};
    const key=createHash('sha256').update(JSON.stringify(schema)).digest('hex');this.schemas.set(key,schema);
    const schemaName='ml_host_value_schema_'+key,refinementsName='ml_host_value_refinements_'+key;this.state.reserved.add(schemaName).add(refinementsName);
    return `ml_validate_rust_value(${value}, ${JSON.stringify(runtimeValueType(type))}, ${schemaName}, { refinements: ${refinementsName} })`;
  }
  fn(entry){const restoreBase64=prepareRouterCoreBase64Emission(this,entry,HostChecker),restoreJsonProjection=prepareOriginalJsonProjectionEmission(this,entry,HostChecker),restore=preparePinnedStandardFunction(this,entry,HostRustParser,HostChecker),restoreShared=prepareOriginalSharedBodies(this,entry,HostRustParser,HostChecker),restoreMapped=prepareOriginalMappedBodies(this,entry,HostRustParser,HostChecker),restoreCallbacks=prepareOriginalOptionCallbacks(this,entry,HostRustParser,HostChecker),restoreFrames=prepareOriginalSourceFrames(this,entry),restoreConversions=prepareOriginalConversionFunction(this,entry),restoreTryFrom=prepareOriginalPrimitiveTryFrom(this,entry),restorePatterns=sourcePatterns.prepareOriginalSharedPatterns(this,entry),restoreClones=prepareOriginalCloneEmission(this,entry),prior=this.constMatchFunction;this.constMatchFunction=this.state.localName(entry.fullName);try{return super.fn(entry);}finally{this.constMatchFunction=prior;restoreClones?.();restorePatterns?.();restoreTryFrom?.();restoreConversions?.();restoreFrames?.();restoreCallbacks?.();restoreMapped?.();restoreShared?.();restore?.();restoreJsonProjection?.();restoreBase64?.();}}
  statements(node,...args){
    if(node.k==='routerOriginalSharedPatternMatch'&&node.sourceSharedPatternProof?.functionTail===true)return sourcePatterns.withOriginalSharedPatternEmission(this,node,body=>this.statements(body,...args));
    if(node.k==='routerOrderedMatchArms'&&node.functionTail===true)sourcePatterns.requireOriginalSharedPatternNodeEmission(this,node);
    const declaration=node.k==='let'&&node.value.type.kind==='data'?this.program.declarations.get(node.value.type.name):null;
    // A concrete constructor initializer must retain its complete checked
    // union for later exhaustive Rust branches. This is TypeScript-only
    // annotation evidence; it neither changes JavaScript nor grants a type.
    if(node.k==='let'&&(typeof node.constMatchSourceEvidence==='string'||declaration?.k==='data'&&declaration.ctors.length>1)&&this.checkedLocalBindings)this.checkedLocalBindings.push({function:this.constMatchFunction,name:node.name,type:structuredClone(node.value.type)});
    return super.statements(node,...args);
  }
  expr(node) {
    const character=emitCharacterExpression(this,node);if(character!==null)return character;
    if(node.k==='routerOriginalPrimitiveTryFrom')return this.expr(requireOriginalPrimitiveTryFromBody(node,this));
    if(node.k==='routerSourceConversion')return this.expr(requireOriginalConversionEmission(node,this));
    if(node.k==='routerCheckedCloneBody')return this.expr(requireOriginalCloneEmission(node,this));
    if(node.k==='routerCheckedCloneFieldBorrow')return this.expr(requireOriginalCloneFieldEmission(node,this));
    if(['routerOriginalCallbackLoan','routerOriginalStandardFrame'].includes(node.k)&&sourcePatterns.originalSharedPatternNestedFrameEmission(this,node)){
      assertOriginalSourceFrameEnvelope(node,this.program);
      if(!sourcePatterns.originalSharedPatternNestedFrameEmission(this,node))throw new Error('Original standard frame/loan changed inside its private shared tail frame');
      return node.k==='routerOriginalCallbackLoan'?this.expr(node.value):`(() => {\n${this.statements(node.body).join('\n')}\n})()`;
    }
    if(node.k==='routerOriginalCallbackLoan')return this.expr(requireOriginalSourceFrameEmission(this,node));
    if(node.k==='routerOriginalStandardFrame')return `(() => {\n${this.statements(requireOriginalSourceFrameEmission(this,node)).join('\n')}\n})()`;
    if(node.k==='routerOriginalSharedDomainGuard'){this.copyReceivers=true;return `(() => { const ${this.sharedGuardVariable} = ${this.expr(node.value)}; ml_assert_immutable_copy(${this.sharedGuardVariable}); return ${this.sharedGuardVariable}; })()`;}
    if(node.k==='routerOriginalMappedBody')return this.expr(requireOriginalMappedEmission(this,node));
    if(node.k==='routerPinnedOptionCallbackBody')return this.expr(requireOriginalOptionCallbackEmission(this,node));
    if(node.k==='routerPinnedSharedBody')return this.expr(requireOriginalSharedEmission(this,node));
    if(node.k==='routerStaticArrayElement'){const proof=requireStaticArrayElement(node,this.program,HostChecker);this.staticArrayElements=true;return `ml_static_array_element(${JSON.stringify(proof.storageKey)}, () => ${this.expr(node.array)}, ${this.expr(node.index)})`;}
    if(node.k==='routerSourceUnitEnumCast')return this.expr(requireUnitEnumCast(node,this.program,HostChecker));
    if(['routerPrimitiveIntegerCast','routerPrimitiveIntegerShift'].includes(node.k)){
      const proof=requirePrimitiveOperator(node);this.primitiveOperators=true;
      this.state.encode('rust-primitive-integer-operators','Actual by-value primitive integer cast and shift nodes, exact two-complement BigInt ABI and checked shift counts; no trait or pointer authority.');
      if(node.k==='routerPrimitiveIntegerCast')return `ml_integer_cast(${this.expr(node.value)}, ${node.value.type.bits}, ${node.value.type.signed}, ${node.type.bits}, ${node.type.signed})`;
      return `ml_integer_shift(${this.expr(node.left)}, ${this.expr(node.right)}, ${node.type.bits}, ${node.type.signed}, ${node.right.type.bits}, ${node.right.type.signed}, ${JSON.stringify(proof.operation)})`;
    }
    if(node.k==='routerPinnedStandardBody'){requirePinnedStandardEmission(this,node,HostRustParser,HostChecker);return this.expr(node.body);}
    if(node.sourceByteLiteral)requireByteLiteral(node,true);
    if(node.k==='routerReverseSplitFind'){requireReverseStringProof(node);this.reverseStrings=true;return `ml_reverse_split_find(${this.expr(node.base.object)}, ${JSON.stringify(node.base.delimiter)}, Object.freeze([${node.maps.map(map=>this.expr(map)).join(', ')}]), ${this.expr(node.predicate)})`;}
    if(node.k==='routerOriginalSharedPatternMatch')return sourcePatterns.withOriginalSharedPatternEmission(this,node,body=>this.expr(body));
    if(node.k==='routerSourcePatternStringView'){sourcePatterns.requireOriginalSharedPatternNodeEmission(this,node);return this.expr(node.value);}
    if(node.k==='routerSourcePatternProjection'){sourcePatterns.requireOriginalSharedPatternNodeEmission(this,node);return `(${this.expr(node.object)})[${JSON.stringify(node.field)}]`;}
    if(node.k==='routerOptionAsDeref'){requireOptionDerefProof(node);this.optionDeref=true;return `ml_option_string_as_deref(${this.expr(node.object)})`;}
    if(['routerResultCollect','routerResultMapErr'].includes(node.k)){
      requireResultIteratorProof(node);this.resultIterators=true;
      return node.k==='routerResultCollect'?`ml_result_collect(${this.expr(node.object)})`:`ml_result_map_err(${this.expr(node.object)}, ${this.expr(node.callback)})`;
    }
    if(['routerStringSplit','routerStringSplitNext','routerAllocatingStringItem'].includes(node.k)){
      requireCsvEmitterProof(node);this.csvStrings=true;
      const operation={routerStringSplit:'split',routerStringSplitNext:'split_next',routerAllocatingStringItem:'allocate'}[node.k];
      return `ml_csv_${operation}(${this.expr(node.object)}${node.k==='routerStringSplit'?', '+JSON.stringify(node.delimiter):''})`;
    }
    if(['routerStringLines','routerStringWords','routerStringNext','routerStringJoin'].includes(node.k)) {
      if(node.stringIteratorProof?.verified!==true||node.stringIteratorProof.profile!=='rust-1.89-borrowed-string-iterators')throw new Error('missing checked standard string iterator proof');
      if(node.k==='routerStringWords'&&(node.whitespaceIteratorProfile?.id!=='rust-1.89-split-whitespace-v1'||node.whitespaceIteratorProfile.sourceInputsVerified!==true))throw new Error('missing checked standard whitespace source profile');
      this.stringIterators=true;
      const operation={routerStringLines:'lines',routerStringWords:'split_whitespace',routerStringNext:'next',routerStringJoin:'join'}[node.k];
      return `ml_str_${operation}(${this.expr(node.object)}${node.separator?', '+this.expr(node.separator):''})`;
    }
    if(node.k==='routerStringBytes'){requireStringBytesProof(node);this.stringBytesRuntime=true;return `${this.stringBytesHelper}(${this.expr(node.object)})`;}
    if(node.k==='routerUtf16Iterator'){this.utf16Runtime=true;return `ml_encode_utf16(${this.expr(node.object)})`;}
    if(node.k==='routerFixedF64Cast'){this.fixedF64Runtime=true;return `ml_fixed_to_f64(${this.expr(node.object)}, ${JSON.stringify(node.sourceType.rustPrimitiveName)})`;}
    if(node.k==='routerTemporaryStringCallBorrow')return this.expr(node.object);
    if(node.k==='array'&&node.type?.rustFixedArray) {
      this.fixedArrays=true;
      return `ml_copy_fixed_array([${node.items.map(item=>this.expr(item)).join(', ')}], ${JSON.stringify(runtimeValueType(node.type))})`;
    }
    if(node.type?.kind==='array'&&node.type.rustFixedArray) {
      this.fixedArrays=true;
      const value=node.k==='routerOrderedMatchArms'?emitOrderedMatch(this,node):node.k==='routerStandardSharedReceiver'?this.expr(node.object):super.expr(node);
      return `ml_copy_fixed_array(${value}, ${JSON.stringify(runtimeValueType(node.type))})`;
    }
    if(node.k==='routerOrderedMatchArms')return emitOrderedMatch(this,node);
    if(node.k==='routerStandardSharedReceiver')return this.expr(node.object);
    if(node.k==='routerSharedArrayLiteral'){if(!node.arrayBorrowProof?.verified)throw new Error('missing checked shared array origin proof');return `Object.freeze(${this.expr(node.value)})`;}
    if(node.k==='routerPrimitiveDereference')return this.expr(node.value);
    if(node.k==='routerPrimitiveIdentityFrom'){requirePrimitiveIdentityFromEvidence(node.sourcePrimitiveIdentityFromBody,node.value.type);requirePrimitiveBoolFromScope(node.sourceCallerTraitScope,node.type);if(node.type.kind!==node.value.type.kind||node.type.rustPrimitiveName!==(node.value.type.kind==='bool'?'bool':node.value.type.rustPrimitiveName)||node.constEligible!==false)throw new Error('missing checked original generic identity From operation');this.state.encode('original-primitive-identity-from','Actual generic From<T> for T member, privately bound original T/Self, explicit primitive Sized assumption and original caller trait scope; pointer identities remain legacy and unpromoted.');return this.expr(node.value);}
    if(node.k==='routerPrimitiveFixedFrom'){if(node.value.type.kind!=='fixed'||node.value.type.rustReference||node.type.kind!=='fixed'||node.sourcePrimitiveFromBody?.checkedOperation?.kind!=='primitive-fixed-infallible-cast'||node.sourcePrimitiveFromBody.constTraitCall!==false)throw new Error('missing checked original fixed From operation');this.state.encode('original-primitive-fixed-from','Complete actual primitive From macro invocation/member, shared original caller trait scope, infallible typed cast and exact BigInt value; pointer/generic identity remains legacy and unpromoted.');return this.expr(node.value);}
    if(node.k==='routerPrimitiveBoolFrom'){if(node.value.type.kind!=='bool'||node.value.type.rustReference||node.type.kind!=='fixed'||node.sourcePrimitiveBoolFromBody?.constTraitCall!==false)throw new Error('missing checked original Boolean From operation');this.primitiveBoolFrom=true;this.state.encode('original-primitive-bool-from','Actual non-const From<bool> macro member, private original caller trait scope and exact boolean ABI; no generic trait or numeric formatter authority.');return `ml_primitive_bool_from(${this.expr(node.value)})`;}
    if(['routerConstObligation','routerBuiltinConversion'].includes(node.k))return this.expr(node.value);
    if(node.k==='routerStandardMethod'){this.standardMethods=true;return `ml_host_${node.operation}(${this.expr(node.value)}${node.argument?', '+this.expr(node.argument):''}${node.defaultValue?', '+this.expr(node.defaultValue):''}${node.callback?', '+this.expr(node.callback):''})`;}
    if(node.k==='routerCoreJsonCollection'){requireOriginalJsonProjectionEmission(this,node);this.jsonCollections=true;return `ml_host_${node.id}(${this.expr(node.args[0])}, ${this.expr(node.args[1])})`;}
    if(node.k==='routerOptionCallback'){this.optionCallbacks=true;return `ml_host_option_bind(${this.expr(node.value)}, ${this.expr(node.callback)}, ${JSON.stringify(node.op)})`;}
    if(node.k!=='routerHostCall')return super.expr(node);
    requireRouterCoreBase64Emission(this,node);requireOriginalJsonProjectionEmission(this,node);
    const contract=node.contract??HOST_CONTRACTS.find(contract=>contract.id===node.id);if(!contract)throw new Error('missing checked host contract');
    if(contract.family==='vector') {
      const guard=this.valueGuard('values',contract.runtimeInstantiation.validatorType);
      this.instantiations.set(contract.id,`const ml_host_${contract.id} = ml_create_vector_runtime(values => ${guard}).${contract.jsExport};`);
    }
    if(contract.family==='fixed')this.instantiations.set(contract.id,`const ml_host_${contract.id} = ml_create_fixed_integer_runtime(${JSON.stringify(contract.runtimeInstantiation.type)}).${contract.jsExport};`);
    if(contract.family==='integer'&&contract.runtimeInstantiation) this.instantiations.set(contract.id,`const ml_host_${contract.id} = ml_create_integer_runtime(${JSON.stringify(contract.runtimeInstantiation.type)}).${contract.jsExport};`);
    this.hosts.add(contract.id);this.state.encode('host-contract-'+contract.id,contract.assumptions.join(' '));
    return `ml_host_${contract.id}(${node.args.map(arg=>this.expr(arg)).join(', ')})`;
  }
  file() {
    const result=super.file(),preludes=[...result.preludes];
    if(this.primitiveOperators)preludes.unshift(`import { integerCast as ml_integer_cast, integerShift as ml_integer_shift } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'primitive-operator-runtime.mjs'))};`);
    if(this.primitiveBoolFrom)preludes.unshift(`import { primitiveBoolFrom as ml_primitive_bool_from } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'primitive-bool-from-runtime.mjs'))};`);
    if(this.stringIterators)preludes.unshift(`import { stringLines as ml_str_lines, stringWhitespace as ml_str_split_whitespace, stringNext as ml_str_next, stringJoin as ml_str_join } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'string-iterator-runtime.mjs'))};`);
    if(this.csvStrings)preludes.unshift(`import { stringSplitCharacter as ml_csv_split, stringSplitNext as ml_csv_split_next, allocateStringItem as ml_csv_allocate } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'csv-string-runtime.mjs'))};`);
    if(this.resultIterators)preludes.unshift(`import { collectResult as ml_result_collect, mapResultError as ml_result_map_err } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'result-iterator-runtime.mjs'))};`);
    if(this.optionDeref)preludes.unshift(`import { optionStringAsDeref as ml_option_string_as_deref } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'option-deref-runtime.mjs'))};`);
    if(this.reverseStrings)preludes.unshift(`import { reverseFindCharacterSplit as ml_reverse_split_find } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'reverse-string-runtime.mjs'))};`);
    if(this.stringBytesRuntime)preludes.unshift(`import { stringBytes as ${this.stringBytesHelper} } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'string-bytes-runtime.mjs'))};`);
    if(this.utf16Runtime||this.fixedF64Runtime)preludes.unshift(`import { ${[...(this.utf16Runtime?['encodeUtf16 as ml_encode_utf16']:[]),...(this.fixedF64Runtime?['fixedToF64 as ml_fixed_to_f64']:[])].join(', ')} } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'utf16-fixed-f64-runtime.mjs'))};`);
    if(this.fixedArrays)preludes.unshift(`import { copyFixedArray as ml_copy_fixed_array } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'fixed-array-runtime.mjs'))};`);
    if(this.staticArrayElements)preludes.unshift(`const ml_static_array_values = new Map(); function ml_static_array_element(key, initialize, index) { let array = ml_static_array_values.get(key); if (!array) { array = initialize(); ml_static_array_values.set(key, array); } if (index < 0n || index >= BigInt(array.length)) throw new RangeError('index out of bounds'); return array[Number(index)]; }`);
    if(this.copyReceivers)preludes.unshift(`import { assertImmutableCopy as ml_assert_immutable_copy } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'copy-runtime.mjs'))};`);
    if([...this.instantiations.keys()].some(id=>id.startsWith('rust_fixed_')))preludes.unshift(`import { createFixedIntegerRuntime as ml_create_fixed_integer_runtime } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'fixed-integer-runtime.mjs'))};`);
    if([...this.instantiations.keys()].some(id=>id.startsWith('rust_integer_')))preludes.unshift(`import { createIntegerRuntime as ml_create_integer_runtime } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'integer-runtime.mjs'))};`);
    if([...this.instantiations.keys()].some(id=>id.startsWith('rust_vec_')))preludes.unshift(`import { createVectorRuntime as ml_create_vector_runtime } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'vector-runtime.mjs'))};`);
    for(const family of ['base64','json','json-update','time','integer','float','string-iterator']) {
      const used=HOST_CONTRACTS.filter(contract=>contract.family===family&&this.hosts.has(contract.id));
      if(used.length)preludes.unshift(`import { ${used.map(contract=>`${contract.jsExport} as ml_host_${contract.id}`).join(', ')} } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,`${family}-runtime.mjs`))};`);
    }
    if(this.schemas.size){
      preludes.unshift(`import { validateRustValue as ml_validate_rust_value } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'type-layout-runtime.mjs'))};`);
      let json=false,time=false;
      for(const [schemaKey,schema] of this.schemas){
        const refinements=[];
        // Explicit contract metadata survives qualified and flattened paths.
        for(const entry of this.program.declarations.values())if(entry.k==='data'&&Object.hasOwn(schema.types,entry.fullName)) {
          const key=pathKey(entry.hostTypePath??[]);
          if(key===pathKey(JSON_TYPES.number.path)){json=true;refinements.push(`[${JSON.stringify(entry.fullName)}, ml_validate_json_number]`);}
          if(key===pathKey(JSON_TYPES.map.path)){json=true;refinements.push(`[${JSON.stringify(entry.fullName)}, ml_validate_json_map]`);}
          if(key==='std::time::Duration'){time=true;refinements.push(`[${JSON.stringify(entry.fullName)}, ml_validate_duration]`);}
        }
        preludes.push(`const ml_host_value_schema_${schemaKey} = ${JSON.stringify(schema)};`);
        preludes.push(`const ml_host_value_refinements_${schemaKey} = new Map([${refinements.join(', ')}]);`);
      }
      if(json)preludes.unshift(`import { validateJsonNumber as ml_validate_json_number, validateJsonMap as ml_validate_json_map } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'json-values.mjs'))};`);
      if(time){preludes.unshift(`import { std_time_duration_as_secs as ml_host_duration_as_secs } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'time-runtime.mjs'))};`);preludes.push('function ml_validate_duration(value) { ml_host_duration_as_secs(value); return true; }');}
    }
    if(this.standardMethods)preludes.push(`function ml_host_bool_then_some(value, argument) { return value ? Object.freeze({ $: 'Some', field0: argument }) : Object.freeze({ $: 'None' }); }`, `function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }`, `function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }`, `function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }`, `function ml_host_option_map_or(value, defaultValue, callback) { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }`);
    if(this.jsonCollections)preludes.push(`import { router_core_json_map as ml_host_router_core_json_map, router_core_json_filter_map as ml_host_router_core_json_filter_map } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'json-collections-runtime.mjs'))};`);
    if(this.optionCallbacks)preludes.push(`function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }`);
    preludes.push(...this.instantiations.values());
    return {...result,preludes,text:[...preludes,...result.definitions].join('\n\n')};
  }
}
// Definition-time identities authenticate namespace callbacks without requiring
// a cursor prototype: bounded clause cursors retain their original token array.
const FROM_CALLBACK_NAMES=['builtinShadow','resolveSourceNamespace','resolve','inSourceNamespace','registeredGenericKind','hasResolvedSourceAlias'];
const FROM_CALLBACK_ROOTS=[];
for(let prototype=HostRustParser.prototype;prototype&&prototype!==Object.prototype;prototype=Object.getPrototypeOf(prototype))FROM_CALLBACK_ROOTS.push(Object.freeze({prototype,parent:Object.getPrototypeOf(prototype),descriptors:Object.freeze(Object.fromEntries(FROM_CALLBACK_NAMES.map(name=>[name,Object.getOwnPropertyDescriptor(prototype,name)])))}));
function sameCallbackDescriptor(actual,expected){return actual===undefined&&expected===undefined||!!actual&&!!expected&&actual.value===expected.value&&actual.get===expected.get&&actual.set===expected.set&&actual.configurable===expected.configurable&&actual.enumerable===expected.enumerable&&actual.writable===expected.writable;}
export function requireOriginalFromNamespaceCallbacks(parser){
  const fail=()=>{throw new TypeError('Primitive From namespace callbacks lost their original private source association with actual Host definitions');};
  if(!parser||nodeTypes.isProxy(parser))fail();
  let current=parser;
  while(current!==HostRustParser.prototype){
    if(!current||nodeTypes.isProxy(current)||FROM_CALLBACK_NAMES.some(name=>Object.hasOwn(current,name)))fail();current=Object.getPrototypeOf(current);
  }
  for(const root of FROM_CALLBACK_ROOTS){if(nodeTypes.isProxy(root.prototype)||Object.getPrototypeOf(root.prototype)!==root.parent||FROM_CALLBACK_NAMES.some(name=>!sameCallbackDescriptor(Object.getOwnPropertyDescriptor(root.prototype,name),root.descriptors[name])))fail();}
  return parser;
}
export const parseRust=(source,{shadowedEffectRoots,shadowedPreludeTypes,macroEvidence=macroProvenance(source),sourceScope,standaloneSourceContext,jsonMacroContext,jsonMacroModule,cargoManifest}={})=>{const parser=new HostRustParser(tokenizeRust(source));parser.shadowedEffectRoots=shadowedEffectRoots;parser.shadowedPreludeTypes=shadowedPreludeTypes;parser.shadowedBuiltinMacros=new Set(macroEvidence.shadowedNames);parser.shadowedImportedBindings=new Set(macroEvidence.importedNames);parser.unresolvedImportScope=macroEvidence.unresolvedImportScope;if(sourceScope)configureParserSourceScope(parser,sourceScope.scope,sourceScope.scopes,[]);if(jsonMacroContext)configureJsonMacroParser(parser,jsonMacroContext,jsonMacroModule);if(sourceScope?.matchesMacroContext)configureMatchesParserFromSourceScope(parser,sourceScope);else if(!sourceScope){if(standaloneSourceContext)configureMatchesMacroParser(parser,standaloneSourceContext.context,{file:standaloneSourceContext.file,offset:standaloneSourceContext.offset,allowEmptyMainCarrier:true});else{const context=standaloneMatchesMacroContext(source,{compilationProfile:parser.compilationProfile??null,cargoEditionContext:cargoManifest===undefined||cargoManifest===null?null:captureOriginalCargoEdition(cargoManifest)});configureMatchesMacroParser(parser,context,{file:'src/module.rs'});}}return linkParsedFile(parser,parser.file(),source,{scope:{macroEvidence,sourceScope:sourceScope?.scope??null,compilationProfile:sourceScope?.compilationProfile??null,configurationCondition:sourceScope?.configurationCondition??null}});};
export const checkProgram=(surface,{jsonParserProfile=DEFAULT_JSON_PARSER_PROFILE}={})=>{const checker=configureJsonCapabilities(new HostChecker(surface.language,surface.externals??[]),jsonParserProfile);const program=checker.program(surface);program.jsonParserProfile=jsonParserProfile;return program;};
export const checkProjectProgram=(surface,{jsonParserProfile=DEFAULT_JSON_PARSER_PROFILE,collectIndependentBodies=false}={})=>{const checker=configureJsonCapabilities(new HostChecker(surface.language,surface.externals??[]),jsonParserProfile);const program=checkCollectedDeclarationTypes(checker,surface,{collectIndependentBodies});program.jsonParserProfile=jsonParserProfile;return program;};
export const emitJavaScript=(program,{runtimeModule,reserved=[]}={})=>{let emitter;const result=emitWith(program,class extends HostEmitter{constructor(program,state){for(const name of reserved)state.reserved.add(name);super(program,state);this.runtimeModule=runtimeModule;this.checkedLocalBindings=[];emitter=this;}});return emitter.checkedLocalBindings.length?{...result,checkedLocalBindings:emitter.checkedLocalBindings}:result;};
