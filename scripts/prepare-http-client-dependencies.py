"""Apply the Router probe's dependency manifests to disposable OpenAPI clients."""

from pathlib import Path
from shutil import copyfile
from sys import argv
import xml.etree.ElementTree as xml


FIXTURES = Path(__file__).resolve().parents[1] / 'experiments/issue-697/http-clients'
MAVEN_NS = 'http://maven.apache.org/POM/4.0.0'
PROJECT_VERSION = f'{{{MAVEN_NS}}}version'


def prepare_java(directory):
    xml.register_namespace('', MAVEN_NS)
    path = directory / 'pom.xml'
    generated_version = xml.parse(path).findtext(PROJECT_VERSION)
    if not generated_version:
        raise ValueError(f'Missing generated Java client version in {path}')
    parser = xml.XMLParser(target=xml.TreeBuilder(insert_comments=True))
    pinned = xml.parse(FIXTURES / 'pom.xml', parser=parser)
    pinned.find(PROJECT_VERSION).text = generated_version
    pinned.write(path, encoding='utf-8', xml_declaration=True)

    # The okhttp-gson generator still calls the deprecated Gson setter in both
    # deserialize overloads. Keep the same leniency with the current Gson API.
    json_path = directory / 'src/main/java/router/client/JSON.java'
    source = json_path.read_text(encoding='utf-8')
    deprecated_call = 'jsonReader.setLenient(true);'
    current_call = 'jsonReader.setStrictness(com.google.gson.Strictness.LENIENT);'
    if deprecated_call in source:
        if source.count(deprecated_call) != 2 or current_call in source:
            raise ValueError(f'Unexpected Gson leniency calls in {json_path}')
        json_path.write_text(source.replace(deprecated_call, current_call), encoding='utf-8')


if __name__ == '__main__':
    language, destination = argv[1:]
    directory = Path(destination)
    match language:
        case 'go':
            for name in ('go.mod', 'go.sum'):
                copyfile(FIXTURES / name, directory / name)
        case 'php':
            for name in ('composer.json', 'composer.lock'):
                copyfile(FIXTURES / name, directory / name)
        case 'java':
            prepare_java(directory)
        case _:
            raise SystemExit(f'Unknown HTTP client language {language}')
