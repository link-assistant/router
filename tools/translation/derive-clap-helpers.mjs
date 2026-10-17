// Bounded Clap Expr input only. Original output routes and actual derive owners
// must independently prove these helper values before namespace admission.
const booleans=new Set(['trailing_var_arg','allow_hyphen_values','global','hide_env_values','required']);
const strings=new Set(['long','env','value_name','default_value','default_missing_value','alias','conflicts_with','requires','required_unless_present']);
const expressions=new Set(['default_value_t','value_parser','num_args']);
export function boundedClapArgHelper(tokens,begin,position,kind) {
  const key=tokens[begin];let at=begin+1,value=null,valueKind='flag';
  if(position!=='field'||kind!=='struct'||!key||!(booleans.has(key.text)||strings.has(key.text)||expressions.has(key.text)))throw new TypeError('Clap arg helper requires a separately proved field literal route');
  if(tokens[at]?.text==='=') {
    const literal=tokens[++at];at++;
    if(expressions.has(key.text)) {
      const beginExpr=at-1;
      if(key.text==='num_args') {if(literal?.type!=='number'||!/^\d{1,38}$/u.test(literal.text)||tokens[at]?.text!=='.'||tokens[at+1]?.text!=='.'||tokens[at].end!==tokens[at+1].start)throw new TypeError('Clap num_args needs an original closed integer range');at+=2;if(tokens[at]?.text==='='){if(tokens[at-1].end!==tokens[at].start)throw new TypeError('Clap inclusive range punctuation is not original joint syntax');at++;}if(tokens[at]?.type!=='number'||!/^\d{1,38}$/u.test(tokens[at].text))throw new TypeError('Clap range requires its original integer upper bound');at++;}
      else if(key.text==='default_value_t'&&(literal?.type==='number'&&/^\d{1,38}$/u.test(literal.text)||['true','false'].includes(literal?.text))){}
      else {if(literal?.type!=='ident'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(literal.text)||['true','false'].includes(literal.text))throw new TypeError('Clap parser/default requires a macro-free original ExprPath or scalar literal');while(tokens[at]?.text==='::'){if(tokens[at+1]?.type!=='ident'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(tokens[at+1].text))throw new TypeError('Clap helper ExprPath has an unresolved segment');at+=2;}}
      if(tokens[at]&&tokens[at].text!==',')throw new TypeError('Clap helper expression excludes calls, macros, operators and generic effects');
      value=tokens.slice(beginExpr,at).map(token=>token.text).join(key.text==='num_args'?'':' ');valueKind='source-expression';
    }
    else if(booleans.has(key.text)&&['true','false'].includes(literal?.text)){value=literal.text==='true';valueKind='boolean';}
    else if(strings.has(key.text)&&literal?.type==='string'&&literal.text.startsWith('"')) {
      for(let escape=1;escape<literal.text.length-1;escape++)if(literal.text[escape]==='\\'&&!['"','\\','n','r','t'].includes(literal.text[++escape]))throw new TypeError('Clap literal escape requires an independent Rust literal profile');
      try{value=JSON.parse(literal.text);}catch{throw new TypeError('Clap arg helper requires a bounded original string literal');}
      if(typeof value!=='string'||Buffer.byteLength(value)>4096)throw new TypeError('Clap arg literal exceeds its input budget');valueKind='string';
    }else throw new TypeError('Clap arg helper expression requires an independent original output route');
  }else if(key.text!=='long')throw new TypeError('Clap arg helper needs an explicit literal assignment');
  return {end:at,key:key.text,value,evidence:{profile:'bounded-original-clap-arg-literal-v1',valueKind,span:{start:key.start,end:tokens[at-1].end},tokens:tokens.slice(begin,at).map(token=>({text:token.text,type:token.type,span:{start:token.start,end:token.end}})),generatedHelperBehavior:false}};
}
