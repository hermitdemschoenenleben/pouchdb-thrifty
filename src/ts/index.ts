import {thriftySync, initStore} from './sync_thrifty';
import * as PouchDBUpsert from 'pouchdb-upsert';
console.debug('UPS', PouchDBUpsert);


export default function plugin(PouchDB) {
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


declare var window;

/* istanbul ignore next */
if (typeof window !== 'undefined' && window.PouchDB) {
  window.PouchDB.plugin(plugin);
}
