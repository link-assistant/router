// Rust tuple products have their own checked layout, distinct from tuple structs.
import {originalStandardTupleContext,originalStandardTupleField,originalStandardTupleIdentity,recordOriginalStandardTuple} from './standard-method-context.mjs';
import {PatternControlRustParser,PatternControlChecker,PatternControlEmitter} from './pattern-control.mjs';
import {monomorphicTypeName} from '../monomorphic.mjs';
import {sameType,UNIT,rustFixedType} from '../checked-types.mjs';
import {normalizeGeneratedTypeOwner} from './generated-type-owners.mjs';
import {coerce} from '../checked-coercions.mjs';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {withParameterPatternParser} from './parameter-patterns.mjs';

const span=(start,end)=>({start:start.start,end:end.end});
const SHARED_ITERATOR_PAIR=Symbol('checked-source-shared-scalar-iterator-pair');
// Portable widths and scalar encodings are insufficient to intern Rust tuple
// layouts: usize/u64 and String/&str have different source contracts. Keep
// source qualifiers in an injective suffix, without location-dependent spans.
function sourceQualifiers(type) {
  return {
    ...(type.rustPrimitiveName?{primitive:type.rustPrimitiveName}:{}),
    ...(type.patternOwnershipRefusal?{ownership:type.patternOwnershipRefusal}:{}),
    ...(type.rustOwnership?{sourceOwnership:type.rustOwnership}:{}),
    ...(type.rustReference?{reference:{kind:type.rustReference.kind,pointee:sourceQualifiers(type.rustReference.pointee)}}:{}),
    ...(type.rustGenericIdentityUnresolved?{unresolved:true}:{}),
    ...(type.kind==='array'?{element:sourceQualifiers(type.element)}:{}),
    ...(type.rustStandardGeneric?{generic:{kind:type.rustStandardGeneric.kind,arguments:type.rustStandardGeneric.arguments.map(sourceQualifiers)}}:{}),
  };
}
function tupleName(fields) {
  const qualifiers=Buffer.from(JSON.stringify(fields.map(field=>sourceQualifiers(field.type))),'utf8').toString('hex');
  return monomorphicTypeName('Tuple',fields.map(field=>field.type))+'_rust_'+qualifiers;
}
export class TupleRustParser extends withParameterPatternParser(PatternControlRustParser) {
  tupleType(fields,location) {
    const name=tupleName(fields);
    if(!this.genericTypes.has(name))this.genericTypes.set(name,{k:'data',name,tuple:true,ctors:[{name:'Tuple',fields,ctorStyle:'tuple'}],span:location,generated:'router-tuple-type'});
    const ownership=fields.map(field=>field.type.patternOwnershipRefusal).find(Boolean);
    return {kind:'named',path:['crate',name],rustGeneratedTypeOwner:{name,generated:'router-tuple-type'},span:location,...(ownership?{patternOwnershipRefusal:ownership}:{})};
  }
  type() {
    const c=this.cursor;if(!c.is('('))return super.type();
    const start=c.next();if(c.eat(')'))return UNIT;
    const fields=[];
    for(;;) {
      const begin=c.index,type=this.type();
      const rustTypeSyntax=c.tokens.slice(begin,c.index).map(token=>token.raw??token.value);
      if(rustTypeSyntax.some(token=>['Box','Vec','Arc','Rc','Cell','RefCell','UnsafeCell','Mutex','RwLock','Pin','ManuallyDrop','MaybeUninit','mut','*'].includes(token)))throw unsupported('tuple field ownership','ownership-bearing product fields need a separately checked contract',span(start,c.peek()));
      fields.push({name:`field${fields.length}`,type:normalizeGeneratedTypeOwner(this,type,this.modulePath,span(start,c.peek())),rustTypeSyntax});
      if(!c.eat(',')) {if(fields.length===1){c.expect(')','parenthesized type');return type;}c.expect(')','tuple type');break;}
      if(c.eat(')'))break;
    }
    return this.tupleType(fields,span(start,c.peek()));
  }

  primary(path,options) {
    const c=this.cursor;if(!c.is('(')||c.is(')',1))return super.primary(path,options);
    // Parentheses introduce an ordinary expression context, including tuple
    // elements; the outer condition's record/statement exclusions end here.
    const start=c.next(),first=this.expr(path);
    if(!c.eat(',')){c.expect(')','parenthesized expression');return first;}
    const items=[first];
    while(!c.is(')')){items.push(this.expr(path));if(!c.eat(','))break;}
    c.expect(')','tuple expression');return {k:'routerTuple',items,span:span(start,c.peek())};
  }
}
const __routerOriginalBirth286_TupleRustParser=[TupleRustParser,TupleRustParser.prototype,null,[["constructor",TupleRustParser],["tupleType",TupleRustParser.prototype["tupleType"]],["type",TupleRustParser.prototype["type"]],["primary",TupleRustParser.prototype["primary"]]]];


