// TP: pipe-split sequenced index switch dispatcher
function run() {
	var seq = '0|1|2|3'.split('|');
	var i = 0;
	var out = '';
	while (true) {
		switch (seq[i++]) {
			case '0':
				out += 'a';
				continue;
			case '1':
				out += 'b';
				continue;
			case '2':
				out += 'c';
				continue;
			case '3':
				return out;
		}
	}
}

console.log(run());
