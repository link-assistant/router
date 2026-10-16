// Hoisted undefined slots do not add a module lexical TDZ. Never overwritten.
var __routerOriginalBirth286_ParameterPatternRustParser,__routerOriginalFactoryCalls286_ParameterPatternRustParser;
// Written function parameter patterns reuse the checked irrefutable binding
// planner. The original body is parsed once and retained without substitutions.
import {UNIT} from '../checked-types.mjs';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';

const range=(first,last)=>({start:first.start,end:last.end});
function bindingNames(pattern) {
  if(['bind','bindOrCtor'].includes(pattern.k))return [pattern.name];
  if(pattern.alternatives)return bindingNames(pattern.alternatives[0]);
  return [...(pattern.items??[]),...(pattern.args??[]),...(pattern.fields??[]).map(field=>field.pattern)].flatMap(bindingNames);
}
export function withParameterPatternParser(Base) {
  __routerOriginalFactoryCalls286_ParameterPatternRustParser=__routerOriginalFactoryCalls286_ParameterPatternRustParser===undefined?1:2;

  const __routerOriginalReturned286_ParameterPatternRustParser=(0,class extends Base {
    fn(path) {
      const c=this.cursor,start=c.expect('fn','function'),name=c.identifier('function').value;
      const sourceLifetimeParameters=c.is('<')?this.sourceLifetimeParameters?.():null;
      if(c.is('<'))throw unsupported('generic function','generic signatures require monomorphization',range(start,c.peek()));
      c.expect('(','function');
      const params=[],patterns=[],bound=new Set();
      this.parameterPatternNames??=new Set(c.tokens.filter(token=>token.kind==='identifier').map(token=>token.value));
      const fresh=()=>{let name;do{name=`router_parameter_${this.parameterPatternIndex??0}`;this.parameterPatternIndex=(this.parameterPatternIndex??0)+1;}while(this.parameterPatternNames.has(name));this.parameterPatternNames.add(name);return name;};
      while(!c.is(')')) {
        const first=c.peek(),mutable=Boolean(c.eat('mut'));
        if(c.is('self')||c.is('&'))throw unsupported('method receiver','methods require resolved implementation type layouts',range(first,c.peek()));
        const patterned=c.is('(')||c.is('_')||['(','{','::'].includes(c.peek(1).value);
        if(mutable&&patterned)throw unsupported('mutable parameter pattern','requires a checked per-binding mutation contract',range(first,c.peek()));
        const pattern=patterned?this.controlPattern(path,first):null;
        const parameterName=pattern?fresh():c.identifier('parameter').value;
        c.expect(':','parameter');const type=this.type();
        for(const name of pattern?bindingNames(pattern):[parameterName]) {
          if(bound.has(name))throw typeError(`duplicate function parameter binding ${name}`,range(first,c.peek()));
          bound.add(name);
        }
        const parameter={name:parameterName,mutable,type,span:range(first,c.peek()),...(pattern?{sourceParameterPattern:pattern}:{})};
        params.push(parameter);if(pattern)patterns.push({parameter,pattern});
        if(!c.eat(','))break;
      }
      c.expect(')','function');const ret=c.eat('->')?this.type():UNIT;
      if(c.is('where'))throw unsupported('where clause','trait bounds require resolved trait implementations',range(start,c.peek()));
      let body=this.block(path);const originalBodySpan={...body.span};
      for(const {parameter,pattern} of patterns.toReversed())body={k:'routerLetPattern',pattern,subject:{k:'name',path:[parameter.name],span:parameter.span},body,span:pattern.span,sourceParameterBinding:true};
      return {k:'fn',name,params,ret,body,span:range(start,c.peek()),...(sourceLifetimeParameters?{sourceLifetimeParameters}:{}),...(patterns.length?{sourceParameterPatterns:{profile:'checked-irrefutable-parameters-v1',originalBodySpan,bindings:patterns.map(({parameter,pattern})=>({parameter:parameter.name,pattern}))}}:{})};
    }
  });
  if(__routerOriginalBirth286_ParameterPatternRustParser===undefined)__routerOriginalBirth286_ParameterPatternRustParser=[__routerOriginalReturned286_ParameterPatternRustParser,__routerOriginalReturned286_ParameterPatternRustParser.prototype,Base,[["constructor",__routerOriginalReturned286_ParameterPatternRustParser],["fn",__routerOriginalReturned286_ParameterPatternRustParser.prototype["fn"]]]];
  return __routerOriginalReturned286_ParameterPatternRustParser;
}

export function originalClassDefinitionBirths(){return {records:[__routerOriginalBirth286_ParameterPatternRustParser?[__routerOriginalBirth286_ParameterPatternRustParser[0],__routerOriginalBirth286_ParameterPatternRustParser[1],__routerOriginalBirth286_ParameterPatternRustParser[2],[[__routerOriginalBirth286_ParameterPatternRustParser[3][0][0],__routerOriginalBirth286_ParameterPatternRustParser[3][0][1]],[__routerOriginalBirth286_ParameterPatternRustParser[3][1][0],__routerOriginalBirth286_ParameterPatternRustParser[3][1][1]]]]:null],bindings:[],factoryCalls:[(__routerOriginalFactoryCalls286_ParameterPatternRustParser===undefined?0:__routerOriginalFactoryCalls286_ParameterPatternRustParser)]};}