export class TupleChecker extends PatternControlChecker {
  program(surface) {
    this.inferredTupleLayouts=new Map();
    const program=super.program(surface);
    // The upstream checker builds the item tree from surface declarations.
    // Types inferred while checking bodies also belong in the serialized tree.
    program.items.push(...this.inferredTupleLayouts.values());
    return program;
  }
  inferredTupleField(type,location,depth,active,verified,budget,referenceContext) {
    if(originalStandardTupleField(this,referenceContext,type,depth)){if(--budget.cells<0)throw unsupported('original shared tuple budget','exceeds the existing checked product bound',location);return;}
    if(referenceContext?.token===SHARED_ITERATOR_PAIR&&depth===0&&type===referenceContext.itemType) {
      const reference=type.rustReference,pointee=reference?.pointee;
      if(--budget.cells<0||reference?.kind!=='shared'||!pointee||!['fixed','bool'].includes(pointee.kind)||type.rustOwnership||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved||type.patternOwnershipRefusal!=='shared source reference')throw unsupported('inferred iterator tuple reference','requires the actual checked immutable scalar Item; no aggregate, mutable or owned field is inferred',location);
      this.inferredTupleField(pointee,location,depth+1,active,verified,budget);
      return;
    }
    if(--budget.cells<0||depth>32||type.rustReference||type.rustOwnership||type.patternOwnershipRefusal||type.rustGenericIdentityUnresolved||type.rustBorrowingUnresolved)throw unsupported('inferred tuple ownership','requires bounded immutable by-value scalar fields or checked products of those fields',location);
    if(['bool','unit'].includes(type.kind))return;
    if(type.kind==='fixed') {
      const primitive=rustFixedType(type.rustPrimitiveName);
      if(!primitive||!sameType(primitive,type))throw unsupported('inferred tuple integer identity','requires an actual checked Rust primitive; no integer default or portable-width identity is invented',location);
      return;
    }
    const entry=type.kind==='data'?this.items.get(type.name):null;
    if(!entry?.tuple||entry.generated!=='router-tuple-type'||entry.ctors.length!==1||active.has(type.name))throw unsupported('inferred tuple field','requires a checked scalar or anonymous tuple, without nominal or borrowed owner erasure',location);
    if(verified.has(type.name))return;
    active.add(type.name);for(const field of entry.ctors[0].fields)this.inferredTupleField(field.type,location,depth+1,active,verified,budget);active.delete(type.name);verified.add(type.name);
  }
  inferSharedScalarIteratorPair(indexType,itemType,location) {
    if(indexType.rustPrimitiveName!=='usize'||!itemType.rustReference)throw unsupported('inferred iterator tuple','requires the actual by-value usize index and shared scalar Item',location);
    return this.inferTuple([{type:indexType},{type:itemType}],location,{token:SHARED_ITERATOR_PAIR,itemType});
  }
  inferTuple(args,location,referenceContext) {
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
      this.declare([{k:'data',name,tuple:true,generated:'router-tuple-type',ctors:[{name:'Tuple',fields,ctorStyle:'tuple'}],span:location,tupleInference:{kind:referenceContext?.token===SHARED_ITERATOR_PAIR?'checked-source-shared-scalar-iterator-pair':'checked-scalar-expression-product',sourceSpan:location,fieldTypes:fields.map(field=>structuredClone(field.type)),defaultedFields:false}}],[]);
      entry=this.items.get(name);this.inferredTupleLayouts.set(name,entry);
    }
    return {entry,type:{kind:'data',name:entry.fullName,rustGeneratedTypeOwner:{name,generated:'router-tuple-type'},rustTupleLifetimeFields:fields.map(field=>structuredClone(field.type))}};
  }
  expr(node,env,path,expected,allowLiteral=false) {
    env=this.contextEnvironment(node,env,expected);
    if(node.k==='routerTuple') {
      if(!expected) {
        // Check the original field expressions once, in source order. A
        // later result context never supplies missing Rust field identities.
        const args=node.items.map(item=>this.expr(item,env,path,undefined,true)),context=originalStandardTupleContext(this,node,args),{entry,type}=this.inferTuple(args,node.span,context);if(context)recordOriginalStandardTuple(this,context,entry,type);
        return {k:'ctor',data:entry.fullName,ctor:entry.ctors[0].name,args,type,span:node.span,tupleInference:{kind:'checked-scalar-expression-product',fieldTypes:args.map(argument=>structuredClone(argument.type)),defaultedFields:false}};
      }
      if(expected?.kind==='named')expected=this.resolveType(expected,path,node.span);
      const entry=expected?.kind==='data'?this.items.get(expected.name):null;
      if(!entry?.tuple || entry.generated!=='router-tuple-type' || entry.ctors.length!==1)throw unsupported('tuple expression','requires an actual checked tuple product from a contextual type',node.span);
      const ctor=entry.ctors[0];
      if(ctor.fields.length!==node.items.length)throw typeError('tuple arity does not match the checked product',node.span);
      const args=node.items.map((item,index)=>coerce(this.expr(item,env,path,ctor.fields[index].type),ctor.fields[index].type,this.language,node.span));
      return {k:'ctor',data:entry.fullName,ctor:ctor.name,args,type:expected,span:node.span};
    }
    if(node.k==='routerTupleField') {
      const object=this.expr(node.object,env,path),entry=object.type.kind==='data'?this.items.get(object.type.name):null;
      if(!entry?.tuple || entry.generated!=='router-tuple-type' || entry.ctors.length!==1)throw unsupported('numeric tuple field','requires an actual checked tuple product',node.span);
      const field=entry.ctors[0].fields[node.index];if(!field)throw typeError('tuple projection is outside the checked arity',node.span);
      const type=field.type;if(expected&&!sameType(type,expected))throw typeError('tuple field has the wrong result type',node.span);
      return {k:node.k,object,index:node.index,type,span:node.span};
    }
    return super.expr(node,env,path,expected,allowLiteral);
  }
}
const __routerOriginalBirth286_TupleChecker=[TupleChecker,TupleChecker.prototype,PatternControlChecker,[["constructor",TupleChecker],["program",TupleChecker.prototype["program"]],["inferredTupleField",TupleChecker.prototype["inferredTupleField"]],["inferSharedScalarIteratorPair",TupleChecker.prototype["inferSharedScalarIteratorPair"]],["inferTuple",TupleChecker.prototype["inferTuple"]],["expr",TupleChecker.prototype["expr"]]]];

