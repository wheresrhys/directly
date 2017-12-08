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

	describe('promise count is zero', function () {
		it('should resolve with an empty array', function (done) {
			var promises = setupPromises(0);

			new Directly(3, promises.functions).run()
				.then(function (res) {
					expect(res).to.eql([]);
					done();
				});
			promises.promises.forEach(function (p) {
				p.resolve();
			});

		});
	});

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

describe('infinite queueing', function () {

	it('should call all on startup if throttle limit not reached', function (done) {
		const result = [];
		const funcs = new Directly.Queue([1, 2].map(i => {
			return () => {
				result.push(i);
				return Promise.resolve(i);
			}
		}))

		new Directly(3, funcs).run()
		setTimeout(() => {
			expect(result).to.eql([1, 2]);
			done();
		}, 50)
	});

	it('should only call up to the throttle limit on startup', function (done) {
		const result = [];
		const funcs = new Directly.Queue([1, 2, 3].map(i => {
			return () => {
				result.push(i);
				return new Promise(() => null);
			}
		}))

		new Directly(2, funcs).run()
		setTimeout(() => {
			expect(result).to.eql([1, 2]);
			done();
		}, 50)
	});

	it('should seamlessly call any promise function added after startup', function (done) {
		const promises = setupPromises(3);
		const funcs = new Directly.Queue(promises.functions);

		new Directly(3, funcs).run();
		let spyCalled = false;
		const spy = () => {
			spyCalled = true;
			return new Promise(() => null)
		};
		funcs.push(spy);

		setTimeout(() => {
			expect(spyCalled).to.be.false;
			promises.promises.forEach(promise => promise.resolve());

			setTimeout(() => {
				expect(spyCalled).to.be.true;
				done();
			}, 50)
		}, 50);

	});

	it('should restart if functions are pushed when it is idling', function (done) {
		const funcs = new Directly.Queue([1, 2].map(i => {
			return () => {
				return Promise.resolve(i);
			}
		}))

		new Directly(3, funcs).run()
		let spyCalled = false;
		const spy = () => {
			spyCalled = true;
			return new Promise(() => null)
		};
		funcs.push(spy);

		setTimeout(() => {
			expect(spyCalled).to.be.true;
			done();
		}, 50)
	});

	it('should still apply concurrence limits to functions added after startup', function (done) {
		const funcs = new Directly.Queue([1, 2].map(i => {
			return () => {
				return Promise.resolve(i);
			}
		}))

		new Directly(3, funcs).run()
		let spyCalled = false;
		const spy = () => {
			spyCalled = true;
			return new Promise(() => null)
		};
		funcs.push(() => new Promise(() => null));
		funcs.push(() => new Promise(() => null));
		funcs.push(() => new Promise(() => null));
		funcs.push(spy);

		setTimeout(() => {
			expect(spyCalled).to.be.false;
			done();
		}, 50)
	});

	it('should provide a promisey interface to handle errors', function (done) {
		const funcs = new Directly.Queue([() => {
			return Promise.reject('test error1');
		}]);

		var d = new Directly(3, funcs);

		var p = d.run()
			.catch(err1 => {
				expect(err1.error).to.equal('test error1');

				funcs.push(() => Promise.reject('test error2'));

				err1.nextError.catch(err2 => {
					expect(err2.error).to.equal('test error2');
					err2.terminate();
					let spyCalled = false;
					const spy = () => {
						spyCalled = true;
						return new Promise(() => null)
					};
					setTimeout(() => {
						expect(spyCalled).to.be.false;
						done();
					}, 50)
				});
			})
	});
})
