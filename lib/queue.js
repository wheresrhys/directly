'use strict';

class Queue {
	constructor (items) {
		this.items = items || [];
	}

	attachDirectlyInstance (directly) {
		this.directly = directly;
	}

	push (func) {
		this.items.push.apply(this.items, [].slice.call(arguments));
		this.directly.run();
	}

	shift () {
		return this.items.shift();
	}

	get length () {
		return this.items.length;
	}

}

module.exports = Queue;
