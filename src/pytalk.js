"use strict";

const extend = require('extend');

const Worker = require('./Worker');
const PyObject = require('./PyObject');

module.exports = {
	Worker: Worker,

	worker(...args) {
		return new Worker(...args);
	}
};