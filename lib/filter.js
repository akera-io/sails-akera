 Filter = module.exports = function() {
     this._MODEL_KEYS = null;
     var chr2 = String.fromCharCode(2);
     var chr1 = String.fromCharCode(1);

     //constructs a findAll query for the current model based on the given filter
     this.findAll = function(model, filter, cb) {

         //sets the current model and the model fields in case of find all
         this._argFormatter.currentModel = model;
         this._argFormatter.keys = this._MODEL_KEYS;

         //formats the arguments in a correct query string
         this._formatArgs(filter, function(args) {
             var qryParams = model + args.chr1 +
                 args.where + args.chr1 + args.reqFields + args.chr1 +
                 args.orderBy + args.chr1 + args.from + args.chr1 + args.limit;
             cb(qryParams);
         });
     };
     //constructs a create query for the current model based on the given filter and data
     this.create = function(model, data, cb) {
         var fieldList = '';
         var count = 0;
         for (var key in data) {
             if (count > 0) {
                 fieldList += ',' + key;
             } else {
                 fieldList += key;
                 count++;
             }
         }
         var values = '';
         count = 0;
         for (var k in data) {
             if (count > 0) {
                 values += chr2 + data[k];
             } else {
                 values += data[k];
                 count++;
             }
         }
         var qryString = model + chr1 + fieldList + chr1 + values + chr1 + true + chr1 + '1';
         cb(qryString);
     };
     //constructs a count query for the current model based on the given filter
     this.count = function(model, data, cb) {
         this._argFormatter.currentModel = model;
         this._argFormatter.keys = this._MODEL_KEYS;
         this._formatArgs(data, function(args) {
             var qryParams = model + args.chr1 + args.where;
             cb(qryParams);
         });
     };
     //constructs a delete query for the current model based on the given filter
     this.destroy = function(model, data, cb) {
         if (data.where)
             data = data.where;
         var where = '';
         var count = 0;
         for (var key in data) {
             if (count > 0) {
                 where += ' and ';
             } else {
                 where += key + ' = "' + data[key] + '"';
             }
         }
         var qryParams = model + chr1 + where + chr1;
         cb(qryParams);
     };
     //constructs a update query for the current model based on the given filter and data
     this.update = function(model, fld, val, cb) {
         this._formatFieldsVals(val, function(data) {
             var args = data;
             var where = '';
             var count = 0;
             if(fld.where){
             	fld = fld.where;
             }
             for (var key in fld) {
                 if (count > 0)
                     where += ' and ';
                 where += key + ' = "' + fld[key] + '"';
                 count++;
             }
             var qryParams = model + chr1 + where + chr1 + args.fields + chr1 + args.vals + chr1 + true + chr1 + '1';
             cb(qryParams);
         });
     };
 };

 Filter.prototype._argFormatter = {};
 Filter.prototype._formatFieldsVals = function(val, cb) {
 	var chr2 = String.fromCharCode(2);
     var ret = {
         fields: '',
         vals: ''
     };
     var count = 0;
     for (var k in val) {
         if (count > 0) {
             ret.fields += ',' + k;
         } else {
             ret.fields += k;
             count++;
         }
     }
     count = 0;
     for (var j in val) {
         if (count > 0) {
             ret.vals += chr2 + val[j];
         } else {
             ret.vals += val[j];
             count++;
         }
     }
     cb(ret);
 };
 Filter.prototype._formatArgs = function(filter, cb) {
     var self = this;
     self._argFormatter.getWhereString(filter, function(wh) {
         //stores all the required parameters
         var args = {
             where: wh,
             fieldList: '',
             reqFields: self._argFormatter.getFieldsString(filter) || '',
             orderBy: filter.orderBy || '',
             chr1: String.fromCharCode(1),
             limit: filter.limit || '',
             from: filter.offset || filter.skip || ''
         };
         cb(args);
     });
 };
 Filter.prototype._argFormatter._sailsWhereString = function(filter) {
     var where = '';
     var count = 0;
     if (!filter.where) return where;
     for (var i in filter.where) {
         if (count > 0)
             where += ' and ';
         where += i + ' = "' + filter.where[i] + '"';
         count++;
     }
     return where;
 };
 Filter.prototype._argFormatter.getWhereString = function(filter, cb) {
     var where = '';
     where = this._sailsWhereString(filter);
     if (cb)
         cb(where);


 };
 Filter.prototype._argFormatter.getFieldsString = function(filter) {
     var reqFields = '';
     var count = 0;
     if (filter.fields) {
         for (var key in filter.fields) {
             if (count > 0) {
                 reqFields += ',' + filter.fields[key];
             } else {
                 reqFields += filter.fields[key];
                 count++;
             }
         }
     } else {
         reqFields = this.keys[this.currentModel];
     }
     return reqFields;
 };
