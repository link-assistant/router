#!/usr/bin/env python3
"""Prepare, but do not install, the complete native source producer successor."""
from hashlib import sha256
from pathlib import Path
import gzip
import json

producer = Path('tools/translation/prepare-native-regeneration-batch.mjs')
source = producer.read_text()

def once(text, before, after):
    if text.count(before) != 1:
        raise ValueError('Unique complete producer anchor required')
    return text.replace(before, after, 1)

helper = r''' const lifetimeRule={id:'native-regeneration:consume-private-meta-and-plan-keys',apply(source){
  const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if(file.parseDiagnostics.length)throw Error('Complete private regeneration grammar differs');
  const select=name=>{
   const nodes=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
   if(nodes.length!==1)throw Error('Unique private regeneration declaration required: '+name);
   return source.slice(nodes[0].getStart(file),nodes[0].end);
  };
  const oldBuilder=select('buildNativeTypeScriptForRegeneration');
  let builder=once(oldBuilder,
   '    const meta = parseBuildReconstructedNativeJavaScript(ts, path, source, { file: inference.program.getSourceFile(join(sourceRoot, path)), checker: inference.checker });\n    const metaText = `${JSON.stringify(meta)}\\n`;',
   '    const metaText = `${JSON.stringify(parseBuildReconstructedNativeJavaScript(ts, path, source, { file: inference.program.getSourceFile(join(sourceRoot, path)), checker: inference.checker }))}\\n`;');
  builder=once(builder,'nodes: meta.nodes,','nodes: reparsed.nodes,');
  const oldEmitter=select('emitRegeneratedNativeTypeScript');
  let emitter=once(oldEmitter,
   '  const plans=new Map((meta.gaps??[]).map(gap=>[`${gap.kind}:${gap.occurrence}`,gap]));\n  const plannedKinds=new Set([...plans.keys()].map(key=>key.slice(0,key.indexOf(\':\'))));',
   '  const plans=new Map();\n  for(const gap of meta.gaps??[]){\n    let kindPlans=plans.get(gap.kind);\n    if(!kindPlans){kindPlans=new Map();plans.set(gap.kind,kindPlans);}\n    kindPlans.set(gap.occurrence,gap);\n  }');
  emitter=once(emitter,
   '      if(plannedKinds.has(`${node.kind}`)){\n        const occurrence=occurrences.get(node.kind)??0;occurrences.set(node.kind,occurrence+1);\n        gap=plans.get(`${node.kind}:${occurrence}`)??empty;\n      }',
   '      const kindPlans=plans.get(node.kind);\n      if(kindPlans){\n        const occurrence=occurrences.get(node.kind)??0;occurrences.set(node.kind,occurrence+1);\n        gap=kindPlans.get(occurrence)??empty;\n      }');
  return once(once(source,oldBuilder,builder),oldEmitter,emitter);
 }};
'''
source = once(source, ' const repository=createRulePipeline([\n', helper + ' const repository=createRulePipeline([\n')
source = once(source, '   return memoryEvolution.after;\n  }}]},', '   return memoryEvolution.after;\n  }},lifetimeRule]},')
source = once(source,
    'physical!==memoryEvolution.before&&physical!==after)',
    'physical!==memoryEvolution.before&&physical!==memoryEvolution.after&&physical!==after)')
source = once(source,
    'if(receivingEvolution.after!==after)',
    'if(receivingEvolution.after!==memoryEvolution.after)')
source = once(source,
    'const [equation,previousEquation,receivingEquation]=transportConcreteSourcePhases([',
    'const [equation,previousEquation,memoryEquation,receivingEquation]=transportConcreteSourcePhases([')
source = once(source,
    '  ...(receivingEvolution?[{before:physical,middle:after,after,language:',
    '  {before:memoryEvolution.after,middle:after,after,language:\'JavaScript\'},\n  ...(receivingEvolution?[{before:physical,middle:after,after,language:')
source = once(source,
    'previousAfter,previousSha256,previousEquation,memoryEvolution,nativeBindings,receivingEvolution,receivingEquation,',
    'previousAfter,previousSha256,previousEquation,memoryEvolution,memoryEquation,nativeBindings,receivingEvolution,receivingEquation,')
path = Path('ci-logs/issue-784-restart-2/current-native-meta-lifetime-producer.mjs')
with path.open('x') as out:
    out.write(source)
record = {'schema': 'native-meta-lifetime-producer-draft-v1', 'producer': str(producer),
          'before': producer.read_text(), 'after': source, 'candidate': str(path),
          'productionSourcesChanged': False, 'executed': False,
          'semanticAuthority': False, 'productionExecutableGain': 0}
raw = json.dumps(record, separators=(',', ':')).encode()
receipt = path.with_suffix('.json.gz')
with receipt.open('xb') as out:
    out.write(gzip.compress(raw, compresslevel=6, mtime=0))
if gzip.decompress(receipt.read_bytes()) != raw:
    raise ValueError('Complete draft readback differs')
print(json.dumps({'candidate': str(path), 'beforeSha256': sha256(record['before'].encode()).hexdigest(),
                  'afterSha256': sha256(source.encode()).hexdigest(), 'bytes': len(source.encode()),
                  'productionSourcesChanged': False, 'executed': False}))
