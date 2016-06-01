const pytalk = require('../lib/pytalk.js');

let expect = require('chai').expect;

describe('Pytalk worker', () => {

	describe('basic in-out', () => {
		it('recieves event from python', done => {
			let worker = new pytalk.Worker(__dirname + '/testSimple.py');
			worker.on('done', data => {
				worker.close();
				done();
			});

			worker.emit('request', true);
		});

		it('sends event without data', done => {
			let worker = new pytalk.Worker(__dirname + '/testDecorator.py');
			worker.on('done', data => {
				worker.close();
				done();
			});

			worker.emit('test_noargs');
		});

		it('recieves 2 events from python', done => {
			let worker = new pytalk.Worker(__dirname + '/testSimple.py');
			let doneCount = 0;

			worker.on('done', data => {
				if (++doneCount == 2) {
					worker.close();
					done();
				}
			});

			worker.emit('request', 1);
			worker.emit('request', 2);
		});

		it('uses pytalk_on with data', done => {
			let testData = {
				text: ['Hello', 'World!']
			};

			let worker = new pytalk.Worker(__dirname + '/testSimple.py');
			worker.on('done', data => {
				expect(data).to.deep.equal(testData);
				worker.close();
				done();
			});

			worker.emit('request', testData);
		});

		it('uses decorator with data', done => {
			let testData = {
				text: ['Hello', 'World!']
			};

			let worker = new pytalk.Worker(__dirname + '/testDecorator.py');

			worker.on('done', data => {
				expect(data).to.deep.equal(testData);
				done();

				worker.close();
			});

			worker.emit('request', testData);
		});

		it('uses decorator with multiple arguments', done => {
			let worker = new pytalk.Worker(__dirname + '/testDecorator.py');

			worker.on('done', res => {
				expect(res).to.deep.equal(6);
				done();

				worker.close();
			});

			worker.emit('three_args', 1, 2, 3);
		});

		it('handling non-pytalk stdout data', done => {
			let testData = {
				text: ['Hello', 'World!']
			};

			let worker = new pytalk.Worker(__dirname + '/testNonpytalkPrints.py', {
				stdout: false
			});
			
			let test = worker.method('test');

			test(123, function() {
				done();

				worker.close();
			});
		});

		it('sends data more than once', done => {

			let worker = new pytalk.Worker(__dirname + '/testDecorator.py');
			let doneCount = 0;

			worker.on('done', data => {
				if (++doneCount == 3) {
					worker.close();
					done();
				}
			});

			worker.emit('test_noargs');
			worker.emit('test_noargs');
			worker.emit('test_noargs');
		});

		it('sends data with newlines', done => {

			let testData = {
				text: ['Hel\nlo', 'Wo\nrld!']
			};

			let worker = new pytalk.Worker(__dirname + '/testDecorator.py');

			worker.on('done', data => {
				expect(data).to.deep.equal(testData);
				worker.close();
				done();
			});

			worker.emit('request', testData);
		});

		it('multiple worker instances', done => {

			let workers = [];
			let workersNum = 10;
			let doneCount = 0;

			for (let i = 0; i < workersNum; ++i) {
				let worker = new pytalk.Worker(__dirname + '/testDecorator.py');
				worker.on('done', data => {
					if (++doneCount == workersNum) {					
						workers.forEach(w => w.close());
						done();
					}
				});			
				
				worker.emit('request', {});
				workers.push(worker);
			}
		});		
	});

	describe('NaN', () => {
		it('function returns Infinity', done => {
			let worker = new pytalk.Worker(__dirname + '/testFunction.py');
			let test = worker.methodSync('NaN_test1');
			
			expect(test()).to.equal(Infinity);
			done();
			
			worker.close();
		});

		it('function returns object with Infinity property', done => {
			let worker = new pytalk.Worker(__dirname + '/testFunction.py');
			let test = worker.methodSync('NaN_test2');
			
			expect(test().prop).to.equal(Infinity);
			done();
			
			worker.close();
		});
	});

	describe('async method', () => {
		it('using method', done => {

			let worker = new pytalk.Worker(__dirname + '/testFunction.py');
			let fact = worker.method('factorial');

			fact(10, (err, res) => {
				expect(res).to.equal(3628800);
				done();

				worker.close();
			});
		});

		it('using method with error', done => {

			let worker = new pytalk.Worker(__dirname + '/testFunctionError.py');
			let fact = worker.method('factorial');

			fact(10, (err, res) => {
				expect(err).to.equal('integer division or modulo by zero');
				done();
				
				worker.close();
			});
		});
	});

	describe('sync method', () => {
		it('using method', done => {

			let worker = new pytalk.Worker(__dirname + '/testFunction.py');
			let fact = worker.methodSync('factorial');

			expect(fact(10)).to.equal(3628800);
			done();

			worker.close();
		});

		it('using method with error', done => {
			let worker = new pytalk.Worker(__dirname + '/testFunctionError.py');
			let fact = worker.methodSync('factorial');

			try {
				fact(10);
			}
			catch (err) {
				expect(err.toString()).to.equal('integer division or modulo by zero');
			}
			done();
			
			worker.close();
		});
	});	
	
	describe('stdout options', () => {

		it('callback', done => {

			let worker = new pytalk.Worker(__dirname + '/testNonpytalkPrints.py', {
				stdout: data => {
					expect(data).to.equal('hello world!');
					done();
				}
			});

			let test = worker.method('test');
			test(123, () => {
				worker.close();
			});
		});
	});
});

