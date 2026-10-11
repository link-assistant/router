import {itemConfiguration} from '../cfg-profile.mjs';
import {createHash} from 'node:crypto';
// Crate contracts select operations by resolved paths and checked value types.
// They never supply a repository function body or waive a body obligation.
import {MethodRustParser,MethodChecker} from './methods.mjs';
import {withNestedMatchPatternsParser,withNestedMatchPatternsChecker} from './match-patterns.mjs';
import {parseStandardMatches,emitOrderedMatch} from './ordered-matches.mjs';
import {withSourceOwnershipParser,withSourceOwnershipChecker} from './ownership.mjs';
import {withSourceLifetimeChecker} from './source-lifetimes.mjs';
import {withSharedArrayBorrowChecker} from './array-borrows.mjs';
import {withFixedArrayParser,withFixedArrayChecker,fixedArrayCopyCells} from './fixed-arrays.mjs';
import {EffectEmitter,effectData} from './effects.mjs';
import {JSON_DATA,JSON_CONTRACTS,JSON_TYPES} from './json-contracts.mjs';
import {INTEGER_DATA,INTEGER_ERROR_CONTRACTS} from './integer-contracts.mjs';
import {planStandardMethod,completeStandardMethod} from './standard-method-plans.mjs';
import {rustFixedType} from '../checked-types.mjs';
import {decodeRustFloat,RUST_FLOAT_LITERAL_PROFILE} from './rust-float.mjs';
import {FLOAT_CONTRACTS,SOURCE_F64,primitiveFloatContract,primitiveFloatConstant,requirePrimitiveFloat,qualifyPrimitiveFloatResult,checkedPrimitiveFloatConstant} from './primitive-float-contracts.mjs';
import {floatSignObligation,withFloatZeroSignChecker} from './float-zero-refinements.mjs';
import {checkedUtf16Iterator,checkedFixedF64Cast,prepareTemporaryStringCall,consumeTemporaryStringCallBorrow} from './utf16-fixed-f64.mjs';
import {TIME_DATA,TIME_CONTRACTS} from './time-contracts.mjs';
import {EFFECT_CONTRACTS} from './effects-contracts.mjs';
import {emitWith} from './core.mjs';
import {tokenizeRust} from './lexical.mjs';
import {sameType,fixedBounds} from '../checked-types.mjs';
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

