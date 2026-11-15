"""Draft complete native CLI equations for the historical and current inputs."""
import gzip
import hashlib
import json
from pathlib import Path

files = []


def change(path, rewrite):
    before = Path(path).read_text()
    after = rewrite(before)
    assert before != after
    sha = lambda source: hashlib.sha256(source.encode()).hexdigest()
    files.append(dict(path=path, before=before, after=after,
                      beforeSha256=sha(before), afterSha256=sha(after)))


def once(source, before, after):
    assert source.count(before) == 1, before
    return source.replace(before, after)


def producer(source):
    start = source.index(" files.push(route(ts,sources.get(cli),'scripts/translate-router-native-owned-field-meta.mjs',{")
    end = source.index(" const bindings=verifyNativeCopiedModuleBindings", start)
    selected = source[start:end]
    body = selected.replace(" files.push(route(ts,sources.get(cli),", " return route(ts,source,", 1)
    assert body.endswith('}));\n')
    body = body[:-5] + '});\n'
    helper = ('function deriveNativeCliSource(ts,source,deferCli){\n' + body + '}\n'
              '// Complete CLI source DATA; the receiving cohort supplies fresh all-module bindings.\n'
              'export function deriveNativeCliBoundarySource(source){\n'
              ' return deriveNativeCliSource(ownershipCompiler(),source,true);\n}\n')
    source = source[:start] + ' files.push(deriveNativeCliSource(ts,sources.get(cli),deferCli));\n' + source[end:]
    return once(source, '// Source DATA only. The archived equations keep their original eager imports;',
                helper + '// Source DATA only. The archived equations keep their original eager imports;')


change('tools/translation/prepare-native-output-text-retention.mjs', producer)


def history(source):
    source = once(source, 'deriveCurrentNativeOutputTextSourceSet,deriveNativeMatrixBoundarySources}',
                  'deriveCurrentNativeOutputTextSourceSet,deriveNativeMatrixBoundarySources,deriveNativeCliBoundarySource}')
    source = once(source,
                  ' // Five rows have identical complete inputs and outputs in both cohorts. Reuse\n'
                  ' // those source equations within this invocation; semantic checks remain fresh\n'
                  ' // for the entire historical cohort, including both separately derived rows.\n'
                  ' const traceFiles=files.map((row,at)=>({...([4,5].includes(at)?boundaries[at-4]:row)}));',
                  ' // Four rows have identical complete inputs and outputs in both cohorts.\n'
                  ' // Reproduce both matrix boundaries and the historical CLI from their own\n'
                  ' // complete archived inputs; current progress diagnostics stay separate.\n'
                  ' const traceCli=deriveNativeCliBoundarySource(traceSources.get(INPUTS[6]).source);\n'
                  ' const traceFiles=files.map((row,at)=>({...([4,5].includes(at)?boundaries[at-4]:at===6?traceCli:row)}));')
    source = once(source, ' const plan={schema:',
                  " const [cliEvolution]=transportConcreteNamedSourcePhases([{before:traceCli.after,middle:traceCli.after,after:files[6].after,language:'JavaScript',rules:['language:preserve-complete-native-cli','repository:follow-checked-progress-adapter','language:restore-complete-native-cli','repository:restore-trace-cli']}]);\n"
                  " if(cliEvolution.before!==traceCli.after||cliEvolution.after!==files[6].after||cliEvolution.inverse!==traceCli.after)fail('complete native CLI evolution differs');\n"
                  ' const plan={schema:')
    return once(source, 'inputs,history,traceHistory,traceFiles,prerequisites:',
                'inputs,history,traceHistory,traceFiles,cliEvolution,prerequisites:')


change('tools/translation/prepare-current-native-output-text-retention.mjs', history)


def tests(source):
    source = once(source,
                  " assert.deepEqual(traceChanged,['tools/translation/native-owned-field-isolated-matrix-session.mjs','tools/translation/native-owned-field-isolated-matrix-profile.mjs']);",
                  " assert.deepEqual(traceChanged,['tools/translation/native-owned-field-isolated-matrix-session.mjs','tools/translation/native-owned-field-isolated-matrix-profile.mjs','scripts/translate-router-native-owned-field-meta.mjs']);")
    source = once(source, 'old=parse(cli.historical.after),current=parse(cli.after);',
                  'old=parse(cli.historical.after),current=parse(plan.traceFiles.at(-1).after);')
    return once(source, ' const edits=cli.stages[1].edits.filter',
                " const progress=plan.cliEvolution;assert.equal(progress.before,plan.traceFiles.at(-1).after);assert.equal(progress.after,cli.after);assert.equal(progress.inverse,progress.before);\n"
                " assert.deepEqual(progress.stages.map(stage=>stage.phase),['language','repository']);\n"
                " for(const stage of progress.stages){assert.equal(transportConcreteSyntaxMeta(stage.beforeMeta).source,stage.before);assert.equal(transportConcreteSyntaxMeta(stage.afterMeta).source,stage.after);assert.equal(stage.inverse,stage.before);}\n"
                " const imports=parse(cli.after).statements.filter(ts.isImportDeclaration).filter(node=>node.moduleSpecifier.text==='../tools/translation/translation-progress.mjs');\n"
                " assert.equal(imports.length,1);assert.equal(imports[0].importClause.namedBindings.elements[0].name.text,'namespaceProgressObserver');\n"
                " assert.ok(cli.after.includes('progress:progress?namespaceProgressObserver(record=>'));\n"
                ' const edits=cli.stages[1].edits.filter')


change('tools/translation/test/current-native-output-text-retention.test.mjs', tests)
raw = json.dumps(dict(schema='complete-native-cli-progress-history-author-draft-v1',
                      files=files, originalDeadlinesChanged=False,
                      originalHistoryPinsChanged=False, productionExecutableGain=0)).encode()
target = Path('ci-logs/issue-784-restart-2/native-cli-progress-history-source-draft.json.gz')
with target.open('xb') as stream:
    stream.write(gzip.compress(raw, mtime=0))
assert gzip.decompress(target.read_bytes()) == raw
print(json.dumps(dict(output=str(target), bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())))
