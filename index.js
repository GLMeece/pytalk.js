"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fs = require('fs');
var extend = require('extend');
var spawn = require('child_process').spawn;

var PYTALK_DRIVER = fs.readFileSync(__dirname + '/pytalk-driver.py', 'utf-8');
var PYTALK_CODE_LABEL = '{_PYTALK_PYTHON_CODE_GOES_HERE_}';

var Worker = exports.Worker = function () {
	function Worker(path, opts) {
		_classCallCheck(this, Worker);

		var pyCode = fs.readFileSync(path, 'utf-8');
		pyCode = this._convertPyCode(pyCode);

		this.opts = extend(this._defaultOpts(), opts);

		this.process = spawn(this.opts.pythonPath, ['-c', pyCode]);

		this.process.stderr.on('data', function (data) {
			fs.writeFileSync('generated-code.py', pyCode);
			throw new Error(data);
		});
	}

	_createClass(Worker, [{
		key: 'on',
		value: function on(eventName, callback) {
			var _this = this;

			this.process.stdout.on('data', function (data) {
				data = data.toString('utf-8').split('\n').filter(function (s) {
					return s.length;
				});

				var chunk = void 0;
				while (chunk = data.shift()) {
					var eventObj = _this._parseChunk(chunk);
					if (!eventObj) {
						_this._onStdout(chunk);
						continue;
					}

					if (eventObj['eventName'] == eventName) {
						callback(eventObj['data']);
					}
				}
			});
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
		}
	}, {
		key: 'method',
		value: function method(methodName) {
			var _this2 = this;

			return function (data, callback) {
				_this2.on('pytalkMethodDone' + methodName, function (res) {
					callback(res['error'], res['res']);
				});

				_this2.emit('pytalkMethod' + methodName, data);
			};
		}
	}, {
		key: '_convertPyCode',
		value: function _convertPyCode(pyCode) {
			pyCode = PYTALK_DRIVER.replace(PYTALK_CODE_LABEL, pyCode);
			return pyCode;
		}
	}, {
		key: '_defaultOpts',
		value: function _defaultOpts() {
			return {
				pythonPath: 'python',
				stdout: function stdout(data) {
					return console.log(data);
				}
			};
		}
	}, {
		key: '_sendToStdin',
		value: function _sendToStdin(data) {
			data = JSON.stringify(data);

			this.process.stdin.cork();
			this.process.stdin.write(data + '\n');
			this.process.stdin.uncork();
		}
	}, {
		key: '_onStdout',
		value: function _onStdout(data) {
			if (this.opts.stdout == false) {
				return;
			}

			this.opts.stdout(data);
		}
	}, {
		key: '_parseChunk',
		value: function _parseChunk(chunk) {
			try {
				var eventObj = JSON.parse(chunk);
				if (eventObj['__pytalkObject__']) {
					return eventObj;
				}
			} catch (e) {}

			return false;
		}
	}]);

	return Worker;
}();
