"use strict";

var Worker = require('./Worker');
var PyObject = require('./PyObject');

var workerInstance = void 0,
    workerOptions = void 0;

var pytalk = module.exports = {
	Worker: Worker,

	import: function _import(moduleName) {
		if (!workerInstance) {
			workerInstance = new Worker(undefined, workerOptions);
		}

		return workerInstance.import(moduleName);
	},
	close: function close() {
		workerInstance.close();

		workerInstance = undefined;
		workerOptions = undefined;

		return pytalk;
	},
	options: function options(opts) {
		workerOptions = opts;
		return pytalk;
	}
};