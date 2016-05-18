let pytalk = require('../index.js');
let expect = require("chai").expect;

describe('Pytalk worker', () => {

	it('recieves event from python', done => {
		let worker = new pytalk.Worker(__dirname + '/testSimple.py');
		worker.on('done', data => {
			done();
		});

		worker.send('request', true);
	});

	it('recieves 2 events from python', done => {
		let worker = new pytalk.Worker(__dirname + '/testSimple.py');
		let doneCount = 0;

		worker.on('done', data => {
			if (++doneCount == 2) {
				done();
			}
		});

		worker.send('request', 1);
		worker.send('request', 2);
	});

	it('uses pytalk_on with data', done => {
		let testData = {
			text: ['Hello', 'World!']
		};

		let worker = new pytalk.Worker(__dirname + '/testSimple.py');
		worker.on('done', data => {
			expect(data).to.deep.equal(testData);
			done();
		});

		worker.send('request', testData);
	});

	it('uses decorator with data', done => {
		let testData = {
			text: ['Hello', 'World!']
		};

		let worker = new pytalk.Worker(__dirname + '/testDecorator.py');

		worker.on('done', data => {
			expect(data).to.deep.equal(testData);
			done();
		});

		worker.send('request', testData);
	});

	it('sends data more than once', done => {

		let worker = new pytalk.Worker(__dirname + '/testDecorator.py');
		let doneCount = 0;

		worker.on('done', data => {
			if (++doneCount == 3) {
				done();
			}
		});

		worker.send('request', {});
		worker.send('request', {});
		worker.send('request', {});
	});

	it('sends data with newlines', done => {

		let testData = {
			text: ['Hel\nlo', 'Wo\nrld!']
		};

		let worker = new pytalk.Worker(__dirname + '/testDecorator.py');

		worker.on('done', data => {
			expect(data).to.deep.equal(testData);
			done();
		});

		worker.send('request', testData);
	});	

	it('multiple worker instances', done => {		

		let workers = [];
		let workersNum = 10;
		let doneCount = 0;

		for (let i = 0; i < workersNum; ++i) {
			let worker = new pytalk.Worker(__dirname + '/testDecorator.py');
			worker.on('done', data => {
				if (++doneCount == workersNum) {
					done();
				}
			});			
			
			worker.send('request', {});
			workers.push(worker);
		}
	});
});