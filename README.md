Thrifty Sync for PouchDB
=====

This PouchDB plugin aims at improving the performance of synchronization with a remote database.

**It is still in an early stage of development, use it at own risk!
Also, please notice that this plugin is not suited for all scenarios (see below).**

What does this plugin do?
----

Mainly it tries to minimize the number of requests a remote database during two-way sync.
- The standard PouchDB two-way synchronization isn't but two one-way replications that don't interact with each other. This leads to unnecessary \_revs_diff requests that this plugin avoids.

When should I use it?
----
This plugin can be used if you are performing a two-way synchronization from PouchDB to a remote database of which you know that it will never get recreated (thrifty sync is not able to detect a newly created database, thus potentially leading to missing documents in the remote database).

Usage
----
Just replace `sync` with `thriftySync`:

    import PouchDBThrifty from 'pouchdb-thrifty';

    PouchDB.plugin(PouchDBThrifty);

    var localDB = new PouchDB('foo');
    localDB.thriftySync(remoteDB, options, callback);
