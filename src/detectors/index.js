/**
 * @module detectors
 *
 * Registry of all obfuscation detectors. Each detector is
 * `{ name, prioritizeOver, detect(flatTree, previouslyDetectedNames) }`.
 *
 * ## Evaluation order
 * Detectors run in the order listed in {@link detectors}. Order matters for composites
 * that read previously detected names (e.g. `obfuscator_io` checks for
 * `augmented_array_function_replacements`).
 *
 * ## Reduced-mode suppression
 * `prioritizeOver` is a directed inclusiveness graph: if A prioritizes over B and both
 * fire, reduced mode keeps A and drops B (transitively). Full/raw mode keeps every hit.
 *
 * ## Replacements-family suggested specificity (most → least inclusive)
 * 1. `augmented_proxied_array_function_replacements`
 * 2. `proxied_array_function_replacements` / `augmented_array_function_replacements` /
 *    `augmented_array_replacements`
 * 3. Bases: `array_replacements`, `array_function_replacements`, `function_to_array_replacements`
 * 4. Composite `obfuscator_io` (may remain the reduced primary for javascript-obfuscator samples)
 */

import {detector as arrayFunctionReplacements} from './arrayFunctionReplacements.js';
import {detector as arrayReplacements} from './arrayReplacements.js';
import {detector as augmentedArrayFunctionReplacements} from './augmentedArrayFunctionReplacements.js';
import {detector as augmentedArrayReplacements} from './augmentedArrayReplacements.js';
import {detector as augmentedProxiedArrayFunctionReplacements} from './augmentedProxiedArrayFunctionReplacements.js';
import {detector as caesarPlus} from './caesarPlus.js';
import {detector as cffStorageObject} from './cffStorageObject.js';
import {detector as functionToArrayReplacements} from './functionToArrayReplacements.js';
import {detector as jsConfuserStateMachine} from './jsConfuserStateMachine.js';
import {detector as jsConfuserStringBank} from './jsConfuserStringBank.js';
import {detector as obfuscatorIo} from './obfuscatorIo.js';
import {detector as proxiedArrayFunctionReplacements} from './proxiedArrayFunctionReplacements.js';
import {detector as sequencedIndexSwitch} from './sequencedIndexSwitch.js';

/**
 * Ordered list of detectors evaluated for every detection API.
 *
 * @type {Array<{name: string, prioritizeOver: string[], detect: Function}>}
 */
const detectors = [
  arrayReplacements,
  arrayFunctionReplacements,
  augmentedArrayReplacements,
  augmentedArrayFunctionReplacements,
  proxiedArrayFunctionReplacements,
  augmentedProxiedArrayFunctionReplacements,
  functionToArrayReplacements,
  cffStorageObject,
  sequencedIndexSwitch,
  obfuscatorIo,
  jsConfuserStringBank,
  jsConfuserStateMachine,
  caesarPlus,
];

/**
 * Builds a name → detector map.
 *
 * @param {Array<{name: string, prioritizeOver: string[], detect: Function}>} [detectorsList=detectors]
 * @returns {Map<string, {name: string, prioritizeOver: string[], detect: Function}>}
 */
function getDetectorMap(detectorsList = detectors) {
  return new Map(detectorsList.map(detector => [detector.name, detector]));
}

/**
 * Validates detector names and the `prioritizeOver` graph (unknown targets, cycles, duplicates).
 *
 * @param {Array<{name: string, prioritizeOver: string[], detect: Function}>} [detectorsList=detectors]
 * @throws {Error} On duplicate names, unknown prioritizeOver targets, or cycles.
 */
function validateDetectors(detectorsList = detectors) {
  const detectorMap = getDetectorMap(detectorsList);

  if (detectorMap.size !== detectorsList.length) {
    throw new Error('Duplicate detector names are not allowed');
  }

  for (const detector of detectorsList) {
    for (const prioritizedName of detector.prioritizeOver) {
      if (!detectorMap.has(prioritizedName)) {
        throw new Error(`Detector "${detector.name}" prioritizes over unknown detector "${prioritizedName}"`);
      }
    }
  }

  const visited = new Set();
  const active = new Set();

  /**
   * DFS cycle detection over the prioritizeOver graph.
   * @param {string} detectorName
   */
  function visit(detectorName) {
    if (active.has(detectorName)) {
      throw new Error(`Cycle detected in prioritizeOver graph at "${detectorName}"`);
    }
    if (visited.has(detectorName)) return;

    active.add(detectorName);
    const detector = detectorMap.get(detectorName);
    detector.prioritizeOver.forEach(visit);
    active.delete(detectorName);
    visited.add(detectorName);
  }

  detectorsList.forEach(detector => visit(detector.name));
}

validateDetectors();

export {detectors, getDetectorMap, validateDetectors};
