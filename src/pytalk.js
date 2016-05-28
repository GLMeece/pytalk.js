"use strict";

const extend = require('extend');

const Worker = require('./Worker');
const PyObject = require('./PyObject');

export default {
	Worker,

	worker(...args) {
		return new Worker(...args);
	}
};