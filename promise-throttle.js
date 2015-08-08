'use strict';

require('es6-promise').polyfill();

var PromiseThrottle = function (throttleLimit, funcs) {
	if (!(this instanceof PromiseThrottle)) {
		return new PromiseThrottle(throttleLimit, funcs).run();
	}
	this.results = [];
	this.throttleLimit = throttleLimit;
	this.funcs = funcs;
	this.counter = 0;
};

PromiseThrottle.prototype.run = function () {
	if (this.funcs.length <= this.throttleLimit) {
		return Promise.all(this.funcs.map(function (func) {
			return func();
		}));
	}
	this.competitors = [];
	this.promise = new Promise(function (resolve, reject) {
		this.resolve = resolve;
		this.reject = reject;
	}.bind(this));

	var i = this.throttleLimit;

	while (i--) {
		this.executeOne();
	}
	this.startRace();

	return this.promise;
};

PromiseThrottle.prototype.executeOne = function () {
	var promise = this.funcs.shift()();

	this.results.push(promise);
	var index = this.counter++;
	promise = promise.then(function () {
		return index;
	});
	promise.__index = index;
	this.competitors.push(promise);
};

PromiseThrottle.prototype.startRace = function () {
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


module.exports = PromiseThrottle;
