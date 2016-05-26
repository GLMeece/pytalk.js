"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fs = require('fs');
var extend = require('extend');
var deasync = require('deasync');
var spawn = require('child_process').spawn;

var utils = require('./utils');
var PyObject = require('./PyObject');

var PYTALK_DRIVER = fs.readFileSync(__dirname + '/worker-driver.py', 'utf-8');
var PYTALK_CODE_LABEL = '{_PYTALK_PYTHON_CODE_GOES_HERE_}';

var workers = [];

var Worker = function () {
	function Worker(path, opts) {
		_classCallCheck(this, Worker);

		// read python code
		var pyCode = 'pass';
		if (typeof path !== 'undefined') {
			pyCode = fs.readFileSync(path, 'utf-8');
		}
		pyCode = PYTALK_DRIVER.replace(PYTALK_CODE_LABEL, pyCode);

		// private variables
		this._isClosed = false;
		this._eventHandlers = {};

		// options
		this._opts = extend(this._defaultOpts(), opts);
		if (this._opts.stdout == false) {
			this._opts.stdout = function () {};
		}

		// spawning python process
		this.process = spawn(this._opts.pythonPath, ['-u', '-c', pyCode]);

		this.process.stdout.on('data', this._onStdout.bind(this));
		this.process.stderr.on('data', this._opts.stderr);

		workers.push(this);
	}

	_createClass(Worker, [{
		key: 'on',
		value: function on(eventName, callback) {
			if (!this._eventHandlers[eventName]) {
				this._eventHandlers[eventName] = [];
			}

			this._eventHandlers[eventName].push(callback);
		}
	}, {
		key: 'emit',
		value: function emit(eventName) {
			var data = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];

			this._sendToStdin({
				eventName: eventName,
				data: data
			});
		}
	}, {
		key: 'close',
		value: function close() {
			this._sendToStdin({
				exitSignal: true
			});

			this.process.stdout.pause();
			this._isClosed = true;
		}
	}, {
		key: 'method',
		value: function method(methodName) {
			var _this = this;

			return function (data, callback) {
				_this.on('pytalkMethodDone' + methodName, function (res) {
					if (res['isPyObject']) {
						res['res'] = new PyObject(res['res'], _this);
					}

					callback(res['error'], res['res']);
				});

				_this.emit('pytalkMethod' + methodName, data);
			};
		}
	}, {
		key: 'methodSync',
		value: function methodSync(methodName) {
			return deasync(this.method(methodName));
		}
	}, {
		key: 'import',
		value: function _import(moduleName) {
			var getModuleId = this.methodSync('pytalkGetModuleId');
			var moduleId = getModuleId(moduleName);

			return new PyObject(moduleId, this);
		}
	}, {
		key: '_defaultOpts',
		value: function _defaultOpts() {
			return {
				async: false,
				pythonPath: 'python',
				stdout: function stdout(data) {
					return console.log(data.toString('utf-8'));
				},
				stderr: function stderr(data) {
					return console.log(data.toString('utf-8'));
				}
			};
		}
	}, {
		key: '_sendToStdin',
		value: function _sendToStdin(data) {
			if (this._isClosed) {
				return;
			}

			data = JSON.stringify(data);

			this.process.stdin.cork();
			this.process.stdin.write(data + '\n');
			this.process.stdin.uncork();
		}
	}, {
		key: '_onStdout',
		value: function _onStdout(data) {
			var _this2 = this;

			data = data.toString('utf-8').split('\n').filter(function (s) {
				return s.length;
			});

			var chunk = void 0;

			var _loop = function _loop() {
				var eventObj = _this2._parseChunk(chunk);
				if (!eventObj) {
					_this2._opts.stdout(chunk);
					return 'continue';
				}

				if (_this2._eventHandlers[eventObj['eventName']]) {
					var cbs = _this2._eventHandlers[eventObj['eventName']];
					cbs.forEach(function (cb) {
						return cb(eventObj['data']);
					});
				}
			};

			while (chunk = data.shift()) {
				var _ret = _loop();

				if (_ret === 'continue') continue;
			}
		}
	}, {
		key: '_parseChunk',
		value: function _parseChunk(chunk) {
			try {
				var eventObj = utils.parseJSON(chunk);
				if (eventObj['__pytalkObject__']) {
					return eventObj;
				}
			} catch (e) {
				//console.log(e);
			}

			return false;
		}
	}]);

	return Worker;
}();

function nodeExitHandler() {
	workers.forEach(function (worker) {
		return worker.close();
	});
}
process.on('exit', nodeExitHandler);
process.on('SIGINT', nodeExitHandler);

module.exports = Worker;