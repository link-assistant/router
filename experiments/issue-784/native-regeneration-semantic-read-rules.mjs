// Draft source recipe only. Run after the frozen production-generation batch.
// Public serializers and their custom compiler/checker observations stay intact.
import {createRulePipeline} from '../../tools/translation/rule-pipeline.mjs';
import {exactLiteralSubstitutionRule as literalRule} from '../../tools/translation/literal-substitution-rule.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';

const exactLiteralSubstitutionRule=(id,before,after)=>literalRule(id,before,after,'Complete source anchor changed: '+id);

export function preparePrivateRegenerationSerializer(before) {
  if(typeof before!=='string'||!before.startsWith('function serializeBuild('))throw Error('Complete original build serializer required');
  const signatureBefore=`        const signature=checker.getResolvedSignature(node),parameters=signature?.getParameters()??[];
        const formal=signature?.declaration?.parameters;
        const rest=formal?formal.at(-1)?.dotDotDotToken:parameters.at(-1)?.declarations?.some(declaration=>declaration.dotDotDotToken);
        // The JS checker can infer extra parameters from callers. The emitted
        // declaration still has the original formal list, so compare that list.
        if(node.arguments.length>(formal?.length??parameters.length) && !rest || ts.isPropertyAccessExpression(node.expression) && node.expression.name.text==='bind') gap.call=true;`;
  const signatureAfter=`        // Only this private stock-checker contract elides unused queries.
        // A zero-argument call cannot exceed a nonnegative formal count;
        // bind always needs the existing gap regardless of its signature.
        if(ts.isPropertyAccessExpression(node.expression) && node.expression.name.text==='bind')gap.call=true;
        else if(node.arguments.length) {
          const signature=checker.getResolvedSignature(node),parameters=signature?.getParameters()??[];
          const formal=signature?.declaration?.parameters;
          const rest=formal?formal.at(-1)?.dotDotDotToken:parameters.at(-1)?.declarations?.some(declaration=>declaration.dotDotDotToken);
          if(node.arguments.length>(formal?.length??parameters.length) && !rest)gap.call=true;
        }`;
  const language=createRulePipeline([
    {phase:'language',rules:[
      exactLiteralSubstitutionRule('native-regeneration:unused-zero-arity-and-bind-signatures',signatureBefore,signatureAfter),
      exactLiteralSubstitutionRule('native-regeneration:empty-loop-binding-set',
        'if(ts.isIdentifier(node) && !propertyName && !ts.isDeclarationName(node) && loopBindings.has(checker.getSymbolAtLocation(node)))gap.loopBinding=true;',
        'if(loopBindings.size && ts.isIdentifier(node) && !propertyName && !ts.isDeclarationName(node) && loopBindings.has(checker.getSymbolAtLocation(node)))gap.loopBinding=true;'),
      exactLiteralSubstitutionRule('native-regeneration:empty-reassigned-binding-set',
        'if(ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && reassignedBindings.has(checker.getSymbolAtLocation(node.expression)) && checker.getTypeAtLocation(node.expression).flags&ts.TypeFlags.Any)gap.globalProperty=true;',
        'if(reassignedBindings.size && ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && reassignedBindings.has(checker.getSymbolAtLocation(node.expression)) && checker.getTypeAtLocation(node.expression).flags&ts.TypeFlags.Any)gap.globalProperty=true;'),
    ]},
    {phase:'repository',rules:[]},
  ]).run(before);
  const middle=language.value;
  const repository=createRulePipeline([
    {phase:'language',rules:[]},
    {phase:'repository',rules:[exactLiteralSubstitutionRule('native-regeneration:name-private-serializer',
      'function serializeBuild(', 'function serializeRegenerationBuild(')]},
  ]).run(middle);
  const after=repository.value;
  const [equation]=transportConcreteSourcePhases([{before,middle,after,language:'JavaScript'}]);
  return {before,middle,after,equation,trace:[language.trace,repository.trace],
    semanticAuthority:false,publicSerializerChanged:false,performanceQualified:false};
}
