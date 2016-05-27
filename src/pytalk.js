"use strict";

const extend = require('extend');

const Worker = require('./Worker');
const PyObject = require('./PyObject');

let workerInstance;

let pytalk = {
	Worker: Worker,

	import(moduleName) {
		return workerInstance.import(moduleName);
	},

	init(opts) {
		if (workerInstance) {
			this.close();
		}

		workerInstance = new Worker(undefined, opts);
		return extend(this, workerInstance.builtins);
	},

	close() {
		workerInstance.close();
		workerInstance = null;

		return pytalk;
	}
};


module.exports = pytalk;