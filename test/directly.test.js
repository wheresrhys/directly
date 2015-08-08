'use strict';

var expect = require('chai').expect;
var Directly = require('../directly');

var setupPromises = function (n) {

	var arrayN = Array(n + 1).join('.').split('');

	var promises = arrayN.map(function (nothing, n) {
		return getMutablePromise(n)
	});

	var functions = arrayN.map(function (nothing, n) {
		var p = promises[n];
		return function () {
			return p;
		};
	});

	return {
		promises: promises,
		functions: functions
	}
};

var getMutablePromise = function (n) {
	var res, rej;
	var p = new Promise(function (resolve, reject) {
		res = resolve;
		rej = reject;
	});

	p.resolve = function () {
		res(n);
	};

	p.reject = function () {
		rej('err' + n);
	};
	return p;
};


describe('concordance with Promise.all', function () {

	describe('promise count is under limit', function () {

		it('should resolve if they all resolve', function (done) {
			var promises = setupPromises(2);

			new Directly(3, promises.functions).run()
				.then(function (res) {
					expect(res).to.eql([0, 1]);
					done();
				});

			promises.promises.forEach(function (p) {
				p.resolve();
			});

		});

		it('should reject if any of them reject', function (done) {
			var promises = setupPromises(2);

			new Directly(3, promises.functions).run()
				.catch(function (res) {
					expect(res).to.equal('err1');
					done();
				});

				promises.promises[1].reject();
		});

	});

	describe('promise count is equal to limit', function () {
		it('should resolve if they all resolve', function (done) {
			var promises = setupPromises(3);

			new Directly(3, promises.functions).run()
				.then(function (res) {
					expect(res).to.eql([0, 1, 2]);
					done();
				});

			promises.promises.forEach(function (p) {
				p.resolve();
			});

		});

		it('should reject if any of them reject', function (done) {
			var promises = setupPromises(3);

			new Directly(3, promises.functions).run()
				.catch(function (res) {
					expect(res).to.equal('err1');
					done();
				});

				promises.promises[1].reject();
		});
	});

	describe('promise count is greater than limit', function () {
		it('should resolve if they all resolve', function (done) {
			var promises = setupPromises(4);

			new Directly(3, promises.functions).run()
				.then(function (res) {
					expect(res).to.eql([0, 1, 2, 3]);
					done();
				});

			promises.promises.forEach(function (p) {
				p.resolve();
			});

		});

		it('should reject if any of them reject', function (done) {
			var promises = setupPromises(4);

			new Directly(3, promises.functions).run()
				.catch(function (res) {
					expect(res).to.equal('err1');
					done();
				});

				promises.promises[1].reject();
		});

		it('should preserve promise order in the results', function () {
			var promises = setupPromises(4);

			new Directly(3, promises.functions).run()
				.then(function (res) {
					expect(res).to.eql([1,2,3,4]);
					done();
				});

			promises.promises.reverse().forEach(function (p) {
				p.resolve();
			});
		});
	});

});

describe('throttling', function () {
	it('should only call up to the throttle limit on startup', function () {
		var spyVal = false;
		var promises = setupPromises(3)

		promises.functions.push(function () {
			spyVal = true;
		});

		new Directly(3, promises.functions).run()

		expect(spyVal).to.be.false;
	});

	it('should incrementally setup next functions as space is freed up', function (done) {
		var spyVals = [];
		var promises = setupPromises(5);

		var func3 = promises.functions[3];
		var func4 = promises.functions[4];

		promises.functions[3] = function () {
			spyVals.push(3);
			return func3();
		}
		promises.functions[4] = function () {
			spyVals.push(4);
			return func4();
		}

		new Directly(3, promises.functions).run()

		expect(spyVals).to.eql([]);

		promises.promises[0].resolve();

		promises.promises[0].then(function () {
			setTimeout(function () {
				expect(spyVals).to.eql([3]);
				promises.promises[3].resolve();

				promises.promises[3].then(function () {
					setTimeout(function () {
						expect(spyVals).to.eql([3, 4]);
						done();
					}, 0)
				});
			}, 0)

		});

	});

});

describe('functional calling', function () {
	it('should be callable as a function', function (done) {
		var promises = setupPromises(3);

		Directly(3, promises.functions)
			.then(function (res) {
				expect(res).to.eql([0, 1, 2]);
				done();
			});

		promises.promises.forEach(function (p) {
			p.resolve();
		});

	});
})
