var REPLICATOR = 'pouchdb-thrifty';
var LOWEST_SEQ = 0;

function getLocalDB(db1, db2) {
  var local = [db1, db2].filter(function(db) {
    return db.type() !== 'http';
  })
  if (local.length != 1) {
    throw 'exactly one remote and one local database is required';
  }
  return local[0];
}

export default function Checkpointer(src, target, id, returnValue) {
  this.db = getLocalDB(src, target);
  this.remoteDB = (src == this.db) ? target : src;
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
  let lastSeq;

  return this.db.get(this.id)
    .then(localDoc => localDoc.last_seq)
    .catch(err => {
      if (err.status === 404) {
        return this.db.put({
          _id: this.id,
          last_seq: LOWEST_SEQ
        }).then(function () {
          return LOWEST_SEQ;
        })
      } else {
        throw err;
      }
    })
    .then(value => {
      lastSeq = value;

      /*
      Sync calls getCheckpoint in the beginning. Normally, this fetches a document
      containing the last revision from the remote server. If connection to the
      remote server does not succeed, this throws an error that is caught afterwards
      and a backoff is started.

      However, thriftySync does not use a remote document. Therefore, if there's
      no connection, this remains unknown and an error occurs later inside
      PouchDB that is not well caught --> the backoff is not working properly and
      the server is spammed.

      In order to prevent this, we make one call to a non-existing document on the
      remote server which tests the connection. If this fails, we throw an error
      in order to enable the backoffed retries.
      */

      return this.remoteDB.get('thisisadocumentthatshouldneverexist');
    }).catch(err => {
      if (err.status !== 404) {
        throw err;
      }
    })
    .then(_ => lastSeq)
};
