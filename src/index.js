/**
 * @module obfuscation-detector
 *
 * Public API for classifying JavaScript obfuscation from source text.
 *
 * ## Pipeline
 * 1. Parse `code` into a flattened AST via flAST (`generateFlatAST`).
 * 2. Run every detector in registry order; each may consult names already detected.
 * 3. Attach `prioritizeOver` / `suppressedBy` metadata for each hit.
 * 4. Export raw, reduced, or detailed views of that result set.
 *
 * ## Output modes
 * | API | Meaning |
 * |-----|---------|
 * | `detectObfuscation` | Every matching label (raw / full). |
 * | `detectObfuscationReduced` | Labels with empty `suppressedBy` only. |
 * | `detectObfuscationDetailed` | `{ name, prioritizeOver, suppressedBy }[]`. |
 *
 * ## Example
 * ```js
 * import {detectObfuscation, detectObfuscationReduced} from 'obfuscation-detector';
 *
 * const code = fs.readFileSync('sample.js', 'utf8');
 * detectObfuscation(code);
 * // e.g. ['array_function_replacements', 'augmented_array_function_replacements', 'obfuscator_io']
 *
 * detectObfuscationReduced(code);
 * // e.g. ['obfuscator_io']
 * ```
 */

import {generateFlatAST, logger} from 'flast';
import {detectors, getDetectorMap} from './detectors/index.js';

/**
 * Transitively collects detector names that `detectorName` suppresses via `prioritizeOver`.
 *
 * @param {string} detectorName - Starting detector name.
 * @param {Map<string, {prioritizeOver: string[]}>} detectorMap - Name → detector registry.
 * @param {Set<string>} [visited=new Set()] - Accumulator / cycle guard (includes `detectorName`).
 * @returns {Set<string>} All names reachable through prioritizeOver, including the start name.
 */
function getSuppressedNames(detectorName, detectorMap, visited = new Set()) {
  if (visited.has(detectorName)) return visited;

  visited.add(detectorName);
  const detector = detectorMap.get(detectorName);

  detector?.prioritizeOver.forEach(prioritizedName => {
    getSuppressedNames(prioritizedName, detectorMap, visited);
  });

  return visited;
}

/**
 * Runs the full detector suite and builds detailed results.
 *
 * Parse failures and per-detector exceptions are swallowed (debug-logged) so callers
 * always receive an array.
 *
 * @param {string} code - JavaScript source.
 * @returns {Array<{name: string, prioritizeOver: string[], suppressedBy: string[]}>}
 */
function createDetailedResults(code) {
  const detectedNames = [];
  const detectorMap = getDetectorMap();

  try {
    const tree = generateFlatAST(code);
    for (const detector of detectors) {
      try {
        if (detector.detect(tree, detectedNames)) {
          detectedNames.push(detector.name);
        }
      } catch (e) {
        logger.debug(`Error while running ${detector.name}: ${e.message}`);
      }
    }
  } catch (e) {
    logger.debug(e.message);
  }

  return detectedNames.map(name => {
    const suppressedBy = detectedNames.filter(otherName => {
      if (otherName === name) return false;
      return getSuppressedNames(otherName, detectorMap).has(name);
    });

    return {
      name,
      prioritizeOver: [...detectorMap.get(name).prioritizeOver],
      suppressedBy,
    };
  });
}

/**
 * Full detection with priority metadata.
 *
 * @param {string} code - JavaScript source.
 * @returns {Array<{name: string, prioritizeOver: string[], suppressedBy: string[]}>}
 */
function detectObfuscationDetailed(code) {
  return createDetailedResults(code);
}

/**
 * Raw detection: every matching label, in detector evaluation order.
 *
 * @param {string} code - JavaScript source.
 * @returns {string[]}
 */
function detectObfuscation(code) {
  return createDetailedResults(code).map(result => result.name);
}

/**
 * Reduced detection: only labels not suppressed by another true detection's
 * `prioritizeOver` graph.
 *
 * @param {string} code - JavaScript source.
 * @returns {string[]}
 */
function detectObfuscationReduced(code) {
  return createDetailedResults(code)
    .filter(result => !result.suppressedBy.length)
    .map(result => result.name);
}

export {detectObfuscation, detectObfuscationDetailed, detectObfuscationReduced};
