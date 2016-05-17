"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fs = require('fs');
var spawn = require('child_process').spawn;

var PYTALK_DRIVER = fs.readFileSync('pytalk-driver.py', 'utf-8');
var PYTALK_CODE_LABEL = "{PYTHON_CODE}";

var Worker = function () {
	function Worker(path) {
		var _this = this;

		var opts = arguments.length <= 1 || arguments[1] === undefined ? this._defaultOpts() : arguments[1];

		_classCallCheck(this, Worker);

		var pyCode = fs.readFileSync(path, 'utf-8');
		pyCode = this._convertPyCode(pyCode);

		this.opts = opts;

		this.process = spawn(this.opts.pythonPath, ['-c', pyCode]);

		this.process.stderr.on('data', function (data) {
			fs.writeFileSync('code.py', _this.pyCode);
		});
	}

	_createClass(Worker, [{
		key: 'on',
		value: function on(eventName, callback) {
			this.process.stdout.on('data', function (data) {
				data = JSON.parse(data.toString('utf-8'));

				if (data['eventName'] == eventName) {
					callback(data['data']);
				}
			});
		}
	}, {
		key: 'send',
		value: function send(eventName, data) {
			data = JSON.stringify({
				eventName: eventName,
				data: data
			});

			this.process.stdin.write(data);
			this.process.stdin.end();
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
				pythonPath: 'python'
			};
		}
	}]);

	return Worker;
}();

module.exports = {
	Worker: Worker
};