export class TupleEmitter extends PatternControlEmitter {
  expr(node){if(node.k==='routerTupleField')return `(${this.expr(node.object)})[${JSON.stringify('field'+node.index)}]`;return super.expr(node);}
}

export function originalClassDefinitionBirths(){return {records:[__routerOriginalBirth286_TupleRustParser?[__routerOriginalBirth286_TupleRustParser[0],__routerOriginalBirth286_TupleRustParser[1],__routerOriginalBirth286_TupleRustParser[2],[[__routerOriginalBirth286_TupleRustParser[3][0][0],__routerOriginalBirth286_TupleRustParser[3][0][1]],[__routerOriginalBirth286_TupleRustParser[3][1][0],__routerOriginalBirth286_TupleRustParser[3][1][1]],[__routerOriginalBirth286_TupleRustParser[3][2][0],__routerOriginalBirth286_TupleRustParser[3][2][1]],[__routerOriginalBirth286_TupleRustParser[3][3][0],__routerOriginalBirth286_TupleRustParser[3][3][1]]]]:null,__routerOriginalBirth286_TupleChecker?[__routerOriginalBirth286_TupleChecker[0],__routerOriginalBirth286_TupleChecker[1],__routerOriginalBirth286_TupleChecker[2],[[__routerOriginalBirth286_TupleChecker[3][0][0],__routerOriginalBirth286_TupleChecker[3][0][1]],[__routerOriginalBirth286_TupleChecker[3][1][0],__routerOriginalBirth286_TupleChecker[3][1][1]],[__routerOriginalBirth286_TupleChecker[3][2][0],__routerOriginalBirth286_TupleChecker[3][2][1]],[__routerOriginalBirth286_TupleChecker[3][3][0],__routerOriginalBirth286_TupleChecker[3][3][1]],[__routerOriginalBirth286_TupleChecker[3][4][0],__routerOriginalBirth286_TupleChecker[3][4][1]],[__routerOriginalBirth286_TupleChecker[3][5][0],__routerOriginalBirth286_TupleChecker[3][5][1]]]]:null],bindings:[],factoryCalls:[0,0]};}
