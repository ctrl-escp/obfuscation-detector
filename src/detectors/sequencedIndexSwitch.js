/**
 * @module sequencedIndexSwitch
 *
 * Label: `sequenced_index_switch`
 *
 * Product extra (javascript-obfuscator control-flow flattening). Not a replacements-family name.
 * A numeric order sequence (pipe-split string or numeric array) drives a switch via `seq[i++]`.
 */

import {
  isNumericSequenceArray,
  isPipeSplitSequenceCall,
} from './sharedDetectionMethods.js';

const name = 'sequenced_index_switch';

/**
 * True when `node` is a member expression whose property is `++` / `--`
 * (e.g. `seq[i++]`).
 *
 * @param {ASTNode} node - Candidate SwitchStatement discriminant.
 * @returns {boolean}
 */
function isIncrementingSequenceMember(node) {
  return node?.type === 'MemberExpression' &&
		node.property?.type === 'UpdateExpression' &&
		(node.property.operator === '++' || node.property.operator === '--');
}

/**
 * Detects sequenced-index switch / pipe-split dispatchers.
 *
 * ## Algorithm
 * 1. Require a sequence source:
 *    - `'0|1|2'.split('|')` where the string matches `/^\d+(\|\d+)+$/`, **or**
 *    - an `ArrayExpression` of numeric / numeric-string literals.
 * 2. Find a `SwitchStatement` whose discriminant is `seq[i++]` (UpdateExpression property).
 * 3. Require every case test to be a Literal (or default with no test).
 *
 * ## Example (true positive)
 * ```js
 * function run() {
 *   var seq = '0|1|2|3'.split('|');
 *   var i = 0;
 *   while (true) {
 *     switch (seq[i++]) {
 *       case '0': continue;
 *       case '1': break;
 *       case '2': return;
 *     }
 *   }
 * }
 * ```
 *
 * ## True negatives
 * - `switch (x)` on a plain identifier with literal cases.
 * - Pipe-split used only as data, with no incrementing-index switch.
 * - Sequence that is not numeric (e.g. `'a|b|c'.split('|')`).
 *
 * ## Reduced-mode priority
 * - `prioritizeOver`: none.
 * - Suppressed by `obfuscator_io` when that composite also fires.
 *
 * @param {ASTNode[]} flatTree - Flattened AST from flAST.
 * @returns {boolean} True when sequence + dispatcher switch are both present.
 */
function detectSequencedIndexSwitch(flatTree) {
  const hasSequence =
		(flatTree[0].typeMap.CallExpression || []).some(isPipeSplitSequenceCall) ||
		(flatTree[0].typeMap.ArrayExpression || []).some(isNumericSequenceArray);
  if (!hasSequence) return false;

  return (flatTree[0].typeMap.SwitchStatement || []).some(sw => {
    if (!isIncrementingSequenceMember(sw.discriminant)) return false;
    if (!sw.cases?.length) return false;
    return sw.cases.every(c => !c.test || c.test.type === 'Literal');
  });
}

/**
 * @type {{name: string, prioritizeOver: string[], detect: Function}}
 */
const detector = {
  name,
  prioritizeOver: [],
  detect: detectSequencedIndexSwitch,
};

export {detector, detectSequencedIndexSwitch};
