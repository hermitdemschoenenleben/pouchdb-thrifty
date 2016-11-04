var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};





function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var Mutation = commonjsGlobal.MutationObserver || commonjsGlobal.WebKitMutationObserver;

var scheduleDrain;

{
  if (Mutation) {
    var called = 0;
    var observer = new Mutation(nextTick);
    var element = commonjsGlobal.document.createTextNode('');
    observer.observe(element, {
      characterData: true
    });
    scheduleDrain = function () {
      element.data = (called = ++called % 2);
    };
  } else if (!commonjsGlobal.setImmediate && typeof commonjsGlobal.MessageChannel !== 'undefined') {
    var channel = new commonjsGlobal.MessageChannel();
    channel.port1.onmessage = nextTick;
    scheduleDrain = function () {
      channel.port2.postMessage(0);
    };
  } else if ('document' in commonjsGlobal && 'onreadystatechange' in commonjsGlobal.document.createElement('script')) {
    scheduleDrain = function () {

      // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
      // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
      var scriptEl = commonjsGlobal.document.createElement('script');
      scriptEl.onreadystatechange = function () {
        nextTick();

        scriptEl.onreadystatechange = null;
        scriptEl.parentNode.removeChild(scriptEl);
        scriptEl = null;
      };
      commonjsGlobal.document.documentElement.appendChild(scriptEl);
    };
  } else {
    scheduleDrain = function () {
      setTimeout(nextTick, 0);
    };
  }
}

var draining;
var queue = [];
//named nextTick for less confusing stack traces
function nextTick() {
  draining = true;
  var i, oldQueue;
  var len = queue.length;
  while (len) {
    oldQueue = queue;
    queue = [];
    i = -1;
    while (++i < len) {
      oldQueue[i]();
    }
    len = queue.length;
  }
  draining = false;
}

var browser$2 = immediate$1;
function immediate$1(task) {
  if (queue.push(task) === 1 && !draining) {
    scheduleDrain();
  }
}

var immediate = browser$2;

/* istanbul ignore next */
function INTERNAL() {}

var handlers = {};

var REJECTED = ['REJECTED'];
var FULFILLED = ['FULFILLED'];
var PENDING = ['PENDING'];

var browser$1 = Promise$2;

function Promise$2(resolver) {
  if (typeof resolver !== 'function') {
    throw new TypeError('resolver must be a function');
  }
  this.state = PENDING;
  this.queue = [];
  this.outcome = void 0;
  if (resolver !== INTERNAL) {
    safelyResolveThenable(this, resolver);
  }
}

Promise$2.prototype["catch"] = function (onRejected) {
  return this.then(null, onRejected);
};
Promise$2.prototype.then = function (onFulfilled, onRejected) {
  if (typeof onFulfilled !== 'function' && this.state === FULFILLED ||
    typeof onRejected !== 'function' && this.state === REJECTED) {
    return this;
  }
  var promise = new this.constructor(INTERNAL);
  if (this.state !== PENDING) {
    var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
    unwrap(promise, resolver, this.outcome);
  } else {
    this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
  }

  return promise;
};
function QueueItem(promise, onFulfilled, onRejected) {
  this.promise = promise;
  if (typeof onFulfilled === 'function') {
    this.onFulfilled = onFulfilled;
    this.callFulfilled = this.otherCallFulfilled;
  }
  if (typeof onRejected === 'function') {
    this.onRejected = onRejected;
    this.callRejected = this.otherCallRejected;
  }
}
QueueItem.prototype.callFulfilled = function (value) {
  handlers.resolve(this.promise, value);
};
QueueItem.prototype.otherCallFulfilled = function (value) {
  unwrap(this.promise, this.onFulfilled, value);
};
QueueItem.prototype.callRejected = function (value) {
  handlers.reject(this.promise, value);
};
QueueItem.prototype.otherCallRejected = function (value) {
  unwrap(this.promise, this.onRejected, value);
};

function unwrap(promise, func, value) {
  immediate(function () {
    var returnValue;
    try {
      returnValue = func(value);
    } catch (e) {
      return handlers.reject(promise, e);
    }
    if (returnValue === promise) {
      handlers.reject(promise, new TypeError('Cannot resolve promise with itself'));
    } else {
      handlers.resolve(promise, returnValue);
    }
  });
}

handlers.resolve = function (self, value) {
  var result = tryCatch(getThen, value);
  if (result.status === 'error') {
    return handlers.reject(self, result.value);
  }
  var thenable = result.value;

  if (thenable) {
    safelyResolveThenable(self, thenable);
  } else {
    self.state = FULFILLED;
    self.outcome = value;
    var i = -1;
    var len = self.queue.length;
    while (++i < len) {
      self.queue[i].callFulfilled(value);
    }
  }
  return self;
};
handlers.reject = function (self, error) {
  self.state = REJECTED;
  self.outcome = error;
  var i = -1;
  var len = self.queue.length;
  while (++i < len) {
    self.queue[i].callRejected(error);
  }
  return self;
};

function getThen(obj) {
  // Make sure we only access the accessor once as required by the spec
  var then = obj && obj.then;
  if (obj && typeof obj === 'object' && typeof then === 'function') {
    return function appyThen() {
      then.apply(obj, arguments);
    };
  }
}

function safelyResolveThenable(self, thenable) {
  // Either fulfill, reject or reject with error
  var called = false;
  function onError(value) {
    if (called) {
      return;
    }
    called = true;
    handlers.reject(self, value);
  }

  function onSuccess(value) {
    if (called) {
      return;
    }
    called = true;
    handlers.resolve(self, value);
  }

  function tryToUnwrap() {
    thenable(onSuccess, onError);
  }

  var result = tryCatch(tryToUnwrap);
  if (result.status === 'error') {
    onError(result.value);
  }
}

function tryCatch(func, value) {
  var out = {};
  try {
    out.value = func(value);
    out.status = 'success';
  } catch (e) {
    out.status = 'error';
    out.value = e;
  }
  return out;
}

Promise$2.resolve = resolve;
function resolve(value) {
  if (value instanceof this) {
    return value;
  }
  return handlers.resolve(new this(INTERNAL), value);
}

Promise$2.reject = reject;
function reject(reason) {
  var promise = new this(INTERNAL);
  return handlers.reject(promise, reason);
}

Promise$2.all = all;
function all(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var values = new Array(len);
  var resolved = 0;
  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    allResolver(iterable[i], i);
  }
  return promise;
  function allResolver(value, i) {
    self.resolve(value).then(resolveFromAll, function (error) {
      if (!called) {
        called = true;
        handlers.reject(promise, error);
      }
    });
    function resolveFromAll(outValue) {
      values[i] = outValue;
      if (++resolved === len && !called) {
        called = true;
        handlers.resolve(promise, values);
      }
    }
  }
}

Promise$2.race = race;
function race(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    resolver(iterable[i]);
  }
  return promise;
  function resolver(value) {
    self.resolve(value).then(function (response) {
      if (!called) {
        called = true;
        handlers.resolve(promise, response);
      }
    }, function (error) {
      if (!called) {
        called = true;
        handlers.reject(promise, error);
      }
    });
  }
}

/* istanbul ignore next */
var PouchPromise$1 = typeof Promise === 'function' ? Promise : browser$1;

var index$1 = argsArray;

function argsArray(fun) {
  return function () {
    var len = arguments.length;
    if (len) {
      var args = [];
      var i = -1;
      while (++i < len) {
        args[i] = arguments[i];
      }
      return fun.call(this, args);
    } else {
      return fun.call(this, []);
    }
  };
}

function isBinaryObject(object) {
  return (typeof ArrayBuffer !== 'undefined' && object instanceof ArrayBuffer) ||
    (typeof Blob !== 'undefined' && object instanceof Blob);
}

function cloneArrayBuffer(buff) {
  if (typeof buff.slice === 'function') {
    return buff.slice(0);
  }
  // IE10-11 slice() polyfill
  var target = new ArrayBuffer(buff.byteLength);
  var targetArray = new Uint8Array(target);
  var sourceArray = new Uint8Array(buff);
  targetArray.set(sourceArray);
  return target;
}

function cloneBinaryObject(object) {
  if (object instanceof ArrayBuffer) {
    return cloneArrayBuffer(object);
  }
  var size = object.size;
  var type = object.type;
  // Blob
  if (typeof object.slice === 'function') {
    return object.slice(0, size, type);
  }
  // PhantomJS slice() replacement
  return object.webkitSlice(0, size, type);
}

// most of this is borrowed from lodash.isPlainObject:
// https://github.com/fis-components/lodash.isplainobject/
// blob/29c358140a74f252aeb08c9eb28bef86f2217d4a/index.js

var funcToString = Function.prototype.toString;
var objectCtorString = funcToString.call(Object);

function isPlainObject(value) {
  var proto = Object.getPrototypeOf(value);
  /* istanbul ignore if */
  if (proto === null) { // not sure when this happens, but I guess it can
    return true;
  }
  var Ctor = proto.constructor;
  return (typeof Ctor == 'function' &&
    Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString);
}

function clone(object) {
  var newObject;
  var i;
  var len;

  if (!object || typeof object !== 'object') {
    return object;
  }

  if (Array.isArray(object)) {
    newObject = [];
    for (i = 0, len = object.length; i < len; i++) {
      newObject[i] = clone(object[i]);
    }
    return newObject;
  }

  // special case: to avoid inconsistencies between IndexedDB
  // and other backends, we automatically stringify Dates
  if (object instanceof Date) {
    return object.toISOString();
  }

  if (isBinaryObject(object)) {
    return cloneBinaryObject(object);
  }

  if (!isPlainObject(object)) {
    return object; // don't clone objects like Workers
  }

  newObject = {};
  for (i in object) {
    /* istanbul ignore else */
    if (Object.prototype.hasOwnProperty.call(object, i)) {
      var value = clone(object[i]);
      if (typeof value !== 'undefined') {
        newObject[i] = value;
      }
    }
  }
  return newObject;
}

function once(fun) {
  var called = false;
  return index$1(function (args) {
    /* istanbul ignore if */
    if (called) {
      // this is a smoke test and should never actually happen
      throw new Error('once called more than once');
    } else {
      called = true;
      fun.apply(this, args);
    }
  });
}

function toPromise(func) {
  //create the function we will be returning
  return index$1(function (args) {
    // Clone arguments
    args = clone(args);
    var self = this;
    var tempCB =
      (typeof args[args.length - 1] === 'function') ? args.pop() : false;
    // if the last argument is a function, assume its a callback
    var usedCB;
    if (tempCB) {
      // if it was a callback, create a new callback which calls it,
      // but do so async so we don't trap any errors
      usedCB = function (err, resp) {
        process.nextTick(function () {
          tempCB(err, resp);
        });
      };
    }
    var promise = new PouchPromise$1(function (fulfill, reject) {
      var resp;
      try {
        var callback = once(function (err, mesg) {
          if (err) {
            reject(err);
          } else {
            fulfill(mesg);
          }
        });
        // create a callback for this invocation
        // apply the function in the orig context
        args.push(callback);
        resp = func.apply(self, args);
        if (resp && typeof resp.then === 'function') {
          fulfill(resp);
        }
      } catch (e) {
        reject(e);
      }
    });
    // if there is a callback, call it back
    if (usedCB) {
      promise.then(function (result) {
        usedCB(null, result);
      }, usedCB);
    }
    return promise;
  });
}

/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

var index$2 = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

var debug_1 = createCommonjsModule(function (module, exports) {
/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = index$2;

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}
});

var browser$4 = createCommonjsModule(function (module, exports) {
/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug_1;
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}
});

var log$$1 = browser$4('pouchdb:api');

// like underscore/lodash _.pick()
function pick(obj, arr) {
  var res = {};
  for (var i = 0, len = arr.length; i < len; i++) {
    var prop = arr[i];
    if (prop in obj) {
      res[prop] = obj[prop];
    }
  }
  return res;
}

// Most browsers throttle concurrent requests at 6, so it's silly
// to shim _bulk_get by trying to launch potentially hundreds of requests
// and then letting the majority time out. We can handle this ourselves.
var MAX_NUM_CONCURRENT_REQUESTS = 6;

function identityFunction(x) {
  return x;
}

function formatResultForOpenRevsGet(result) {
  return [{
    ok: result
  }];
}

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var events = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

var EventEmitter = events.EventEmitter;

var inherits_browser$1 = createCommonjsModule(function (module) {
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    var TempCtor = function () {};
    TempCtor.prototype = superCtor.prototype;
    ctor.prototype = new TempCtor();
    ctor.prototype.constructor = ctor;
  };
}
});

function isChromeApp() {
  return (typeof chrome !== "undefined" &&
    typeof chrome.storage !== "undefined" &&
    typeof chrome.storage.local !== "undefined");
}

var hasLocal;

if (isChromeApp()) {
  hasLocal = false;
} else {
  try {
    localStorage.setItem('_pouch_check_localstorage', 1);
    hasLocal = !!localStorage.getItem('_pouch_check_localstorage');
  } catch (e) {
    hasLocal = false;
  }
}

function hasLocalStorage() {
  return hasLocal;
}

inherits_browser$1(Changes, EventEmitter);

/* istanbul ignore next */
function attachBrowserEvents(self) {
  if (isChromeApp()) {
    chrome.storage.onChanged.addListener(function (e) {
      // make sure it's event addressed to us
      if (e.db_name != null) {
        //object only has oldValue, newValue members
        self.emit(e.dbName.newValue);
      }
    });
  } else if (hasLocalStorage()) {
    if (typeof addEventListener !== 'undefined') {
      addEventListener("storage", function (e) {
        self.emit(e.key);
      });
    } else { // old IE
      window.attachEvent("storage", function (e) {
        self.emit(e.key);
      });
    }
  }
}

