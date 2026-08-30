/**
 * @module cffStorageObject
 *
 * Label: `cff_storage_object`
 *
 * Product extra (javascript-obfuscator control-flow flattening). Not a replacements-family name.
 * Objects whose keys look like generated 5-letter identifiers and whose values are mostly
 * single-return operator/call shells or literals.
 */

import {isCffStorageObject} from './sharedDetectionMethods.js';

const name = 'cff_storage_object';

/**
 * Detects javascript-obfuscator-style control-flow flattening storage objects.
 *
 * ## Algorithm
 * 1. Scan every `ObjectExpression` in the AST.
 * 2. Delegate to `isCffStorageObject`:
 *    - majority of keys match `/^[A-Za-z]{5}$/`;
 *    - majority of values are Literals or single-return Function/ArrowExpression shells.
 * 3. Deliberately **does not** match “any object of small helper functions” (e.g. `{add:(a,b)=>a+b}`).
 *
 * ## Example (true positive)
 * ```js
 * const sto = {
 *   AbCde: function (x, y) { return x === y; },
 *   FgHij: function (x, y) { return x + y; },
 *   KlMno: 'ok',
 * };
 * ```
 *
 * ## True negatives
 * - `{ add: (a, b) => a + b }` (readable keys).
 * - 5-letter keys with multi-statement bodies / DOM methods.
 * - Empty object.
 *
 * ## Reduced-mode priority
 * - `prioritizeOver`: none.
 * - Suppressed by `obfuscator_io` when that composite also fires.
 *
 * @param {ASTNode[]} flatTree - Flattened AST from flAST.
 * @returns {boolean} True when at least one matching object exists.
 */
function detectCffStorageObject(flatTree) {
  return (flatTree[0].typeMap.ObjectExpression || []).some(isCffStorageObject);
}

/**
 * @type {{name: string, prioritizeOver: string[], detect: Function}}
 */
const detector = {
  name,
  prioritizeOver: [],
  detect: detectCffStorageObject,
};

export {detector, detectCffStorageObject};
