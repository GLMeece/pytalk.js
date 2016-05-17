var pytalk = require('../index.js');
var expect = require("chai").expect;

describe('Pytalk worker', () => {

	it('uses pytalk_on in python', done => {
		var testData = {
			text: ['Hello', 'World!']
		};

		var worker = new pytalk.Worker(__dirname + '/testSimple.py');
		worker.on('done', data => {
			expect(data).to.deep.equal(testData);
			done();
		});

		worker.send('request', testData);
	});

	it('uses decorator in python', done => {
		var testData = {
			text: ['Hello', 'World!']
		};

		var worker = new pytalk.Worker(__dirname + '/testDecorator.py');
		worker.on('done', data => {
			expect(data).to.deep.equal(testData);
			done();
		});

		worker.send('request', testData);
	});

	it('multiple worker instances', done => {		

		var workers = [];
		var workersNum = 10;
		var doneCount = 0;

		for (var i = 0; i < workersNum; ++i) {
			var worker = new pytalk.Worker(__dirname + '/testDecorator.py');
			worker.on('done', data => {
				doneCount++;
				if (doneCount == workersNum) {
					done();
				}
			});			
			
			worker.send('request', {});
			workers.push(worker);
		}		
	});

});