function Changes() {
  EventEmitter.call(this);
  this._listeners = {};

  attachBrowserEvents(this);
}
Changes.prototype.addListener = function (dbName, id, db, opts) {
  /* istanbul ignore if */
  if (this._listeners[id]) {
    return;
  }
  var self = this;
  var inprogress = false;
  function eventFunction() {
    /* istanbul ignore if */
    if (!self._listeners[id]) {
      return;
    }
    if (inprogress) {
      inprogress = 'waiting';
      return;
    }
    inprogress = true;
    var changesOpts = pick(opts, [
      'style', 'include_docs', 'attachments', 'conflicts', 'filter',
      'doc_ids', 'view', 'since', 'query_params', 'binary'
    ]);

    /* istanbul ignore next */
    function onError() {
      inprogress = false;
    }

    db.changes(changesOpts).on('change', function (c) {
      if (c.seq > opts.since && !opts.cancelled) {
        opts.since = c.seq;
        opts.onChange(c);
      }
    }).on('complete', function () {
      if (inprogress === 'waiting') {
        setTimeout(function (){
          eventFunction();
        },0);
      }
      inprogress = false;
    }).on('error', onError);
  }
  this._listeners[id] = eventFunction;
  this.on(dbName, eventFunction);
};

Changes.prototype.removeListener = function (dbName, id) {
  /* istanbul ignore if */
  if (!(id in this._listeners)) {
    return;
  }
  EventEmitter.prototype.removeListener.call(this, dbName,
    this._listeners[id]);
  delete this._listeners[id];
};


/* istanbul ignore next */
Changes.prototype.notifyLocalWindows = function (dbName) {
  //do a useless change on a storage thing
  //in order to get other windows's listeners to activate
  if (isChromeApp()) {
    chrome.storage.local.set({dbName: dbName});
  } else if (hasLocalStorage()) {
    localStorage[dbName] = (localStorage[dbName] === "a") ? "b" : "a";
  }
};

Changes.prototype.notify = function (dbName) {
  this.emit(dbName);
  this.notifyLocalWindows(dbName);
};

function guardedConsole(method) {
  /* istanbul ignore else */
  if (console !== 'undefined' && method in console) {
    var args = Array.prototype.slice.call(arguments, 1);
    console[method].apply(console, args);
  }
}

function randomNumber(min, max) {
  var maxTimeout = 600000; // Hard-coded default of 10 minutes
  min = parseInt(min, 10) || 0;
  max = parseInt(max, 10);
  if (max !== max || max <= min) {
    max = (min || 1) << 1; //doubling
  } else {
    max = max + 1;
  }
  // In order to not exceed maxTimeout, pick a random value between half of maxTimeout and maxTimeout
  if(max > maxTimeout) {
    min = maxTimeout >> 1; // divide by two
    max = maxTimeout;
  }
  var ratio = Math.random();
  var range = max - min;

  return ~~(range * ratio + min); // ~~ coerces to an int, but fast.
}

function defaultBackOff(min) {
  var max = 0;
  if (!min) {
    max = 2000;
  }
  return randomNumber(min, max);
}

function extendInner(obj, otherObj) {
  for (var key in otherObj) {
    if (otherObj.hasOwnProperty(key)) {
      var value = clone(otherObj[key]);
      if (typeof value !== 'undefined') {
        obj[key] = value;
      }
    }
  }
}

// forked from
// https://github.com/vmattos/js-extend/blob/7023fd69a9e9552688086b8b8006b1fcf916a306/extend.js
// TODO: I don't know why we have two different extend() functions in PouchDB

var slice = Array.prototype.slice;
var each = Array.prototype.forEach;

function extend$2(obj) {
  if (typeof obj !== 'object') {
    throw obj + ' is not an object' ;
  }

  var sources = slice.call(arguments, 1);

  each.call(sources, function (source) {
    if (source) {
      for (var prop in source) {
        if (typeof source[prop] === 'object' && obj[prop]) {
          extend$2.call(obj, obj[prop], source[prop]);
        } else {
          obj[prop] = source[prop];
        }
      }
    }
  });

  return obj;
}

inherits_browser$1(PouchError, Error);

function PouchError(opts) {
  Error.call(this, opts.reason);
  this.status = opts.status;
  this.name = opts.error;
  this.message = opts.reason;
  this.error = true;
}

PouchError.prototype.toString = function () {
  return JSON.stringify({
    status: this.status,
    name: this.name,
    message: this.message,
    reason: this.reason
  });
};

var UNAUTHORIZED = new PouchError({
  status: 401,
  error: 'unauthorized',
  reason: "Name or password is incorrect."
});

var MISSING_BULK_DOCS = new PouchError({
  status: 400,
  error: 'bad_request',
  reason: "Missing JSON list of 'docs'"
});

var MISSING_DOC = new PouchError({
  status: 404,
  error: 'not_found',
  reason: 'missing'
});

var REV_CONFLICT = new PouchError({
  status: 409,
  error: 'conflict',
  reason: 'Document update conflict'
});

var INVALID_ID = new PouchError({
  status: 400,
  error: 'bad_request',
  reason: '_id field must contain a string'
});

var MISSING_ID = new PouchError({
  status: 412,
  error: 'missing_id',
  reason: '_id is required for puts'
});

var RESERVED_ID = new PouchError({
  status: 400,
  error: 'bad_request',
  reason: 'Only reserved document ids may start with underscore.'
});

var NOT_OPEN = new PouchError({
  status: 412,
  error: 'precondition_failed',
  reason: 'Database not open'
});

var UNKNOWN_ERROR = new PouchError({
  status: 500,
  error: 'unknown_error',
  reason: 'Database encountered an unknown error'
});

var BAD_ARG = new PouchError({
  status: 500,
  error: 'badarg',
  reason: 'Some query argument is invalid'
});

var INVALID_REQUEST = new PouchError({
  status: 400,
  error: 'invalid_request',
  reason: 'Request was invalid'
});

var QUERY_PARSE_ERROR = new PouchError({
  status: 400,
  error: 'query_parse_error',
  reason: 'Some query parameter is invalid'
});

var DOC_VALIDATION = new PouchError({
  status: 500,
  error: 'doc_validation',
  reason: 'Bad special document member'
});

var BAD_REQUEST = new PouchError({
  status: 400,
  error: 'bad_request',
  reason: 'Something wrong with the request'
});

var NOT_AN_OBJECT = new PouchError({
  status: 400,
  error: 'bad_request',
  reason: 'Document must be a JSON object'
});

var DB_MISSING = new PouchError({
  status: 404,
  error: 'not_found',
  reason: 'Database not found'
});

var IDB_ERROR = new PouchError({
  status: 500,
  error: 'indexed_db_went_bad',
  reason: 'unknown'
});

var WSQ_ERROR = new PouchError({
  status: 500,
  error: 'web_sql_went_bad',
  reason: 'unknown'
});

var LDB_ERROR = new PouchError({
  status: 500,
  error: 'levelDB_went_went_bad',
  reason: 'unknown'
});

var FORBIDDEN = new PouchError({
  status: 403,
  error: 'forbidden',
  reason: 'Forbidden by design doc validate_doc_update function'
});

var INVALID_REV = new PouchError({
  status: 400,
  error: 'bad_request',
  reason: 'Invalid rev format'
});

var FILE_EXISTS = new PouchError({
  status: 412,
  error: 'file_exists',
  reason: 'The database could not be created, the file already exists.'
});

var MISSING_STUB = new PouchError({
  status: 412,
  error: 'missing_stub'
});

var INVALID_URL = new PouchError({
  status: 413,
  error: 'invalid_url',
  reason: 'Provided URL is invalid'
});

function createError(error, reason) {
  function CustomPouchError(reason) {
    // inherit error properties from our parent error manually
    // so as to allow proper JSON parsing.
    /* jshint ignore:start */
    for (var p in error) {
      if (typeof error[p] !== 'function') {
        this[p] = error[p];
      }
    }
    /* jshint ignore:end */
    if (reason !== undefined) {
      this.reason = reason;
    }
  }
  CustomPouchError.prototype = PouchError.prototype;
  return new CustomPouchError(reason);
}

function tryFilter(filter, doc, req) {
  try {
    return !filter(doc, req);
  } catch (err) {
    var msg = 'Filter function threw: ' + err.toString();
    return createError(BAD_REQUEST, msg);
  }
}

function filterChange(opts) {
  var req = {};
  var hasFilter = opts.filter && typeof opts.filter === 'function';
  req.query = opts.query_params;

  return function filter(change) {
    if (!change.doc) {
      // CSG sends events on the changes feed that don't have documents,
      // this hack makes a whole lot of existing code robust.
      change.doc = {};
    }

    var filterReturn = hasFilter && tryFilter(opts.filter, change.doc, req);

    if (typeof filterReturn === 'object') {
      return filterReturn;
    }

    if (filterReturn) {
      return false;
    }

    if (!opts.include_docs) {
      delete change.doc;
    } else if (!opts.attachments) {
      for (var att in change.doc._attachments) {
        /* istanbul ignore else */
        if (change.doc._attachments.hasOwnProperty(att)) {
          change.doc._attachments[att].stub = true;
        }
      }
    }
    return true;
  };
}

function flatten(arrs) {
  var res = [];
  for (var i = 0, len = arrs.length; i < len; i++) {
    res = res.concat(arrs[i]);
  }
  return res;
}

// shim for Function.prototype.name,
// for browsers that don't support it like IE

/* istanbul ignore next */
function f() {}

var hasName = f.name;
var res;

