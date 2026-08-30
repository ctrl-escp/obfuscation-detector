// TP: memoized self-reassign string-array factory → function_to_array_replacements
function f() {
	const a = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel'];
	f = function () {
		return a;
	};
	return f();
}

const table = f();
console.log(table[0], table[1], table[2], table[3], table[4], table[5]);
