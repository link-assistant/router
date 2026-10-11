// Rust tuple products have their own checked layout, distinct from tuple structs.
import {PatternControlRustParser,PatternControlChecker,PatternControlEmitter} from './pattern-control.mjs';
import {monomorphicTypeName} from '../monomorphic.mjs';
import {sameType,UNIT} from '../vendor/meta-language/translation/types.js';
import {coerce} from '../vendor/meta-language/translation/check.js';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';

const span=(start,end)=>({start:start.start,end:end.end});
// Portable widths and scalar encodings are insufficient to intern Rust tuple
// layouts: usize/u64 and String/&str have different source contracts. Keep
// source qualifiers in an injective suffix, without location-dependent spans.
function sourceQualifiers(type) {
  return {
    ...(type.rustPrimitiveName?{primitive:type.rustPrimitiveName}:{}),
    ...(type.patternOwnershipRefusal?{ownership:type.patternOwnershipRefusal}:{}),
    ...(type.rustReference?{reference:type.rustReference.kind}:{}),
    ...(type.rustGenericIdentityUnresolved?{unresolved:true}:{}),
    ...(type.kind==='array'?{element:sourceQualifiers(type.element)}:{}),
    ...(type.rustStandardGeneric?{generic:{kind:type.rustStandardGeneric.kind,arguments:type.rustStandardGeneric.arguments.map(sourceQualifiers)}}:{}),
  };
}
export class TupleRustParser extends PatternControlRustParser {
  tupleType(fields,location) {
    const qualifiers=Buffer.from(JSON.stringify(fields.map(field=>sourceQualifiers(field.type))),'utf8').toString('hex');
    const name=monomorphicTypeName('Tuple',fields.map(field=>field.type))+'_rust_'+qualifiers;
    if(!this.genericTypes.has(name))this.genericTypes.set(name,{k:'data',name,tuple:true,ctors:[{name:'Tuple',fields,ctorStyle:'tuple'}],span:location,generated:'router-tuple-type'});
    const ownership=fields.map(field=>field.type.patternOwnershipRefusal).find(Boolean);
    return {kind:'named',path:['crate',name],span:location,...(ownership?{patternOwnershipRefusal:ownership}:{})};
  }
  type() {
    const c=this.cursor;if(!c.is('('))return super.type();
    const start=c.next();if(c.eat(')'))return UNIT;
    const fields=[];
    for(;;) {
      const begin=c.index,type=this.type();
      const normalize=type=>{
        if(type.kind==='array')return {...type,element:normalize(type.element)};
        if(type.kind!=='named')return type;
        let path=type.path;
        if(path[0]==='self')path=['crate',...this.modulePath,...path.slice(1)];
        else if(path[0]==='super'){let up=0;while(path[up]==='super')up++;if(up>this.modulePath.length)throw typeError('super beyond crate root',span(start,c.peek()));path=['crate',...this.modulePath.slice(0,-up),...path.slice(up)];}
        else if(!['crate','std','serde_json'].includes(path[0]))path=['crate',...this.modulePath,...path];
        return {...type,path};
      };
      const rustTypeSyntax=c.tokens.slice(begin,c.index).map(token=>token.raw??token.value);
      if(rustTypeSyntax.some(token=>['Box','Vec','Arc','Rc','Cell','RefCell','UnsafeCell','Mutex','RwLock','Pin','ManuallyDrop','MaybeUninit','mut','*'].includes(token)))throw unsupported('tuple field ownership','ownership-bearing product fields need a separately checked contract',span(start,c.peek()));
      fields.push({name:`field${fields.length}`,type:normalize(type),rustTypeSyntax});
      if(!c.eat(',')) {if(fields.length===1){c.expect(')','parenthesized type');return type;}c.expect(')','tuple type');break;}
      if(c.eat(')'))break;
    }
    return this.tupleType(fields,span(start,c.peek()));
  }

  primary(path,options) {
    const c=this.cursor;if(!c.is('(')||c.is(')',1))return super.primary(path,options);
    const start=c.next(),first=this.expr(path,options);
    if(!c.eat(',')){c.expect(')','parenthesized expression');return first;}
    const items=[first];
    while(!c.is(')')){items.push(this.expr(path,options));if(!c.eat(','))break;}
    c.expect(')','tuple expression');return {k:'routerTuple',items,span:span(start,c.peek())};
  }
}

export class TupleChecker extends PatternControlChecker {
  expr(node,env,path,expected,allowLiteral=false) {
    env=this.contextEnvironment(node,env,expected);
    if(node.k==='routerTuple') {
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
export class TupleEmitter extends PatternControlEmitter {
  expr(node){if(node.k==='routerTupleField')return `(${this.expr(node.object)})[${JSON.stringify('field'+node.index)}]`;return super.expr(node);}
}