// We dont run coverage in IE
/* istanbul ignore else */
if (hasName) {
  res = function (fun) {
    return fun.name;
  };
} else {
  res = function (fun) {
    return fun.toString().match(/^\s*function\s*(\S*)\s*\(/)[1];
  };
}

function parseDesignDocFunctionName(s) {
  if (!s) {
    return null;
  }
  var parts = s.split('/');
  if (parts.length === 2) {
    return parts;
  }
  if (parts.length === 1) {
    return [s, s];
  }
  return null;
}

// originally parseUri 1.2.2, now patched by us
// (c) Steven Levithan <stevenlevithan.com>
// MIT License
var keys = ["source", "protocol", "authority", "userInfo", "user", "password",
    "host", "port", "relative", "path", "directory", "file", "query", "anchor"];
var qName ="queryKey";
var qParser = /(?:^|&)([^&=]*)=?([^&]*)/g;

// use the "loose" parser
/* jshint maxlen: false */
var parser = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

// this is essentially the "update sugar" function from daleharvey/pouchdb#1388
// the diffFun tells us what delta to apply to the doc.  it either returns
// the doc, or false if it doesn't need to do an update after all
function upsert(db, docId, diffFun) {
  return new PouchPromise$1(function (fulfill, reject) {
    db.get(docId, function (err, doc) {
      if (err) {
        /* istanbul ignore next */
        if (err.status !== 404) {
          return reject(err);
        }
        doc = {};
      }

      // the user might change the _rev, so save it for posterity
      var docRev = doc._rev;
      var newDoc = diffFun(doc);

      if (!newDoc) {
        // if the diffFun returns falsy, we short-circuit as
        // an optimization
        return fulfill({updated: false, rev: docRev});
      }

      // users aren't allowed to modify these values,
      // so reset them here
      newDoc._id = docId;
      newDoc._rev = docRev;
      fulfill(tryAndPut(db, newDoc, diffFun));
    });
  });
}

function tryAndPut(db, doc, diffFun) {
  return db.put(doc).then(function (res) {
    return {
      updated: true,
      rev: res.rev
    };
  }, function (err) {
    /* istanbul ignore next */
    if (err.status !== 409) {
      throw err;
    }
    return upsert(db, doc._id, diffFun);
  });
}

// BEGIN Math.uuid.js

/*!
Math.uuid.js (v1.4)
http://www.broofa.com
mailto:robert@broofa.com

Copyright (c) 2010 Robert Kieffer
Dual licensed under the MIT and GPL licenses.
*/

/*
 * Generate a random uuid.
 *
 * USAGE: Math.uuid(length, radix)
 *   length - the desired number of characters
 *   radix  - the number of allowable values for each character.
 *
 * EXAMPLES:
 *   // No arguments  - returns RFC4122, version 4 ID
 *   >>> Math.uuid()
 *   "92329D39-6F5C-4520-ABFC-AAB64544E172"
 *
 *   // One argument - returns ID of the specified length
 *   >>> Math.uuid(15)     // 15 character ID (default base=62)
 *   "VcydxgltxrVZSTV"
 *
 *   // Two arguments - returns ID of the specified length, and radix. 
 *   // (Radix must be <= 62)
 *   >>> Math.uuid(8, 2)  // 8 character ID (base=2)
 *   "01001010"
 *   >>> Math.uuid(8, 10) // 8 character ID (base=10)
 *   "47473046"
 *   >>> Math.uuid(8, 16) // 8 character ID (base=16)
 *   "098F4D35"
 */
var chars = (
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
  'abcdefghijklmnopqrstuvwxyz'
).split('');
function getValue(radix) {
  return 0 | Math.random() * radix;
}
function uuid(len, radix) {
  radix = radix || chars.length;
  var out = '';
  var i = -1;

  if (len) {
    // Compact form
    while (++i < len) {
      out += chars[getValue(radix)];
    }
    return out;
  }
    // rfc4122, version 4 form
    // Fill in random data.  At i==19 set the high bits of clock sequence as
    // per rfc4122, sec. 4.1.5
  while (++i < 36) {
    switch (i) {
      case 8:
      case 13:
      case 18:
      case 23:
        out += '-';
        break;
      case 19:
        out += chars[(getValue(16) & 0x3) | 0x8];
        break;
      default:
        out += chars[getValue(16)];
    }
  }

  return out;
}

var Mutation$1 = commonjsGlobal.MutationObserver || commonjsGlobal.WebKitMutationObserver;

var scheduleDrain$1;

{
  if (Mutation$1) {
    var called$1 = 0;
    var observer$1 = new Mutation$1(nextTick$1);
    var element$1 = commonjsGlobal.document.createTextNode('');
    observer$1.observe(element$1, {
      characterData: true
    });
    scheduleDrain$1 = function () {
      element$1.data = (called$1 = ++called$1 % 2);
    };
  } else if (!commonjsGlobal.setImmediate && typeof commonjsGlobal.MessageChannel !== 'undefined') {
    var channel$1 = new commonjsGlobal.MessageChannel();
    channel$1.port1.onmessage = nextTick$1;
    scheduleDrain$1 = function () {
      channel$1.port2.postMessage(0);
    };
  } else if ('document' in commonjsGlobal && 'onreadystatechange' in commonjsGlobal.document.createElement('script')) {
    scheduleDrain$1 = function () {

      // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
      // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
      var scriptEl = commonjsGlobal.document.createElement('script');
      scriptEl.onreadystatechange = function () {
        nextTick$1();

        scriptEl.onreadystatechange = null;
        scriptEl.parentNode.removeChild(scriptEl);
        scriptEl = null;
      };
      commonjsGlobal.document.documentElement.appendChild(scriptEl);
    };
  } else {
    scheduleDrain$1 = function () {
      setTimeout(nextTick$1, 0);
    };
  }
}

var draining$1;
var queue$1 = [];
//named nextTick for less confusing stack traces
function nextTick$1() {
  draining$1 = true;
  var i, oldQueue;
  var len = queue$1.length;
  while (len) {
    oldQueue = queue$1;
    queue$1 = [];
    i = -1;
    while (++i < len) {
      oldQueue[i]();
    }
    len = queue$1.length;
  }
  draining$1 = false;
}

var browser$6 = immediate$3;
function immediate$3(task) {
  if (queue$1.push(task) === 1 && !draining$1) {
    scheduleDrain$1();
  }
}

var immediate$2 = browser$6;

/* istanbul ignore next */
function INTERNAL$1() {}

var handlers$1 = {};

var REJECTED$1 = ['REJECTED'];
var FULFILLED$1 = ['FULFILLED'];
var PENDING$1 = ['PENDING'];

var browser$5 = Promise$4;

function Promise$4(resolver) {
  if (typeof resolver !== 'function') {
    throw new TypeError('resolver must be a function');
  }
  this.state = PENDING$1;
  this.queue = [];
  this.outcome = void 0;
  if (resolver !== INTERNAL$1) {
    safelyResolveThenable$1(this, resolver);
  }
}

Promise$4.prototype["catch"] = function (onRejected) {
  return this.then(null, onRejected);
};
Promise$4.prototype.then = function (onFulfilled, onRejected) {
  if (typeof onFulfilled !== 'function' && this.state === FULFILLED$1 ||
    typeof onRejected !== 'function' && this.state === REJECTED$1) {
    return this;
  }
  var promise = new this.constructor(INTERNAL$1);
  if (this.state !== PENDING$1) {
    var resolver = this.state === FULFILLED$1 ? onFulfilled : onRejected;
    unwrap$1(promise, resolver, this.outcome);
  } else {
    this.queue.push(new QueueItem$1(promise, onFulfilled, onRejected));
  }

  return promise;
};
function QueueItem$1(promise, onFulfilled, onRejected) {
  this.promise = promise;
  if (typeof onFulfilled === 'function') {
    this.onFulfilled = onFulfilled;
    this.callFulfilled = this.otherCallFulfilled;
  }
  if (typeof onRejected === 'function') {
    this.onRejected = onRejected;
    this.callRejected = this.otherCallRejected;
  }
}
QueueItem$1.prototype.callFulfilled = function (value) {
  handlers$1.resolve(this.promise, value);
};
QueueItem$1.prototype.otherCallFulfilled = function (value) {
  unwrap$1(this.promise, this.onFulfilled, value);
};
QueueItem$1.prototype.callRejected = function (value) {
  handlers$1.reject(this.promise, value);
};
QueueItem$1.prototype.otherCallRejected = function (value) {
  unwrap$1(this.promise, this.onRejected, value);
};

function unwrap$1(promise, func, value) {
  immediate$2(function () {
    var returnValue;
    try {
      returnValue = func(value);
    } catch (e) {
      return handlers$1.reject(promise, e);
    }
    if (returnValue === promise) {
      handlers$1.reject(promise, new TypeError('Cannot resolve promise with itself'));
    } else {
      handlers$1.resolve(promise, returnValue);
    }
  });
}

handlers$1.resolve = function (self, value) {
  var result = tryCatch$1(getThen$1, value);
  if (result.status === 'error') {
    return handlers$1.reject(self, result.value);
  }
  var thenable = result.value;

  if (thenable) {
    safelyResolveThenable$1(self, thenable);
  } else {
    self.state = FULFILLED$1;
    self.outcome = value;
    var i = -1;
    var len = self.queue.length;
    while (++i < len) {
      self.queue[i].callFulfilled(value);
    }
  }
  return self;
};
handlers$1.reject = function (self, error) {
  self.state = REJECTED$1;
  self.outcome = error;
  var i = -1;
  var len = self.queue.length;
  while (++i < len) {
    self.queue[i].callRejected(error);
  }
  return self;
};

function getThen$1(obj) {
  // Make sure we only access the accessor once as required by the spec
  var then = obj && obj.then;
  if (obj && typeof obj === 'object' && typeof then === 'function') {
    return function appyThen() {
      then.apply(obj, arguments);
    };
  }
}

function safelyResolveThenable$1(self, thenable) {
  // Either fulfill, reject or reject with error
  var called = false;
  function onError(value) {
    if (called) {
      return;
    }
    called = true;
    handlers$1.reject(self, value);
  }

  function onSuccess(value) {
    if (called) {
      return;
    }
    called = true;
    handlers$1.resolve(self, value);
  }

  function tryToUnwrap() {
    thenable(onSuccess, onError);
  }

  var result = tryCatch$1(tryToUnwrap);
  if (result.status === 'error') {
    onError(result.value);
  }
}

function tryCatch$1(func, value) {
  var out = {};
  try {
    out.value = func(value);
    out.status = 'success';
  } catch (e) {
    out.status = 'error';
    out.value = e;
  }
  return out;
}

Promise$4.resolve = resolve$1;
function resolve$1(value) {
  if (value instanceof this) {
    return value;
  }
  return handlers$1.resolve(new this(INTERNAL$1), value);
}

Promise$4.reject = reject$1;
function reject$1(reason) {
  var promise = new this(INTERNAL$1);
  return handlers$1.reject(promise, reason);
}

Promise$4.all = all$1;
function all$1(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var values = new Array(len);
  var resolved = 0;
  var i = -1;
  var promise = new this(INTERNAL$1);

  while (++i < len) {
    allResolver(iterable[i], i);
  }
  return promise;
  function allResolver(value, i) {
    self.resolve(value).then(resolveFromAll, function (error) {
      if (!called) {
        called = true;
        handlers$1.reject(promise, error);
      }
    });
    function resolveFromAll(outValue) {
      values[i] = outValue;
      if (++resolved === len && !called) {
        called = true;
        handlers$1.resolve(promise, values);
      }
    }
  }
}

Promise$4.race = race$1;
function race$1(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var i = -1;
  var promise = new this(INTERNAL$1);

  while (++i < len) {
    resolver(iterable[i]);
  }
  return promise;
  function resolver(value) {
    self.resolve(value).then(function (response) {
      if (!called) {
        called = true;
        handlers$1.resolve(promise, response);
      }
    }, function (error) {
      if (!called) {
        called = true;
        handlers$1.reject(promise, error);
      }
    });
  }
}

/* istanbul ignore next */
var PouchPromise$2 = typeof Promise === 'function' ? Promise : browser$5;

function isGenOne(rev) {
    return /^1-/.test(rev);
}
function fileHasChanged(localDoc, remoteDoc, filename) {
    return !localDoc._attachments ||
        !localDoc._attachments[filename] ||
        localDoc._attachments[filename].digest !== remoteDoc._attachments[filename].digest;
}
function getDocAttachments(db, doc) {
    var filenames = Object.keys(doc._attachments);
    return PouchPromise$2.all(filenames.map(function (filename) {
        return db.getAttachment(doc._id, filename, { rev: doc._rev });
    }));
}
function getDocAttachmentsFromTargetOrSource(target, src, doc) {
    var doCheckForLocalAttachments = src.type() === 'http' && target.type() !== 'http';
    var filenames = Object.keys(doc._attachments);
    if (!doCheckForLocalAttachments) {
        return getDocAttachments(src, doc);
    }
    return target.get(doc._id).then(function (localDoc) {
        return PouchPromise$2.all(filenames.map(function (filename) {
            if (fileHasChanged(localDoc, doc, filename)) {
                return src.getAttachment(doc._id, filename);
            }
            return target.getAttachment(localDoc._id, filename);
        }));
    }).catch(function (error) {
        /* istanbul ignore if */
        if (error.status !== 404) {
            throw error;
        }
        return getDocAttachments(src, doc);
    });
}
function createBulkGetOpts(diffs) {
    var requests = [];
    Object.keys(diffs).forEach(function (id) {
        var missingRevs = diffs[id].missing;
        missingRevs.forEach(function (missingRev) {
            requests.push({
                id: id,
                rev: missingRev
            });
        });
    });
    return {
        docs: requests,
        revs: true
    };
}
//
// Fetch all the documents from the src as described in the "diffs",
// which is a mapping of docs IDs to revisions. If the state ever
// changes to "cancelled", then the returned promise will be rejected.
// Else it will be resolved with a list of fetched documents.
//
function getDocs(src, target, diffs, state) {
    diffs = clone(diffs); // we do not need to modify this
    var resultDocs = [], ok = true;
    function getAllDocs() {
        var bulkGetOpts = createBulkGetOpts(diffs);
        if (!bulkGetOpts.docs.length) {
            return;
        }
        return src.bulkGet(bulkGetOpts).then(function (bulkGetResponse) {
            /* istanbul ignore if */
            if (state.cancelled) {
                throw new Error('cancelled');
            }
            return PouchPromise$2.all(bulkGetResponse.results.map(function (bulkGetInfo) {
                return PouchPromise$2.all(bulkGetInfo.docs.map(function (doc) {
                    var remoteDoc = doc.ok;
                    if (doc.error) {
                        // when AUTO_COMPACTION is set, docs can be returned which look
                        // like this: {"missing":"1-7c3ac256b693c462af8442f992b83696"}
                        ok = false;
                    }
                    if (!remoteDoc || !remoteDoc._attachments) {
                        return remoteDoc;
                    }
                    return getDocAttachmentsFromTargetOrSource(target, src, remoteDoc).then(function (attachments) {
                        var filenames = Object.keys(remoteDoc._attachments);
                        attachments.forEach(function (attachment, i) {
                            var att = remoteDoc._attachments[filenames[i]];
                            delete att.stub;
                            delete att.length;
                            att.data = attachment;
                        });
                        return remoteDoc;
                    });
                }));
            }))
                .then(function (results) {
                resultDocs = resultDocs.concat(flatten(results).filter(Boolean));
            });
        });
    }
    function hasAttachments(doc) {
        return doc._attachments && Object.keys(doc._attachments).length > 0;
    }
    function hasConflicts(doc) {
        return doc._conflicts && doc._conflicts.length > 0;
    }
    function fetchRevisionOneDocs(ids) {
        // Optimization: fetch gen-1 docs and attachments in
        // a single request using _all_docs
        return src.allDocs({
            keys: ids,
            include_docs: true,
            conflicts: true
        }).then(function (res) {
            if (state.cancelled) {
                throw new Error('cancelled');
            }
            res.rows.forEach(function (row) {
                if (row.deleted || !row.doc || !isGenOne(row.value.rev) ||
                    hasAttachments(row.doc) || hasConflicts(row.doc)) {
                    // if any of these conditions apply, we need to fetch using get()
                    return;
                }
                // strip _conflicts array to appease CSG (#5793)
                /* istanbul ignore if */
                if (row.doc._conflicts) {
                    delete row.doc._conflicts;
                }
                // the doc we got back from allDocs() is sufficient
                resultDocs.push(row.doc);
                delete diffs[row.id];
            });
        });
    }
    function getRevisionOneDocs() {
        // filter out the generation 1 docs and get them
        // leaving the non-generation one docs to be got otherwise
        var ids = Object.keys(diffs).filter(function (id) {
            var missing = diffs[id].missing;
            return missing.length === 1 && isGenOne(missing[0]);
        });
        if (ids.length > 0) {
            return fetchRevisionOneDocs(ids);
        }
    }
    function returnResult() {
        return { ok: ok, docs: resultDocs };
    }
    return PouchPromise$2.resolve()
        .then(getRevisionOneDocs)
        .then(getAllDocs)
        .then(returnResult);
}

var REPLICATOR = 'pouchdb-thrifty';
var LOWEST_SEQ = 0;
function getLocalDB(db1, db2) {
    var local = [db1, db2].filter(function (db) {
        return db.type() !== 'http';
    });
    if (local.length != 1) {
        throw 'exactly one remote and one local database is required';
    }
    return local[0];
}
function Checkpointer(src, target, id, returnValue) {
    this.db = getLocalDB(src, target);
    this.id = id;
    this.returnValue = returnValue;
}
function updateCheckpoint(db, id, checkpoint, session, returnValue) {
    return db.get(id).catch(function (err) {
        if (err.status === 404) {
            return {
                session_id: session,
                _id: id,
                replicator: REPLICATOR
            };
        }
        throw err;
    }).then(function (doc) {
        if (returnValue.cancelled) {
            return;
        }
        // if the checkpoint has not changed, do not update
        if (doc.last_seq === checkpoint) {
            return;
        }
        doc.replicator = REPLICATOR;
        doc.session_id = session;
        doc.last_seq = checkpoint;
        return db.put(doc).catch(function (err) {
            if (err.status === 409) {
                // retry; someone is trying to write a checkpoint simultaneously
                return updateCheckpoint(db, id, checkpoint, session, returnValue);
            }
            throw err;
        });
    });
}
Checkpointer.prototype.writeCheckpoint = function (checkpoint, session) {
    return updateCheckpoint(this.db, this.id, checkpoint, session, this.returnValue);
};
Checkpointer.prototype.getCheckpoint = function () {
    var self = this;
    return self.db.get(self.id).then(function (doc) {
        return doc.last_seq;
    }).catch(function (err) {
        if (err.status === 404) {
            return self.db.put({
                _id: self.id,
                last_seq: LOWEST_SEQ
            }).then(function () {
                return LOWEST_SEQ;
            });
        }
        else {
            throw err;
        }
    }).then(function (result) {
        return result;
    });
};

var STARTING_BACK_OFF = 0;
function backOff(opts, returnValue, error, callback) {
    if (opts.retry === false) {
        returnValue.emit('error', error);
        returnValue.removeAllListeners();
        return;
    }
    if (typeof opts.back_off_function !== 'function') {
        opts.back_off_function = defaultBackOff;
    }
    returnValue.emit('requestError', error);
    if (returnValue.state === 'active' || returnValue.state === 'pending') {
        returnValue.emit('paused', error);
        returnValue.state = 'stopped';
        var backOffSet = function backoffTimeSet() {
            opts.current_back_off = STARTING_BACK_OFF;
        };
        var removeBackOffSetter = function removeBackOffTimeSet() {
            returnValue.removeListener('active', backOffSet);
        };
        returnValue.once('paused', removeBackOffSetter);
        returnValue.once('active', backOffSet);
    }
    opts.current_back_off = opts.current_back_off || STARTING_BACK_OFF;
    opts.current_back_off = opts.back_off_function(opts.current_back_off);
    setTimeout(callback, opts.current_back_off);
}

var thisAtob = function (str) {
  return atob(str);
};

var thisBtoa = function (str) {
  return btoa(str);
};

// Abstracts constructing a Blob object, so it also works in older
// browsers that don't support the native Blob constructor (e.g.
// old QtWebKit versions, Android < 4.4).
function createBlob(parts, properties) {
  /* global BlobBuilder,MSBlobBuilder,MozBlobBuilder,WebKitBlobBuilder */
  parts = parts || [];
  properties = properties || {};
  try {
    return new Blob(parts, properties);
  } catch (e) {
    if (e.name !== "TypeError") {
      throw e;
    }
    var Builder = typeof BlobBuilder !== 'undefined' ? BlobBuilder :
                  typeof MSBlobBuilder !== 'undefined' ? MSBlobBuilder :
                  typeof MozBlobBuilder !== 'undefined' ? MozBlobBuilder :
                  WebKitBlobBuilder;
    var builder = new Builder();
    for (var i = 0; i < parts.length; i += 1) {
      builder.append(parts[i]);
    }
    return builder.getBlob(properties.type);
  }
}

// From http://stackoverflow.com/questions/14967647/ (continues on next line)
// encode-decode-image-with-base64-breaks-image (2013-04-21)
function binaryStringToArrayBuffer(bin) {
  var length = bin.length;
  var buf = new ArrayBuffer(length);
  var arr = new Uint8Array(buf);
  for (var i = 0; i < length; i++) {
    arr[i] = bin.charCodeAt(i);
  }
  return buf;
}

function binStringToBluffer(binString, type) {
  return createBlob([binaryStringToArrayBuffer(binString)], {type: type});
}

//Can't find original post, but this is close
//http://stackoverflow.com/questions/6965107/ (continues on next line)
//converting-between-strings-and-arraybuffers
function arrayBufferToBinaryString(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  var length = bytes.byteLength;
  for (var i = 0; i < length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

// shim for browsers that don't support it
function readAsBinaryString(blob, callback) {
  if (typeof FileReader === 'undefined') {
    // fix for Firefox in a web worker
    // https://bugzilla.mozilla.org/show_bug.cgi?id=901097
    return callback(arrayBufferToBinaryString(
      new FileReaderSync().readAsArrayBuffer(blob)));
  }

  var reader = new FileReader();
  var hasBinaryString = typeof reader.readAsBinaryString === 'function';
  reader.onloadend = function (e) {
    var result = e.target.result || '';
    if (hasBinaryString) {
      return callback(result);
    }
    callback(arrayBufferToBinaryString(result));
  };
  if (hasBinaryString) {
    reader.readAsBinaryString(blob);
  } else {
    reader.readAsArrayBuffer(blob);
  }
}

function blobToBinaryString$1(blobOrBuffer, callback) {
  readAsBinaryString(blobOrBuffer, function (bin) {
    callback(bin);
  });
}

// simplified API. universal browser support is assumed
function readAsArrayBuffer(blob, callback) {
  if (typeof FileReader === 'undefined') {
    // fix for Firefox in a web worker:
    // https://bugzilla.mozilla.org/show_bug.cgi?id=901097
    return callback(new FileReaderSync().readAsArrayBuffer(blob));
  }

  var reader = new FileReader();
  reader.onloadend = function (e) {
    var result = e.target.result || new ArrayBuffer(0);
    callback(result);
  };
  reader.readAsArrayBuffer(blob);
}

// this is not used in the browser

var sparkMd5 = createCommonjsModule(function (module, exports) {
(function (factory) {
    if (typeof exports === 'object') {
        // Node/CommonJS
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(factory);
    } else {
        // Browser globals (with support for web workers)
        var glob;

        try {
            glob = window;
        } catch (e) {
            glob = self;
        }

        glob.SparkMD5 = factory();
    }
}(function (undefined) {

    'use strict';

    /*
     * Fastest md5 implementation around (JKM md5).
     * Credits: Joseph Myers
     *
     * @see http://www.myersdaily.org/joseph/javascript/md5-text.html
     * @see http://jsperf.com/md5-shootout/7
     */

    /* this function is much faster,
      so if possible we use it. Some IEs
      are the only ones I know of that
      need the idiotic second function,
      generated by an if clause.  */
    var add32 = function (a, b) {
        return (a + b) & 0xFFFFFFFF;
    },
        hex_chr = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];


    function cmn(q, a, b, x, s, t) {
        a = add32(add32(a, q), add32(x, t));
        return add32((a << s) | (a >>> (32 - s)), b);
    }

    function ff(a, b, c, d, x, s, t) {
        return cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }

    function gg(a, b, c, d, x, s, t) {
        return cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }

    function hh(a, b, c, d, x, s, t) {
        return cmn(b ^ c ^ d, a, b, x, s, t);
    }

    function ii(a, b, c, d, x, s, t) {
        return cmn(c ^ (b | (~d)), a, b, x, s, t);
    }

    function md5cycle(x, k) {
        var a = x[0],
            b = x[1],
            c = x[2],
            d = x[3];

        a = ff(a, b, c, d, k[0], 7, -680876936);
        d = ff(d, a, b, c, k[1], 12, -389564586);
        c = ff(c, d, a, b, k[2], 17, 606105819);
        b = ff(b, c, d, a, k[3], 22, -1044525330);
        a = ff(a, b, c, d, k[4], 7, -176418897);
        d = ff(d, a, b, c, k[5], 12, 1200080426);
        c = ff(c, d, a, b, k[6], 17, -1473231341);
        b = ff(b, c, d, a, k[7], 22, -45705983);
        a = ff(a, b, c, d, k[8], 7, 1770035416);
        d = ff(d, a, b, c, k[9], 12, -1958414417);
        c = ff(c, d, a, b, k[10], 17, -42063);
        b = ff(b, c, d, a, k[11], 22, -1990404162);
        a = ff(a, b, c, d, k[12], 7, 1804603682);
        d = ff(d, a, b, c, k[13], 12, -40341101);
        c = ff(c, d, a, b, k[14], 17, -1502002290);
        b = ff(b, c, d, a, k[15], 22, 1236535329);

        a = gg(a, b, c, d, k[1], 5, -165796510);
        d = gg(d, a, b, c, k[6], 9, -1069501632);
        c = gg(c, d, a, b, k[11], 14, 643717713);
        b = gg(b, c, d, a, k[0], 20, -373897302);
        a = gg(a, b, c, d, k[5], 5, -701558691);
        d = gg(d, a, b, c, k[10], 9, 38016083);
        c = gg(c, d, a, b, k[15], 14, -660478335);
        b = gg(b, c, d, a, k[4], 20, -405537848);
        a = gg(a, b, c, d, k[9], 5, 568446438);
        d = gg(d, a, b, c, k[14], 9, -1019803690);
        c = gg(c, d, a, b, k[3], 14, -187363961);
        b = gg(b, c, d, a, k[8], 20, 1163531501);
        a = gg(a, b, c, d, k[13], 5, -1444681467);
        d = gg(d, a, b, c, k[2], 9, -51403784);
        c = gg(c, d, a, b, k[7], 14, 1735328473);
        b = gg(b, c, d, a, k[12], 20, -1926607734);

        a = hh(a, b, c, d, k[5], 4, -378558);
        d = hh(d, a, b, c, k[8], 11, -2022574463);
        c = hh(c, d, a, b, k[11], 16, 1839030562);
        b = hh(b, c, d, a, k[14], 23, -35309556);
        a = hh(a, b, c, d, k[1], 4, -1530992060);
        d = hh(d, a, b, c, k[4], 11, 1272893353);
        c = hh(c, d, a, b, k[7], 16, -155497632);
        b = hh(b, c, d, a, k[10], 23, -1094730640);
        a = hh(a, b, c, d, k[13], 4, 681279174);
        d = hh(d, a, b, c, k[0], 11, -358537222);
        c = hh(c, d, a, b, k[3], 16, -722521979);
        b = hh(b, c, d, a, k[6], 23, 76029189);
        a = hh(a, b, c, d, k[9], 4, -640364487);
        d = hh(d, a, b, c, k[12], 11, -421815835);
        c = hh(c, d, a, b, k[15], 16, 530742520);
        b = hh(b, c, d, a, k[2], 23, -995338651);

        a = ii(a, b, c, d, k[0], 6, -198630844);
        d = ii(d, a, b, c, k[7], 10, 1126891415);
        c = ii(c, d, a, b, k[14], 15, -1416354905);
        b = ii(b, c, d, a, k[5], 21, -57434055);
        a = ii(a, b, c, d, k[12], 6, 1700485571);
        d = ii(d, a, b, c, k[3], 10, -1894986606);
        c = ii(c, d, a, b, k[10], 15, -1051523);
        b = ii(b, c, d, a, k[1], 21, -2054922799);
        a = ii(a, b, c, d, k[8], 6, 1873313359);
        d = ii(d, a, b, c, k[15], 10, -30611744);
        c = ii(c, d, a, b, k[6], 15, -1560198380);
        b = ii(b, c, d, a, k[13], 21, 1309151649);
        a = ii(a, b, c, d, k[4], 6, -145523070);
        d = ii(d, a, b, c, k[11], 10, -1120210379);
        c = ii(c, d, a, b, k[2], 15, 718787259);
        b = ii(b, c, d, a, k[9], 21, -343485551);

        x[0] = add32(a, x[0]);
        x[1] = add32(b, x[1]);
        x[2] = add32(c, x[2]);
        x[3] = add32(d, x[3]);
    }

    function md5blk(s) {
        var md5blks = [],
            i; /* Andy King said do it this way. */

        for (i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = s.charCodeAt(i) + (s.charCodeAt(i + 1) << 8) + (s.charCodeAt(i + 2) << 16) + (s.charCodeAt(i + 3) << 24);
        }
        return md5blks;
    }

    function md5blk_array(a) {
        var md5blks = [],
            i; /* Andy King said do it this way. */

        for (i = 0; i < 64; i += 4) {
            md5blks[i >> 2] = a[i] + (a[i + 1] << 8) + (a[i + 2] << 16) + (a[i + 3] << 24);
        }
        return md5blks;
    }

    function md51(s) {
        var n = s.length,
            state = [1732584193, -271733879, -1732584194, 271733878],
            i,
            length,
            tail,
            tmp,
            lo,
            hi;

        for (i = 64; i <= n; i += 64) {
            md5cycle(state, md5blk(s.substring(i - 64, i)));
        }
        s = s.substring(i - 64);
        length = s.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= s.charCodeAt(i) << ((i % 4) << 3);
        }
        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Beware that the final length might not fit in 32 bits so we take care of that
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;

        md5cycle(state, tail);
        return state;
    }

    function md51_array(a) {
        var n = a.length,
            state = [1732584193, -271733879, -1732584194, 271733878],
            i,
            length,
            tail,
            tmp,
            lo,
            hi;

        for (i = 64; i <= n; i += 64) {
            md5cycle(state, md5blk_array(a.subarray(i - 64, i)));
        }

        // Not sure if it is a bug, however IE10 will always produce a sub array of length 1
        // containing the last element of the parent array if the sub array specified starts
        // beyond the length of the parent array - weird.
        // https://connect.microsoft.com/IE/feedback/details/771452/typed-array-subarray-issue
        a = (i - 64) < n ? a.subarray(i - 64) : new Uint8Array(0);

        length = a.length;
        tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= a[i] << ((i % 4) << 3);
        }

        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(state, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Beware that the final length might not fit in 32 bits so we take care of that
        tmp = n * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;

        md5cycle(state, tail);

        return state;
    }

    function rhex(n) {
        var s = '',
            j;
        for (j = 0; j < 4; j += 1) {
            s += hex_chr[(n >> (j * 8 + 4)) & 0x0F] + hex_chr[(n >> (j * 8)) & 0x0F];
        }
        return s;
    }

    function hex(x) {
        var i;
        for (i = 0; i < x.length; i += 1) {
            x[i] = rhex(x[i]);
        }
        return x.join('');
    }

    // In some cases the fast add32 function cannot be used..
    if (hex(md51('hello')) !== '5d41402abc4b2a76b9719d911017c592') {
        add32 = function (x, y) {
            var lsw = (x & 0xFFFF) + (y & 0xFFFF),
                msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xFFFF);
        };
    }

    // ---------------------------------------------------

    /**
     * ArrayBuffer slice polyfill.
     *
     * @see https://github.com/ttaubert/node-arraybuffer-slice
     */

    if (typeof ArrayBuffer !== 'undefined' && !ArrayBuffer.prototype.slice) {
        (function () {
            function clamp(val, length) {
                val = (val | 0) || 0;

                if (val < 0) {
                    return Math.max(val + length, 0);
                }

                return Math.min(val, length);
            }

            ArrayBuffer.prototype.slice = function (from, to) {
                var length = this.byteLength,
                    begin = clamp(from, length),
                    end = length,
                    num,
                    target,
                    targetArray,
                    sourceArray;

                if (to !== undefined) {
                    end = clamp(to, length);
                }

                if (begin > end) {
                    return new ArrayBuffer(0);
                }

                num = end - begin;
                target = new ArrayBuffer(num);
                targetArray = new Uint8Array(target);

                sourceArray = new Uint8Array(this, begin, num);
                targetArray.set(sourceArray);

                return target;
            };
        })();
    }

    // ---------------------------------------------------

    /**
     * Helpers.
     */

    function toUtf8(str) {
        if (/[\u0080-\uFFFF]/.test(str)) {
            str = unescape(encodeURIComponent(str));
        }

        return str;
    }

    function utf8Str2ArrayBuffer(str, returnUInt8Array) {
        var length = str.length,
           buff = new ArrayBuffer(length),
           arr = new Uint8Array(buff),
           i;

        for (i = 0; i < length; i += 1) {
            arr[i] = str.charCodeAt(i);
        }

        return returnUInt8Array ? arr : buff;
    }

    function arrayBuffer2Utf8Str(buff) {
        return String.fromCharCode.apply(null, new Uint8Array(buff));
    }

    function concatenateArrayBuffers(first, second, returnUInt8Array) {
        var result = new Uint8Array(first.byteLength + second.byteLength);

        result.set(new Uint8Array(first));
        result.set(new Uint8Array(second), first.byteLength);

        return returnUInt8Array ? result : result.buffer;
    }

    function hexToBinaryString(hex) {
        var bytes = [],
            length = hex.length,
            x;

        for (x = 0; x < length - 1; x += 2) {
            bytes.push(parseInt(hex.substr(x, 2), 16));
        }

        return String.fromCharCode.apply(String, bytes);
    }

    // ---------------------------------------------------

    /**
     * SparkMD5 OOP implementation.
     *
     * Use this class to perform an incremental md5, otherwise use the
     * static methods instead.
     */

    function SparkMD5() {
        // call reset to init the instance
        this.reset();
    }

    /**
     * Appends a string.
     * A conversion will be applied if an utf8 string is detected.
     *
     * @param {String} str The string to be appended
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.append = function (str) {
        // Converts the string to utf8 bytes if necessary
        // Then append as binary
        this.appendBinary(toUtf8(str));

        return this;
    };

    /**
     * Appends a binary string.
     *
     * @param {String} contents The binary string to be appended
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.appendBinary = function (contents) {
        this._buff += contents;
        this._length += contents.length;

        var length = this._buff.length,
            i;

        for (i = 64; i <= length; i += 64) {
            md5cycle(this._hash, md5blk(this._buff.substring(i - 64, i)));
        }

        this._buff = this._buff.substring(i - 64);

        return this;
    };

    /**
     * Finishes the incremental computation, reseting the internal state and
     * returning the result.
     *
     * @param {Boolean} raw True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.prototype.end = function (raw) {
        var buff = this._buff,
            length = buff.length,
            i,
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ret;

        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= buff.charCodeAt(i) << ((i % 4) << 3);
        }

        this._finish(tail, length);
        ret = hex(this._hash);

        if (raw) {
            ret = hexToBinaryString(ret);
        }

        this.reset();

        return ret;
    };

    /**
     * Resets the internal state of the computation.
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.reset = function () {
        this._buff = '';
        this._length = 0;
        this._hash = [1732584193, -271733879, -1732584194, 271733878];

        return this;
    };

    /**
     * Gets the internal state of the computation.
     *
     * @return {Object} The state
     */
    SparkMD5.prototype.getState = function () {
        return {
            buff: this._buff,
            length: this._length,
            hash: this._hash
        };
    };

    /**
     * Gets the internal state of the computation.
     *
     * @param {Object} state The state
     *
     * @return {SparkMD5} The instance itself
     */
    SparkMD5.prototype.setState = function (state) {
        this._buff = state.buff;
        this._length = state.length;
        this._hash = state.hash;

        return this;
    };

    /**
     * Releases memory used by the incremental buffer and other additional
     * resources. If you plan to use the instance again, use reset instead.
     */
    SparkMD5.prototype.destroy = function () {
        delete this._hash;
        delete this._buff;
        delete this._length;
    };

    /**
     * Finish the final calculation based on the tail.
     *
     * @param {Array}  tail   The tail (will be modified)
     * @param {Number} length The length of the remaining buffer
     */
    SparkMD5.prototype._finish = function (tail, length) {
        var i = length,
            tmp,
            lo,
            hi;

        tail[i >> 2] |= 0x80 << ((i % 4) << 3);
        if (i > 55) {
            md5cycle(this._hash, tail);
            for (i = 0; i < 16; i += 1) {
                tail[i] = 0;
            }
        }

        // Do the final computation based on the tail and length
        // Beware that the final length may not fit in 32 bits so we take care of that
        tmp = this._length * 8;
        tmp = tmp.toString(16).match(/(.*?)(.{0,8})$/);
        lo = parseInt(tmp[2], 16);
        hi = parseInt(tmp[1], 16) || 0;

        tail[14] = lo;
        tail[15] = hi;
        md5cycle(this._hash, tail);
    };

    /**
     * Performs the md5 hash on a string.
     * A conversion will be applied if utf8 string is detected.
     *
     * @param {String}  str The string
     * @param {Boolean} raw True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.hash = function (str, raw) {
        // Converts the string to utf8 bytes if necessary
        // Then compute it using the binary function
        return SparkMD5.hashBinary(toUtf8(str), raw);
    };

    /**
     * Performs the md5 hash on a binary string.
     *
     * @param {String}  content The binary string
     * @param {Boolean} raw     True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.hashBinary = function (content, raw) {
        var hash = md51(content),
            ret = hex(hash);

        return raw ? hexToBinaryString(ret) : ret;
    };

    // ---------------------------------------------------

    /**
     * SparkMD5 OOP implementation for array buffers.
     *
     * Use this class to perform an incremental md5 ONLY for array buffers.
     */
    SparkMD5.ArrayBuffer = function () {
        // call reset to init the instance
        this.reset();
    };

    /**
     * Appends an array buffer.
     *
     * @param {ArrayBuffer} arr The array to be appended
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.append = function (arr) {
        var buff = concatenateArrayBuffers(this._buff.buffer, arr, true),
            length = buff.length,
            i;

        this._length += arr.byteLength;

        for (i = 64; i <= length; i += 64) {
            md5cycle(this._hash, md5blk_array(buff.subarray(i - 64, i)));
        }

        this._buff = (i - 64) < length ? new Uint8Array(buff.buffer.slice(i - 64)) : new Uint8Array(0);

        return this;
    };

    /**
     * Finishes the incremental computation, reseting the internal state and
     * returning the result.
     *
     * @param {Boolean} raw True to get the raw string, false to get the hex string
     *
     * @return {String} The result
     */
    SparkMD5.ArrayBuffer.prototype.end = function (raw) {
        var buff = this._buff,
            length = buff.length,
            tail = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            i,
            ret;

        for (i = 0; i < length; i += 1) {
            tail[i >> 2] |= buff[i] << ((i % 4) << 3);
        }

        this._finish(tail, length);
        ret = hex(this._hash);

        if (raw) {
            ret = hexToBinaryString(ret);
        }

        this.reset();

        return ret;
    };

    /**
     * Resets the internal state of the computation.
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.reset = function () {
        this._buff = new Uint8Array(0);
        this._length = 0;
        this._hash = [1732584193, -271733879, -1732584194, 271733878];

        return this;
    };

    /**
     * Gets the internal state of the computation.
     *
     * @return {Object} The state
     */
    SparkMD5.ArrayBuffer.prototype.getState = function () {
        var state = SparkMD5.prototype.getState.call(this);

        // Convert buffer to a string
        state.buff = arrayBuffer2Utf8Str(state.buff);

        return state;
    };

    /**
     * Gets the internal state of the computation.
     *
     * @param {Object} state The state
     *
     * @return {SparkMD5.ArrayBuffer} The instance itself
     */
    SparkMD5.ArrayBuffer.prototype.setState = function (state) {
        // Convert string to buffer
        state.buff = utf8Str2ArrayBuffer(state.buff, true);

        return SparkMD5.prototype.setState.call(this, state);
    };

    SparkMD5.ArrayBuffer.prototype.destroy = SparkMD5.prototype.destroy;

    SparkMD5.ArrayBuffer.prototype._finish = SparkMD5.prototype._finish;

    /**
     * Performs the md5 hash on an array buffer.
     *
     * @param {ArrayBuffer} arr The array buffer
     * @param {Boolean}     raw True to get the raw string, false to get the hex one
     *
     * @return {String} The result
     */
    SparkMD5.ArrayBuffer.hash = function (arr, raw) {
        var hash = md51_array(new Uint8Array(arr)),
            ret = hex(hash);

        return raw ? hexToBinaryString(ret) : ret;
    };

    return SparkMD5;
}));
});