describe('worker.import', () => {
	describe('import math', () => {

		it('math', done => {
			let worker = pytalk.worker();

			let math = worker.import('math');
			done();
		});

		it('math.pi', done => {
			let worker = pytalk.worker();

			let math = worker.import('math');
			expect(math.pi).to.equal(3.141592653589793);
			done();
		});

		it('math.sqrt sync', done => {
			let worker = pytalk.worker();

			let math = worker.import('math');

			expect(math.sqrt(144)).to.equal(12);
			done();
		});

		it('math.sqrt async', done => {
			let worker = pytalk.worker({
				async: true
			});

			let math = worker.import('math');

			math.sqrt(144, (err, res) => {
				expect(res).to.equal(12);
				done();
			});
		});
	});

	describe('import os', () => {
		it('os', done => {
			let worker = pytalk.worker();
			let os = worker.import('os');
			done();
		});

		it('os.path.split', done => {
			let worker = pytalk.worker();
			let os = worker.import('os');

			expect(os.path.split('aaa/bbb')).to.deep.equal(['aaa', 'bbb']);
			done();
		});

		it('import os.path', done => {
			let worker = pytalk.worker();
			let split = worker.import('os.path').split;

			expect(split('aaa/bbb')).to.deep.equal(['aaa', 'bbb']);
			done();
		});
	});

	describe('import numpy', () => {
		
		it('numpy', done => {
			let worker = pytalk.worker();
			let np = worker.import('numpy');
			done();
		});

		it('numpy.array.tolist', done => {
			let worker = pytalk.worker();
			let np = worker.import('numpy');
			let arr = np.array([1, 2, 3]);

			expect(arr.tolist()).to.deep.equal([1, 2, 3]);
			done();
		});

		it('numpy.sqrt(nparray)', done => {
			let worker = pytalk.worker();
			let np = worker.import('numpy');
			let arr = np.array([1, 4, 9]);
			arr = np.sqrt(arr);

			expect(arr.tolist()).to.deep.equal([1.0, 2.0, 3.0]);
			done();
		});
	});

	describe('import cv2', () => {
		
		it('cv2', done => {
			let worker = pytalk.worker();

			let cv2 = worker.import('cv2');
			done();
		});
	});

	describe('builtins', () => {
		
		it('max', done => {
			let worker = pytalk.worker();

			expect(worker.builtins.max([1, 5, 2])).to.equal(5);
			done();
		});

		it('range sum', done => {
			let worker = pytalk.worker();

			expect(worker.builtins.sum(worker.builtins.range(100))).to.equal(4950);
			done();
		});
	});

	describe('unrefAll', () => {
		
		it('call', done => {
			let worker = pytalk.worker();

			let np = worker.import('numpy');
			worker.unrefAll();
			
			done();
		});
	});	

});
