// Reusable source-expression DATA planner. Candidate written spellings never
// authenticate a type: every emitted call must pass the actual private checker.
const fail=message=>{throw new TypeError('Scalar collection callback expression: '+message);};
const domains=new Set(['bool','u8','i8','u16','i16','u32','i32','u64','i64','u128','i128']);
export function candidateScalarSliceParameterDomain(ts,parameter){
 let type=parameter.type??ts.getJSDocType(parameter),steps=0;
 const unwrap=()=>{while(type&&ts.isParenthesizedTypeNode(type)){if(++steps>16)fail('bounded written candidate type');type=type.type;}};
 unwrap();if(type&&ts.isTypeOperatorNode(type)&&type.operator===ts.SyntaxKind.ReadonlyKeyword){type=type.type;unwrap();}
 if(!type||!ts.isArrayTypeNode(type))fail('written primitive slice candidate required');
 type=type.elementType;unwrap();if(type?.kind===ts.SyntaxKind.BooleanKeyword)return 'bool';
 const name=type&&ts.isImportTypeNode(type)&&type.qualifier&&ts.isIdentifier(type.qualifier)?type.qualifier.text:type&&ts.isTypeReferenceNode(type)&&ts.isIdentifier(type.typeName)?type.typeName.text:null;
 const match=typeof name==='string'&&/^Rust([UI])(8|16|32|64|128)$/u.exec(name),domain=match?match[1].toLowerCase()+match[2]:null;
 if(!domain||!domains.has(domain))fail('explicit written primitive slice candidate required');return domain;
}
export function lowerScalarCallbackExpression(node,{ts,file,parameter,inputDomain,outputDomain,imported,tick}){
 if(!domains.has(inputDomain)||!domains.has(outputDomain))fail('finite input/output candidate domains required');
 const arithmetic={'+':'add','-':'sub','*':'mul','/':'div','%':'rem'},operators=new Set(['<','<=','>','>=','===','!==','&&','||','&','|','^','<<','>>']);
 // Constants in a bool→integer map use the separate output candidate; scalar
 // input operands always retain their actual private checked source domain.
 const numericDomain=inputDomain==='bool'?outputDomain:inputDomain,numeric=numericDomain!=='bool',bits=numeric?Number(numericDomain.slice(1)):null,signed=numeric?numericDomain[0]==='i':null,metadata=String(bits)+','+String(signed);
 function emit(value,depth=0){
  tick(depth);
  if(ts.isIdentifier(value)){if(value.text!==parameter)fail('captured callback values need a separate ownership profile');return value.text;}
  if(ts.isBigIntLiteral(value)||value.kind===ts.SyntaxKind.TrueKeyword||value.kind===ts.SyntaxKind.FalseKeyword)return value.getText(file);
  if(ts.isParenthesizedExpression(value))return '('+emit(value.expression,depth+1)+'\n)';
  if(ts.isPrefixUnaryExpression(value)){
   if(value.operator===ts.SyntaxKind.MinusToken&&ts.isBigIntLiteral(value.operand))return value.getText(file);
   const operand=emit(value.operand,depth+1);
   if(value.operator===ts.SyntaxKind.ExclamationToken)return '(!'+operand+')';
   if(!numeric)fail('numeric unary callback operation requires a native integer candidate');
   if(value.operator===ts.SyntaxKind.MinusToken)return imported('integerArithmetic')+'('+operand+',null,'+metadata+',"neg")';
   if(value.operator===ts.SyntaxKind.TildeToken)return imported('primitiveNot')+'('+operand+','+metadata+')';
   fail('unsupported coercing or mutating unary callback expression');
  }
  if(ts.isBinaryExpression(value)){
   const op=value.operatorToken.getText(file);if(!Object.hasOwn(arithmetic,op)&&!operators.has(op))fail('unsupported callback binary operation');
   const left=emit(value.left,depth+1),right=emit(value.right,depth+1);
   if(Object.hasOwn(arithmetic,op)){if(!numeric)fail('arithmetic callback requires a native integer candidate');return imported('integerArithmetic')+'('+left+','+right+','+metadata+','+JSON.stringify(arithmetic[op])+')';}
   if(['<<','>>'].includes(op)){if(!numeric)fail('shift callback requires a native integer candidate');return imported('integerShift')+'('+left+','+right+','+metadata+','+metadata+','+JSON.stringify(op)+')';}
   if(['&','|','^'].includes(op))return imported('primitiveBitwise')+'('+left+','+right+','+JSON.stringify(op)+','+metadata+')';
   return '('+left+' '+op+' '+right+')';
  }
  if(ts.isConditionalExpression(value))return '('+emit(value.condition,depth+1)+'?'+emit(value.whenTrue,depth+1)+':'+emit(value.whenFalse,depth+1)+')';
  fail('only capture-free scalar expressions without calls writes references or suspension are supported');
 }
 return emit(node);
}
