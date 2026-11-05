// String emission consumes only freshly reissued complete checked source IR.
export function emitOwnedJsonLoop(statement,{rust,expr,body,sequence,indent,rustName}){
 const pad=' '.repeat(indent);if(!rust)return pad+'for (const '+statement.name+' of '+expr(statement.value)+') {\n'+body(statement.body,indent+4)+'\n'+pad+'}';
 const name='__ro_loop_values_'+sequence(),value=expr(statement.value),argument=statement.value.type==='json-list-owned'?'&'+value:value;
 return pad+'let '+name+' = crate::translation_state_core::json_values_copy('+argument+');\n'+pad+'__ro_domain(&::serde_json::Value::Array('+name+'.clone()));\n'+pad+'for '+rustName(statement.name)+' in '+name+'.iter() {\n'+body(statement.body,indent+4)+'\n'+pad+'}';
}
export function hasOwnedJsonLoop(program){
 let cells=0;function visit(value,depth=0){if(++cells>100000||depth>160)throw new TypeError('Owned JSON loop source traversal bound exceeded');if(!value||typeof value!=='object')return false;if(value.kind==='for-json')return true;for(const [key,item]of Object.entries(value))if(!['source','pairedSource','hostCalls','span','type'].includes(key)&&visit(item,depth+1))return true;return false;}for(const item of program){cells=0;if(visit(item))return true;}return false;
}
