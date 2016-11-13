import { sync } from './sync/sync';
var CACHE_KEY = '_pouchdb_thrifty_store';
function updateAdapter(PouchDB, name, transformer) {
    PouchDB.adapters[name] = transformer(PouchDB.adapters[name]);
    PouchDB.adapters[name].valid = function () { return true; };
}
// TODO: Multiple DBs
var store = {};
export function initStore() {
    //store = window.localStorage.getItem(CACHE_KEY);
}
function writeStore() {
    //window.localStorage.setItem(CACHE_KEY, JSON.stringify(store));
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
export function thriftySync(src, target, options, callback) {
    if (options === void 0) { options = {}; }
    options.push = options.push || {};
    var oldFilter = options.push.filter || (function () { return true; });
    options.push.filter = function (doc) { return oldFilter(doc) && filterPush(doc); };
    var handle = sync(src, target, options, callback), last_seq = 0;
    handle.on('change', function (change) {
        if (change.direction == 'pull') {
            addDocsToStore(change.change.docs, last_seq);
        }
        else if (change.direction == 'push') {
            last_seq = change.change.last_seq;
            clearStorage(last_seq);
        }
    });
    return handle;
}
