# directly

## Like Promise.all, only less so

This module could more descriptively be named Promise.allButNotAllAtOnce. It takes an array of functions, each of which return a promise, and returns a promise which resolves once all those promises have resolved, or otherwise rejects... very similar to `Promise.all`. The difference is that a maximum of `n` promises are created at any one time. This is useful for rate-limiting asynchronous calls (e.g. `fetch`, `mongoose`...)

*** New feature ***
Now supports throttling of potentially infinite queues of Promises (see notes on the `Queue` class below)

## About the name
In the West Country people will often promise to do things 'directly' `[drekt-lee]`, meaning they'll do it when they're good and ready, possibly never. Example usage:

> I'll wash the dishes directly, my lover

## Usage

```js
const directly = require('directly');
const urls = []; // a big array of urls
const fetchers = urls.map(function (url) {
    return function () {
        return fetch(url);
    }
});


directly(10, fetchers)
    .then(function (results) {
        // handle exactly as if it was a Promise.all()
    });

```

Can also be called as a constructor (in which case the `.run()` method should be used)

```js
const Directly = require('Directly');
const throttledRequests = new Directly(10, fetchers)

throttledRequests
    .run()
    .then(function (results) {
        // handle exactly as if it was a Promise.all()
    })

 // can be used to stop the directly instance prematurely
throttledRequests.terminate()
```

To handle an infinite queue of promises use the `Queue` class to wrap your array of functions

```js
fetchers = new directly.Queue(fetchers);
directly(10, fetchers)
    .catch(function (errorObject) {
        // You can handle any errors in here
        // The error object has 3 properties
        //  error: The error thrown
        //  nextError: A promise which will reject the next time an error is encountered
        //  terminate: A function to call which will terminate the directly instance
    });

// use push to add to the execution queue. Will work even if the queue has fallen idle
fetchers.push(func1, func2, func3)
```


*Based on an idea originally developed [at FT](https://github.com/Financial-Times/next-user-preferences-api-v2/blob/master/lib/promise-throttle.js)*
