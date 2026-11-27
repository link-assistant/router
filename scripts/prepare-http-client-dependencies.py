"""Apply the Router probe's dependency pins to disposable OpenAPI clients."""

from pathlib import Path
from shutil import copyfile
from sys import argv
import xml.etree.ElementTree as xml


FIXTURES = Path(__file__).resolve().parents[1] / 'experiments/issue-697/http-clients'
MAVEN_NS = 'http://maven.apache.org/POM/4.0.0'
MAVEN = {'m': MAVEN_NS}
JAVA_PROPERTIES = {
    'java.version': '17',
    'okhttp-version': '5.5.1',
    'gson-version': '2.15.0',
    'commons-lang3-version': '3.22.0',
    'jakarta-annotation-version': '3.0.0',
    'jakarta.ws.rs-api-version': '4.0.0',
    'junit-version': '6.1.3',
    'spotless.version': '3.12.0',
}
JAVA_PLUGINS = {
    'maven-compiler-plugin': '3.16.0',
    'maven-enforcer-plugin': '3.7.0',
    'maven-surefire-plugin': '3.6.1',
    'maven-dependency-plugin': '3.11.0',
    'maven-jar-plugin': '3.5.1',
    'maven-javadoc-plugin': '3.12.0',
    'maven-source-plugin': '3.4.0',
    'maven-gpg-plugin': '3.2.8',
    'build-helper-maven-plugin': '3.8.0',
}


def prepare_java(directory):
    xml.register_namespace('', MAVEN_NS)
    path = directory / 'pom.xml'
    pom = xml.parse(path, parser=xml.XMLParser(target=xml.TreeBuilder(insert_comments=True)))
    properties = pom.find('m:properties', MAVEN)
    for name, version in JAVA_PROPERTIES.items():
        properties.find(f'm:{name}', MAVEN).text = version
    properties.remove(properties.find('m:junit-platform-runner.version', MAVEN))
    plugins = {p.findtext('m:artifactId', namespaces=MAVEN): p for p in pom.findall('.//m:plugin', MAVEN)}
    for name, version in JAVA_PLUGINS.items():
        plugins[name].find('m:version', MAVEN).text = version
    formatter = plugins['spotless-maven-plugin'].find('m:configuration/m:java/m:googleJavaFormat/m:version', MAVEN)
    formatter.text = '2.0.0'

    dependencies = pom.find('m:dependencies', MAVEN)
    # Maven consumes the JVM artifact of OkHttp. Surefire uses JUnit Platform
    # directly, so the generated JUnit 4 bridge is redundant.
    okhttp = dependencies.find("m:dependency[m:artifactId='okhttp']/m:artifactId", MAVEN)
    okhttp.text = 'okhttp-jvm'
    dependencies.remove(dependencies.find("m:dependency[m:artifactId='junit-platform-runner']", MAVEN))
    pom.write(path, encoding='utf-8', xml_declaration=True)


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
