// TP: array-function replacements + single-return wrapper cluster → proxied_array_function_replacements
var table = [
	'aaa', 'bbb', 'ccc', 'ddd', 'eee', 'fff', 'ggg', 'hhh',
	'iii', 'jjj', 'kkk', 'lll', 'mmm', 'nnn', 'ooo', 'ppp',
	'qqq', 'rrr', 'sss', 'ttt', 'uuu', 'vvv', 'www', 'xxx',
	'yyy', 'zzz', 'one', 'two', 'three', 'four', 'five', 'six',
];

function dec(i, k) {
	return table[i];
}

function w1(a, b, c) {
	return dec(b - 4, c);
}

function w2(x, y) {
	return w1(0, x, y);
}

console.log(w2(4, 1), w2(5, 2), w2(6, 3), w2(7, 1), w2(8, 2), w2(9, 3));
console.log(w2(10, 1), w2(11, 2), w2(12, 3), w2(13, 1), w2(14, 2), w2(15, 3));
console.log(w2(16, 1), w2(17, 2), w2(18, 3), w2(19, 1), w2(20, 2), w2(21, 3));
