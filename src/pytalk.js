"use strict";

const fs = require('fs');
const spawn = require('child_process').spawn;

const PYTALK_DRIVER = fs.readFileSync(__dirname + '/pytalk-driver.py', 'utf-8');
const PYTALK_CODE_LABEL = '{_PYTALK_PYTHON_CODE_GOES_HERE_}';

export class Worker {

	constructor(path, opts = this._defaultOpts()) {
		let pyCode = fs.readFileSync(path, 'utf-8');
		pyCode = this._convertPyCode(pyCode);

		this.opts = opts;
		this.process = spawn(this.opts.pythonPath, [
			'-c', pyCode
		]);

		this.process.stderr.on('data', data => {
			fs.writeFileSync('generated-code.py', pyCode);
			throw new Error(data);
		});
	}

	on(eventName, callback) {
		this.process.stdout.on('data', function(data) {
			data = data
				.toString('utf-8')
				.split('\n')
				.filter(s => s.length);

			let json;
			while (json = data.shift()) {
				let eventObj = JSON.parse(json);
				if (eventObj['eventName'] == eventName) {
					callback(eventObj['data']);
				}
			}
		});
	}

	send(eventName, data = null) {
		this._sendToStdin({
			eventName: eventName,
			data: data
		});
	}

	close() {
		this._sendToStdin({
			exitSignal: true
		});

		this.process.stdout.pause();
	}

	method(methodName) {
		return (data, callback) => {
			this.on('pytalkMethodDone' + methodName, res => {
				callback(res);
			});

			this.send('pytalkMethod' + methodName, data);
		};
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

	_sendToStdin(data) {
		data = JSON.stringify(data);

		this.process.stdin.cork();
		this.process.stdin.write(data + '\n');
		this.process.stdin.uncork();
	}
}