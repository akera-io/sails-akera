var connection = require('./connection');
var filter = require('./filter');
var gnmFilter = new filter();


module.exports = (function() {
    var gnmConn = null;
    var definitions = [];
    var adapter = {
    	//sets the connection as ADM one and defines the model keys
        registerConnection: function(conn, collections, cb) {
            console.log('Registering connection');
            if (!conn.identity) return cb('Missing Identity');
            //creates a new Active Connection
            gnmConn = new connection(conn, collections);
            gnmFilter._MODEL_KEYS = gnmConn._MODEL_KEYS;
            gnmConn.connect(function(err, state) {
                if (err) {
                    cb(err);
                } else {
                    cb();
                }
            });
        },
        //closes any active connection
        teardown: function(conn,cb){
        	if(typeof conn == 'function'){
        		cb = conn;
        		conn = null;
        	}
        	if(conn === null){
        		return cb();
        	}
        	gnmConn.close(cb);
        },
        //finds all instances of the model based on the options/filter(ex:"CustNum:1")
        find: function(connName, model, opt, cb) {
        	console.log(opt);
            gnmConn._CURRENT_MODEL = model;
            gnmFilter.findAll(model, opt, function(qryString) {
                gnmConn.query('adm_query_select_all', qryString, function(err, ret) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(null, ret);
                    }
                });
            });

        },
        //creates a model from the model data JSON 
        create: function(connName, model, data, cb) {
            gnmConn._CURRENT_MODEL = model;
            gnmFilter.create(model, data, function(qryString) {
                gnmConn.query('adm_query_insert', qryString, function(err, ret) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(null, ret);
                    }
                });
            });
        },
        //updates a model that matches the filter with the given values
        update: function(connName, model, opt, val, cb) {
        	var self = this;
            gnmFilter.update(model, opt, val, function(qryString) {
                gnmConn.query('adm_query_update', qryString, function(err, ret) {
                    if (err)
                        cb(err);
                    else {
                    	self.find(connName,model,opt,cb);
                    }
                });
            });
        },
        //deletes a model that matches the filter
        destroy: function(connName, model, opt, cb) {
            gnmFilter.destroy(model, opt, function(qryString) {
                gnmConn.query('adm_query_delete', qryString + false, function(err, ret) {
                    if (err)
                        cb(err);
                    else cb(null, ret);
                });
            });
        },
        //counts all instances of a model that matches the filter
        count: function(connName, model, opt, cb) {
            gnmFilter.count(model, opt, function(qryString) {
                gnmConn.query('adm_query_select_count', qryString, function(err, ret) {
                    if (err) {
                        cb(err);
                    } else {
                        cb(null, ret);
                    }
                });
            });
        },
        //Adaptor identity
        identity: 'sails-gnm-connector'
    };

    return adapter;
})();
