'use strict';

function getRemover (arr, target) {
	return () => {
		arr.splice(arr.indexOf(target), 1);
	};
}

class Directly {
	constructor (concurrence, funcs) {
		this.results = [];
		this.concurrence = concurrence;
		this.funcs = funcs;
		this.terminates = Array.isArray(this.funcs);
		this.cancelled = false;
		if (!Array.isArray(this.funcs)) {
			this.funcs.attachDirectlyInstance(this);
		}
		this.competitors = [];
	}

	run () {
		if (Array.isArray(this.funcs) && !this.funcs.length) {
			return Promise.resolve([]);		
		}

		if (typeof this.funcs[0] !== 'function') {
			throw new TypeError('directly expects a list functions that return a Promise, not a list of Promises')
		}
		if (this.terminates) {
			if (this.funcs.length <= this.concurrence) {
				return Promise.all(this.funcs.map(func => func()));
			}

			while (this.concurrence - this.competitors.length) {
				this.executeOne();
			}
			this.startRace();


		} else if (!this.running) {
			// never take the Promise.all shortcut as even if the initial list is short, it
			// could easily grow to exceed the concurrence limit.
			while (this.funcs.length && this.concurrence - this.competitors.length) {
				this.executeOne();
			}
			this.startRace();
		}
		this.running === true;
		if (!this.resolve) {
			return this.instancePromise();
		}
	}

	instancePromise () {
		return new Promise((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
	}

	executeOne () {
		const promise = this.funcs.shift()();

		this.results.push(promise);
		this.competitors.push(promise);
		const remove = getRemover(this.competitors, promise)
		promise.then(remove, remove);
	}

	startRace () {
		const race = this.race = Promise.race(this.competitors);

		race
			.then(() => {
				this.rejoinRace(race);
			}, err => {

				if (this.terminates) {
					this.reject(err);
				} else {
					// give the ability to handle future errors;
					const reject = this.reject;
					const nextPromise = this.instancePromise();
					reject({
						error: err,
						nextError: nextPromise,
						terminate: this.terminate.bind(this)
					});
					this.rejoinRace(race);
				}
			});
	}

	rejoinRace (race) {
		if (this.race === race) {
			if (!this.funcs.length) {
				if (this.terminates) {
					return this.resolve(Promise.all(this.results));
				} else {
					this.running = false;
				}
			} else if (!this.cancelled) {
				this.executeOne();
				this.startRace();
			}
		}
	}

	terminate () {
		this.resolve();
		this.cancelled = true;
	}

}

module.exports = function SmartConstructor (concurrence, funcs) {
	const directly = new Directly(concurrence, funcs)
	return (this instanceof SmartConstructor) ? directly : directly.run();
};

module.exports.Queue = require('./lib/queue');
