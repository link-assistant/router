type Node = {kind:string;span:{start:number;end:number};fields:Record<string,unknown>};
type Facts = {ast:Node;typeAuthority:false;namespaceAuthority:false;runtimeAuthority:false};
// Independent strict target observes source DATA. It grants no execution rights.
export function letOffsets(facts:Facts):number[]{
 const output:number[]=[];
 const visit=(value:unknown):void=>{
  if(value===null||typeof value!=='object')return;
  if(Array.isArray(value)){for(const child of value)visit(child);return;}
  const object=value as Record<string,unknown>;
  if(object.kind==='LetCondition')output.push((object.span as {start:number}).start);
  if(typeof object.kind==='string'&&object.fields)visit(object.fields);
  else for(const child of Object.values(object))visit(child);
 };
 visit(facts.ast);return output;
}
export function conditionOracle(first:boolean,value:number|null,last:boolean):{result:boolean;trace:string[]}{
 const trace:string[]=[];trace.push('first');if(!first)return {result:false,trace};
 trace.push('next');if(value===null)return {result:false,trace};
 trace.push('last');return {result:value>0&&last,trace};
}
