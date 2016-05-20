let pytalk = require('../index.js');
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

			worker.emit('request');
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
				worker.close();
				done();
			});

			worker.emit('request', testData);
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
				worker.close();
				done();
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

			worker.emit('request');
			worker.emit('request');
			worker.emit('request');
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

	describe('method', () => {
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

	describe('stdout options', () => {

		it('callback', done => {

			let worker = new pytalk.Worker(__dirname + '/testNonpytalkPrints.py', {
				stdout: data => {
					expect(data).to.equal('hello world!');

					worker.close();
					done();
				}
			});

			let test = worker.method('test');
			test(123, (err, res) => {

			});

		});
	});
});