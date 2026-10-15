// Runtime metadata uses the same shipped file boundary as authoring tools.
import { readProjectData } from './project-data-files.js';

export function readRuntimeProjectData(file, options) {
  return readProjectData(file, options);
}
