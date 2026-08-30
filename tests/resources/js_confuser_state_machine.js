// TP: js-confuser-shaped sum(states) state machine
function sum(states) {
	var total = 0;
	for (var i = 0; i < states.length; i++) total += states[i];
	return total;
}

var s0 = 1;
var s1 = 0;
var s2 = 0;
var result = '';
while (sum([s0, s1, s2]) !== 0) {
	switch (s0) {
		case 1:
			result += 'a';
			s0 = 0;
			s1 = 1;
			break;
		default:
			if (s1) {
				result += 'b';
				s1 = 0;
				s2 = 1;
			} else {
				result += 'c';
				s2 = 0;
			}
			break;
	}
}

console.log(result);
