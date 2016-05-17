"use strict";

const fs = require('fs');
const spawn = require('child_process').spawn;

const PYTALK_DRIVER = fs.readFileSync('pytalk-driver.py', 'utf-8');
const PYTALK_CODE_LABEL = "{PYTHON_CODE}";

class Worker {
	constructor(path, opts = this._defaultOpts()) {
		var pyCode = fs.readFileSync(path, 'utf-8');
		pyCode = this._convertPyCode(pyCode);

		this.opts = opts;

		this.process = spawn(this.opts.pythonPath, [
			'-c', pyCode
		]);

		this.process.stderr.on('data', data => {
			fs.writeFileSync('code.py', this.pyCode);			
		});
	}

	on(eventName, callback) {
		this.process.stdout.on('data', function(data) {
			data = JSON.parse(data.toString('utf-8'));

			if (data['eventName'] == eventName) {
				callback(data['data']);
			}
		});
	}

	send(eventName, data) {
		data = JSON.stringify({
			eventName: eventName,
			data: data
		});

		this.process.stdin.write(data);
		this.process.stdin.end();
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

module.exports = {
	Worker: Worker
};