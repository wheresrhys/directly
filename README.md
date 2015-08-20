# directly

## Like Promise.all, only less so

This module could more descriptively be named Promise.allButNotAllAtOnce. It takes an array of functions, each of which return a promise, and returns a promise which resolves once all those promises have resolved, or otherwise rejects... very similar to `Promise.all`. The difference is that a maximum of `n` promises are created at any one time. This is useful for rate-limiting asynchronous calls (e.g. `fetch`, `mongoose`...);

## About the name
In Devon people will often promise to do things 'directly', meaning they'll do it when they're good and ready

## Usage

```
var Directly = require('directly');
var urls = []; // a big array of urls
var fetchers = urls.map(function (url) {
    return function () {
        return fetch(url);
    }
});

var throttledRequests = new Directly(10, fetchers)

throttledRequests
    .run()
    .then(function (results) {
        // handle exactly as if it was a Promise.all()
    })

```

Can also be called as a function (which calls the `.run()` method internally)

```
var directly = require('directly');
directly(10, fetchers)
    .then(function (results) {
        // handle exactly as if it was a Promise.all()
    });
```

*Based on an idea originally developed [at FT](https://github.com/Financial-Times/next-user-preferences-api-v2/blob/master/lib/directly.js)*
