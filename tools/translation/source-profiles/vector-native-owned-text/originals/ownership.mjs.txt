// Source ownership qualifiers are distinct from equal portable value domains.
// No borrow, move, dereference or allocation is fabricated by this adapter.
import {TextRustParser,TextChecker} from './text.mjs';
import {SOURCE_STR,hasSourceBorrowedStrSignature} from './source-contract-types.mjs';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';
import {fixedArrayLength} from '../checked-types.mjs';

const OWNED_STRING=Object.freeze({kind:'owned',source:'String'});
const BORROWED_STR=Object.freeze({kind:'borrowed',source:'str'});
const OWNED_VEC=Object.freeze({kind:'owned',source:'Vec'});
const BORROWED_SLICE=Object.freeze({kind:'borrowed',source:'slice'});
const location=(first,last)=>({start:first.start,end:last.end});
const canonical=owner=>owner&&(owner.kind==='owned'&&['String','Vec'].includes(owner.source)||owner.kind==='borrowed'&&['String','str','Vec','slice'].includes(owner.source)||owner.kind==='value'&&owner.source==='array');
function ownership(type) {
  if(type?.rustOwnership) {
    if(!canonical(type.rustOwnership))throw new TypeError('Malformed checked Rust ownership qualifier');
    return type.rustOwnership;
  }
  // These existing markers arise from checked String syntax/operations. They
  // prove an owned result, unlike the absence of a borrowed qualifier.
  if(type?.kind==='string'&&type.patternOwnershipRefusal?.startsWith('owned String'))return OWNED_STRING;
  return null;
}
function requireResolvedOwnership(type,span,{declarations,resolveType=type=>type},active=new Set()) {
  if(!type)return;
  if(type.rustSourceType!==undefined&&type.rustSourceType!==true)throw unsupported('source type ownership proof','requires an actual checked source type marker',span);
  if(type.rustGenericIdentityUnresolved)throw unsupported('erased Rust ownership generic','requires an actual checked source layout and ownership contract',span);
  if(type.kind==='array')requireResolvedOwnership(type.element,span,{declarations,resolveType},active);
  if(type.rustReference) {
    if(type.rustReference.kind!=='shared'||!type.rustReference.pointee)throw unsupported('source reference ownership proof','requires actual checked shared pointees',span);
    requireResolvedOwnership(type.rustReference.pointee,span,{declarations,resolveType},active);
  }
  if(type.rustStandardGeneric)for(const argument of type.rustStandardGeneric.arguments)requireResolvedOwnership(argument,span,{declarations,resolveType},active);
  if(type.kind==='data'&&!active.has(type.name)) {
    active.add(type.name);const entry=declarations?.get(type.name);
    for(const ctor of entry?.ctors??[])for(const field of ctor.fields)requireResolvedOwnership(resolveType(field.type,entry.modulePath,span),span,{declarations,resolveType},active);
    active.delete(type.name);
  }
}

export function assertRustOwnership(actual,expected,span,{declarations,resolveType=type=>type}={},active=new Set()) {
  requireResolvedOwnership(actual,span,{declarations,resolveType});requireResolvedOwnership(expected,span,{declarations,resolveType});
  if(!actual||!expected)return;
  const left=ownership(actual),right=ownership(expected);
  if(expected.rustSourceType&&['string','array'].includes(expected.kind)&&!right)throw typeError('checked Rust source ownership qualifier is missing for the boundary type',span);
  if(expected.rustSourceType||right) {
    if(actual.rustReference||expected.rustReference) {
      if(!actual.rustReference||!expected.rustReference)throw typeError('Rust source reference depth differs from the expected value type',span);
      if(actual.rustReference.kind!=='shared'||expected.rustReference.kind!=='shared'||!actual.rustReference.pointee||!expected.rustReference.pointee)throw unsupported('source reference ownership proof','requires actual checked shared pointees',span);
      assertRustOwnership(actual.rustReference.pointee,expected.rustReference.pointee,span,{declarations,resolveType},active);
    }
  }
  // Bare portable hints used inside checked operations are not conversions.
  // Every source-qualified argument/return boundary still requires evidence.
  if(right) {
    if(!left)throw typeError('Rust ownership source qualifier is missing for the expected value',span);
    if(left.kind!==right.kind||left.source!==right.source)throw typeError('distinct Rust owned and borrowed source types require a checked conversion',span);
    if(actual.rustBorrowingUnresolved&&right.kind==='borrowed')throw unsupported('escaping owned string borrow','requires a checked lifetime and borrowing contract',span);
  }
  if(actual.kind==='array'&&expected.kind==='array') {
    if(fixedArrayLength(actual)!==fixedArrayLength(expected))throw typeError('Rust fixed-array length differs at the source boundary',span);
    assertRustOwnership(actual.element,expected.element,span,{declarations,resolveType},active);
  }
  if(actual.kind==='data'&&expected.kind==='data') {
    const key=actual.name+'|'+expected.name;if(active.has(key))return;active.add(key);
    const generic=type=>{
      const entry=declarations?.get(type.name);
      const info=type.rustStandardGeneric??entry?.standardGeneric;
      return info?{kind:info.kind,arguments:info.arguments.map(argument=>resolveType(argument,entry?.modulePath,span))}:null;
    };
    const a=generic(actual),b=generic(expected);
    if(a&&b&&a.kind===b.kind&&a.arguments.length===b.arguments.length)for(let index=0;index<a.arguments.length;index++)assertRustOwnership(a.arguments[index],b.arguments[index],span,{declarations,resolveType},active);
    active.delete(key);
  }
}

