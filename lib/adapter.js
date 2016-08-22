var akeraApi = require('akera-api');
var async = require('async');
var Errors = require('waterline-errors').adapter;
var Util = require('./util.js');

module.exports = (function() {

  var adapter = {
    connections : {},

    /**
     * 
     * This method runs when a model is initially registered at
     * server-start-time. This is the only required method.
     * 
     * @param {[type]}
     *          connection [description]
     * @param {[type]}
     *          collection [description]
     * @param {Function}
     *          cb [description]
     * @return {[type]} [description]
     */
    registerConnection : function(connection, collections, cb) {

      var self = this;
      // Set the version of the API
      var version = connection.version || 0;

      // Validate arguments
      if (!connection.identity) {
        return cb(Errors.IdentityMissing);
      }

      if (this.connections[connection.identity]) {
        return cb(Errors.IdentityDuplicate);
      }

      akeraApi.connect(connection).then(
        function(akeraConn) {
          try {
            var schema = {};

            for ( var collectionName in collections) {
              var collection = collections[collectionName];

              // Normalize schema into a sane object and discard all the WL
              // context
              var wlSchema = collection.waterline
                && collection.waterline.schema
                && collection.waterline.schema[collection.identity];
              var _schema = {};
              _schema.meta = collection.meta || {};
              _schema.tableName = wlSchema.tableName;
              _schema.connection = wlSchema.connection;

              // If a newer Adapter API is in use, the definition key is used to
              // build
              // queries and the attributes property can be ignored.
              //
              // In older api versions SELECT statements were not normalized.
              // Because
              // of
              // this the attributes need to be stored that so SELECTS can be
              // manually
              // normalized in the adapter before sending to the SQL builder.
              if (version > 0) {
                _schema.definition = collection.definition || {};
              } else {
                _schema.definition = collection.definition || {};
                _schema.attributes = wlSchema.attributes || {};
              }

              _schema.tableName = _schema.tableName || collectionName;

              schema[collectionName] = _schema;
            }

            akeraConn.autoReconnect = true;

            self.connections[connection.identity] = {
              config : connection,
              connection : akeraConn,
              schema : schema,
              version : version
            };

            return cb();
          } catch (err) {
            cb(err);
          }
        }, cb);

    },

    /**
     * Fired when a model is unregistered, typically when the server is killed.
     * Useful for tearing-down remaining open connections, etc.
     * 
     * @param {Function}
     *          cb [description]
     * @return {[type]} [description]
     */
    teardown : function(connectionName, cb) {
      var self = this;

      function closeConnection(connectionName, cbClose) {
        var conn = connections[connectionName];
        if (!conn)
          return cbClose();

        delete self.connections[connectionName];
        conn.connection.disconnect().then(cbClose, cbClose);
      }

      if (typeof connectionName == 'function') {
        cb = connectionName;
        connectionName = null;
      }

      // if connection name given close only that one connection else close
      // everything
      if (connectionName) {
        closeConnection(connectionName, cb);
      } else {
        return async.eachOf(self.connections, function(connection,
          connectionName, cbClose)
        {
          closeConnection(connectionName, cbClose);
        }, cb);
      }
    },

    getConnection : function(connectionName) {
      var conn = this.connections[connectionName];

      if (!conn)
        throw Errors.InvalidConnection;

      return conn;
    },

    getCollection : function(connection, collectionName) {
      var collection = connection.schema[collectionName];

      if (!collection)
        throw Errors.CollectionNotRegistered;

      return collection;
    },

    getFields : function(collection, set) {
      var self = this;

      if (collection.selectFields !== undefined)
        return collection.selectFields;

      if (!set)
        return self.getFields(collection, collection.attributes
          || collection.definition);
      else {
        collection.selectFields = [];

        for ( var attribute in set) {
          var info = set[attribute];
          collection.selectFields.push(info.columnName || attribute);
        }

        return collection.selectFields;
      }
    },

    // Return attributes
    describe : function(connectionName, collectionName, cb) {
      var self = this;

      try {
        var conn = self.getConnection(connectionName);

      } catch (err) {
        cb(err);
      }
    },
    /**
     * 
     * REQUIRED method if users expect to call Model.find(), Model.findOne(), or
     * related.
     * 
     * You should implement this method to respond with an array of instances.
     * Waterline core will take care of supporting all the other different find
     * methods/usages.
     * 
     */
    find : function(connectionName, collectionName, options, cb) {
      var self = this;

      if (typeof options === 'function') {
        cb = options;
        options = null;
      }

      options = options || {};

      try {
        var conn = self.getConnection(connectionName);
        var collection = self.getCollection(conn, collectionName);
        var qry = conn.connection.query.select(collection.tableName).fields(
          self.getFields(collection));

        if (options.where)
          qry.where(Util.adaptQueryWhere(options.where));

        if (options.limit)
          qry.limit(options.limit);
        if (options.skip)
          qry.offset(options.skip);

        if (typeof options.sort === 'object') {
          for ( var sort in options.sort) {
            qry.by(sort, options.sort[sort] !== 1);
          }
        }

        qry.all().then(function(data) {
          cb(null, data);
        }, cb);
      } catch (err) {
        cb(err);
      }
    },

    create : function(connectionName, collectionName, values, cb) {
      var self = this;

      try {
        var conn = self.getConnection(connectionName);
        var collection = self.getCollection(conn, collectionName);
        var qry = conn.connection.query.insert(collection.tableName);

        qry.set(values).fetch().then(function(data) {
          cb(null, data);
        }, cb);
      } catch (err) {
        cb(err);
      }
    },

    update : function(connectionName, collectionName, options, values, cb) {
      var self = this;

      try {
        var conn = self.getConnection(connectionName);
        var collection = self.getCollection(conn, collectionName);
        var qry = conn.connection.query.update(collection.tableName);

        if (options && options.where)
          qry.where(Util.adaptQueryWhere(options.where));

        qry.set(values).fetch().then(function(data) {
          cb(null, data);
        }, cb);

      } catch (err) {
        cb(err);
      }
    },

    destroy : function(connectionName, collectionName, options, cb) {
      var self = this;

      try {
        var conn = self.getConnection(connectionName);
        var collection = self.getCollection(conn, collectionName);
        var qry = conn.connection.query.destroy(collection.tableName);

        if (options && options.where)
          qry.where(Util.adaptQueryWhere(options.where));

        qry.go().then(function(data) {
          cb(null, data);
        }, cb);

      } catch (err) {
        cb(err);
      }
    },

    // Count one model from the collection
    // using where, limit, skip, and order
    // In where: handle `or`, `and`, and `like` queries
    count : function(connectionName, collectionName, options, cb) {
      var self = this;

      if (typeof options === 'function') {
        cb = options;
        options = null;
      }

      try {
        var conn = self.getConnection(connectionName);
        var collection = self.getCollection(conn, collectionName);
        var qry = conn.connection.query.select(collection.tableName);

        if (options && options.where)
          qry.where(Util.adaptQueryWhere(options.where));

        qry.count().then(function(data) {
          cb(null, data);
        }, cb);
      } catch (err) {
        cb(err);
      }
    },

    // Adaptor identity
    identity : 'sails-akera'
  };

  return adapter;
})();