var setImmediateShim = global.setImmediate || global.setTimeout;
var MD5_CHUNK_SIZE = 32768;

function rawToBase64(raw) {
  return thisBtoa(raw);
}

function sliceBlob(blob$$1, start, end) {
  if (blob$$1.webkitSlice) {
    return blob$$1.webkitSlice(start, end);
  }
  return blob$$1.slice(start, end);
}

function appendBlob(buffer, blob$$1, start, end, callback) {
  if (start > 0 || end < blob$$1.size) {
    // only slice blob if we really need to
    blob$$1 = sliceBlob(blob$$1, start, end);
  }
  readAsArrayBuffer(blob$$1, function (arrayBuffer) {
    buffer.append(arrayBuffer);
    callback();
  });
}

function appendString(buffer, string, start, end, callback) {
  if (start > 0 || end < string.length) {
    // only create a substring if we really need to
    string = string.substring(start, end);
  }
  buffer.appendBinary(string);
  callback();
}

function binaryMd5(data, callback) {
  var inputIsString = typeof data === 'string';
  var len = inputIsString ? data.length : data.size;
  var chunkSize = Math.min(MD5_CHUNK_SIZE, len);
  var chunks = Math.ceil(len / chunkSize);
  var currentChunk = 0;
  var buffer = inputIsString ? new sparkMd5() : new sparkMd5.ArrayBuffer();

  var append = inputIsString ? appendString : appendBlob;

  function next() {
    setImmediateShim(loadNextChunk);
  }

  function done() {
    var raw = buffer.end(true);
    var base64 = rawToBase64(raw);
    callback(base64);
    buffer.destroy();
  }

  function loadNextChunk() {
    var start = currentChunk * chunkSize;
    var end = start + chunkSize;
    currentChunk++;
    if (currentChunk < chunks) {
      append(buffer, data, start, end, next);
    } else {
      append(buffer, data, start, end, done);
    }
  }
  loadNextChunk();
}

