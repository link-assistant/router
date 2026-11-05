// Closed primitive domain DATA. Original source/type admission stays upstream.
const fail=message=>{throw new TypeError('Owned reverse vector input: '+message);};
export function vectorScalarBounds(name){
 if(name==='bool'||name==='f64')return null;
 if(typeof name!=='string'||!/^[iu](?:8|16|32|64|128|size)$/u.test(name))fail('unknown original primitive domain');
 const bits=BigInt(name.endsWith('size')?64:Number(name.slice(1))),signed=name[0]==='i';
 return {minimum:signed?-(1n<<(bits-1n)):0n,maximum:(1n<<(signed?bits-1n:bits))-1n};
}
export function validateVectorParameters(item,scope){
 if(!item.vectorOrigin)return;
 for(const param of item.params){const value=scope.get(param.name),bounds=vectorScalarBounds(param.type);if(bounds?(typeof value!=='bigint'||value<bounds.minimum||value>bounds.maximum):typeof value!==(param.type==='f64'?'number':'boolean'))fail('argument differs from actual original scalar domain');}
}
export function vectorParameterPrelude(item,rust){
 if(rust||!item.vectorOrigin)return '';
 return item.params.map(param=>{const bounds=vectorScalarBounds(param.type),test=bounds?'typeof '+param.name+' !== "bigint" || '+param.name+' < '+bounds.minimum+'n || '+param.name+' > '+bounds.maximum+'n':'typeof '+param.name+' !== '+JSON.stringify(param.type==='f64'?'number':'boolean');return '    if ('+test+') throw new TypeError("Owned vector argument differs from actual original scalar domain");';}).join('\n');
}