export const HOST_CONTRACTS=[...FLOAT_CONTRACTS,...JSON_CONTRACTS.map(contract=>({...contract,family:'json',pure:true,constEligible:false})),...TIME_CONTRACTS.map(contract=>({...contract,family:'time'})),...INTEGER_ERROR_CONTRACTS.map(contract=>({...contract,family:'integer',assumptions:['Registered standard ParseIntError layout and source-derived diagnostic behavior.']}))];
const pathKey=path=>path.filter((part,index)=>index!==0||part!=='crate').join('::');
const span=(start,end)=>({start:start.start,end:end.end});
const runtimeValueType=type=>type.kind==='fixed'?{kind:'fixed',bits:type.bits,signed:type.signed}:type.kind==='array'?{kind:'array',element:runtimeValueType(type.element),...(type.rustFixedArray?{rustFixedArray:{length:type.rustFixedArray.length}}:{})}:type.kind==='named'?{kind:'data',name:(type.path[0]==='crate'?type.path.slice(1):type.path).join('.')}:type.kind==='data'?{kind:'data',name:type.name}:{kind:type.kind};
const nonlocalDefault=node=>node&&typeof node==='object'&&(['routerReturn','routerBreak','routerContinue','routerTry','routerAwait'].includes(node.k)||Object.entries(node).some(([key,value])=>key!=='type'&&(Array.isArray(value)?value.some(nonlocalDefault):nonlocalDefault(value))));
const INHERENT_FIXED_COPY=new Set(['checked_add','checked_sub','checked_mul','saturating_add','saturating_sub','saturating_mul']);
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
export const INTEGER_FROM_PROFILE=Object.freeze({rust:'1.89.0',source:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/convert/num.rs',sha256:'270e0801e5e23cba89fec51eed416be60743034a6f02c5fe64be2e8f2e8ca958',lines:[99,141],identity:{source:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/library/core/src/convert/mod.rs',sha256:'0b05be0bc9c7d92d788abd6817d648b4479ed6e29ffe24cfd6879e09ee9fbdab',line:774}});
const integerFromSources=Object.freeze({u8:[],u16:['u8'],u32:['u8','u16'],u64:['u8','u16','u32'],u128:['u8','u16','u32','u64'],usize:['u8','u16'],i8:[],i16:['i8','u8'],i32:['i8','i16','u8','u16'],i64:['i8','i16','i32','u8','u16','u32'],i128:['i8','i16','i32','i64','u8','u16','u32','u64'],isize:['i8','i16','u8']});
export const hasIntegerFrom=(source,target)=>Object.hasOwn(integerFromSources,target)&&(source===target||integerFromSources[target].includes(source));
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
  merge(result,effectData());merge(result,JSON_DATA);merge(result,TIME_DATA);merge(result,INTEGER_DATA);return result;
}
const builtins=()=>new Set([...HOST_CONTRACTS,...EFFECT_CONTRACTS].flatMap(contract=>contract.rustPath.map((_,index)=>pathKey(contract.rustPath.slice(0,index+1)))).concat(Object.values(JSON_TYPES).map(type=>pathKey(type.path)),['serde_json::json','std::str::FromStr','std::option::Option','std::result::Result']));
export class HostRustParser extends withCapturedSourceParser(withSourceNamespaceParser(withNestedMatchPatternsParser(withSourceOwnershipParser(withFixedArrayParser(MethodRustParser))))) {
  tupleType(fields,location) {return {...super.tupleType(fields,location),rustTupleLifetimeFields:fields.map(field=>structuredClone(field.type))};}
  genericType(kind,types,range){const type=super.genericType(kind,types,range),entry=this.genericTypes.get(type.path.at(-1));return {...type,rustStandardGeneric:{kind,arguments:structuredClone(entry.standardGeneric.arguments)}};}
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
    if(name.value==='encode_utf16')return {k:'routerUtf16Encode',object,args,span:range};
    if(name.value!=='parse')return super.method(object,name,args,range);
    return this.instantiatedMethod(object,name,args,null,range);
  }
  unary(path,options) {
    if(this.cursor.is('&')&&this.cursor.is('[',1)) {
      const c=this.cursor,start=c.index,first=c.next(),value=this.unary(path,{}),tokens=c.tokens.slice(start,c.index);
      return {k:'routerSharedArrayLiteral',value,span:{start:first.start,end:tokens.at(-1).end},sourceArrayBorrow:{tokens:tokens.map(token=>({kind:token.kind,value:token.value,span:{start:token.start,end:token.end}}))}};
    }
    if(this.cursor.is('&')&&!this.cursor.is('mut',1)) {
      const first=this.cursor.peek(),value=super.unary(path,options);
      // Preserve only written borrows of actual allocation candidates. Their
      // authority is checked later against an ordinary scalar-returning call.
      const operand=value.k==='routerTextReference'?value.value:null;
      const allocation=operand?.k==='routerDispatchMethod'&&!operand.args.length?operand.fallback:operand;
      if(allocation&&(allocation.k==='toString'||allocation.k==='routerStringOwnership'&&allocation.operation==='to_owned'||allocation.k==='routerBuiltinConversion'&&allocation.operation==='String::from'||allocation.k==='routerOwnedString'))return {...value,sourceAmpersand:{value:'&',span:{start:first.start,end:first.end}}};
      return value;
    }
    const first=this.cursor.peek();if(!this.cursor.eat('*'))return super.unary(path,options);
    const value=this.unary(path,{});return {k:'routerPrimitiveDereference',value,sourceFeature:'explicit-dereference',span:{start:first.start,end:value.span.end}};
  }
  type(){
    const c=this.cursor,start=c.index,type=this.hostTypeSyntax();
    return this.qualifyOwnershipType?.(type,c.tokens.slice(start,c.index))??type;
  }
  hostTypeSyntax(){
    const c=this.cursor;
    // && is one lexer token, but two borrows only in a source type position.
    // Split its coordinates here; boolean expression tokens remain untouched.
    if(c.is('&&')){const token=c.peek();c.tokens=[...c.tokens.slice(0,c.index),{...token,value:'&',end:token.start+1},{...token,value:'&',start:token.start+1},...c.tokens.slice(c.index+1)];}
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
    const registered=builtins();
    const resolve=full=>full[0]==='self'?['crate',...path,...full.slice(1)]:full[0]==='super'?['crate',...path.slice(0,-1),...full.slice(1)]:full;
    const tree=prefix=>{
      if(c.eat('{')){while(!c.is('}')){tree(prefix);if(!c.eat(','))break;}c.expect('}','use');return;}
      const segment=c.identifier('use').value,full=[...prefix,segment];if(c.eat('::')){tree(full);return;}
      const alias=c.eat('as')?c.identifier('alias').value:segment;
      if(!['crate','self','super'].includes(full[0]) && !registered.has(pathKey(full)) && !['std::io::Error','std::io::Result','std::env::VarError'].includes(pathKey(full)))throw unsupported(`use ${pathKey(full)}`,'import requires a checked crate or registered host contract',span(start,c.peek()));
      if(aliases.has(alias)){aliases.set(alias,['crate','ml_unresolved_import_alias',alias]);throw typeError(`ambiguous import alias ${alias}`,span(start,c.peek()));}
      aliases.set(alias,resolve(full));
    };
    tree([]);c.expect(';','use');
  }
  primary(path,options) {
    if(this.cursor.peek().kind==='rustFloat') {
      const token=this.cursor.next();
      return {k:'num',value:token.value,type:FLOAT,sourceFloatLiteral:{profile:RUST_FLOAT_LITERAL_PROFILE.id,raw:token.raw,bits:token.floatBits,suffix:token.suffix},span:{start:token.start,end:token.end}};
    }
    const c=this.cursor,first=c.peek();if(first.kind!=='identifier'){
      const value=super.primary(path,options);
      return first.kind==='number'&&rustFixedType(first.suffix)&&value.k==='num'?{...value,type:{...value.type,rustPrimitiveName:first.suffix}}:value;
    }
    let offset=1;const segments=[first.value];while(c.is('::',offset)&&c.peek(offset+1).kind==='identifier'){segments.push(c.peek(offset+1).value);offset+=2;}
    const resolved=this.resolve(segments,path),owner=segments.slice(0,-1),operation=segments.at(-1),fixed=rustFixedType(owner.at(-1));
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
    const stringItem=segments.length===2&&segments[0]==='str'&&operation==='to_owned'&&!this.builtinShadow('str',path);
    if((fixedItem||stringItem)&&!c.is('(',offset)&&!c.is('::',offset)) {
      for(let index=0;index<offset;index++)c.next();
      return {k:'routerStandardFunctionItem',operation:segments.join('::'),method:operation,...(fixedItem?{ownerType:{...fixed,rustPrimitiveName:owner[0]}}:{}),sourceFunctionItem:{profile:fixedItem?'rust-1.89-primitive-inherent-function-item':'rust-1.89-str-to-owned-function-item',path:resolved,span:span(first,c.peek())},span:span(first,c.peek())};
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
    if(segments.length===2&&!this.builtinShadow(segments[0],path)&&c.is('(',offset)&&((segments[0]==='Box'&&operation==='new')||(segments[0]==='String'&&operation==='from')||(rustFixedType(segments[0])&&operation==='from'))) {
      for(let index=0;index<offset;index++)c.next();c.expect('(','standard conversion');const args=[];while(!c.is(')')){args.push(this.expr(path));if(!c.eat(','))break;}c.expect(')','standard conversion');
      if(args.length!==1)throw typeError('standard conversion requires one argument',span(first,c.peek()));const target=rustFixedType(segments[0]);return {k:'routerBuiltinConversion',operation:segments.join('::'),value:args[0],target:target?{...target,rustPrimitiveName:segments[0]}:null,targetName:segments[0],constEligible:false,span:span(first,c.peek())};
    }
    const contracts=HOST_CONTRACTS.filter(contract=>contract.family!=='float'&&pathKey(contract.rustPath)===pathKey(resolved));
    if(!contracts.length)return super.primary(path,options);
    if(!c.is('(',offset)&&!(c.is('::',offset)&&c.is('<',offset+1)))return super.primary(path,options);
    if(resolved[0]==='crate'||this.shadowedEffectRoots?.has(resolved[0]))throw unsupported('shadowed host namespace','requires actual crate resolution',span(first,c.peek()));
    for(let index=0;index<offset;index++)c.next();let instantiation;
    if(c.eat('::')){c.expect('<','host type instantiation');instantiation=this.type();c.expect('>','host type instantiation');}
    c.expect('(','host operation');const args=[];while(!c.is(')')){args.push(this.expr(path));if(!c.eat(','))break;}c.expect(')','host operation');
    return {k:'routerHostCall',path:resolved,args,instantiation,span:span(first,c.peek())};
  }
}
export class HostChecker extends withCheckedSourceLinks(withFloatZeroSignChecker(withSourceLifetimeChecker(withSharedArrayBorrowChecker(withNestedMatchPatternsChecker(withSourceOwnershipChecker(withFixedArrayChecker(MethodChecker))))))) {
  constructor(language,externals){super(language,externals);this.instantiations=new HostInstantiations(this);this.sourceLifetimeHostContracts=HOST_CONTRACTS;}
  resolveType(type,path,range){const resolved=super.resolveType(type,path,range);return {...resolved,...(type?.rustTupleLifetimeFields?{rustTupleLifetimeFields:type.rustTupleLifetimeFields.map(field=>this.resolveType(field,path,range))}:{}),...(type?.patternOwnershipRefusal?{patternOwnershipRefusal:type.patternOwnershipRefusal}:{}),...(type?.rustReference?{rustReference:{...type.rustReference,...(type.rustReference.pointee?{pointee:this.resolveType(type.rustReference.pointee,path,range)}:{})}}:{}),...(type?.rustGenericIdentityUnresolved?{rustGenericIdentityUnresolved:true}:{}),...(type?.rustStandardGeneric?{rustStandardGeneric:{kind:type.rustStandardGeneric.kind,arguments:type.rustStandardGeneric.arguments.map(argument=>this.resolveType(argument,path,range))}}:{})};}
  normalisePattern(pattern,type,span) {
    if(pattern.registeredGenericOwner){
      const entry=type.kind==='data'?this.items.get(type.name):null;
      if(entry?.standardGeneric?.kind!==pattern.registeredGenericOwner)throw typeError('registered pattern owner differs from its checked generic layout',span);
      return super.normalisePattern({...pattern,path:[type.name,pattern.path.at(-1)]},type,span);
    }
    return super.normalisePattern(pattern,type,span);
  }
  hostLambda(node,types,env,path,expected,context) {
    if(node.k==='routerLambda')return this.lambda(node,types,env,path,expected,context);
    if(node.k==='routerStandardFunctionItem') {
      const names=types.map((_,index)=>`ml_standard_callback_${this.fresh++}_${index}`),args=names.map(name=>({k:'name',path:[name],span:node.span}));
      let body;
      if(node.operation==='str::to_owned') {
        if(types.length!==1||types[0].kind!=='string'||types[0].rustReference||types[0].rustOwnership?.kind!=='borrowed'||types[0].rustOwnership.source!=='str')throw typeError('str::to_owned function item needs its actual borrowed str argument',node.span);
        body={k:'routerStringOwnership',operation:'to_owned',object:args[0],span:node.span};
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
    const contracts=head.k==='name'?HOST_CONTRACTS.filter(contract=>contract.family!=='float'&&pathKey(contract.rustPath)===pathKey(head.path)):[];
    return contracts.length?this.hostCall(contracts,args,env,path,expected,range):super.application(head,args,env,path,expected,range);
  }
  expr(node,env,path,expected,allowLiteral=false) {
    let value=this.hostExpression(node,env,path,expected,allowLiteral);
    if(node.k==='routerTuple'&&expected?.rustTupleLifetimeFields&&value.type.kind==='data'&&value.type.name===expected.name)value={...value,type:{...value.type,rustTupleLifetimeFields:expected.rustTupleLifetimeFields}};
    value=this.qualifyOwnershipResult?.(node,value,expected,path)??value;
    value=qualifyPrimitiveFloatResult(value);
    if(node.k==='binary'&&value.k==='binary'&&value.op==='eq'&&value.domain?.rustPrimitiveName==='f64')value={...value,span:node.span};
    this.expectedOwnership?.(value.type,expected,path,node.span);
    this.expectedPrimitiveIdentity(value.type,expected,path,node.span);
    return value;
  }
  expectedPrimitiveIdentity(actual,expected,path,range) {
    assertRustPrimitiveIdentity(actual,expected,range,{declarations:this.items,resolveType:(type,scope,span)=>this.resolveType(type,scope??path,span)});
  }
  hostExpression(node,env,path,expected,allowLiteral=false) {
    env=this.contextEnvironment(node,env,expected);
    if(node.k==='num'&&node.sourceFloatLiteral) {
      const source=node.sourceFloatLiteral,decoded=decodeRustFloat(source.raw,node.span);
      if(source.profile!==RUST_FLOAT_LITERAL_PROFILE.id||source.bits!==decoded.floatBits||source.suffix!==decoded.suffix||node.value!==decoded.value||node.type?.kind!=='float')throw typeError('floating literal differs from its original checked source token',node.span);
      if(expected?.rustReference||expected?.patternOwnershipRefusal)throw unsupported('floating reference literal','requires actual checked borrowing or promotion',node.span);
      const value=super.expr(node,env,path,expected,allowLiteral);
      return {...value,sourceFloatLiteral:{...source,verified:true}};
    }
    if(node.k==='routerPreparedStringCallBorrow')return consumeTemporaryStringCallBorrow(node);
    if(node.k==='routerTemporaryStringBorrow')throw unsupported('temporary String source borrow','only an actual checked ordinary scalar-returning &str call may consume it',node.span);
    if(node.k==='routerUtf16Encode') {
      const object=this.expr(node.object,env,path),inherent=this.resolvedMethod(object.type,'encode_utf16','shared');
      if(inherent)return this.methodCall(inherent,node.object,node.args,env,path,expected,node.span);
      if(node.args.length)throw typeError('str::encode_utf16 takes no arguments',node.span);
      return checkedUtf16Iterator(object,node.span);
    }
    if(node.k==='cast') {
      const target=this.resolveType(node.to,path,node.span);
      if(target.kind==='float')return checkedFixedF64Cast(this.expr(node.arg,env,path),target,node.span);
    }
    if(node.k==='routerPrimitiveFloatConstant')return checkedPrimitiveFloatConstant(node);
    if(node.k==='routerPrimitiveFloatCall') {
      const contract=primitiveFloatContract(node.method);
      if(!contract||node.owner?.join('::')!=='f64')throw typeError('primitive float call has no checked source owner',node.span);
      const call=this.hostCall([contract],node.args,env,path,expected,node.span);call.args.forEach(arg=>requirePrimitiveFloat(arg,node.span));return call;
    }
    if(node.k==='routerSharedArrayLiteral')return this.sharedArrayBorrow(node,env,path,expected);
    if(node.k==='routerPrimitiveDereference') {
      if(nonlocalDefault(node.value))throw unsupported('dereference control','nonlocal exits require separately checked statement lowering',node.span);
      const value=this.expr(node.value,env,path),reference=value.type.rustReference,pointee=reference?.pointee;
      if(value.type.kind==='string'&&reference?.kind==='shared'&&pointee?.kind==='string'&&pointee.rustOwnership?.kind==='borrowed'&&pointee.rustOwnership.source==='str'&&!pointee.rustGenericIdentityUnresolved)return {...node,value,type:pointee,dereferenceProof:{kind:'shared-str-reference-copy',reference:structuredClone(reference),sourceFeature:node.sourceFeature,span:node.span}};
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
      if(node.target){if(value.type.kind!=='fixed'||value.type.patternOwnershipRefusal||value.type.rustGenericIdentityUnresolved)throw unsupported('primitive From conversion','requires a checked infallible by-value fixed integer source',node.span);const inputName=value.type.rustPrimitiveName;if(!inputName)throw unsupported('primitive From source identity','requires the actual source integer type',node.span);if(!hasIntegerFrom(inputName,node.targetName))throw typeError(`no registered standard From<${inputName}> for ${node.targetName}`,node.span);const input=fixedBounds(value.type),output=fixedBounds(node.target);if(input.min<output.min||input.max>output.max)throw typeError('primitive From conversion is not infallible for the checked source type',node.span);}
      const type=node.operation==='String::from'?{...value.type,patternOwnershipRefusal:'owned String conversion'}:node.target??value.type;if(expected&&!sameType(type,expected))throw typeError('standard conversion return type mismatch',node.span);return {...node,value,type};
    }
    if(['routerIntegerParse','routerIntegerAssociated'].includes(node.k)) {
      if(node.object){const receiver=this.expr(node.object,env,path);const inherent=this.resolvedMethod(receiver.type,'parse','shared');if(inherent&&!node.instantiation)return this.methodCall(inherent,node.object,node.args,env,path,expected,node.span);if(receiver.type.kind!=='string')throw typeError('integer parse requires an actual checked str receiver',node.span);}
      const expectedEntry=expected?.kind==='data'?this.items.get(expected.name):null;
      const inferred=expectedEntry?.standardGeneric?.kind==='Result'?this.resolveType(expectedEntry.standardGeneric.arguments[0],expectedEntry.modulePath,node.span):null;
      const type=node.instantiation?this.resolveType(node.instantiation,path,node.span):inferred;
      if(type?.kind!=='fixed')throw unsupported('integer parse target','requires an actual resolved fixed-integer instantiation',node.span);
      const instance=this.instantiations.integer(type,node.span),operation=node.k==='routerIntegerParse'?'rust_integer_parse':node.operation==='from_str'?'rust_integer_from_str':'rust_integer_from_str_radix';
      return this.hostCall(instance.contracts.filter(contract=>contract.id.startsWith(operation+'_')),(node.object?[node.object,...node.args]:node.args),env,path,expected,node.span,type);
    }
    if(node.k==='routerHostCall')return this.hostCall(HOST_CONTRACTS.filter(contract=>!contract.requiresRefinement&&(node.id?contract.id===node.id:pathKey(contract.rustPath)===pathKey(node.path))),node.args,env,path,expected,node.span,node.instantiation);
    if(['routerDispatchMethod','routerIteratorOperation'].includes(node.k)) {
      if(node.k==='routerDispatchMethod'&&node.object.k==='routerDispatchMethod'&&node.object.fallback?.k==='routerStringView'&&this.expr(node.object.object,env,path).type.kind==='string')return super.expr(node,env,path,expected,allowLiteral);
      const receiver=this.expr(node.object,env,path),method=node.method??node.op;
      const inherent=this.resolvedMethod(receiver.type,method,'shared');if(inherent)return this.methodCall(inherent,node.object,node.args,env,path,expected,node.span);
      if(receiver.type.kind==='float') {
        const contract=primitiveFloatContract(method);
        if(contract){requirePrimitiveFloat(receiver,node.span);return this.hostCall([contract],[node.object,...node.args],env,path,expected,node.span);}
        if(['is_sign_negative','is_sign_positive'].includes(method)){if(node.args.length)throw typeError('primitive f64 sign predicate takes no arguments',node.span);this.floatSignObligations=true;return floatSignObligation(method,receiver,node.span);}
      }
      const contracts=HOST_CONTRACTS.filter(contract=>contract.family!=='float'&&contract.kind==='method'&&contract.rustPath.at(-1)===method&&sameType(this.hostType(contract.receiver,path,node.span),receiver.type));
      if(contracts.length)return this.hostCall(contracts,[node.object,...node.args],env,path,expected,node.span);
      if(receiver.type.kind==='fixed'&&['checked_add','checked_sub','checked_mul','saturating_add','saturating_sub','saturating_mul','min','max','clamp'].includes(method)){
        const borrowed=Boolean(receiver.type.rustReference);let type=receiver.type,object=node.object;
        if(borrowed&&!INHERENT_FIXED_COPY.has(method))throw unsupported('reference Ord method','reference trait selection is not primitive inherent autodereference',node.span);
        while(type.rustReference){type=sharedFixedPointee(type,node.span);object={k:'routerPrimitiveDereference',value:object,sourceFeature:'inherent-receiver-autoderef',span:node.object.span};}
        const instance=this.instantiations.fixed(type,node.span);return this.hostCall(instance.contracts.filter(contract=>contract.rustPath.at(-1)===method),[object,...node.args],env,path,expected,node.span);
      }
      const mapOr=method==='map_or'&&receiver.type.kind==='data'&&this.items.get(receiver.type.name)?.standardGeneric?.kind==='Option';
      if(mapOr&&node.args.length!==2)throw typeError('standard map_or expects 2 arguments',node.span);
      if(mapOr&&nonlocalDefault(node.args[0]))throw unsupported('Option.map_or default control','nonlocal exits require separately checked statement lowering',node.args[0].span);
      const defaultValue=mapOr?this.expr(node.args[0],env,path,expected):null;
      const plan=['bool','data'].includes(receiver.type.kind)?planStandardMethod(receiver.type,method,{declarations:this.items,resolveType:(type,range)=>this.resolveType(type,path,range),expected,defaultType:defaultValue?.type,span:node.span,argumentCount:node.args.length}):null;
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
  program(surface) {
    this.floatSignObligations=false;
    const program=super.program(surface);
    const sourceContext=checkedSourceContext(program);
    program.items.push(...this.instantiations.items);
    for(const entry of program.declarations.values())if(entry.impl?.receiver==='value'&&entry.impl.copyCertificate?.verified){const param=entry.params.find(param=>param.name===entry.impl.receiverName);if(!param)throw typeError('missing checked Copy receiver',entry.span);param.copyReceiver=true;}
    const forbidden=(node,seen=new Set())=>{
      if(!node||typeof node!=='object')return false;
      if(node.k==='routerAlgebraicOperation'&&node.op==='unwrap_or'||node.k==='routerStringOperation')return true;
      if(node.constEligible===false||['routerEffectCall','routerFutureCall','routerAwait','routerOptionCallback','routerFor','routerIteratorOperation'].includes(node.k))return true;
      if(node.k==='routerHostCall'&&!(node.contract??HOST_CONTRACTS.find(contract=>contract.id===node.id))?.constEligible)return true;
      if(['call','routerFutureCall'].includes(node.k)&&!seen.has(node.fn)){seen.add(node.fn);const entry=program.declarations.get(node.fn);if(!entry||!entry.constant&&!entry.constFunction||forbidden(entry.body,seen))return true;}
      return Object.entries(node).some(([key,value])=>key!=='type'&&(Array.isArray(value)?value.some(item=>forbidden(item,seen)):forbidden(value,seen)));
    };
    for(const entry of program.declarations.values())if((entry.constant||entry.constFunction)&&forbidden(entry.body))throw unsupported('non-const host operation','pure does not imply Rust const eligibility',entry.span);
    const sourceLinks=bindCheckedSourceLinks(program,sourceContext,{targetProfile:CONSTANT_EVALUATION_PROFILE});
    for(const entry of program.declarations.values())if(entry.constant){
      const result=evaluateCheckedConstant(program,entry.fullName,{sourceLinks,contracts:new Map(HOST_CONTRACTS.map(contract=>[contract.id,contract]))});
      if(result.status!=='value'||!result.proof.sourceLinksVerified)throw unsupported('constant evaluation',result.diagnostic?.reason??'requires fresh original parser source association',entry.span);
      entry.constantEvaluationProof=result.proof;
    }
    return program;
  }
}
export class HostEmitter extends EffectEmitter {
  constructor(program,state){const reserve=node=>{if(!node||typeof node!=='object')return;if(node.k==='routerHostCall'&&node.contract)state.reserved.add('ml_host_'+node.id);for(const value of Object.values(node))Array.isArray(value)?value.forEach(reserve):reserve(value);};program.items.forEach(reserve);super(program,state);this.copyTypes=new Set(program.items.filter(entry=>entry.impl?.copyCertificate?.verified).map(entry=>entry.params.find(param=>param.copyReceiver)?.type.name));this.hosts=new Set();this.schemas=new Map();this.instantiations=new Map();this.optionCallbacks=false;for(const name of ['ml_copy_fixed_array','ml_assert_immutable_copy','ml_validate_rust_value','ml_validate_json_number','ml_validate_json_map','ml_validate_duration','ml_host_duration_as_secs','ml_host_option_bind','ml_create_vector_runtime','ml_create_integer_runtime','ml_create_fixed_integer_runtime','ml_host_option_map','ml_host_option_map_or','ml_host_result_ok','ml_host_bool_then'])state.reserved.add(name);for(const contract of HOST_CONTRACTS)state.reserved.add('ml_host_'+contract.id);}
  parameterGuard(param) {
    if(param.type.kind==='array'&&param.type.rustFixedArray) {
      fixedArrayCopyCells(param.type,param.span);this.fixedArrays=true;
      return [`${param.name} = ml_copy_fixed_array(${param.name}, ${JSON.stringify(runtimeValueType(param.type))});`,this.valueGuard(param.name,param.type)+';'];
    }
    // The portable bounds helper compares values. Reject non-BigInts before
    // that helper can invoke a hostile object's conversion hooks.
    if(param.type.kind==='fixed')return [`if (typeof ${param.name} !== 'bigint') throw new TypeError('argument outside supported Rust fixed-integer domain');`,...super.parameterGuard(param)];
    const hasData=type=>type.kind==='data'||type.kind==='named'||type.kind==='array'&&(type.rustFixedArray||hasData(type.element));
    if(!hasData(param.type)&&param.type.kind!=='float')return [...(this.iteratorParameterGuards?.(param)??[]),...super.parameterGuard(param)];
    // A helper's guard must depend only on its actual reachable parameter
    // layout, not on unrelated callers in another checked dependency closure.
    return [...(this.iteratorParameterGuards?.(param)??[]),...(this.patternParameterGuards?.(param)??[]),...((param.copyReceiver||param.type.kind==='data'&&this.copyTypes.has(param.type.name))?(this.copyReceivers=true,[`ml_assert_immutable_copy(${param.name});`]):[]),this.valueGuard(param.name,param.type)+';'];
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
  expr(node) {
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
    if(['routerConstObligation','routerBuiltinConversion'].includes(node.k))return this.expr(node.value);
    if(node.k==='routerStandardMethod'){this.standardMethods=true;return `ml_host_${node.operation}(${this.expr(node.value)}${node.defaultValue?', '+this.expr(node.defaultValue):''}${node.callback?', '+this.expr(node.callback):''})`;}
    if(node.k==='routerOptionCallback'){this.optionCallbacks=true;return `ml_host_option_bind(${this.expr(node.value)}, ${this.expr(node.callback)}, ${JSON.stringify(node.op)})`;}
    if(node.k!=='routerHostCall')return super.expr(node);
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
    if(this.utf16Runtime||this.fixedF64Runtime)preludes.unshift(`import { ${[...(this.utf16Runtime?['encodeUtf16 as ml_encode_utf16']:[]),...(this.fixedF64Runtime?['fixedToF64 as ml_fixed_to_f64']:[])].join(', ')} } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'utf16-fixed-f64-runtime.mjs'))};`);
    if(this.fixedArrays)preludes.unshift(`import { copyFixedArray as ml_copy_fixed_array } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'fixed-array-runtime.mjs'))};`);
    if(this.copyReceivers)preludes.unshift(`import { assertImmutableCopy as ml_assert_immutable_copy } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'copy-runtime.mjs'))};`);
    if([...this.instantiations.keys()].some(id=>id.startsWith('rust_fixed_')))preludes.unshift(`import { createFixedIntegerRuntime as ml_create_fixed_integer_runtime } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'fixed-integer-runtime.mjs'))};`);
    if([...this.instantiations.keys()].some(id=>id.startsWith('rust_integer_')))preludes.unshift(`import { createIntegerRuntime as ml_create_integer_runtime } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'integer-runtime.mjs'))};`);
    if([...this.instantiations.keys()].some(id=>id.startsWith('rust_vec_')))preludes.unshift(`import { createVectorRuntime as ml_create_vector_runtime } from ${JSON.stringify((this.runtimeModule??'./runtime/effects.mjs').replace(/effects\.mjs$/u,'vector-runtime.mjs'))};`);
    for(const family of ['json','time','integer','float']) {
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
    if(this.standardMethods)preludes.push(`function ml_host_bool_then(value, callback) { return value ? Object.freeze({ $: 'Some', field0: callback() }) : Object.freeze({ $: 'None' }); }`, `function ml_host_result_ok(value) { return value.$ === 'Ok' ? Object.freeze({ $: 'Some', field0: value.field0 }) : Object.freeze({ $: 'None' }); }`, `function ml_host_option_map(value, callback) { return value.$ === 'Some' ? Object.freeze({ $: 'Some', field0: callback(value.field0) }) : Object.freeze({ $: 'None' }); }`, `function ml_host_option_map_or(value, defaultValue, callback) { return value.$ === 'Some' ? callback(value.field0) : defaultValue; }`);
    if(this.optionCallbacks)preludes.push(`function ml_host_option_bind(value, operation, mode) { if (mode === 'or_else') return value.$ === 'Some' ? value : operation(); if (value.$ === 'Some') return operation(value.field0); return mode === 'is_some_and' ? false : Object.freeze({ $: 'None' }); }`);
    preludes.push(...this.instantiations.values());
    return {...result,preludes,text:[...preludes,...result.definitions].join('\n\n')};
  }
}
export const parseRust=(source,{shadowedEffectRoots,shadowedPreludeTypes,macroEvidence=macroProvenance(source),sourceScope}={})=>{const parser=new HostRustParser(tokenizeRust(source));parser.shadowedEffectRoots=shadowedEffectRoots;parser.shadowedPreludeTypes=shadowedPreludeTypes;parser.shadowedBuiltinMacros=new Set(macroEvidence.shadowedNames);parser.shadowedImportedBindings=new Set(macroEvidence.importedNames);parser.unresolvedImportScope=macroEvidence.unresolvedImportScope;if(sourceScope)configureParserSourceScope(parser,sourceScope.scope,sourceScope.scopes,[]);return linkParsedFile(parser,parser.file(),source,{scope:{macroEvidence,sourceScope:sourceScope?.scope??null,compilationProfile:sourceScope?.compilationProfile??null,configurationCondition:sourceScope?.configurationCondition??null}});};
export const checkProgram=surface=>new HostChecker(surface.language,surface.externals??[]).program(surface);
export const emitJavaScript=(program,{runtimeModule,reserved=[]}={})=>emitWith(program,class extends HostEmitter{constructor(program,state){for(const name of reserved)state.reserved.add(name);super(program,state);this.runtimeModule=runtimeModule;}});
