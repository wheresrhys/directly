'use strict';

var Directly = function (concurrence, funcs) {

	if (!Promise) {
		throw 'Directly requires es6 Promises';
	}

	if (!(this instanceof Directly)) {
		return new Directly(concurrence, funcs).run();
	}
	this.results = [];
	this.concurrence = concurrence;
	this.funcs = funcs;
	this.competitors = [];
};

Directly.prototype.run = function () {

	if (this.funcs.length <= this.concurrence) {
		return Promise.all(this.funcs.map(function (func) {
			return func();
		}));
	}

	while (this.concurrence--) {
		this.executeOne();
	}
	this.startRace();

	return new Promise(function (resolve, reject) {
		this.resolve = resolve;
		this.reject = reject;
	}.bind(this));
};

Directly.prototype.executeOne = function () {
	var promise = this.funcs.shift()();
	var competitors = this.competitors;

	this.results.push(promise);
	competitors.push(promise);

	promise.then(function () {
		competitors.splice(competitors.indexOf(promise), 1);
	});
};

Directly.prototype.startRace = function () {
	Promise.race(this.competitors)
		.then(function (index) {
			if (!this.funcs.length) {
				return this.resolve(Promise.all(this.results));
			}

			this.executeOne();
			this.startRace();

		}.bind(this), function (err) {
			this.reject(err);
		}.bind(this));
};

module.exports = Directly;
