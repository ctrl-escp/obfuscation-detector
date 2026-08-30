/**
 * @module arrayFunctionReplacements
 *
 * Label: `array_function_replacements`
 *
 * Base replacements-family detector for a string/literal array accessed almost only
 * through a decoder function (`dec(literal, …)`), not via many direct `arr[i]` reads.
 */

import {findArrayDeclarationCandidates, functionHasMinimumRequiredReferences} from './sharedDetectionMethods.js';

const name = 'array_function_replacements';

/**
 * Detects the Array-Function Replacements obfuscation type.
 *
 * ## Algorithm
 * 1. Find large literal-array declarators (`findArrayDeclarationCandidates`).
 * 2. Keep candidates with at most two references to the array identifier (typically
 *    the decoder body, and optionally an augmenting IIFE).
 * 3. For a reference that sits inside a function scope, require that function to have
 *    enough call sites with **only literal arguments** (or assignment/alias proxies)
 *    via `functionHasMinimumRequiredReferences`.
 *
 * ## Example (true positive)
 * ```js
 * var table = ['aaa', 'bbb', 'ccc', '...'];
 * function dec(i) { return table[i]; }
 * console.log(dec(0), dec(1), dec(2), dec(3), dec(4));
 * ```
 *
 * ## True negatives
 * - Arrays with many direct `arr[i]` reads (that is `array_replacements` instead).
 * - Decoders called mainly with non-literal arguments and no literal-call density.
 *
 * ## Reduced-mode priority
 * - `prioritizeOver`: none.
 * - Suppressed by `augmented_array_function_replacements`, `proxied_array_function_replacements`,
 *   and `augmented_proxied_array_function_replacements`.
 *
 * @param {ASTNode[]} flatTree - Flattened AST from flAST.
 * @returns {boolean} True when the pattern is present.
 */
function detectArrayFunctionReplacements(flatTree) {
  const candidates = findArrayDeclarationCandidates(flatTree);

  const isFound = candidates.some(c => {
    // A matching array would not have more than two references to it
    if (c.id.references.length > 2) return false;
    return c.id.references.some(ref => functionHasMinimumRequiredReferences(ref, flatTree));
  });
  return isFound;
}

/**
 * @type {{name: string, prioritizeOver: string[], detect: Function}}
 */
const detector = {
  name,
  prioritizeOver: [],
  detect: detectArrayFunctionReplacements,
};

export {detector, detectArrayFunctionReplacements};
