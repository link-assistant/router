// Checked module bindings retain Rust's distinct type/value/macro namespaces.
// No source rewriting or callable/type implementation is inferred here.
import {unsupported} from '../vendor/meta-language/translation/diagnostics.js';
// Canonical paths are results of resolving an original written type route.
// Normalizing a generated Option/Result/tuple must not resolve that result as
// another written path. Copies retain the exact source occurrence, while a
// different parser, source span or consuming scope cannot borrow its route.
const resolvedPaths=new WeakMap(),sourceTypeOwners=new WeakMap();
const ownerKey=(type,scope)=>type?.kind==='named'&&Array.isArray(type.path)&&type.path.every(part=>typeof part==='string')&&
  Number.isSafeInteger(type.span?.start)&&Number.isSafeInteger(type.span?.end)&&type.span.start>=0&&type.span.end>=type.span.start&&
  Array.isArray(scope)&&scope.every(part=>typeof part==='string')?JSON.stringify([scope,type.span.start,type.span.end,type.path]):null;
function resolvedPath(parser,target,scope,namespace) {
  if(namespace==='type'&&target[0]==='crate'&&!target.some(part=>part.startsWith('ml_')))resolvedPaths.set(target,{parser,scope:[...scope],target:[...target]});
  return target;
}
export function originalSourceTypeOwner(parser,type,scope) {
  const key=ownerKey(type,scope),state=sourceTypeOwners.get(parser);
  const owner=key&&state&&state.aliases===parser.sourceNamespaceAliases&&state.owners.get(key);
  return owner?[...owner]:null;
}
export function withSourceNamespaceParser(Base) {
  return class extends Base {
    sourceLexicalScope(bindings,operation,{inherit=true}={}) {
      const previous=this.sourceLexicalValues;
      this.sourceLexicalValues=new Map(inherit?previous:[]);
      try {for(const binding of bindings)this.sourceLexicalBind(binding);return operation();}
      finally {this.sourceLexicalValues=previous;}
    }
    sourceLexicalBind(binding) {
      const aliases=this.sourceNamespaceAliases?.value?.get((this.modulePath??this.sourceNamespaceEvidence?.module??[]).join('.'));
      if(aliases?.has(binding.name)) {
        const original=this.sourceNamespaceEvidence?.bindings.find(item=>item.namespace==='value'&&item.name===binding.name);
        // Rust patterns cannot shadow imported constructors or constants.
        // Only an actual resolved function permits this lexical shadowing.
        if(original?.status!=='resolved'||original.kind!=='fn')throw unsupported('source value alias/local scope collision','requires an actual function binding before checked lexical shadowing',binding.span);
      }
      this.sourceLexicalValues?.set(binding.name,binding);
    }
    sourceDeclarationNamespace(declaration,path) {
      const aliases=this.sourceNamespaceAliases?.value?.get(path.join('.'));
      if(!aliases)return declaration;
      const pattern=node=>{
        if(!node||typeof node!=='object')return;
        if(['bind','bindOrCtor'].includes(node.k)&&aliases.has(node.name)&&!node.sourceLexicalBinding)throw unsupported('source value alias/local scope collision','pattern bindings require checked lexical activation',node.span??declaration.span);
        for(const key of ['args','items','alternatives'])for(const child of node[key]??[])pattern(child);
        for(const field of node.fields??[])pattern(field.pattern);
      };
      const inspect=node=>{
        if(!node||typeof node!=='object')return;
        if((node.k==='let'&&!node.sourceLexicalBinding||node.k==='routerFor')&&aliases.has(node.name))throw unsupported('source value alias/local scope collision','requires checked lexical activation for this binder',node.span??declaration.span);
        if(node.pattern)pattern(node.pattern);
        if(node.k==='match')for(const row of node.rows)for(const child of row.patterns)pattern(child);
        if(node.k==='routerLambda')for(const parameter of node.params){if(parameter.pattern)pattern(parameter.pattern);else if(aliases.has(parameter.name)&&!node.sourceLexicalParameters?.some(binding=>binding.name===parameter.name))throw unsupported('source value alias/local scope collision','requires original closure parameter activation before lexical shadowing',parameter.span??node.span);}
        // Names on record fields, field projections and declarations are not
        // lexical binders. Only the explicit binder nodes above own scopes.
        for(const [name,value]of Object.entries(node))if(!['type','span','pattern','sourceLexicalBinding'].includes(name)){if(Array.isArray(value))for(const child of value)inspect(child);else inspect(value);}
      };
      for(const parameter of declaration.params??[])if(aliases.has(parameter.name)&&!this.sourceLexicalValues?.has(parameter.name))throw unsupported('source value alias/local scope collision','requires original parameter activation before lexical shadowing',parameter.span??declaration.span);
      inspect(declaration.body);
      return {...declaration,sourceNamespaceEvidence:{source:this.sourceNamespaceEvidence.source,module:[...this.sourceNamespaceEvidence.module],unresolvedTypeScope:this.unresolvedImportScope,unresolvedMacroScope:this.unresolvedMacroScope,bindings:[...(this.sourceNamespaceResolvedBindings?.values()??[])]}};
    }
    sourceParameterBindings(open,terminator,{annotation=true}={}) {
      const tokens=this.cursor.tokens,bindings=[];let start=open,depth=0;
      const add=end=>{
        const part=tokens.slice(start,end),first=part[0]?.value==='mut'?part[1]:part[0],next=part[part[0]?.value==='mut'?2:1];
        if(first?.kind==='identifier'&&(next?.value===':'||!annotation&&!next))bindings.push({name:first.value,span:{start:first.start,end:first.end},kind:'source-parameter'});
      };
      for(let index=open;index<tokens.length;index++) {
        const token=tokens[index];
        if(depth===0&&token.value===terminator){add(index);return bindings;}
        if(depth===0&&token.value===','){add(index);start=index+1;continue;}
        if(['(','[','{','<'].includes(token.value))depth++;
        if([')',']','}','>'].includes(token.value))depth--;
        if(token.value==='>>')depth-=2;
      }
      return [];
    }
    fn(path) {
      const c=this.cursor,modifier=c.is('async')&&c.is('fn',1)?1:0;
      const bindings=c.is('fn',modifier)&&c.is('(',modifier+2)?this.sourceParameterBindings(c.index+modifier+3,')'):[];
      return this.sourceLexicalScope(bindings,()=>this.sourceDeclarationNamespace(super.fn(path),path),{inherit:false});
    }
    constItem(path){return this.sourceLexicalScope([],()=>this.sourceDeclarationNamespace(super.constItem(path),path),{inherit:false});}
    block(...args){return this.sourceLexicalScope([],()=>super.block(...args));}
    letStatement(path) {
      const binding=super.letStatement(path);
      // The initializer was parsed in the previous scope. Activate only the
      // exact ordinary source binder after that parsing has completed.
      if(binding.name){const proof={name:binding.name,span:{...binding.span},kind:'source-let'};this.sourceLexicalBind(proof);return {...binding,sourceLexicalBinding:proof};}
      if(binding.k==='routerLetElse'){
        // The initializer and diverging else were parsed in the old scope.
        // Only the success continuation can shadow an actual function name.
        const activate=node=>{
          if(!node||typeof node!=='object')return node;
          if(['bind','bindOrCtor'].includes(node.k)){
            const original=(this.sourceNamespaceBindingEvidence?.get(path.join('.'))??this.sourceNamespaceEvidence?.bindings)?.find(item=>item.namespace==='value'&&item.name===node.name);
            if(node.k==='bind'||!original||original.status==='resolved'&&original.kind==='fn'){
              const proof={name:node.name,span:{...node.span},kind:'source-let-else'};this.sourceLexicalBind(proof);return {...node,sourceLexicalBinding:proof};
            }
          }
          return {...node,...(node.args?{args:node.args.map(activate)}:{}),...(node.items?{items:node.items.map(activate)}:{}),...(node.alternatives?{alternatives:node.alternatives.map(activate)}:{}),...(node.fields?{fields:node.fields.map(field=>({...field,pattern:activate(field.pattern)}))}:{})};
        };
        return {...binding,pattern:activate(binding.pattern)};
      }
      return binding;
    }
    sourcePatternPath(written,path){
      const original=(this.sourceNamespaceBindingEvidence?.get(path.join('.'))??this.sourceNamespaceEvidence?.bindings)?.find(item=>item.namespace==='value'&&item.name===written[0]);
      // A plain function name may be an identifier binding in Rust. Preserve
      // it until the checker distinguishes it from actual constants/ctors.
      if(written.length===1&&!this.cursor.is('(')&&!this.cursor.is('{')&&original?.status==='resolved'&&original.kind==='fn')return [...written];
      return this.resolve(written,path);
    }
    inSourceNamespace(namespace,operation) {
      const previous=this.sourceResolutionNamespace;this.sourceResolutionNamespace=namespace;
      try{return operation();}finally{this.sourceResolutionNamespace=previous;}
    }
    resolveSourceNamespace(segments,path,namespace) {
      if(!this.sourceNamespaceAliases)return super.resolve(segments,path);
      if(!['type','value','macro'].includes(namespace))throw new TypeError('Source path requires an explicit Rust namespace');
      // A qualified value path walks module/type owners before its value leaf.
      if(namespace==='value'&&segments.length===1&&this.sourceLexicalValues?.has(segments[0]))return [...segments];
      const ownerNamespace=namespace==='value'&&segments.length>1?'type':namespace;
      const aliases=this.sourceNamespaceAliases[ownerNamespace]?.get(path.join('.'));
      const record=(name,ownerPath,ownerNamespace)=>{
        this.sourceNamespaceResolvedBindings??=new Map();
        const bindings=this.sourceNamespaceBindingEvidence?.get(ownerPath.join('.'))??this.sourceNamespaceEvidence?.bindings;
        const binding=bindings?.find(binding=>binding.namespace===ownerNamespace&&binding.name===name);
        if(binding)this.sourceNamespaceResolvedBindings.set(`${ownerPath.join('.')}:${ownerNamespace}:${name}`,structuredClone(binding));
        return binding;
      };
      const checkedTarget=(binding,target)=>binding?.status==='resolved'&&target?.[0]==='crate'&&binding.target?.length===target.length&&binding.target.every((part,index)=>part===target[index]);
      const finish=target=>resolvedPath(this,target,path,namespace);
      const initialTarget=aliases?.get(segments[0]),initialBinding=initialTarget?record(segments[0],path,ownerNamespace):null;
      let resolved=initialTarget?[...initialTarget,...segments.slice(1)]:[...segments];
      if(['self','super'].includes(resolved[0])){
        const owner=[...path];let at=resolved[0]==='self'?1:0;
        while(resolved[at]==='super'){if(!owner.length)return resolved;owner.pop();at++;}
        resolved=['crate',...owner,...resolved.slice(at)];
      }
      if(resolved[0]!=='crate')return resolved;
      // Walk the actual module scopes, including reexports at the value leaf.
      // Nominal associated items and external owners keep their checked paths.
      // A resolved import/reexport already checked the visibility of its
      // original written route. Its canonical target can pass through private
      // modules; only a new written suffix needs another visibility check.
      // Masked or unresolved aliases cannot borrow the retained target proof.
      const initialChecked=checkedTarget(initialBinding,initialTarget),seen=new Set();
      let prefix=initialChecked?initialTarget.slice(1):[],remaining=initialChecked?segments.slice(1):resolved.slice(1);
      for(let step=0;remaining.length&&step<128;step++){
        const key=JSON.stringify([prefix,remaining]);
        if(seen.has(key))throw unsupported('source qualified path','cyclic source namespace alias',this.cursor.peek?.());
        seen.add(key);
        const ownerNamespace=remaining.length===1?namespace:'type',map=this.sourceNamespaceAliases[ownerNamespace]?.get(prefix.join('.'));
        if(!map?.has(remaining[0]))return finish(['crate',...prefix,...remaining]);
        const target=map.get(remaining[0]),binding=record(remaining[0],prefix,ownerNamespace);
        const tail=remaining.slice(1),ordinary=['crate',...prefix,remaining[0]];
        if(target.length===ordinary.length&&target.every((part,index)=>part===ordinary[index])){prefix.push(remaining[0]);remaining=tail;continue;}
        if(target[0]!=='crate')return [...target,...tail];
        if(checkedTarget(binding,target)){prefix=target.slice(1);remaining=tail;}
        else {prefix=[];remaining=[...target.slice(1),...tail];}
      }
      if(remaining.length)throw unsupported('source qualified path','source namespace alias walk exceeds its bound',this.cursor.peek?.());
      return finish(['crate',...prefix]);
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
    type(){return this.inSourceNamespace('type',()=>{
      const type=super.type(),proof=resolvedPaths.get(type.path),scope=this.modulePath??[];
      const key=ownerKey(type,scope);
      if(key&&proof?.parser===this&&proof.scope.length===scope.length&&proof.scope.every((part,index)=>part===scope[index])&&proof.target.length===type.path.length&&proof.target.every((part,index)=>part===type.path[index])) {
        let state=sourceTypeOwners.get(this);
        if(!state||state.aliases!==this.sourceNamespaceAliases){state={aliases:this.sourceNamespaceAliases,owners:new Map()};sourceTypeOwners.set(this,state);}
        if(!state.owners.has(key)&&state.owners.size>=8192)throw unsupported('source type route evidence','exceeds its bounded original occurrence count',type.span);
        state.owners.set(key,[...proof.target]);
      }
      return type;
    });}
    genericType(...args){return this.inSourceNamespace('type',()=>super.genericType(...args));}
    builtinShadow(...args){return this.inSourceNamespace('type',()=>super.builtinShadow(...args));}
    expr(...args){return this.inSourceNamespace('value',()=>super.expr(...args));}
    primary(path,options) {
      const c=this.cursor,first=c.peek(),segments=[];
      if(first.kind==='identifier'&&this.sourceLexicalValues?.has(first.value)&&c.is('(',1))throw unsupported('source lexical callable','requires a checked function-valued local rather than an erased zero-argument call',first);
      if(c.is('|')||c.is('||')) {
        const bindings=c.is('|')?this.sourceParameterBindings(c.index+1,'|',{annotation:false}):[];
        return this.sourceLexicalScope(bindings,()=>{const value=super.primary(path,options);return value.k==='routerLambda'?{...value,sourceLexicalParameters:bindings}:value;});
      }
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

// A value-only source name cannot remove a registered module/type owner.
// Preserve legacy conservative exclusion for non-module support declarations.
export function admittedHostData(support,sourceItems) {
  const key=path=>path.filter((part,index)=>index!==0||part!=='crate').join('.');
  const denied=new Set(),registered=new Set();
  const names=(items,path,operation)=>{for(const item of items){const own=[...path,item.name];operation(key(own));if(item.k==='module')names(item.items,own,operation);}};
  const admitted=support.filter(item=>{
    const excluded=sourceItems.some(source=>source.name===item.name&&(item.k!=='module'||['module','data'].includes(source.k)));
    if(excluded)names([item],[],name=>denied.add(name));return !excluded;
  });
  if(!denied.size)return admitted;
  names(support,[],name=>registered.add(name));
  const dependsOnDenied=node=>{
    if(!node||typeof node!=='object')return false;
    if(node.kind==='named'&&Array.isArray(node.path)&&registered.has(key(node.path))&&denied.has(key(node.path)))return true;
    return Object.values(node).some(value=>Array.isArray(value)?value.some(dependsOnDenied):dependsOnDenied(value));
  };
  // Registered support must not borrow a same-spelled source owner's layout.
  // Remove its dependent support types transitively; actual source bodies then
  // retain their own precise refusal instead of failing at a host zero span.
  let current=admitted,changed=true;
  while(changed){
    changed=false;
    const visit=(items,path=[])=>items.flatMap(item=>{
      const own=[...path,item.name];
      if(item.k==='module')return [{...item,items:visit(item.items,own)}];
      if(dependsOnDenied(item)){denied.add(key(own));changed=true;return [];}
      return [item];
    });
    current=visit(current);
  }
  return current;
}