function pad(str, padWith, upToLength) {
  var padding = '';
  var targetLength = upToLength - str.length;
  /* istanbul ignore next */
  while (padding.length < targetLength) {
    padding += padWith;
  }
  return padding;
}

function padLeft(str, padWith, upToLength) {
  var padding = pad(str, padWith, upToLength);
  return padding + str;
}

var MIN_MAGNITUDE = -324; // verified by -Number.MIN_VALUE
var MAGNITUDE_DIGITS = 3; // ditto
var SEP = ''; // set to '_' for easier debugging 

function collate(a, b) {

  if (a === b) {
    return 0;
  }

  a = normalizeKey(a);
  b = normalizeKey(b);

  var ai = collationIndex(a);
  var bi = collationIndex(b);
  if ((ai - bi) !== 0) {
    return ai - bi;
  }
  if (a === null) {
    return 0;
  }
  switch (typeof a) {
    case 'number':
      return a - b;
    case 'boolean':
      return a === b ? 0 : (a < b ? -1 : 1);
    case 'string':
      return stringCollate(a, b);
  }
  return Array.isArray(a) ? arrayCollate(a, b) : objectCollate(a, b);
}

// couch considers null/NaN/Infinity/-Infinity === undefined,
// for the purposes of mapreduce indexes. also, dates get stringified.
function normalizeKey(key) {
  switch (typeof key) {
    case 'undefined':
      return null;
    case 'number':
      if (key === Infinity || key === -Infinity || isNaN(key)) {
        return null;
      }
      return key;
    case 'object':
      var origKey = key;
      if (Array.isArray(key)) {
        var len = key.length;
        key = new Array(len);
        for (var i = 0; i < len; i++) {
          key[i] = normalizeKey(origKey[i]);
        }
      /* istanbul ignore next */
      } else if (key instanceof Date) {
        return key.toJSON();
      } else if (key !== null) { // generic object
        key = {};
        for (var k in origKey) {
          if (origKey.hasOwnProperty(k)) {
            var val = origKey[k];
            if (typeof val !== 'undefined') {
              key[k] = normalizeKey(val);
            }
          }
        }
      }
  }
  return key;
}

function indexify(key) {
  if (key !== null) {
    switch (typeof key) {
      case 'boolean':
        return key ? 1 : 0;
      case 'number':
        return numToIndexableString(key);
      case 'string':
        // We've to be sure that key does not contain \u0000
        // Do order-preserving replacements:
        // 0 -> 1, 1
        // 1 -> 1, 2
        // 2 -> 2, 2
        return key
          .replace(/\u0002/g, '\u0002\u0002')
          .replace(/\u0001/g, '\u0001\u0002')
          .replace(/\u0000/g, '\u0001\u0001');
      case 'object':
        var isArray = Array.isArray(key);
        var arr = isArray ? key : Object.keys(key);
        var i = -1;
        var len = arr.length;
        var result = '';
        if (isArray) {
          while (++i < len) {
            result += toIndexableString(arr[i]);
          }
        } else {
          while (++i < len) {
            var objKey = arr[i];
            result += toIndexableString(objKey) +
                toIndexableString(key[objKey]);
          }
        }
        return result;
    }
  }
  return '';
}

// convert the given key to a string that would be appropriate
// for lexical sorting, e.g. within a database, where the
// sorting is the same given by the collate() function.
function toIndexableString(key) {
  var zero = '\u0000';
  key = normalizeKey(key);
  return collationIndex(key) + SEP + indexify(key) + zero;
}

function parseNumber(str, i) {
  var originalIdx = i;
  var num;
  var zero = str[i] === '1';
  if (zero) {
    num = 0;
    i++;
  } else {
    var neg = str[i] === '0';
    i++;
    var numAsString = '';
    var magAsString = str.substring(i, i + MAGNITUDE_DIGITS);
    var magnitude = parseInt(magAsString, 10) + MIN_MAGNITUDE;
    /* istanbul ignore next */
    if (neg) {
      magnitude = -magnitude;
    }
    i += MAGNITUDE_DIGITS;
    while (true) {
      var ch = str[i];
      if (ch === '\u0000') {
        break;
      } else {
        numAsString += ch;
      }
      i++;
    }
    numAsString = numAsString.split('.');
    if (numAsString.length === 1) {
      num = parseInt(numAsString, 10);
    } else {
      /* istanbul ignore next */
      num = parseFloat(numAsString[0] + '.' + numAsString[1]);
    }
    /* istanbul ignore next */
    if (neg) {
      num = num - 10;
    }
    /* istanbul ignore next */
    if (magnitude !== 0) {
      // parseFloat is more reliable than pow due to rounding errors
      // e.g. Number.MAX_VALUE would return Infinity if we did
      // num * Math.pow(10, magnitude);
      num = parseFloat(num + 'e' + magnitude);
    }
  }
  return {num: num, length : i - originalIdx};
}

