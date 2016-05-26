"use strict";

const extend = require('extend');

class PyObject {

	constructor(id, worker) {

		// pytalk data
		this.__pytalk = {
			id: id,
			worker: worker
		};

		// private methods
		let registerMethod = _registerMethod.bind(this);
		let registerProperty = _registerProperty.bind(this);
		let getObjInfoFromPython = _getObjInfoFromPython.bind(this);

		let info = getObjInfoFromPython(id);		

		// set object methods and properties
		info.methods.forEach(registerMethod);
		info.properties.forEach(registerProperty);
	}
}

function _getObjInfoFromPython(id) {
	let getObj = this.__pytalk.worker.methodSync('pytalkGetObject');
	return getObj(id);
}

function _registerProperty(p) {
	Object.defineProperty(this, p.name, {
		get: function() {
			if (p.hasOwnProperty('value')) {
				return p['value'];
			}

			return new PyObject(p.id, this.__pytalk.worker);
		}
	});
}

function _registerMethod(m) {
	const async = this.__pytalk.worker._opts.async;

	if (async) {
		this[m.name] = this.__pytalk.worker.method(`pytalkMethod${m.id}`);
	}
	else {
		this[m.name] = this.__pytalk.worker.methodSync(`pytalkMethod${m.id}`);
	}
}

module.exports = PyObject;