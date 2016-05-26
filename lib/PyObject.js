"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var extend = require('extend');

var PyObject = function PyObject(id, worker) {
	_classCallCheck(this, PyObject);

	// pytalk data
	this.__pytalk = {
		id: id,
		worker: worker
	};

	// private methods
	var registerMethod = _registerMethod.bind(this);
	var registerProperty = _registerProperty.bind(this);
	var getObjInfoFromPython = _getObjInfoFromPython.bind(this);

	var info = getObjInfoFromPython(id);

	// set object methods and properties
	info.methods.forEach(registerMethod);
	info.properties.forEach(registerProperty);
};

function _getObjInfoFromPython(id) {
	var getObj = this.__pytalk.worker.methodSync('pytalkGetObject');
	return getObj(id);
}

function _registerProperty(p) {
	Object.defineProperty(this, p.name, {
		get: function get() {
			if (p.hasOwnProperty('value')) {
				return p['value'];
			}

			return new PyObject(p.id, this.__pytalk.worker);
		}
	});
}

function _registerMethod(m) {
	var async = this.__pytalk.worker._opts.async;

	if (async) {
		this[m.name] = this.__pytalk.worker.method('pytalkMethod' + m.id);
	} else {
		this[m.name] = this.__pytalk.worker.methodSync('pytalkMethod' + m.id);
	}
}

module.exports = PyObject;