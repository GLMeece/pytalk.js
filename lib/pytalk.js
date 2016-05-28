"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
var extend = require('extend');

var Worker = require('./Worker');
var PyObject = require('./PyObject');

exports.default = {
	Worker: Worker,

	worker: function worker() {
		for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
			args[_key] = arguments[_key];
		}

		return new (Function.prototype.bind.apply(Worker, [null].concat(args)))();
	}
};