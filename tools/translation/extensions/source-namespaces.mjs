// Checked module bindings retain Rust's distinct type/value/macro namespaces.
// No source rewriting or callable/type implementation is inferred here.
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';
export function withSourceNamespaceParser(Base) {
  return class extends Base {
    sourceDeclarationNamespace(declaration,path) {
      const aliases=this.sourceNamespaceAliases?.value?.get(path.join('.'));
      if(!aliases)return declaration;
      // The portable parser has no checked lexical alias environment. Carry
      // collisions rather than turn a parameter/local into a module call.
      const inspect=node=>{
        if(!node||typeof node!=='object')return;
        if(typeof node.name==='string'&&aliases.has(node.name))throw unsupported('source value alias/local scope collision','requires checked lexical shadowing before module value resolution',node.span??declaration.span);
        for(const [name,value]of Object.entries(node))if(!['type','span'].includes(name)){if(Array.isArray(value))for(const child of value)inspect(child);else inspect(value);}
      };
      for(const parameter of declaration.params??[])inspect(parameter);inspect(declaration.body);
      return {...declaration,sourceNamespaceEvidence:{source:this.sourceNamespaceEvidence.source,module:[...this.sourceNamespaceEvidence.module],unresolvedTypeScope:this.unresolvedImportScope,unresolvedMacroScope:this.unresolvedMacroScope,bindings:[...(this.sourceNamespaceResolvedBindings?.values()??[])]}};
    }
    fn(path){return this.sourceDeclarationNamespace(super.fn(path),path);}
    constItem(path){return this.sourceDeclarationNamespace(super.constItem(path),path);}
    inSourceNamespace(namespace,operation) {
      const previous=this.sourceResolutionNamespace;this.sourceResolutionNamespace=namespace;
      try{return operation();}finally{this.sourceResolutionNamespace=previous;}
    }
    resolveSourceNamespace(segments,path,namespace) {
      if(!this.sourceNamespaceAliases)return super.resolve(segments,path);
      if(!['type','value','macro'].includes(namespace))throw new TypeError('Source path requires an explicit Rust namespace');
      // A qualified value path walks module/type owners before its value leaf.
      const ownerNamespace=namespace==='value'&&segments.length>1?'type':namespace;
      const aliases=this.sourceNamespaceAliases[ownerNamespace]?.get(path.join('.'));
      if(aliases?.has(segments[0])) {
        this.sourceNamespaceResolvedBindings??=new Map();
        const binding=this.sourceNamespaceEvidence?.bindings.find(binding=>binding.namespace===ownerNamespace&&binding.name===segments[0]);
        if(binding)this.sourceNamespaceResolvedBindings.set(`${ownerNamespace}:${segments[0]}`,structuredClone(binding));
      }
      return aliases?.has(segments[0])?[...aliases.get(segments[0]),...segments.slice(1)]:[...segments];
    }
    resolve(segments,path) {
      const namespace=this.sourcePatternResolution&&this.cursor.is('{')?'type':this.sourceResolutionNamespace??'value';
      return this.resolveSourceNamespace(segments,path,namespace);
    }
    hasResolvedSourceAlias(name,target,path) {
      if(!this.sourceNamespaceAliases)return this.aliases.get(path.join('.'))?.has(name)??false;
      const type=this.sourceNamespaceAliases.type?.get(path.join('.'))?.get(name),value=this.sourceNamespaceAliases.value?.get(path.join('.'))?.get(name);
      return Boolean(type&&type.length<=target.length&&type.every((part,index)=>part===target[index])||value&&value.length===target.length+1&&value.slice(0,-1).every((part,index)=>part===target[index])&&['Some','None','Ok','Err'].includes(value.at(-1)));
    }
    type(){return this.inSourceNamespace('type',()=>super.type());}
    genericType(...args){return this.inSourceNamespace('type',()=>super.genericType(...args));}
    builtinShadow(...args){return this.inSourceNamespace('type',()=>super.builtinShadow(...args));}
    expr(...args){return this.inSourceNamespace('value',()=>super.expr(...args));}
    primary(path,options) {
      const c=this.cursor,first=c.peek(),segments=[];
      if(first.kind==='identifier') {
        segments.push(first.value);let offset=1;
        while(c.is('::',offset)&&c.peek(offset+1).kind==='identifier'){segments.push(c.peek(offset+1).value);offset+=2;}
        // Named record construction resolves the owner in the type namespace.
        // Its field value expressions still pass through expr's value scope.
        if(!options?.noStruct&&c.is('{',offset)) {
          const owner=this.resolveSourceNamespace(segments,path,'type'),result=super.primary(path,options);
          return result.k==='routerRecord'?{...result,path:owner}:result;
        }
      }
      return super.primary(path,options);
    }
    inSourcePattern(operation) {
      const previous=this.sourcePatternResolution;this.sourcePatternResolution=true;
      try{return this.inSourceNamespace('value',operation);}finally{this.sourcePatternResolution=previous;}
    }
    pattern(...args){return this.inSourcePattern(()=>super.pattern(...args));}
    controlPattern(...args){return this.inSourcePattern(()=>super.controlPattern(...args));}
  };
}