// move up the stack while parsing
// this function moved outside of parseIndexableString for performance
function pop(stack, metaStack) {
  var obj = stack.pop();

  if (metaStack.length) {
    var lastMetaElement = metaStack[metaStack.length - 1];
    if (obj === lastMetaElement.element) {
      // popping a meta-element, e.g. an object whose value is another object
      metaStack.pop();
      lastMetaElement = metaStack[metaStack.length - 1];
    }
    var element = lastMetaElement.element;
    var lastElementIndex = lastMetaElement.index;
    if (Array.isArray(element)) {
      element.push(obj);
    } else if (lastElementIndex === stack.length - 2) { // obj with key+value
      var key = stack.pop();
      element[key] = obj;
    } else {
      stack.push(obj); // obj with key only
    }
  }
}

function arrayCollate(a, b) {
  var len = Math.min(a.length, b.length);
  for (var i = 0; i < len; i++) {
    var sort = collate(a[i], b[i]);
    if (sort !== 0) {
      return sort;
    }
  }
  return (a.length === b.length) ? 0 :
    (a.length > b.length) ? 1 : -1;
}
function stringCollate(a, b) {
  // See: https://github.com/daleharvey/pouchdb/issues/40
  // This is incompatible with the CouchDB implementation, but its the
  // best we can do for now
  return (a === b) ? 0 : ((a > b) ? 1 : -1);
}
function objectCollate(a, b) {
  var ak = Object.keys(a), bk = Object.keys(b);
  var len = Math.min(ak.length, bk.length);
  for (var i = 0; i < len; i++) {
    // First sort the keys
    var sort = collate(ak[i], bk[i]);
    if (sort !== 0) {
      return sort;
    }
    // if the keys are equal sort the values
    sort = collate(a[ak[i]], b[bk[i]]);
    if (sort !== 0) {
      return sort;
    }

  }
  return (ak.length === bk.length) ? 0 :
    (ak.length > bk.length) ? 1 : -1;
}
// The collation is defined by erlangs ordered terms
// the atoms null, true, false come first, then numbers, strings,
// arrays, then objects
// null/undefined/NaN/Infinity/-Infinity are all considered null
function collationIndex(x) {
  var id = ['boolean', 'number', 'string', 'object'];
  var idx = id.indexOf(typeof x);
  //false if -1 otherwise true, but fast!!!!1
  if (~idx) {
    if (x === null) {
      return 1;
    }
    if (Array.isArray(x)) {
      return 5;
    }
    return idx < 3 ? (idx + 2) : (idx + 3);
  }
  /* istanbul ignore next */
  if (Array.isArray(x)) {
    return 5;
  }
}

// conversion:
// x yyy zz...zz
// x = 0 for negative, 1 for 0, 2 for positive
// y = exponent (for negative numbers negated) moved so that it's >= 0
// z = mantisse
function numToIndexableString(num) {

  if (num === 0) {
    return '1';
  }

  // convert number to exponential format for easier and
  // more succinct string sorting
  var expFormat = num.toExponential().split(/e\+?/);
  var magnitude = parseInt(expFormat[1], 10);

  var neg = num < 0;

  var result = neg ? '0' : '2';

  // first sort by magnitude
  // it's easier if all magnitudes are positive
  var magForComparison = ((neg ? -magnitude : magnitude) - MIN_MAGNITUDE);
  var magString = padLeft((magForComparison).toString(), '0', MAGNITUDE_DIGITS);

  result += SEP + magString;

  // then sort by the factor
  var factor = Math.abs(parseFloat(expFormat[0])); // [1..10)
  /* istanbul ignore next */
  if (neg) { // for negative reverse ordering
    factor = 10 - factor;
  }

  var factorStr = factor.toFixed(20);

  // strip zeros from the end
  factorStr = factorStr.replace(/\.?0+$/, '');

  result += SEP + factorStr;

  return result;
}

function sortObjectPropertiesByKey(queryParams) {
  return Object.keys(queryParams).sort(collate).reduce(function (result, key) {
    result[key] = queryParams[key];
    return result;
  }, {});
}

// Generate a unique id particular to this replication.
// Not guaranteed to align perfectly with CouchDB's rep ids.
function generateReplicationId(src, target, opts) {
  var docIds = opts.doc_ids ? opts.doc_ids.sort(collate) : '';
  var filterFun = opts.filter ? opts.filter.toString() : '';
  var queryParams = '';
  var filterViewName =  '';

  if (opts.filter && opts.query_params) {
    queryParams = JSON.stringify(sortObjectPropertiesByKey(opts.query_params));
  }

  if (opts.filter && opts.filter === '_view') {
    filterViewName = opts.view.toString();
  }

  return PouchPromise$2.all([src.id(), target.id()]).then(function (res) {
    var queryData = res[0] + res[1] + filterFun + filterViewName +
      queryParams + docIds;
    return new PouchPromise$2(function (resolve) {
      binaryMd5(queryData, resolve);
    });
  }).then(function (md5sum) {
    // can't use straight-up md5 alphabet, because
    // the char '/' is interpreted as being for attachments,
    // and + is also not url-safe
    md5sum = md5sum.replace(/\//g, '.').replace(/\+/g, '_');
    return '_local/' + md5sum;
  });
}

function replicate(src, target, opts, returnValue, result) {
    var batches = []; // list of batches to be processed
    var currentBatch; // the batch currently being processed
    var pendingBatch = {
        seq: 0,
        changes: [],
        docs: []
    }; // next batch, not yet ready to be processed
    var writingCheckpoint = false; // true while checkpoint is being written
    var changesCompleted = false; // true when all changes received
    var replicationCompleted = false; // true when replication has completed
    var last_seq = 0;
    var continuous = opts.continuous || opts.live || false;
    var batch_size = opts.batch_size || 100;
    var batches_limit = opts.batches_limit || 10;
    var changesPending = false; // true while src.changes is running
    var doc_ids = opts.doc_ids;
    var repId;
    var checkpointer;
    var changedDocs = [];
    // Like couchdb, every replication gets a unique session id
    var session = uuid();
    result = result || {
        ok: true,
        start_time: new Date(),
        docs_read: 0,
        docs_written: 0,
        doc_write_failures: 0,
        errors: []
    };
    var changesOpts = {};
    returnValue.ready(src, target);
    function initCheckpointer() {
        if (checkpointer) {
            return PouchPromise$2.resolve();
        }
        return generateReplicationId(src, target, opts).then(function (res) {
            repId = res;
            checkpointer = new Checkpointer(src, target, repId, returnValue);
        });
    }
    function writeDocs() {
        changedDocs = [];
        if (currentBatch.docs.length === 0) {
            return;
        }
        var docs = currentBatch.docs;
        var bulkOpts = { timeout: opts.timeout };
        return target.bulkDocs({ docs: docs, new_edits: false }, bulkOpts).then(function (res) {
            /* istanbul ignore if */
            if (returnValue.cancelled) {
                completeReplication();
                throw new Error('cancelled');
            }
            // `res` doesn't include full documents (which live in `docs`), so we create a map of
            // (id -> error), and check for errors while iterating over `docs`
            var errorsById = Object.create(null);
            res.forEach(function (res) {
                if (res.error) {
                    errorsById[res.id] = res;
                }
            });
            var errorsNo = Object.keys(errorsById).length;
            result.doc_write_failures += errorsNo;
            result.docs_written += docs.length - errorsNo;
            docs.forEach(function (doc) {
                var error = errorsById[doc._id];
                if (error) {
                    result.errors.push(error);
                    if (error.name === 'unauthorized' || error.name === 'forbidden') {
                        returnValue.emit('denied', clone(error));
                    }
                    else {
                        throw error;
                    }
                }
                else {
                    changedDocs.push(doc);
                }
            });
        }, function (err) {
            result.doc_write_failures += docs.length;
            throw err;
        });
    }
    function finishBatch() {
        if (currentBatch.error) {
            throw new Error('There was a problem getting docs.');
        }
        result.last_seq = last_seq = currentBatch.seq;
        var outResult = clone(result);
        if (changedDocs.length) {
            outResult.docs = changedDocs;
            returnValue.emit('change', outResult);
        }
        writingCheckpoint = true;
        return checkpointer.writeCheckpoint(currentBatch.seq, session).then(function () {
            writingCheckpoint = false;
            /* istanbul ignore if */
            if (returnValue.cancelled) {
                completeReplication();
                throw new Error('cancelled');
            }
            currentBatch = undefined;
            getChanges();
        }).catch(function (err) {
            onCheckpointError(err);
            throw err;
        });
    }
    function getDiffs() {
        var diff = {};
        currentBatch.changes.forEach(function (change) {
            // Couchbase Sync Gateway emits these, but we can ignore them
            /* istanbul ignore if */
            if (change.id === "_user/") {
                return;
            }
            diff[change.id] = change.changes.map(function (x) {
                return x.rev;
            });
        });
        return target.revsDiff(diff).then(function (diffs) {
            /* istanbul ignore if */
            if (returnValue.cancelled) {
                completeReplication();
                throw new Error('cancelled');
            }
            // currentBatch.diffs elements are deleted as the documents are written
            currentBatch.diffs = diffs;
        });
    }
    function getBatchDocs() {
        return getDocs(src, target, currentBatch.diffs, returnValue).then(function (got) {
            currentBatch.error = !got.ok;
            got.docs.forEach(function (doc) {
                delete currentBatch.diffs[doc._id];
                result.docs_read++;
                currentBatch.docs.push(doc);
            });
        });
    }
    function startNextBatch() {
        if (returnValue.cancelled || currentBatch) {
            return;
        }
        if (batches.length === 0) {
            processPendingBatch(true);
            return;
        }
        currentBatch = batches.shift();
        getDiffs()
            .then(getBatchDocs)
            .then(writeDocs)
            .then(finishBatch)
            .then(startNextBatch)
            .catch(function (err) {
            abortReplication('batch processing terminated with error', err);
        });
    }
    function processPendingBatch(immediate) {
        if (pendingBatch.changes.length === 0) {
            if (batches.length === 0 && !currentBatch) {
                if ((continuous && changesOpts.live) || changesCompleted) {
                    returnValue.state = 'pending';
                    returnValue.emit('paused');
                }
                if (changesCompleted) {
                    completeReplication();
                }
            }
            return;
        }
        if (immediate ||
            changesCompleted ||
            pendingBatch.changes.length >= batch_size) {
            batches.push(pendingBatch);
            pendingBatch = {
                seq: 0,
                changes: [],
                docs: []
            };
            if (returnValue.state === 'pending' || returnValue.state === 'stopped') {
                returnValue.state = 'active';
                returnValue.emit('active');
            }
            startNextBatch();
        }
    }
    function abortReplication(reason, err) {
        if (replicationCompleted) {
            return;
        }
        if (!err.message) {
            err.message = reason;
        }
        result.ok = false;
        result.status = 'aborting';
        batches = [];
        pendingBatch = {
            seq: 0,
            changes: [],
            docs: []
        };
        completeReplication(err);
    }
    function completeReplication(fatalError) {
        if (replicationCompleted) {
            return;
        }
        /* istanbul ignore if */
        if (returnValue.cancelled) {
            result.status = 'cancelled';
            if (writingCheckpoint) {
                return;
            }
        }
        result.status = result.status || 'complete';
        result.end_time = new Date();
        result.last_seq = last_seq;
        replicationCompleted = true;
        if (fatalError) {
            fatalError.result = result;
            if (fatalError.name === 'unauthorized' || fatalError.name === 'forbidden') {
                returnValue.emit('error', fatalError);
                returnValue.removeAllListeners();
            }
            else {
                backOff(opts, returnValue, fatalError, function () {
                    replicate(src, target, opts, returnValue);
                });
            }
        }
        else {
            returnValue.emit('complete', result);
            returnValue.removeAllListeners();
        }
    }
    function onChange(change) {
        /* istanbul ignore if */
        if (returnValue.cancelled) {
            return completeReplication();
        }
        var filter = filterChange(opts)(change);
        if (!filter) {
            return;
        }
        pendingBatch.seq = change.seq;
        pendingBatch.changes.push(change);
        processPendingBatch(batches.length === 0 && changesOpts.live);
    }
    function onChangesComplete(changes) {
        changesPending = false;
        /* istanbul ignore if */
        if (returnValue.cancelled) {
            return completeReplication();
        }
        // if no results were returned then we're done,
        // else fetch more
        if (changes.results.length > 0) {
            changesOpts.since = changes.last_seq;
            getChanges();
            processPendingBatch(true);
        }
        else {
            var complete = function () {
                if (continuous) {
                    changesOpts.live = true;
                    getChanges();
                }
                else {
                    changesCompleted = true;
                }
                processPendingBatch(true);
            };
            // update the checkpoint so we start from the right seq next time
            if (!currentBatch && changes.results.length === 0) {
                writingCheckpoint = true;
                checkpointer.writeCheckpoint(changes.last_seq, session).then(function () {
                    writingCheckpoint = false;
                    result.last_seq = last_seq = changes.last_seq;
                    complete();
                })
                    .catch(onCheckpointError);
            }
            else {
                complete();
            }
        }
    }
    function onChangesError(err) {
        changesPending = false;
        /* istanbul ignore if */
        if (returnValue.cancelled) {
            return completeReplication();
        }
        abortReplication('changes rejected', err);
    }
    function getChanges() {
        if (!(!changesPending &&
            !changesCompleted &&
            batches.length < batches_limit)) {
            return;
        }
        changesPending = true;
        function abortChanges() {
            changes.cancel();
        }
        function removeListener() {
            returnValue.removeListener('cancel', abortChanges);
        }
        if (returnValue._changes) {
            returnValue.removeListener('cancel', returnValue._abortChanges);
            returnValue._changes.cancel();
        }
        returnValue.once('cancel', abortChanges);
        var changes = src.changes(changesOpts)
            .on('change', onChange);
        changes.then(removeListener, removeListener);
        changes.then(onChangesComplete)
            .catch(onChangesError);
        if (opts.retry) {
            // save for later so we can cancel if necessary
            returnValue._changes = changes;
            returnValue._abortChanges = abortChanges;
        }
    }
    function startChanges() {
        initCheckpointer().then(function () {
            /* istanbul ignore if */
            if (returnValue.cancelled) {
                completeReplication();
                return;
            }
            return checkpointer.getCheckpoint().then(function (checkpoint) {
                last_seq = checkpoint;
                changesOpts = {
                    since: last_seq,
                    limit: batch_size,
                    batch_size: batch_size,
                    style: 'all_docs',
                    doc_ids: doc_ids,
                    return_docs: true // required so we know when we're done
                };
                if (opts.filter) {
                    if (typeof opts.filter !== 'string') {
                        // required for the client-side filter in onChange
                        changesOpts.include_docs = true;
                    }
                    else {
                        changesOpts.filter = opts.filter;
                    }
                }
                if ('heartbeat' in opts) {
                    changesOpts.heartbeat = opts.heartbeat;
                }
                if ('timeout' in opts) {
                    changesOpts.timeout = opts.timeout;
                }
                if (opts.query_params) {
                    changesOpts.query_params = opts.query_params;
                }
                if (opts.view) {
                    changesOpts.view = opts.view;
                }
                getChanges();
            });
        }).catch(function (err) {
            abortReplication('getCheckpoint rejected with ', err);
        });
    }
    /* istanbul ignore next */
    function onCheckpointError(err) {
        writingCheckpoint = false;
        abortReplication('writeCheckpoint completed with error', err);
    }
    /* istanbul ignore if */
    if (returnValue.cancelled) {
        completeReplication();
        return;
    }
    if (!returnValue._addedListeners) {
        returnValue.once('cancel', completeReplication);
        if (typeof opts.complete === 'function') {
            returnValue.once('error', opts.complete);
            returnValue.once('complete', function (result) {
                opts.complete(null, result);
            });
        }
        returnValue._addedListeners = true;
    }
    if (typeof opts.since === 'undefined') {
        startChanges();
    }
    else {
        initCheckpointer().then(function () {
            writingCheckpoint = true;
            return checkpointer.writeCheckpoint(opts.since, session);
        }).then(function () {
            writingCheckpoint = false;
            /* istanbul ignore if */
            if (returnValue.cancelled) {
                completeReplication();
                return;
            }
            last_seq = opts.since;
            startChanges();
        }).catch(onCheckpointError);
    }
}

var inherits_browser$2 = createCommonjsModule(function (module) {
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    var TempCtor = function () {};
    TempCtor.prototype = superCtor.prototype;
    ctor.prototype = new TempCtor();
    ctor.prototype.constructor = ctor;
  };
}
});

