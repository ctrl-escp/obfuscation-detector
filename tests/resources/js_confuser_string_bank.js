// TP: js-confuser-shaped string bank with non-trivial indexer
// Keep the bank off the classic array_replacements path by avoiding a bare
// VariableDeclarator with many direct member reads.
function makeBank() {
	return [
		'aB1x', 'cD2y', 'eF3z', 'gH4w', 'iJ5v', 'kL6u', 'mN7t', 'oP8s',
		'qR9r', 'sT0q', 'uV1p', 'wX2o', 'yZ3n', 'Aa4m', 'Bb5l', 'Cc6k',
	];
}

var holder = {bank: makeBank()};

function get(state, idx) {
	return holder.bank[(state[0] + idx) % holder.bank.length];
}

var state = [3];
console.log(get(state, 0), get(state, 1), get(state, 2), get(state, 3));
