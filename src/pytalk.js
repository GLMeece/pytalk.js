"use strict";

const fs = require('fs');
const spawn = require('child_process').spawn;

const PYTALK_DRIVER = fs.readFileSync('pytalk-driver.py', 'utf-8');
const PYTALK_CODE_LABEL = "{PYTHON_CODE}";

export class Worker {
	constructor(path, opts = this._defaultOpts()) {
		let pyCode = fs.readFileSync(path, 'utf-8');
		pyCode = this._convertPyCode(pyCode);

		this.opts = opts;
		this.process = spawn(this.opts.pythonPath, [
			'-c', pyCode
		]);

		this.process.stderr.on('data', data => {
			throw new Error(data);
		});
	}

	on(eventName, callback) {
		let buffer = [];

		this.process.stdout.on('data', function(data) {
			data = data.toString('utf-8');
			buffer = data.split('\n').filter(s => s.length);

			let json;
			while (json = buffer.shift()) {
				let eventObj = JSON.parse(json);
				if (eventObj['eventName'] == eventName) {
					callback(eventObj['data']);
				}
			}
		});
	}

	send(eventName, data) {
		data = JSON.stringify({
			eventName: eventName,
			data: data
		});

		this.process.stdin.cork();
		this.process.stdin.write(data + '\n');
		this.process.stdin.uncork();
	}

	_convertPyCode(pyCode) {
		pyCode = PYTALK_DRIVER.replace(PYTALK_CODE_LABEL, pyCode)
		return pyCode;
	}

	_defaultOpts() {
		return {
			pythonPath: 'python'
		};
	}
}