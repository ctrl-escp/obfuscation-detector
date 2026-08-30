/**
 * @module obfuscatorIo
 *
 * Label: `obfuscator_io`
 *
 * Product **composite** for [javascript-obfuscator](https://obfuscator.io/) / obfuscator.io
 * output. In full mode it co-emits with whatever replacements-family / CFF labels also
 * matched; in reduced mode it typically remains the single primary label by suppressing
 * those less-specific hits via `prioritizeOver`.
 *
 * Does **not** fold `js_confuser_*` labels.
 */

const name = 'obfuscator_io';

/**
 * Heuristic A: object with a `'setCookie'` literal key whose value is a function
 * containing a `for` loop (common in older obfuscator.io samples that also have
 * augmented array-function replacements).
 *
 * @param {ASTNode[]} flatTree - Flattened AST from flAST.
 * @returns {boolean}
 */
function setCookieIndicator(flatTree) {
  const candidate = (flatTree[0].typeMap.ObjectExpression || []).find(n =>
    n.type === 'ObjectExpression' &&
		n.properties.length &&
		n.properties.some(p =>
		  p.key.type === 'Literal' &&
			p.key.value === 'setCookie'));

  if (candidate) {
    const setCookieFunc = candidate.properties.find(p =>
      p.key.type === 'Literal' &&
			p.key.value === 'setCookie')?.value;
    if (setCookieFunc?.type === 'FunctionExpression' &&
			setCookieFunc.body.body.some(b => b.type === 'ForStatement')) return true;
  }
  return false;
}

/**
 * Heuristic B: block of the form
 * `if (!Boolean(~…)) { … } return …`
 * which appears in certain obfuscator.io transforms independent of the string-array pack.
 *
 * @param {ASTNode[]} flatTree - Flattened AST from flAST.
 * @returns {boolean}
 */
function notBooleanTilde(flatTree) {
  const candidates = (flatTree[0].typeMap.BlockStatement || []).filter(n =>
    n.type === 'BlockStatement' &&
		n.body.length === 2 &&
		n.body[0].type === 'IfStatement' &&
		n.body[0].test?.type === 'UnaryExpression' &&
		n.body[1].type === 'ReturnStatement');

  for (const c of candidates) {
    /** @type {ASTNode} */
    const t = c.body[0].test;
    if (t.operator === '!' &&
			t.argument?.callee?.name === 'Boolean' &&
			t.argument.arguments?.length === 1 &&
			t.argument.arguments[0].type === 'UnaryExpression' &&
			t.argument.arguments[0].operator === '~') return true;
  }
  return false;
}

/**
 * Detects the Obfuscator.io obfuscation type.
 *
 * ## Algorithm
 * Succeeds if **either**:
 * 1. A previous detector already reported `augmented_array_function_replacements`
 *    **and** `setCookieIndicator` matches; or
 * 2. `notBooleanTilde` matches on its own.
 *
 * ## Example (setCookie path — conceptual)
 * ```js
 * // …augmented array-function pack…
 * // …augmented array-function pack…
 * ({ 'setCookie': function () { for (;;) { } } });
 * ```
 *
 * ## Example (Boolean-tilde path — conceptual)
 * ```js
 * {
 *   if (!Boolean(~something)) { }
 *   return result;
 * }
 * ```
 *
 * ## True negatives
 * - Augmented array-function code without the setCookie / tilde fingerprints.
 * - Unrelated objects that happen to contain a `setCookie` method without the for-loop body.
 *
 * ## Reduced-mode priority
 * - `prioritizeOver`:
 *   - `augmented_array_function_replacements` (and transitively `array_function_replacements`)
 *   - `augmented_proxied_array_function_replacements` (and its prioritizeOver targets)
 *   - `function_to_array_replacements`
 *   - `cff_storage_object`
 *   - `sequenced_index_switch`
 * - Full mode still lists every matching family label **and** `obfuscator_io`.
 *
 * @param {ASTNode[]} flatTree - Flattened AST from flAST.
 * @param {string[]} [pdo=[]] - Names of obfuscation types already detected earlier in the run.
 * @returns {boolean} True when either product fingerprint matches.
 */
function detectObfuscatorIo(flatTree, pdo = []) {
  return (pdo.includes('augmented_array_function_replacements') && setCookieIndicator(flatTree)) ||
		notBooleanTilde(flatTree);
}

/**
 * @type {{name: string, prioritizeOver: string[], detect: Function}}
 */
const detector = {
  name,
  prioritizeOver: [
    'augmented_array_function_replacements',
    'augmented_proxied_array_function_replacements',
    'function_to_array_replacements',
    'cff_storage_object',
    'sequenced_index_switch',
  ],
  detect: detectObfuscatorIo,
};

export {detector, detectObfuscatorIo};
