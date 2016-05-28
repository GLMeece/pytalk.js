/**
 * 	@desc Parse JSON string to object, considering NaN values
 * 	@desc Namely, translating '__pytalk__PositiveInfinity' to Infinity
 * 	@desc '__pytalk__NegativeInfinity' to -Infinity
 * 	@desc '__pytalk__NaN' to NaN
 * 
 *  @param {string} serialized - JSON 
 */
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