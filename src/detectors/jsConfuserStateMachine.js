/**
 * @module jsConfuserStateMachine
 *
 * Label: `js_confuser_state_machine`
 *
 * Product label for js-confuser-shaped control-flow state machines driven by
 * `sum(states)` (or an equivalent reduce/add over state cells). Not folded into
 * `obfuscator_io`.
 */

const name = 'js_confuser_state_machine';

/**
 * True when a while/do-while test compares an aggregate over state cells to an end value.
 *
 * Recognized shapes:
 * - `sum(states) !== 0` / `Sum(states) != end`
 * - `states.reduce(...) !== end`
 * - `states[0] + states[1] + … !== end` (≥ 2 member adds)
 *
 * @param {ASTNode} node - WhileStatement / DoWhileStatement `test` expression.
 * @returns {boolean}
 */
function isSumStatesTest(node) {
  if (!node) return false;

  // while (sum(states) !== 0) / while (sum(states) != end)
  if (node.type === 'BinaryExpression' &&
		node.left?.type === 'CallExpression' &&
		node.left.callee?.type === 'Identifier' &&
		['sum', 'Sum'].includes(node.left.callee.name) &&
		node.left.arguments?.length === 1) {
    return true;
  }

  // while (states.reduce((a,b)=>a+b,0) !== end) or similar add-reduce
  if (node.type === 'BinaryExpression' &&
		node.left?.type === 'CallExpression' &&
		node.left.callee?.type === 'MemberExpression' &&
		(node.left.callee.property?.name === 'reduce' || node.left.callee.property?.value === 'reduce')) {
    return true;
  }

  // while (states[0] + states[1] + ... !== end)
  if (node.type === 'BinaryExpression' && node.operator && node.left) {
    let current = node.left;
    let memberAdds = 0;
    while (current?.type === 'BinaryExpression' && current.operator === '+') {
      if (current.right?.type === 'MemberExpression') memberAdds++;
      current = current.left;
    }
    if (current?.type === 'MemberExpression') memberAdds++;
    if (memberAdds >= 2) return true;
  }

  return false;
}

/**
 * Detects js-confuser-shaped state machines.
 *
 * ## Algorithm
 * 1. Collect `WhileStatement` and `DoWhileStatement` nodes.
 * 2. Keep those whose test matches `isSumStatesTest`.
 * 3. Require the loop body to contain a `SwitchStatement` or `IfStatement` (state dispatch).
 *
 * ## Example (true positive)
 * ```js
 * function sum(states) { return states[0] + states[1] + states[2]; }
 * var states = [1, 0, 0];
 * while (sum(states) !== 0) {
 *   switch (states[0]) {
 *     case 1: states[0] = 0; states[1] = 1; break;
 *     default: states[1] = 0; break;
 *   }
 * }
 * ```
 *
 * ## True negatives
 * - Ordinary `while (i < n)` counters.
 * - `sum(...)` loops without switch/if dispatch in the body.
 * - Small numeric arrays used as real program data without the aggregate test.
 *
 * ## Reduced-mode priority
 * - `prioritizeOver`: `obfuscator_io`.
 *
 * @param {ASTNode[]} flatTree - Flattened AST from flAST.
 * @returns {boolean} True when a matching state-machine loop exists.
 */
function detectJsConfuserStateMachine(flatTree) {
  const whiles = [
    ...(flatTree[0].typeMap.WhileStatement || []),
    ...(flatTree[0].typeMap.DoWhileStatement || []),
  ];

  return whiles.some(w => {
    if (!isSumStatesTest(w.test)) return false;
    const body = w.body?.type === 'BlockStatement' ? w.body.body : [w.body];
    return body.some(stmt =>
      stmt?.type === 'SwitchStatement' ||
			stmt?.type === 'IfStatement');
  });
}

/**
 * @type {{name: string, prioritizeOver: string[], detect: Function}}
 */
const detector = {
  name,
  prioritizeOver: ['obfuscator_io'],
  detect: detectJsConfuserStateMachine,
};

export {detector, detectJsConfuserStateMachine};
