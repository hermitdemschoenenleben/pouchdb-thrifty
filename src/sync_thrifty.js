import {getXHR, setXHROption} from './xhr';
import {sync} from './sync/sync';

var CACHE_KEY = '_pouchdb_thrifty_store';

function updateAdapter(PouchDB, name, transformer) {
  PouchDB.adapters[name] = transformer(PouchDB.adapters[name])
  PouchDB.adapters[name].valid = () => true;
}

var store = {};

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
  for (let doc of docs) {
    store[docToKey(doc)] = seq;
  }
}

function clearStorage(seq) {
  window.setTimeout(() => {
    for (let key in Object.assign({}, store)) {
      if (store[key] < seq) {
        delete store[key];
      }
    }
  }, 2000);
}

export function thriftySync(src, target, options={}, callback) {
  options.push = options.push || {};
  let oldFilter = options.push.filter || (() => true);
  options.push.filter = doc => oldFilter(doc) && filterPush(doc);

  let handle = sync(src, target, options, callback),
      last_seq = 0;

  handle.on('change', change => {
    if (change.direction == 'pull') {
      addDocsToStore(change.change.docs, last_seq);
    } else if (change.direction == 'push') {
      last_seq = change.change.last_seq;
      clearStorage(last_seq);
    }
  });
  return handle;
}