"use strict";

const fs = require('fs');
const extend = require('extend');
const spawn = require('child_process').spawn;

const PYTALK_DRIVER = fs.readFileSync(__dirname + '/pytalk-driver.py', 'utf-8');
const PYTALK_CODE_LABEL = '{_PYTALK_PYTHON_CODE_GOES_HERE_}';

export class Worker {

	constructor(path, opts) {
		let pyCode = fs.readFileSync(path, 'utf-8');
		pyCode = this._convertPyCode(pyCode);

		this.opts = extend(this._defaultOpts(), opts);
		this.process = spawn(this.opts.pythonPath, [
			'-c', pyCode
		]);

		this.process.stderr.on('data', data => {
			fs.writeFileSync('generated-code.py', pyCode);
			throw new Error(data);
		});
	}

	on(eventName, callback) {
		this.process.stdout.on('data', data => {
			data = data
				.toString('utf-8')
				.split('\n')
				.filter(s => s.length);

			let chunk;
			while (chunk = data.shift()) {
				let eventObj = this._parseChunk(chunk);
				if (! eventObj) {
					this._onStdout(chunk);
					continue;
				}

				if (eventObj['eventName'] == eventName) {
					callback(eventObj['data']);
				}
			}
		});
	}

	emit(eventName, data = null) {
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
				callback(res['error'], res['res']);
			});

			this.emit('pytalkMethod' + methodName, data);
		};
	}

	_convertPyCode(pyCode) {
		pyCode = PYTALK_DRIVER.replace(PYTALK_CODE_LABEL, pyCode)
		return pyCode;
	}

	_defaultOpts() {
		return {
			pythonPath: 'python',
			stdout: data => console.log(data)
		};
	}

	_sendToStdin(data) {
		data = JSON.stringify(data);

		this.process.stdin.cork();
		this.process.stdin.write(data + '\n');
		this.process.stdin.uncork();
	}

	_onStdout(data) {
		if (this.opts.stdout == false) {
			return;
		}
		
		this.opts.stdout(data);
	}

	_parseChunk(chunk) {
		try {
			var eventObj = JSON.parse(chunk);
			if (eventObj['__pytalkObject__']) {
				return eventObj;
			}
		}
		catch(e) {}

		return false;
	}
}