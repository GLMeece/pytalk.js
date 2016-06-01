"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

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

		var _constructorArgs2 = this._constructorArgs(path, opts);

		var _constructorArgs3 = _slicedToArray(_constructorArgs2, 2);

		path = _constructorArgs3[0];
		opts = _constructorArgs3[1];
		var pyCode = 'pass';
		if (typeof path !== 'undefined') {
			pyCode = fs.readFileSync(path, 'utf-8');
		}
		pyCode = PYTALK_DRIVER.replace(PYTALK_CODE_LABEL, pyCode);

		// private variables
		this._serialized = '';
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

		// builtins
		this.builtins = new PyObject('__builtins__', this);

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
			for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
				args[_key - 1] = arguments[_key];
			}

			args = args.map(function (arg) {
				if (arg instanceof PyObject) {
					return {
						id: arg.__pytalk.id,
						isPyObject: true
					};
				}

				return arg;
			});

			this._sendToStdin({
				eventName: eventName,
				args: args
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
			this._serialized = '';
		}
	}, {
		key: 'method',
		value: function method(methodName) {
			var _this = this;

			return function () {
				for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
					args[_key2] = arguments[_key2];
				}

				var callback = args.pop();

				_this.on('pytalkMethodDone' + methodName, function (res) {
					if (res['isPyObject']) {
						res['res'] = new PyObject(res['res'], _this);
					}

					callback(res['error'], res['res']);
				});

				_this.emit.apply(_this, ['pytalkMethod' + methodName].concat(args));
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
		key: 'unrefAll',
		value: function unrefAll() {
			var resetRefs = this.methodSync('pytalkRefsReset');
			resetRefs();
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

			while (chunk = data.shift()) {
				var messageObj = this._parseChunk(chunk);
				if (!messageObj) {
					this._opts.stdout(chunk);
					continue;
				}

				this._serialized += messageObj.serialized;
				if (messageObj.isFinal) {
					(function () {
						var eventObj = utils.parseJSON(_this2._serialized);
						_this2._serialized = '';

						if (_this2._eventHandlers[eventObj['eventName']]) {
							var cbs = _this2._eventHandlers[eventObj['eventName']];
							cbs.forEach(function (cb) {
								return cb(eventObj['data']);
							});
						}
					})();
				}
			}
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
	}, {
		key: '_constructorArgs',
		value: function _constructorArgs(path, opts) {
			var p = void 0,
			    o = void 0;

			if (typeof path == 'string') {
				p = path;
				o = opts;
			} else if ((typeof path === 'undefined' ? 'undefined' : _typeof(path)) == 'object') {
				p = undefined;
				o = path;
			}

			return [p, o];
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