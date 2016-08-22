module.exports = Util;

var akera = require('akera-api');
var f = akera.query.filter;

function Util() {}

// var u = require('./lib/util.js');
// console.log(u.adaptQueryWhere({ city: [ 'Cluj', 'Atlanta' ] }));
// console.log(u.adaptQueryWhere({ city: {'!': [ 'Cluj', 'Atlanta' ] }}));

Util.OperatorsMap = {
  '!' : f.operator.ne,
  '<' : f.operator.lt,
  '<=' : f.operator.le,
  '>' : f.operator.gt,
  '>=' : f.operator.ge,
  'like' : f.operator.matches,
  'contains' : f.operator.contains,
  'startsWith' : f.operator.matches,
  'endsWith' : f.operator.matches
};

Util.getFilterCriteria = function(field, value) {
  if (typeof value !== 'object') {
    return f.eq(field, value);
  } else {
    if (value instanceof Array) {
      // IN filter
      return f.or(value.map(function(val) {
        return f.eq(field, val);
      }));
    } else {
      for ( var oper in value) {
        value = value[oper];

        switch (oper) {
          case 'like':
            value = value.replace(/%/g, '*');
            break;
          case 'startsWith':
            value = value + '*';
            break;
          case 'endsWith':
            value = '*' + value;
            break;
          case '!':
            // not IN filter
            if (value instanceof Array) {
              return f.and(value.map(function(val) {
                return f.ne(field, val);
              }));
            }
            break;
          default:
            break;
        }

        var akeraOp = Util.OperatorsMap[oper];

        if (akeraOp)
          return f[akeraOp](field, value);

        throw new Error('Invalid filter operator.');
      }
    }
  }
}

Util.adaptQueryWhere = function(where, append) {
  var keys = Object.keys(where);

  if (keys.length === 1) {
    if (keys[0] === 'or') {
      var query = {};
      query[f.operator.or] = [];

      Util.adaptQueryWhere(where.or, query.or);

      return query;
    } else {
      return Util.getFilterCriteria(keys[0], where[keys[0]]);
    }
  } else {
    if (append) {
      for ( var field in where) {
        append.push(Util.getFilterCriteria(field, where[field]));
      }
    } else {
      var query = {};
      query[f.operator.and] = [];

      Util.adaptQueryWhere(where, query.and);

      return query;
    }
  }

  return append;
}