// We create a basic promise so the caller can cancel the replication possibly
// before we have actually started listening to changes etc
inherits_browser$2(Replication, EventEmitter);
function Replication() {
    EventEmitter.call(this);
    this.cancelled = false;
    this.state = 'pending';
    var self = this;
    var promise = new PouchPromise$2(function (fulfill, reject) {
        self.once('complete', fulfill);
        self.once('error', reject);
    });
    self.then = function (resolve, reject) {
        return promise.then(resolve, reject);
    };
    self.catch = function (reject) {
        return promise.catch(reject);
    };
    // As we allow error handling via "error" event as well,
    // put a stub in here so that rejecting never throws UnhandledError.
    self.catch(function () { });
}
Replication.prototype.cancel = function () {
    this.cancelled = true;
    this.state = 'cancelled';
    this.emit('cancel');
};
Replication.prototype.ready = function (src, target) {
    var self = this;
    if (self._readyCalled) {
        return;
    }
    self._readyCalled = true;
    function onDestroy() {
        self.cancel();
    }
    src.once('destroyed', onDestroy);
    target.once('destroyed', onDestroy);
    function cleanup() {
        src.removeListener('destroyed', onDestroy);
        target.removeListener('destroyed', onDestroy);
    }
    self.once('complete', cleanup);
};

inherits_browser$2(PouchError$1, Error);

function PouchError$1(opts) {
  Error.call(this, opts.reason);
  this.status = opts.status;
  this.name = opts.error;
  this.message = opts.reason;
  this.error = true;
}

PouchError$1.prototype.toString = function () {
  return JSON.stringify({
    status: this.status,
    name: this.name,
    message: this.message,
    reason: this.reason
  });
};

var UNAUTHORIZED$1 = new PouchError$1({
  status: 401,
  error: 'unauthorized',
  reason: "Name or password is incorrect."
});

var MISSING_BULK_DOCS$1 = new PouchError$1({
  status: 400,
  error: 'bad_request',
  reason: "Missing JSON list of 'docs'"
});

var MISSING_DOC$1 = new PouchError$1({
  status: 404,
  error: 'not_found',
  reason: 'missing'
});

var REV_CONFLICT$1 = new PouchError$1({
  status: 409,
  error: 'conflict',
  reason: 'Document update conflict'
});

var INVALID_ID$1 = new PouchError$1({
  status: 400,
  error: 'bad_request',
  reason: '_id field must contain a string'
});

var MISSING_ID$1 = new PouchError$1({
  status: 412,
  error: 'missing_id',
  reason: '_id is required for puts'
});

var RESERVED_ID$1 = new PouchError$1({
  status: 400,
  error: 'bad_request',
  reason: 'Only reserved document ids may start with underscore.'
});

var NOT_OPEN$1 = new PouchError$1({
  status: 412,
  error: 'precondition_failed',
  reason: 'Database not open'
});

var UNKNOWN_ERROR$1 = new PouchError$1({
  status: 500,
  error: 'unknown_error',
  reason: 'Database encountered an unknown error'
});

var BAD_ARG$1 = new PouchError$1({
  status: 500,
  error: 'badarg',
  reason: 'Some query argument is invalid'
});

var INVALID_REQUEST$1 = new PouchError$1({
  status: 400,
  error: 'invalid_request',
  reason: 'Request was invalid'
});

var QUERY_PARSE_ERROR$1 = new PouchError$1({
  status: 400,
  error: 'query_parse_error',
  reason: 'Some query parameter is invalid'
});

var DOC_VALIDATION$1 = new PouchError$1({
  status: 500,
  error: 'doc_validation',
  reason: 'Bad special document member'
});

var BAD_REQUEST$1 = new PouchError$1({
  status: 400,
  error: 'bad_request',
  reason: 'Something wrong with the request'
});

var NOT_AN_OBJECT$1 = new PouchError$1({
  status: 400,
  error: 'bad_request',
  reason: 'Document must be a JSON object'
});

var DB_MISSING$1 = new PouchError$1({
  status: 404,
  error: 'not_found',
  reason: 'Database not found'
});

var IDB_ERROR$1 = new PouchError$1({
  status: 500,
  error: 'indexed_db_went_bad',
  reason: 'unknown'
});

var WSQ_ERROR$1 = new PouchError$1({
  status: 500,
  error: 'web_sql_went_bad',
  reason: 'unknown'
});

var LDB_ERROR$1 = new PouchError$1({
  status: 500,
  error: 'levelDB_went_went_bad',
  reason: 'unknown'
});

var FORBIDDEN$1 = new PouchError$1({
  status: 403,
  error: 'forbidden',
  reason: 'Forbidden by design doc validate_doc_update function'
});

var INVALID_REV$1 = new PouchError$1({
  status: 400,
  error: 'bad_request',
  reason: 'Invalid rev format'
});

var FILE_EXISTS$1 = new PouchError$1({
  status: 412,
  error: 'file_exists',
  reason: 'The database could not be created, the file already exists.'
});

var MISSING_STUB$1 = new PouchError$1({
  status: 412,
  error: 'missing_stub'
});

var INVALID_URL$1 = new PouchError$1({
  status: 413,
  error: 'invalid_url',
  reason: 'Provided URL is invalid'
});

function createError$1(error, reason) {
  function CustomPouchError(reason) {
    // inherit error properties from our parent error manually
    // so as to allow proper JSON parsing.
    /* jshint ignore:start */
    for (var p in error) {
      if (typeof error[p] !== 'function') {
        this[p] = error[p];
      }
    }
    /* jshint ignore:end */
    if (reason !== undefined) {
      this.reason = reason;
    }
  }
  CustomPouchError.prototype = PouchError$1.prototype;
  return new CustomPouchError(reason);
}

function toPouch(db, opts) {
    var PouchConstructor = opts.PouchConstructor;
    if (typeof db === 'string') {
        return new PouchConstructor(db, opts);
    }
    else {
        return db;
    }
}
function replicateWrapper(src, target, opts, callback) {
    if (typeof opts === 'function') {
        callback = opts;
        opts = {};
    }
    if (typeof opts === 'undefined') {
        opts = {};
    }
    if (opts.doc_ids && !Array.isArray(opts.doc_ids)) {
        throw createError$1(BAD_REQUEST$1, "`doc_ids` filter parameter is not a list.");
    }
    opts.complete = callback;
    opts = clone(opts);
    opts.continuous = opts.continuous || opts.live;
    opts.retry = ('retry' in opts) ? opts.retry : false;
    /*jshint validthis:true */
    opts.PouchConstructor = opts.PouchConstructor || this;
    var replicateRet = new Replication(opts);
    var srcPouch = toPouch(src, opts);
    var targetPouch = toPouch(target, opts);
    replicate(srcPouch, targetPouch, opts, replicateRet);
    return replicateRet;
}

inherits_browser$2(Sync, EventEmitter);
function sync(src, target, opts, callback) {
    console.debug('INSYNC');
    if (typeof opts === 'function') {
        callback = opts;
        opts = {};
    }
    if (typeof opts === 'undefined') {
        opts = {};
    }
    opts = clone(opts);
    /*jshint validthis:true */
    opts.PouchConstructor = opts.PouchConstructor || this;
    console.debug('pC', opts.PouchConstructor);
    src = toPouch(src, opts);
    target = toPouch(target, opts);
    return new Sync(src, target, opts, callback);
}
function Sync(src, target, opts, callback) {
    var self = this;
    this.canceled = false;
    var optsPush = opts.push ? extend$2({}, opts, opts.push) : opts;
    var optsPull = opts.pull ? extend$2({}, opts, opts.pull) : opts;
    this.push = replicateWrapper(src, target, optsPush);
    this.pull = replicateWrapper(target, src, optsPull);
    this.pushPaused = true;
    this.pullPaused = true;
    function pullChange(change) {
        self.emit('change', {
            direction: 'pull',
            change: change
        });
    }
    function pushChange(change) {
        self.emit('change', {
            direction: 'push',
            change: change
        });
    }
    function pushDenied(doc) {
        self.emit('denied', {
            direction: 'push',
            doc: doc
        });
    }
    function pullDenied(doc) {
        self.emit('denied', {
            direction: 'pull',
            doc: doc
        });
    }
    function pushPaused() {
        self.pushPaused = true;
        /* istanbul ignore if */
        if (self.pullPaused) {
            self.emit('paused');
        }
    }
    function pullPaused() {
        self.pullPaused = true;
        /* istanbul ignore if */
        if (self.pushPaused) {
            self.emit('paused');
        }
    }
    function pushActive() {
        self.pushPaused = false;
        /* istanbul ignore if */
        if (self.pullPaused) {
            self.emit('active', {
                direction: 'push'
            });
        }
    }
    function pullActive() {
        self.pullPaused = false;
        /* istanbul ignore if */
        if (self.pushPaused) {
            self.emit('active', {
                direction: 'pull'
            });
        }
    }
    var removed = {};
    function removeAll(type) {
        return function (event, func) {
            var isChange = event === 'change' &&
                (func === pullChange || func === pushChange);
            var isDenied = event === 'denied' &&
                (func === pullDenied || func === pushDenied);
            var isPaused = event === 'paused' &&
                (func === pullPaused || func === pushPaused);
            var isActive = event === 'active' &&
                (func === pullActive || func === pushActive);
            if (isChange || isDenied || isPaused || isActive) {
                if (!(event in removed)) {
                    removed[event] = {};
                }
                removed[event][type] = true;
                if (Object.keys(removed[event]).length === 2) {
                    // both push and pull have asked to be removed
                    self.removeAllListeners(event);
                }
            }
        };
    }
    if (opts.live) {
        this.push.on('complete', self.pull.cancel.bind(self.pull));
        this.pull.on('complete', self.push.cancel.bind(self.push));
    }
    function addOneListener(ee, event, listener) {
        if (ee.listeners(event).indexOf(listener) == -1) {
            ee.on(event, listener);
        }
    }
    this.on('newListener', function (event) {
        if (event === 'change') {
            addOneListener(self.pull, 'change', pullChange);
            addOneListener(self.push, 'change', pushChange);
        }
        else if (event === 'denied') {
            addOneListener(self.pull, 'denied', pullDenied);
            addOneListener(self.push, 'denied', pushDenied);
        }
        else if (event === 'active') {
            addOneListener(self.pull, 'active', pullActive);
            addOneListener(self.push, 'active', pushActive);
        }
        else if (event === 'paused') {
            addOneListener(self.pull, 'paused', pullPaused);
            addOneListener(self.push, 'paused', pushPaused);
        }
    });
    this.on('removeListener', function (event) {
        if (event === 'change') {
            self.pull.removeListener('change', pullChange);
            self.push.removeListener('change', pushChange);
        }
        else if (event === 'denied') {
            self.pull.removeListener('denied', pullDenied);
            self.push.removeListener('denied', pushDenied);
        }
        else if (event === 'active') {
            self.pull.removeListener('active', pullActive);
            self.push.removeListener('active', pushActive);
        }
        else if (event === 'paused') {
            self.pull.removeListener('paused', pullPaused);
            self.push.removeListener('paused', pushPaused);
        }
    });
    this.pull.on('removeListener', removeAll('pull'));
    this.push.on('removeListener', removeAll('push'));
    var promise = PouchPromise$2.all([
        this.push,
        this.pull
    ]).then(function (resp) {
        var out = {
            push: resp[0],
            pull: resp[1]
        };
        self.emit('complete', out);
        if (callback) {
            callback(null, out);
        }
        self.removeAllListeners();
        return out;
    }, function (err) {
        self.cancel();
        if (callback) {
            // if there's a callback, then the callback can receive
            // the error event
            callback(err);
        }
        else {
            // if there's no callback, then we're safe to emit an error
            // event, which would otherwise throw an unhandled error
            // due to 'error' being a special event in EventEmitters
            self.emit('error', err);
        }
        self.removeAllListeners();
        if (callback) {
            // no sense throwing if we're already emitting an 'error' event
            throw err;
        }
    });
    this.then = function (success, err) {
        return promise.then(success, err);
    };
    this.catch = function (err) {
        return promise.catch(err);
    };
}
Sync.prototype.cancel = function () {
    if (!this.canceled) {
        this.canceled = true;
        this.push.cancel();
        this.pull.cancel();
    }
};

