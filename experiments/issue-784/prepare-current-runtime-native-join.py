"""Extend the full receiving source equation to the current native producer."""
from pathlib import Path


def once(source, before, after):
    if source.count(before) != 1:
        raise RuntimeError('Unique original source anchor required: ' + before)
    return source.replace(before, after)


target = Path('tools/translation/prepare-runtime-import-current-sources.mjs')
source = target.read_text()
source = once(source,
              "import {prepareRuntimeImportPhasedData} from './prepare-runtime-import-phased-data.mjs';",
              "import {prepareRuntimeImportPhasedData} from './prepare-runtime-import-phased-data.mjs';\n"
              "import {prepareNativeRegenerationBatch} from './prepare-native-regeneration-batch.mjs';")
source = once(source, "const nativeCurrent='399c4719f43a7fdf9e682219fb38463e06accd4ac6bae980ee314a40e035c362';",
              "const nativePrevious='399c4719f43a7fdf9e682219fb38463e06accd4ac6bae980ee314a40e035c362';\n"
              "const sourceOriginPrevious='b0e9ed69588b445686802b67cd5e71a51f43921f6797a2c0304438eee7d7793b';")
source = once(source, ' const ts=ownershipCompiler(),files=[];',
              ' const ts=ownershipCompiler(),files=[],nativeBatch=prepareNativeRegenerationBatch();\n'
              ' const nativeCurrent=nativeBatch.afterSha256;')
source = once(source,
              ' files.push({path:base+nodeName,before:dataBefore,middle:dataMiddle,after:dataAfter});',
              " const dataPrevious=dataAfter;\n"
              " dataAfter=once(dataAfter,\"'tools/translation/prepare-native-regeneration-batch.mjs',\","
              "\"'tools/translation/prepare-native-regeneration-batch.mjs','tools/translation/native-regeneration-semantic-rules.mjs',\");\n"
              ' files.push({path:base+nodeName,before:dataBefore,middle:dataMiddle,after:dataAfter,previousAfter:dataPrevious});')
source = once(source,
              "  if(relative==='test/runtime-import-phased-data.test.mjs'&&old.includes(nativeCurrent))old=once(old,nativeCurrent,nativeOld).replace(historyAssertion,'');",
              """  if(relative==='test/runtime-import-phased-data.test.mjs'){
   if(old.includes(historyAssertion))old=once(old,historyAssertion,'');
   for(const pin of [nativePrevious,sourceOriginPrevious,nativeCurrent])if(old.includes(pin))old=once(old,pin,nativeOld);
  }""")
source = once(source, '  files.push({path,before:old,middle:old,after:changed,current});',
              "  const previousAfter=relative==='test/runtime-import-phased-data.test.mjs'?once(changed,nativeCurrent,nativePrevious):undefined;\n"
              '  files.push({path,before:old,middle:old,after:changed,current,...(previousAfter===undefined?{}:{previousAfter})});')
source = once(source,
              '  if(row.current!==null&&row.current!==row.before&&row.current!==row.after)fail(\'unexpected complete physical source: \'+row.path);',
              "  if(Object.hasOwn(row,'previousAfter')){\n"
              "   [row.previousEquation]=transportConcreteSourcePhases([{before:row.previousAfter,middle:row.after,after:row.after,language:'JavaScript'}]);\n"
              "   if(row.previousEquation.inverse!==row.previousAfter)fail('complete previous receiving inverse differs');\n"
              "  }\n"
              "  if(row.current!==null&&row.current!==row.before&&row.current!==row.after&&(!Object.hasOwn(row,'previousAfter')||row.current!==row.previousAfter))fail('unexpected complete physical source: '+row.path);")
target.write_text(source)
print('Retained complete original and grouped receiving equations; added fresh current native composition.')
