'use strict';

class Directly {
	constructor (concurrence, funcs) {
		if (!(this instanceof Directly)) {
			return new Directly(concurrence, funcs).run();
		}
		this.results = [];
		this.concurrence = concurrence;
		this.funcs = funcs;
		this.terminates = Array.isArray(this.funcs);
		this.competitors = [];
	}

	run () {

		if (this.terminates) {
			this.running = true;
			if (this.funcs.length <= this.concurrence) {
				return Promise.all(this.funcs.map(func => func()));
			}

			while (this.concurrence - this.competitors.length) {
				this.executeOne();
			}
			this.startRace();

			return new Promise((resolve, reject) => {
				this.resolve = resolve;
				this.reject = reject;
			});
		} else {
			if (this.running === true) {
				if (this.competitors.length < this.concurrence) {
					// cancel the old race/restart race/blend race ???
				} // else do nothing - it should just get shifted off the list in time

			} else {
				// never take the Promise.all shortcut as even if the initial list is short, it
				// could easily grow to exceed the concurrence limit.
				while (this.funcs.length && this.concurrence - this.competitors.length) {
					this.executeOne();
				}
				this.startRace();
			}
			this.running === true;
		}
	}



	executeOne () {
		const promise = this.funcs.shift()();

		this.results.push(promise);
		this.competitors.push(promise);

		promise.then(() => {
			this.competitors.splice(this.competitors.indexOf(promise), 1);
		});
	}

	startRace () {
		const race = this.race = Promise.race(this.competitors);

		race
			.then(index => {
				if (this.race === race) {
					if (!this.funcs.length) {
						if (this.terminates) {
							return this.resolve(Promise.all(this.results));
						} else {
							this.running = false;
						}
					}
					this.executeOne();
					this.startRace();
				}
			}, err => {
				if (this.terminates) {
					this.reject(err);
				}
			});
	}
}

module.exports = function SmartConstructor (concurrence, funcs) {
	const directly = new Directly(concurrence, funcs)
	return (this instanceof SmartConstructor) ? directly : directly.run();
};
