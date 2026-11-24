// Authored syntax recipe; the producer binds these names to the original class.
export const CONDITION_METHOD=String.raw` condition(){
  if(!conditionalParsers.has(this))return this.expression(0,false);
  const active=conditionActiveParsers.has(this);conditionActiveParsers.add(this);let result;
  try{result=this.expression(0,false);}finally{if(!active)conditionActiveParsers.delete(this);}
  let visits=0;
  const visit=(value,allowed=false,chain=false,depth=0)=>{
   if(++visits>ORIGINAL_NAMESPACE_PARSER_LIMITS.nodes*16||depth>ORIGINAL_NAMESPACE_PARSER_LIMITS.depth*4)fail('complete condition validation bound');
   if(value===null||typeof value!=='object'||trees.has(value))return;
   if(nodes.has(value)){
    if(nodes.get(value)!==this)fail('foreign condition AST');
    if(value.kind==='LetCondition'){
     if(!allowed)fail('let is only admitted at an unparenthesized if/while condition or && chain');
     if(chain)requireParserEdition(this,'2024',value.span);
     visit(value.fields.pattern,false,false,depth+1);visit(value.fields.value,false,false,depth+1);return;
    }
    if(allowed&&value.kind==='Binary'&&value.fields.operation==='&&'){visit(value.fields.left,true,true,depth+1);visit(value.fields.right,true,true,depth+1);return;}
    if(value.kind==='If'||value.kind==='While'){
     for(const [key,child]of Object.entries(value.fields))visit(child,key==='condition',false,depth+1);return;
    }
    visit(value.fields,false,false,depth+1);return;
   }
   if(Array.isArray(value)){for(const child of value)visit(child,false,false,depth+1);}
   else for(const child of Object.values(value))visit(child,false,false,depth+1);
  };
  visit(result,true);return result;
 }
`;
export const LET_PREFIX=String.raw`if(c.is('let')&&conditionalParsers.has(this)){
   if(!conditionActiveParsers.has(this))fail('let expression outside original if/while condition');
   c.take();const pattern=this.pattern();c.expect('=');const value=this.expression(13,false);result=this.node('LetCondition',start,{pattern,value});
  }else `;
