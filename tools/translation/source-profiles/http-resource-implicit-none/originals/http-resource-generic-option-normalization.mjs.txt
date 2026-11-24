// Complete original syntax selections only; fresh caller checking is mandatory.
export function selectHttpResourceGenericOptionIdentity(fn,{constructorShadowed=false,nonBindings=new Set()}={}){
 const type=fn.genericParameters?.[0];if(constructorShadowed||fn.asynchronous||fn.genericParameters?.length!==1||fn.parameters.length!==1||fn.parameters[0].type!=='Option<'+type+'>'||fn.returns!=='Option<'+type+'>')return false;
 const input=fn.parameters[0].name,body=fn.body;
 const absent=block=>block&&!block.tail&&block.statements.length===1&&block.statements[0].kind==='return'&&block.statements[0].value?.kind==='name'&&block.statements[0].value.name==='None';
 const returned=block=>!block.statements.length?block.tail:!block.tail&&block.statements.length===1&&block.statements[0].kind==='return'?block.statements[0].value:null;
 const some=(node,binder)=>node?.kind==='call'&&node.path==='Some'&&node.args.length===1&&node.args[0].kind==='name'&&node.args[0].name===binder;
 const original=node=>node?.kind==='name'&&node.name===input;
 const binding=row=>!row.mutable&&!nonBindings.has(row.name)&&(row.type===null||row.type===undefined||row.type===type);
 if(body.statements.length===1&&!body.tail){const branch=body.statements[0];if(branch.kind==='if-option-let'&&binding(branch)&&original(branch.value)&&absent(branch.otherwise)&&some(returned(branch.yes),branch.name))return true;}
 const first=body.statements[0];if(!first||!binding(first))return false;
 const tail=body.statements.length===1?body.tail:body.statements.length===2&&!body.tail&&body.statements[1].kind==='return'?body.statements[1].value:null;
 if(!some(tail,first.name))return false;
 if(first.kind==='let-option-else')return original(first.value)&&absent(first.otherwise);
 return first.kind==='let'&&first.value?.kind==='effect-try'&&original(first.value.value);
}
