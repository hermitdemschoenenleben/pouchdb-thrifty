import PouchDB from 'pouchdb';

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

export function thriftySync(source, target, options={}) {
  options.push = options.push || {};
  let oldFilter = options.push.filter || (() => true);
  options.push.filter = doc => oldFilter(doc) && filterPush(doc);

  let pullOptions = options.pull,
      pushOptions = options.push;

  delete options.pull;
  delete options.push;

  pullOptions = Object.assign({}, pullOptions, options);
  pushOptions = Object.assign({}, pushOptions, options);

  let pushHandle = PouchDB.replicate(source, target, pushOptions),
      pullHandle = PouchDB.replicate(target, source, pullOptions);

  let last_seq = 0;

  pullHandle = pullHandle.on('change', change => {
    try {
      addDocsToStore(change.docs, last_seq);
    } catch(e) {
      console.error(e);
    }
  });

  pushHandle = pushHandle.on('change', change => {
    try {
      last_seq = change.last_seq;
      clearStorage(last_seq);
    } catch(e) {
      console.error(e);
    }
  });

  return {
    pull: pullHandle,
    push: pushHandle
  };
}
