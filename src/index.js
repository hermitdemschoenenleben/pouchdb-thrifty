import {thriftySync} from './sync_thrifty';

export default function plugin(PouchDB) {
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
