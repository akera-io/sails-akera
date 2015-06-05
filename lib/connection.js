var gnc = require('ganimede-net');

Connection = module.exports = function Connection(config, def) {
    var self = this;
    var defs = def;
    this.config = config || {};
    this._RESULT = null;
    this._HANDLER = null;
    this._CURRENT_MODEL = null;
    this._MODEL_KEYS = {};

    this.define(defs);
    //connects to a Ganimede Server
    this.connect = function connect(cb) {
        var self = this;
        if (self._CONNECTION) {
            cb(null);
            return;
        }
        this._INIT = false;

        gnc.Connection.connect(this.config, function(err, gnmConn) {
            if (err) {
                cb(err);
            } else {
                self._CONNECTION = gnmConn;
                self._conn_write(gnmConn, cb);
                cb();
            }
        });
    };

    //queries the Ganimede Server
    this.query = function query(qry, qryString, cb) {
        var self = this;
        this._REQUEST = qry;
        var chr1 = String.fromCharCode(1);
        this.connect(function(err) {

            if (err) {
                cb(err);
            } else {
                self._HANDLER = cb;
                console.log('qryString' + qryString);
                self._CONNECTION.write(1, qry + chr1 + qryString, function(err) {
                    if (err) {
                        cb(err);
                    }
                });
            }

        });
    };
    //closes any active connection
    this.close = function(cb){
    	if(this._CONNECTION ===null)cb();
    	else{
    		this._CONNECTION = null;
    		cb();
    	}
    };

};
Connection.prototype._responseFormatters = {};
//private function to format the response for a specific qryType
Connection.prototype._formatResponse = function formatResponse(qryType, response, callback) {
    this._responseFormatters.modelKeys = this._MODEL_KEYS[this._CURRENT_MODEL];
    if (this._responseFormatters[qryType])
        this._responseFormatters[qryType](response, callback);
    else
        callback(response);
};

//formatResponse - for FIND ALL
Connection.prototype._responseFormatters.adm_query_select_all = function(response, callback) {
    if (response.type === 0) {
        callback(response.data);
    } else {
        var ret = [];
        var chr2 = String.fromCharCode(2);
        var chr1 = String.fromCharCode(1);
        var data = response.data.split(chr2);

        for (var i in data) {
            var value = data[i].split(chr1);
            var toPush = {};
            for (var j in value) {
                toPush[this.modelKeys[j]] = value[j];
            }
            ret.push(toPush);
        }
        callback(null, ret);
    }

};
//formatResponse - for Update
Connection.prototype._responseFormatters.adm_query_update = function(response, callback) {
    var err = null;
    var ret = {};
    if (response.type === 0 || response.data === '0') {
        err = 'Request failed : Can\'t find any matching row';
    } else {
        var chr1 = String.fromCharCode(1);
        var count = 0;
        var val = response.data.split(chr1);
        var fields = this.modelKeys;
        for (var k in fields) {
            ret[fields[k]] = val[count];
            count++;
        }
    }
    callback(err,ret);
};

//formatResponse - for Destroy
Connection.prototype._responseFormatters.adm_query_delete = function(response, callback) {
    if (response.type == 1) {
        callback(null, response.data);
    } else {
        callback(response.data);
    }
};
//formatResponse - for COUNT
Connection.prototype._responseFormatters.adm_query_select_count = function(response, callback) {
    if (response.type == 1) {
        callback(null, response.data);
    } else {
        callback(response.data);
    }
};
//formatResponse - for CREATE
Connection.prototype._responseFormatters.adm_query_insert = function(response, callback) {
    if (response.type === 0) {
        callback(response.data);
    } else {
        var chr1 = String.fromCharCode(1);
        var ret = {};
        var data = response.data.split(chr1);
        for (var i in data) {
            ret[this.modelKeys[i]] = data[i];
        }
        callback(null, ret);
    }
};
//private function for writing to a Ganimede Server
Connection.prototype._conn_write = function(gnmConn, cb) {
    var self = this;
    gnmConn.write(1, '', function(err) {
        if (err) {
            cb(err);
            return;
        } else {
            console.log('CONNECTED');
            self._conn_onMessage(gnmConn);
            self._conn_onEnd(gnmConn);
        }
    });
};
//private function for receiving message from a Ganimede Server
Connection.prototype._conn_onMessage = function(gnmConn) {
    var self = this;
    gnmConn.on('message', function(type, data) {
        if (!self._INIT)
            self._INIT = true;
        else {
            var firstMsg = self._RESULT === null;
            console.log('First msg: ' + firstMsg);
            if (firstMsg)
                self._RESULT = {};

            self._RESULT.type = type;
            if (data) {
                console.log('in data');
                self._RESULT.data = data.toString('utf8');

            }
            firstMsg = false;
            if (!firstMsg && self._HANDLER) {
                console.log('------------------');
                console.log('call callback: ');
                console.log('------------------');
                //calls the callback after the response is formated
                self._formatResponse(self._REQUEST, self._RESULT, function(err, ret) {
                    if (err) {
                        self._HANDLER(err, ret);
                    } else {
                        self._HANDLER(null, ret);
                    }
                    self._RESULT = null;
                });

                self._RESULT = null;
            }
        }
    });
};
//private function for terminating the connection to a Ganimede Server
Connection.prototype._conn_onEnd = function(gnmConn) {
    var self = this;
    gnmConn.on('end', function() {
        self._CONNECTION = null;
    });
};
//makes a copy of all the available models fields
Connection.prototype.define = function(models) {
    for (var key in models) {
        var modelName = key;
        var modelProp = [];
        var fields = models[key].definition;
        for (var field in fields) {
            	modelProp.push(field);
        }
        this._MODEL_KEYS[modelName] = modelProp;
    }
};
