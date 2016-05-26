export function parseJSON(serialized) {
	return JSON.parse(serialized, (key, value) => {
		if (key !== 'value') {
			return value;
		}

		switch (value) {
			case '__pytalk__PositiveInfinity':
				return Infinity;
			case '__pytalk__NegativeInfinity':
				return -Infinity;
			case '__pytalk__NaN':
				return NaN;
		}

		return value;
	});
}