export function withOwnershipParser(Base=TextRustParser) {
  return class extends Base {
    method(object,method,args,span) {
      if(!['to_owned','as_str'].includes(method.value))return super.method(object,method,args,span);
      if(args.length)throw typeError(`${method.value} expects no arguments`,span);
      // Keep the written operation: the upstream scalar frontend erases both
      // methods, although one creates an owned value and one borrows String.
      return {k:'routerStringOwnership',operation:method.value,object,fallback:super.method(object,method,args,span),span};
    }
    primary(path,options) {
      const c=this.cursor,first=c.peek(),constructor=['String','Vec'].includes(first.value)&&typeof this.builtinShadow==='function'&&!this.builtinShadow(first.value,path)&&c.is('::',1)&&c.is('new',2)&&c.is('(',3)&&c.is(')',4);
      const value=super.primary(path,options);
      if(!constructor)return value;
      const owner=first.value==='String'?OWNED_STRING:OWNED_VEC;
      return {...value,...(value.k==='routerOwnedString'?{value:{...value.value,sourceRustOwnership:owner}}:{}),sourceRustOwnership:owner};
    }
    unary(path,options) {
      if(this.cursor.is('&&'))throw unsupported('repeated shared ownership borrow','requires actual reference creation and lifetime proofs',this.cursor.peek());
      return super.unary(path,options);
    }
    type() {
      const c=this.cursor,start=c.index,first=c.peek(),borrow=first.value==='&';
      let pointee=1;
      if(borrow&&c.peek(pointee).value==="'")pointee+=2;
      // The vendor's &str shortcut runs before named-type lookup. Rust allows
      // a source type/import named str; its spelling cannot certify the
      // standard unsized primitive or grant standard string operations.
      if(borrow&&c.peek(pointee).value==='str'&&typeof this.builtinShadow==='function'&&this.builtinShadow('str',this.modulePath))throw unsupported('shadowed borrowed str type','requires actual standard primitive identity in the source type namespace',location(first,c.peek(pointee)));
      const previous=this.ownershipReferenceDepth??0;
      if(borrow)this.ownershipReferenceDepth=previous+1;
      let type;
      try{type=super.type();}finally{this.ownershipReferenceDepth=previous;}
      return this.qualifyOwnershipType(type,c.tokens.slice(start,c.index),previous);
    }
    qualifyOwnershipType(type,tokens,referenceDepth=this.ownershipReferenceDepth??0) {
      const first=tokens[0],borrow=first?.value==='&';let offset=borrow?1:0;
      if(borrow&&tokens[offset]?.value==="'")offset+=2;
      const root=tokens[offset]?.value,known=name=>typeof this.builtinShadow==='function'&&!this.builtinShadow(name,this.modulePath);
      let owner;
      if(type.kind==='string'&&root==='String'&&known('String'))owner={kind:borrow?'borrowed':'owned',source:'String'};
      else if(type.kind==='string'&&borrow&&root==='str')owner=BORROWED_STR;
      else if(type.kind==='array'&&root==='Vec'&&known('Vec'))owner={kind:borrow?'borrowed':'owned',source:'Vec'};
      else if(type.kind==='array'&&root==='[') {
        if(type.rustFixedArray)owner={kind:'value',source:'array'};
        else {
          if(!borrow&&!referenceDepth)throw unsupported('unsized slice value','requires an actual source borrow, not an owned Vec encoding',location(first,tokens.at(-1)));
          owner=BORROWED_SLICE;
        }
      }
      const qualified={...type,rustSourceType:true,...(owner?{rustOwnership:owner}:{})};
      // A pointee's lifetime is not the lifetime of an outer reference.
      if(type.rustReference)delete qualified.rustBorrowLifetime;
      if(borrow&&root==='str'&&(offset===1||tokens[2]?.value==='static'))qualified.rustBorrowLifetime={kind:offset===1?'elided':'static',source:'borrowed-str-type',span:location(first,tokens.at(-1)),tokens:tokens.map(token=>({kind:token.kind,value:token.value,span:{start:token.start,end:token.end}}))};
      return qualified;
    }
    expressionMacro(token,path) {
      const value=super.expressionMacro(token,path);
      if(token.value!=='vec')return value;
      return value.k==='routerConstObligation'?{...value,value:{...value.value,sourceRustOwnership:OWNED_VEC}}:{...value,sourceRustOwnership:OWNED_VEC};
    }
    tupleType(fields,span) {
      const qualified=fields.map(field=>field.type.kind==='string'&&!field.type.rustOwnership&&field.rustTypeSyntax?.[0]==='&'&&field.rustTypeSyntax.at(-1)==='str'?{...field,type:{...field.type,rustOwnership:BORROWED_STR}}:field);
      if(typeof super.tupleType!=='function')throw unsupported('ownership tuple layout','requires the checked source tuple capability',span);
      return super.tupleType(qualified,span);
    }
  };
}