var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
var __generator = (undefined && undefined.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t;
    return { next: verb(0), "throw": verb(1), "return": verb(2) };
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
// TODO: Multiple DBs
var store = {};
var db;
function initStore(PouchDB) {
    return __awaiter(this, void 0, void 0, function () {
        var e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    db = new PouchDB('sync_optimization', {
                        auto_compaction: true,
                        revs_limit: 10
                    });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, db.get('store')];
                case 2:
                    store = (_a.sent()).data;
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
function writeStore() {
    db.upsert('store', function (doc) {
        doc.data = store;
        return doc;
    });
}
function docToKey(doc) {
    return JSON.stringify([doc._id, doc._rev]);
}
function filterPush(doc) {
    if (docToKey(doc) in store) {
        return false;
    }
    return true;
}
function addDocsToStore(docs, seq) {
    for (var _i = 0, docs_1 = docs; _i < docs_1.length; _i++) {
        var doc = docs_1[_i];
        store[docToKey(doc)] = seq;
    }
    writeStore();
}
function clearStorage(seq) {
    window.setTimeout(function () {
        for (var key in Object.assign({}, store)) {
            if (store[key] < seq) {
                delete store[key];
            }
        }
        writeStore();
    }, 2000);
}
function thriftySync(src, target, options, callback) {
    if (options === void 0) { options = {}; }
    console.debug('thriftySync', src, target, options, callback);
    try {
        options.push = options.push || {};
        var oldFilter_1 = options.push.filter || (function () { return true; });
        options.push.filter = function (doc) { return oldFilter_1(doc) && filterPush(doc); };
        /*console.debug('CONSTR2', constr);
        options.PouchConstructor = constr;*/
        var handle = sync(src, target, options, callback), last_seq_1 = 0;
        console.debug('FOO', handle);
        handle.on('change', function (change) {
            console.debug('CHANGE', change);
            if (change.direction == 'pull') {
                addDocsToStore(change.change.docs, last_seq_1);
            }
            else if (change.direction == 'push') {
                last_seq_1 = change.change.last_seq;
                clearStorage(last_seq_1);
            }
        });
        return handle;
    }
    catch (e) {
        console.error('ASDA', e);
    }
}

var Mutation$2 = commonjsGlobal.MutationObserver || commonjsGlobal.WebKitMutationObserver;

var scheduleDrain$2;

{
  if (Mutation$2) {
    var called$2 = 0;
    var observer$2 = new Mutation$2(nextTick$2);
    var element$2 = commonjsGlobal.document.createTextNode('');
    observer$2.observe(element$2, {
      characterData: true
    });
    scheduleDrain$2 = function () {
      element$2.data = (called$2 = ++called$2 % 2);
    };
  } else if (!commonjsGlobal.setImmediate && typeof commonjsGlobal.MessageChannel !== 'undefined') {
    var channel$2 = new commonjsGlobal.MessageChannel();
    channel$2.port1.onmessage = nextTick$2;
    scheduleDrain$2 = function () {
      channel$2.port2.postMessage(0);
    };
  } else if ('document' in commonjsGlobal && 'onreadystatechange' in commonjsGlobal.document.createElement('script')) {
    scheduleDrain$2 = function () {

      // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
      // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
      var scriptEl = commonjsGlobal.document.createElement('script');
      scriptEl.onreadystatechange = function () {
        nextTick$2();

        scriptEl.onreadystatechange = null;
        scriptEl.parentNode.removeChild(scriptEl);
        scriptEl = null;
      };
      commonjsGlobal.document.documentElement.appendChild(scriptEl);
    };
  } else {
    scheduleDrain$2 = function () {
      setTimeout(nextTick$2, 0);
    };
  }
}

var draining$2;
var queue$2 = [];
//named nextTick for less confusing stack traces
function nextTick$2() {
  draining$2 = true;
  var i, oldQueue;
  var len = queue$2.length;
  while (len) {
    oldQueue = queue$2;
    queue$2 = [];
    i = -1;
    while (++i < len) {
      oldQueue[i]();
    }
    len = queue$2.length;
  }
  draining$2 = false;
}

var browser$8 = immediate$5;
function immediate$5(task) {
  if (queue$2.push(task) === 1 && !draining$2) {
    scheduleDrain$2();
  }
}

var immediate$4 = browser$8;

/* istanbul ignore next */
function INTERNAL$2() {}

var handlers$2 = {};

var REJECTED$2 = ['REJECTED'];
var FULFILLED$2 = ['FULFILLED'];
var PENDING$2 = ['PENDING'];
var index$7 = Promise$5;

function Promise$5(resolver) {
  if (typeof resolver !== 'function') {
    throw new TypeError('resolver must be a function');
  }
  this.state = PENDING$2;
  this.queue = [];
  this.outcome = void 0;
  /* istanbul ignore else */
  if (!process.browser) {
    this.handled = UNHANDLED;
  }
  if (resolver !== INTERNAL$2) {
    safelyResolveThenable$2(this, resolver);
  }
}

Promise$5.prototype.catch = function (onRejected) {
  return this.then(null, onRejected);
};
Promise$5.prototype.then = function (onFulfilled, onRejected) {
  if (typeof onFulfilled !== 'function' && this.state === FULFILLED$2 ||
    typeof onRejected !== 'function' && this.state === REJECTED$2) {
    return this;
  }
  var promise = new this.constructor(INTERNAL$2);
  /* istanbul ignore else */
  if (!process.browser) {
    if (this.handled === UNHANDLED) {
      this.handled = null;
    }
  }
  if (this.state !== PENDING$2) {
    var resolver = this.state === FULFILLED$2 ? onFulfilled : onRejected;
    unwrap$2(promise, resolver, this.outcome);
  } else {
    this.queue.push(new QueueItem$2(promise, onFulfilled, onRejected));
  }

  return promise;
};
function QueueItem$2(promise, onFulfilled, onRejected) {
  this.promise = promise;
  if (typeof onFulfilled === 'function') {
    this.onFulfilled = onFulfilled;
    this.callFulfilled = this.otherCallFulfilled;
  }
  if (typeof onRejected === 'function') {
    this.onRejected = onRejected;
    this.callRejected = this.otherCallRejected;
  }
}
QueueItem$2.prototype.callFulfilled = function (value) {
  handlers$2.resolve(this.promise, value);
};
QueueItem$2.prototype.otherCallFulfilled = function (value) {
  unwrap$2(this.promise, this.onFulfilled, value);
};
QueueItem$2.prototype.callRejected = function (value) {
  handlers$2.reject(this.promise, value);
};
QueueItem$2.prototype.otherCallRejected = function (value) {
  unwrap$2(this.promise, this.onRejected, value);
};

function unwrap$2(promise, func, value) {
  immediate$4(function () {
    var returnValue;
    try {
      returnValue = func(value);
    } catch (e) {
      return handlers$2.reject(promise, e);
    }
    if (returnValue === promise) {
      handlers$2.reject(promise, new TypeError('Cannot resolve promise with itself'));
    } else {
      handlers$2.resolve(promise, returnValue);
    }
  });
}

handlers$2.resolve = function (self, value) {
  var result = tryCatch$2(getThen$2, value);
  if (result.status === 'error') {
    return handlers$2.reject(self, result.value);
  }
  var thenable = result.value;

  if (thenable) {
    safelyResolveThenable$2(self, thenable);
  } else {
    self.state = FULFILLED$2;
    self.outcome = value;
    var i = -1;
    var len = self.queue.length;
    while (++i < len) {
      self.queue[i].callFulfilled(value);
    }
  }
  return self;
};
handlers$2.reject = function (self, error) {
  self.state = REJECTED$2;
  self.outcome = error;
  /* istanbul ignore else */
  if (!process.browser) {
    if (self.handled === UNHANDLED) {
      immediate$4(function () {
        if (self.handled === UNHANDLED) {
          process.emit('unhandledRejection', error, self);
        }
      });
    }
  }
  var i = -1;
  var len = self.queue.length;
  while (++i < len) {
    self.queue[i].callRejected(error);
  }
  return self;
};

function getThen$2(obj) {
  // Make sure we only access the accessor once as required by the spec
  var then = obj && obj.then;
  if (obj && typeof obj === 'object' && typeof then === 'function') {
    return function appyThen() {
      then.apply(obj, arguments);
    };
  }
}

function safelyResolveThenable$2(self, thenable) {
  // Either fulfill, reject or reject with error
  var called = false;
  function onError(value) {
    if (called) {
      return;
    }
    called = true;
    handlers$2.reject(self, value);
  }

  function onSuccess(value) {
    if (called) {
      return;
    }
    called = true;
    handlers$2.resolve(self, value);
  }

  function tryToUnwrap() {
    thenable(onSuccess, onError);
  }

  var result = tryCatch$2(tryToUnwrap);
  if (result.status === 'error') {
    onError(result.value);
  }
}

function tryCatch$2(func, value) {
  var out = {};
  try {
    out.value = func(value);
    out.status = 'success';
  } catch (e) {
    out.status = 'error';
    out.value = e;
  }
  return out;
}

Promise$5.resolve = resolve$2;
function resolve$2(value) {
  if (value instanceof this) {
    return value;
  }
  return handlers$2.resolve(new this(INTERNAL$2), value);
}

Promise$5.reject = reject$2;
function reject$2(reason) {
  var promise = new this(INTERNAL$2);
  return handlers$2.reject(promise, reason);
}

Promise$5.all = all$2;
function all$2(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var values = new Array(len);
  var resolved = 0;
  var i = -1;
  var promise = new this(INTERNAL$2);

  while (++i < len) {
    allResolver(iterable[i], i);
  }
  return promise;
  function allResolver(value, i) {
    self.resolve(value).then(resolveFromAll, function (error) {
      if (!called) {
        called = true;
        handlers$2.reject(promise, error);
      }
    });
    function resolveFromAll(outValue) {
      values[i] = outValue;
      if (++resolved === len && !called) {
        called = true;
        handlers$2.resolve(promise, values);
      }
    }
  }
}

Promise$5.race = race$2;
function race$2(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var i = -1;
  var promise = new this(INTERNAL$2);

  while (++i < len) {
    resolver(iterable[i]);
  }
  return promise;
  function resolver(value) {
    self.resolve(value).then(function (response) {
      if (!called) {
        called = true;
        handlers$2.resolve(promise, response);
      }
    }, function (error) {
      if (!called) {
        called = true;
        handlers$2.reject(promise, error);
      }
    });
  }
}

/* istanbul ignore next */
var PouchPromise$3 = typeof Promise === 'function' ? Promise : index$7;




var index$6 = Object.freeze({
	default: PouchPromise$3
});

var require$$0$5 = ( index$6 && index$6['default'] ) || index$6;

var index$4 = createCommonjsModule(function (module, exports) {
'use strict';

var PouchPromise = require$$0$5;

// this is essentially the "update sugar" function from daleharvey/pouchdb#1388
// the diffFun tells us what delta to apply to the doc.  it either returns
// the doc, or false if it doesn't need to do an update after all
function upsertInner(db, docId, diffFun) {
  if (typeof docId !== 'string') {
    return PouchPromise.reject(new Error('doc id is required'));
  }

  return db.get(docId).catch(function (err) {
    /* istanbul ignore next */
    if (err.status !== 404) {
      throw err;
    }
    return {};
  }).then(function (doc) {
    // the user might change the _rev, so save it for posterity
    var docRev = doc._rev;
    var newDoc = diffFun(doc);

    if (!newDoc) {
      // if the diffFun returns falsy, we short-circuit as
      // an optimization
      return { updated: false, rev: docRev };
    }

    // users aren't allowed to modify these values,
    // so reset them here
    newDoc._id = docId;
    newDoc._rev = docRev;
    return tryAndPut(db, newDoc, diffFun);
  });
}

function tryAndPut(db, doc, diffFun) {
  return db.put(doc).then(function (res) {
    return {
      updated: true,
      rev: res.rev
    };
  }, function (err) {
    /* istanbul ignore next */
    if (err.status !== 409) {
      throw err;
    }
    return upsertInner(db, doc._id, diffFun);
  });
}

exports.upsert = function upsert$2(docId, diffFun, cb) {
  var db = this;
  var promise = upsertInner(db, docId, diffFun);
  if (typeof cb !== 'function') {
    return promise;
  }
  promise.then(function (resp) {
    cb(null, resp);
  }, cb);
};

exports.putIfNotExists = function putIfNotExists(docId, doc, cb) {
  var db = this;

  if (typeof docId !== 'string') {
    cb = doc;
    doc = docId;
    docId = doc._id;
  }

  var diffFun = function (existingDoc) {
    if (existingDoc._rev) {
      return false; // do nothing
    }
    return doc;
  };

  var promise = upsertInner(db, docId, diffFun);
  if (typeof cb !== 'function') {
    return promise;
  }
  promise.then(function (resp) {
    cb(null, resp);
  }, cb);
};


/* istanbul ignore next */
if (typeof window !== 'undefined' && window.PouchDB) {
  window.PouchDB.plugin(exports);
}
});

var putIfNotExists = index$4.putIfNotExists;
var upsert$2 = index$4.upsert;

var PouchDBUpsert = Object.freeze({
	default: index$4,
	__moduleExports: index$4,
	putIfNotExists: putIfNotExists,
	upsert: upsert$2
});

console.debug('UPS', PouchDBUpsert);
function plugin(PouchDB) {
    console.debug('INITP', PouchDB, thriftySync);
    PouchDB.plugin(PouchDBUpsert);
    initStore(PouchDB);
    PouchDB.thriftySync = thriftySync;
    PouchDB.prototype.thriftySync = function (dbName, opts, callback) {
        opts = opts || {};
        opts.PouchConstructor = PouchDB;
        return this.constructor.thriftySync(this, dbName, opts, callback);
    };
}
/* istanbul ignore next */
if (typeof window !== 'undefined' && window.PouchDB) {
    window.PouchDB.plugin(plugin);
}

export default plugin;
