"use strict";

const Worker = require('./Worker');
const PyObject = require('./PyObject');

let workerInstance, workerOptions;

const pytalk = module.exports = {
	Worker: Worker,

	import(moduleName) {
		if (! workerInstance) {
			workerInstance = new Worker(undefined, workerOptions);
		}

		return workerInstance.import(moduleName);
	},

	close() {
		workerInstance.close();
		
		workerInstance = undefined;
		workerOptions = undefined;

		return pytalk;
	},

	options(opts) {
		workerOptions = opts;
		return pytalk;
	}

};
