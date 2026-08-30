/**
 * @module jsConfuserStringBank
 *
 * Label: `js_confuser_string_bank`
 *
 * Product label for js-confuser-shaped string banks. Not a replacements-family compound
 * and not folded into `obfuscator_io`. Prefer this over `obfuscator_io` in reduced mode
 * if both somehow fire.
 */

import {detectArrayFunctionReplacements} from './arrayFunctionReplacements.js';
import {
  isStringLiteralArrayExpression,
  findMemoizedStringArrayFactory,
} from './sharedDetectionMethods.js';

const name = 'js_confuser_string_bank';
/** Minimum number of string literals in the bank. */
const minBankLength = 8;
/** Strings at or below this length count as "short" for the majority check. */
const shortStringMaxLen = 8;

/**
 * True when `funcNode` returns a MemberExpression whose property is richer than a
 * bare identifier/literal index (classic decoders are `return arr[param]`).
 *
 * @param {ASTNode} funcNode - Function-like AST node.
 * @returns {boolean}
 */
function isNonTrivialBankIndexer(funcNode) {
  const body = funcNode.body?.type === 'BlockStatement' ? funcNode.body.body : null;
  const ret = body
    ? (body.length === 1 && body[0].type === 'ReturnStatement' ? body[0].argument : null)
    : funcNode.body;
  if (ret?.type !== 'MemberExpression') return false;
  // Classic array_function decoder is `return arr[param]`; js-confuser indexers are richer.
  return ret.property &&
		ret.property.type !== 'Identifier' &&
		ret.property.type !== 'Literal';
}

/**
 * Detects js-confuser-shaped string banks.
 *
 * ## Algorithm
 * 1. **Exclude** classic `array_function_replacements` and memoized string-array factories
 *    (those belong to the replacements family / §1).
 * 2. Find `ArrayExpression`s of string literals with length ≥ 8 where a majority of
 *    elements are short (≤ 8 chars).
 * 3. Require at least one single-return indexer whose member property is a non-trivial
 *    expression (binary, call, etc.), not `arr[i]` / `arr[0]`.
 *
 * ## Example (true positive)
 * ```js
 * var holder = { bank: ['aB1x', 'cD2y', '...at least 8 short strings'] };
 * function get(state, idx) {
 *   return holder.bank[(state[0] + idx) % holder.bank.length];
 * }
 * ```
 *
 * ## True negatives
 * - Classic array-function decoder banks (excluded explicitly).
 * - Memoized self-reassign factories.
 * - Small arrays used as ordinary program data.
 * - Indexer that is only `return bank[i]`.
 *
 * ## Reduced-mode priority
 * - `prioritizeOver`: `obfuscator_io`.
 *
 * @param {ASTNode[]} flatTree - Flattened AST from flAST.
 * @returns {boolean} True when bank + non-trivial indexer are present and exclusions pass.
 */
function detectJsConfuserStringBank(flatTree) {
  if (detectArrayFunctionReplacements(flatTree)) return false;
  if (findMemoizedStringArrayFactory(flatTree)) return false;

  const arrays = (flatTree[0].typeMap.ArrayExpression || []).filter(n =>
    isStringLiteralArrayExpression(n) &&
		n.elements.length >= minBankLength &&
		n.elements.filter(el => typeof el.value === 'string' && el.value.length <= shortStringMaxLen).length / n.elements.length > 0.5);
  if (!arrays.length) return false;

  const funcs = [
    ...(flatTree[0].typeMap.FunctionDeclaration || []),
    ...(flatTree[0].typeMap.FunctionExpression || []),
    ...(flatTree[0].typeMap.ArrowFunctionExpression || []),
  ];

  return funcs.some(isNonTrivialBankIndexer);
}

/**
 * @type {{name: string, prioritizeOver: string[], detect: Function}}
 */
const detector = {
  name,
  prioritizeOver: ['obfuscator_io'],
  detect: detectJsConfuserStringBank,
};

export {detector, detectJsConfuserStringBank};
