"use strict";

var extend = require('extend');

var Worker = require('./Worker');
var PyObject = require('./PyObject');

var workerInstance = void 0;

var pytalk = {
	Worker: Worker,

	import: function _import(moduleName) {
		return workerInstance.import(moduleName);
	},
	init: function init(opts) {
		if (workerInstance) {
			this.close();
		}

		workerInstance = new Worker(undefined, opts);
		return extend(this, workerInstance.builtins);
	},
	close: function close() {
		workerInstance.close();
		workerInstance = null;

		return pytalk;
	}
};

module.exports = pytalk;