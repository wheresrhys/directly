'use strict';

require('es6-promise').polyfill();

var Directly = function (concurrence, funcs) {
	if (!(this instanceof Directly)) {
		return new Directly(concurrence, funcs).run();
	}
	this.results = [];
	this.concurrence = concurrence;
	this.funcs = funcs;
	this.counter = 0;
};

Directly.prototype.run = function () {
	if (this.funcs.length <= this.concurrence) {
		return Promise.all(this.funcs.map(function (func) {
			return func();
		}));
	}
	this.competitors = [];
	this.promise = new Promise(function (resolve, reject) {
		this.resolve = resolve;
		this.reject = reject;
	}.bind(this));

	var i = this.concurrence;

	while (i--) {
		this.executeOne();
	}
	this.startRace();

	return this.promise;
};

Directly.prototype.executeOne = function () {
	var promise = this.funcs.shift()();

	this.results.push(promise);
	var index = this.counter++;
	promise = promise.then(function () {
		return index;
	});
	promise.__index = index;
	this.competitors.push(promise);
};

Directly.prototype.startRace = function () {
	Promise.race(this.competitors)
		.then(function (index) {
			if (!this.funcs.length) {
				Promise.all(this.results)
					.then(function (results) {
						this.resolve(results);
					}.bind(this));
			} else {
				this.competitors = this.competitors.filter(function (promise) {
					return promise.__index !== index;
				});
				this.executeOne();
				this.startRace();
			}
		}.bind(this), function (err) {
			this.reject(err);
		}.bind(this));
};


module.exports = Directly;
