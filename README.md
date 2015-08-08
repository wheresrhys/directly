# promise-throttle

## Like Promise.all, only less so

This module could more descriptively be named Promise.allButNotAllAtOnce. It takes an array of functions which return a promise and returns a promise which resolves once all the promises resolved by the promises have resolved, or otherwise rejects. The difference is that a maximum of `n` promises are created at any one time. This is useful for rate-limiting asynchronous calls which return promises (e.g. `fetch`, `mongoose`...);

## Usage

```
var PromiseThrottle = require('promise-throttle`);
var urls = []; // a big array of urls
var fetchers = urls.map(function (url) {
    return function () {
        return fetch(url);
    }
});

var throttledRequests = new PromiseThrottle(10, fetchers)

throttledRequests
    .run()
    .then(function (results) {
        // handle exactly as if it was a Promise.all()
    })

```

Can also be called as a function (which implicitly calls the `.run()` method internally)
```
var promiseThrottle = require('promise-throttle');
promiseThrottle(10, fetchers)
    .then(function (results) {
        // handle exactly as if it was a Promise.all()
    });
```

*Based on an idea originally developed [at FT](https://github.com/Financial-Times/next-user-preferences-api-v2/blob/master/lib/promise-throttle.js)*