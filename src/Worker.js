const fs = require('fs');
const extend = require('extend');
const deasync = require('deasync');
const spawn = require('child_process').spawn;

const PYTALK_DRIVER = fs.readFileSync(__dirname + '/worker-driver.py', 'utf-8');
const PYTALK_CODE_LABEL = '{_PYTALK_PYTHON_CODE_GOES_HERE_}';

let workers = [];

class Worker {

	constructor(path, opts) {

		let pyCode = this._loadPycode(path);

		// private variables
		this._isClosed = false;
		this._eventHandlers = {};
	
		// options			
		this.opts = extend(this._defaultOpts(), opts);
		if (this.opts.stdout == false) {
			this.opts.stdout = () => {};
		}

		// spawning python process
		this.process = spawn(this.opts.pythonPath, [
			'-c', pyCode
		]);

		this.process.stdout.on('data', this._onStdout.bind(this));
		this.process.stderr.on('data', this.opts.stderr);

		workers.push(this);
	}

	on(eventName, callback) {
		if (! this._eventHandlers[eventName]) {
			this._eventHandlers[eventName] = [];
		}

		this._eventHandlers[eventName].push(callback);
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
		this._isClosed = true;
	}

	method(methodName) {
		return (data, callback) => {
			this.on('pytalkMethodDone' + methodName, res => {
				callback(res['error'], res['res']);
			});

			this.emit('pytalkMethod' + methodName, data);
		};
	}

	methodSync(methodName) {
		return deasync(this.method(methodName));
	}

	_loadPycode(path) {
		let pyCode = fs.readFileSync(path, 'utf-8');
		return PYTALK_DRIVER.replace(PYTALK_CODE_LABEL, pyCode);
	}

	_defaultOpts() {
		return {
			pythonPath: 'python',
			stdout: data => console.log(data.toString('utf-8')),
			stderr: data => console.log(data.toString('utf-8'))
		};
	}

	_sendToStdin(data) {
		if (this._isClosed) {
			return;
		}

		data = JSON.stringify(data);

		this.process.stdin.cork();
		this.process.stdin.write(data + '\n');
		this.process.stdin.uncork();
	}

	_onStdout(data) {
		data = data
			.toString('utf-8')
			.split('\n')
			.filter(s => s.length);

		let chunk;
		while (chunk = data.shift()) {
			let eventObj = this._parseChunk(chunk);
			if (! eventObj) {
				this.opts.stdout(chunk);
				continue;
			}

			if (this._eventHandlers[eventObj['eventName']]) {
				let cbs = this._eventHandlers[eventObj['eventName']];
				cbs.forEach(cb => cb(eventObj['data']));
			}
		}
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

function nodeExitHandler() {
	workers.forEach(worker => worker.close());
}
process.on('exit', nodeExitHandler);
process.on('SIGINT', nodeExitHandler);

module.exports = Worker;