export function withOwnershipChecker(Base=TextChecker) {
  return class extends Base {
    program(surface) {
      const program=super.program(surface),context={declarations:program.declarations,resolveType:(type,path,span)=>this.resolveType(type,path,span)};
      for(const entry of program.declarations.values())if(entry.k==='fn') {
        for(const param of entry.params)requireResolvedOwnership(param.type,param.span??entry.span,context);
        requireResolvedOwnership(entry.ret,entry.span,context);
      }
      return program;
    }
    resolveType(type,path,span) {
      const resolved=super.resolveType(type,path,span);
      return {...resolved,...(type?.rustSourceType?{rustSourceType:true}:{}),...(type?.rustOwnership?{rustOwnership:type.rustOwnership}:{}),...(type?.rustBorrowLifetime?{rustBorrowLifetime:type.rustBorrowLifetime}:{}),...(type?.rustBorrowingUnresolved?{rustBorrowingUnresolved:type.rustBorrowingUnresolved}:{})};
    }
    expectedOwnership(actual,expected,path,span) {
      assertRustOwnership(actual,expected,span,{declarations:this.items,resolveType:(type,scope,range)=>this.resolveType(type,scope??path,range)});
    }
    qualifyOwnershipResult(node,value,expected,path) {
      let owner=ownership(value.type);
      if(node.k==='routerTextReference'&&['string','array'].includes(value.type.kind))throw unsupported('explicit ownership borrow','requires a checked lifetime and borrowing contract',node.span);
      if(['str','lit'].includes(node.k)&&typeof node.value==='string')owner=BORROWED_STR;
      if(node.sourceRustOwnership)owner=node.sourceRustOwnership;
      if(value.formatProvenance)owner=OWNED_STRING;
      if(node.k==='routerBuiltinConversion'&&node.operation==='String::from')owner=OWNED_STRING;
      if(node.k==='routerIteratorOperation'&&node.op==='collect'&&value.type.kind==='array') {
        const inferred=value.iteratorCollectInference?.profile==='checked-standard-vec-item-inference-v1';
        const target=inferred?value.type:node.explicit?this.resolveType(node.explicit,path,node.span):expected;
        if(target?.kind==='array'&&ownership(target)?.kind==='owned'&&ownership(target)?.source==='Vec')owner=OWNED_VEC;
      }
      if(value.k==='stringMap'&&['toLowerCase','toUpperCase'].includes(value.op)||value.k==='routerStringOperation'&&['to_ascii_lowercase','to_ascii_uppercase'].includes(value.op))owner=OWNED_STRING;
      if(value.k==='routerStringOperation'&&['trim','trim_start','trim_end'].includes(value.op)) {
        owner=BORROWED_STR;
        const receiver=value.string;
        const actual=receiver?.type,actualOwner=ownership(actual);
        const sourceReceiver=actual?.rustSourceType===true||hasSourceBorrowedStrSignature(actual)||actual?.rustBorrowLifetime?.kind==='static'&&actual.rustBorrowLifetime.source==='string-literal';
        if(actualOwner&&['str','String'].includes(actualOwner.source)&&sourceReceiver)value={...value,type:{...value.type,rustStandardSignature:SOURCE_STR.rustStandardSignature}};
        if(ownership(receiver?.type)?.kind==='owned')value={...value,type:{...value.type,rustBorrowingUnresolved:'borrow of owned String'}};
      }
      let operation=value;while(operation.k==='let')operation=operation.body;
      if(operation.k==='routerTextPattern'&&operation.sourceProfile==='checked-str-pattern-v1'&&['trim_start_matches','trim_end_matches','trim_matches'].includes(operation.op))owner=BORROWED_STR;
      // The written allocation owns a new result. Its checked receiver keeps
      // its own borrowed type, lifetime and original source-body proof.
      if(node.k==='toString') {
        owner=OWNED_STRING;
        if(value.k!=='toString'||!value.arg)throw unsupported('string allocation receiver','requires an explicit checked conversion and its actual receiver',node.span);
        const receiverType=value.arg.type;
        if(receiverType.rustReference) {
          const reference=receiverType.rustReference;
          if(reference.kind!=='shared'||reference.pointee?.kind!=='string'||reference.pointee.rustReference||reference.pointee.rustOwnership?.source!=='String')throw unsupported('string Display autodereference','requires one actual checked standard String pointee',node.span);
        }
        const type={...value.type,rustSourceType:true};delete type.rustReference;delete type.rustBorrowingUnresolved;delete type.rustStandardSignature;
        value={...value,type,constEligible:false,sourceOwnershipOperation:{profile:'checked-standard-string-ownership-v1',verified:true,operation:'to_string',receiverType:structuredClone(receiverType),span:{...node.span}}};
      }
      if(value.sourceOwnershipOperation?.profile==='checked-standard-string-ownership-v1'&&value.sourceOwnershipOperation.verified&&['to_string','to_owned'].includes(value.sourceOwnershipOperation.operation))owner=OWNED_STRING;
      // The emitted receiver operation may survive an outer as_str. Qualify
      // the actual written borrow, without inheriting it through allocations.
      if(node.k==='routerStringOwnership'&&node.operation==='as_str'&&value.sourceOwnershipOperation?.profile==='checked-standard-string-ownership-v1'&&value.sourceOwnershipOperation.verified&&value.sourceOwnershipOperation.operation==='as_str')owner=BORROWED_STR;
      if(owner) {
        const type={...value.type,rustOwnership:owner};
        // A checked owned result is a new value, not the input's borrowed
        // string lifetime. Keep reference evidence on actual shared results.
        if(owner.kind==='owned'&&!type.rustReference)delete type.rustBorrowLifetime;
        value={...value,type};
      }
      if(node.k==='str'&&typeof node.value==='string'&&owner?.kind==='borrowed'&&owner.source==='str')value={...value,type:{...value.type,rustBorrowLifetime:{kind:'static',source:'string-literal',span:{...node.span}}}};
      return value;
    }
    expr(node,env,path,expected,allowLiteral=false) {
      if(node.k==='routerStringOwnership') {
        const object=this.expr(node.object,env,path),owner=ownership(object.type);
        // JSON and actual inherent methods keep their independently checked
        // dispatch; an equal portable string representation is insufficient.
        if(object.type.kind!=='string')return this.expr(node.fallback,env,path,expected,allowLiteral);
        if(!owner||!['str','String'].includes(owner.source))throw unsupported('standard string ownership method','requires the actual checked str or String receiver',node.span);
        const reference=object.type.rustReference;
        if(reference&&(reference.kind!=='shared'||reference.pointee?.kind!=='string'||reference.pointee.rustReference||reference.pointee.rustOwnership?.source!=='String'))throw unsupported('string ownership autodereference','requires one actual shared standard String pointee',node.span);
        const proof={profile:'checked-standard-string-ownership-v1',verified:true,operation:node.operation,receiverType:structuredClone(object.type),span:{...node.span}};
        let value;
        if(node.operation==='to_owned') {
          value={k:'toString',arg:object,type:{kind:'string',rustSourceType:true,rustOwnership:OWNED_STRING},sourceOwnershipOperation:proof,span:node.span};
        } else {
          if(owner.source!=='String')throw typeError('String::as_str requires an actual String receiver',node.span);
          value={...object,type:{kind:'string',rustSourceType:true,rustOwnership:BORROWED_STR,rustBorrowLifetime:{kind:'elided',source:'String::as_str',span:{...node.span}},...(owner.kind==='owned'?{rustBorrowingUnresolved:'borrow of owned String'}:{})},sourceOwnershipOperation:proof,sourceOwnershipReceiver:object,span:node.span};
        }
        this.expectedOwnership(value.type,expected,path,node.span);return value;
      }
      const value=this.qualifyOwnershipResult(node,super.expr(node,env,path,expected,allowLiteral),expected,path);
      this.expectedOwnership(value.type,expected,path,node.span);
      return value;
    }
  };
}

export class OwnershipRustParser extends withOwnershipParser() {}
export class OwnershipChecker extends withOwnershipChecker() {}
export const withSourceOwnershipParser=withOwnershipParser;
export const withSourceOwnershipChecker=withOwnershipChecker;
