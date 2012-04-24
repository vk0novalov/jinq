/*!
* Javascript INtergated Query :)
* http://dev/null
*
* Copyright 2011-2012, virpool
* Dual licensed under the MIT or GPL Version 2 licenses.
*
*/

;(function (window, undefined) {
    
    var defaults = {
        'stringType'    : '[object String]',
        'functionType'  : '[object Function]',
        'arrayType'     : '[object Array]'
    };
    
    var toString = Object.prototype.toString;
    
    // -- utils
    function _isDefinedAndArray (prop) {
        return !!prop && toString.call(prop) === defaults['arrayType'];
    }
    
    function _isDefinedAndFunction (f) {
        return !!f && toString.call(f) === defaults['functionType'];
    }
    // -- end utils
    
    var _createRequest;
    
    function _processEndRequest () {
        var tester, handler = function() {
            if (this._inProcess) {
                setTimeout(tester, 1);
            } else {
                this._mode = 0;
                for (var i = 0; i < this._queueCalls.length; i++) {
                    var call = this._queueCalls[i];
                    this[call.method](call.lmd);
                }   

                if (_isDefinedAndFunction(this['_callbackResult'])) {
                    this._callbackResult.call(this._callbackContext || this, this._collection);
                }
            }
        };
        var ctx = this;
        
        tester = function () {
            handler.call(ctx);
        };
        setTimeout(tester, 10);
    }
    
    function _findElem (array, item, selector) {
        var i = 0,
            length = array.length;
        while (i < length) {
            var curItem = array[i++];
            if (selector.call(curItem, curItem) === selector.call(item, item)) return true;
        }
        return false;
    }
    
    // --- JINQ core implemenetation
    function ChainCallback (method, lmd) {
        if (!(this instanceof ChainCallback)) {
            return new ChainCallback(method, lmd);
        }
        this.method = method;
        this.lmd = lmd;
    }
    
    function jinq(collection, options, requestCreator) {
        if (!(this instanceof jinq)) {
            return new jinq(collection, options);
        }
        
        this._collection = collection;
        this._queueCalls = [];
        this._mode = 0; // 0 - simple collection, 1 - async mode with chain of calls

        if (requestCreator) {
            this._createRequest = requestCreator;
        }
        this._options = options || {};
        this._init();
        
	    return this;
    }

    jinq.prototype = {

        _init: function() {
              if (toString.call(this._collection) === defaults['stringType']) {
                  var createRequest;
                  
                  if (_isDefinedAndFunction(this._createRequest)) {
                    createRequest = this._createRequest;
                  } else if (_isDefinedAndFunction(_createRequest)) {
                    createRequest = _createRequest;
                  } else {
                    throw 'Request creator is required';
                  }
              
                  this._mode = 1;
                  this._callbackExtracter = void 0;
                  this._callbackResult = void 0;
                  this._callbackContext = void 0;

                  this._inProcess = true;

                  createRequest.call(this, this._collection);
              }
        },
        
        setRequestCreator: function (requestCreator) {
            if (_isDefinedAndFunction(requestCreator)) {
                _createRequest = requestCreator;
            }
        },
        
        endRequestHandler: function (error, result) {
            this._inProcess = false;
            
            if (error && typeof result === 'undefined') {
                this._collection = [];
                return false;
            }
        
            if (this._schema) {
                this._collection = result[this._schema];
            } else {
                this._collection = _isDefinedAndArray(result.data) || 
                    _isDefinedAndArray(result.list) || 
                    result; // default
            }
        },

        _defaultLambda: function(e) {
            return e;
        },

        _createLambdaFromString: function(lmd) {

            return function(object) {

                var path, propValue, j, pathLength;

                path = lmd.split('.');
                propValue = object;
                for (j = 0, pathLength = path.length; j < pathLength; j++) {
                    propValue = propValue[path[j]];
                    if (propValue === undefined) {
                        throw {
                            message: "fail"
                        };
                    }
                }
                return propValue;

            };

        },

        _processLambda: function(lmd) {
            return lmd ? typeof lmd == 'function' ? lmd : this._createLambdaFromString(lmd) : this._defaultLambda;
        },

        select: function(lmd) {
            if (this._mode) {
                this._queueCalls.push(ChainCallback('select', lmd));
                return this;
            }

            var _newCollection = [];

            for (var i = 0, _length = this._collection.length; i < _length; ++i) {
                var item = this._collection[i];
                _newCollection[_newCollection.length] = lmd.call(item, item);
            }
            this._collection = _newCollection;
            return this;
        },

        where: function(lmd, isNotChain) {
            if (this._mode) {
                this._queueCalls.push(ChainCallback('where', lmd));
                return this;
            }
            var _newCollection = [];

            for (var i = 0, _length = this._collection.length; i < _length; ++i) {
                var item = this._collection[i];
                if (lmd.call(item, item)) {
                    _newCollection[_newCollection.length] = this._collection[i];
                }
            }
            if (!isNotChain) {
                this._collection = _newCollection;
                return this;
            } else {
                return _newCollection;
            }
        },

        orderby: function(lmd) {
            if (this._mode) {
                this._queueCalls.push(ChainCallback('orderby', lmd));
                return this;
            }

            lmd = this._processLambda(lmd);

            this._collection = this._collection.sort(function(a, b) {
                var f = lmd.call(a, a), s = lmd.call(b, b);
                if (typeof f == 'number' && typeof s == 'number') {
                    return f - s;
                } else if (typeof f == 'boolean' && typeof s == 'boolean') {
                    return (f ? 1 : 0) - (s ? 1 : 0);
                } else {
                    return f > s;
                }
            });
            return this;
        },

        orderbydesc: function(lmd) {
            if (this._mode) {
                this._queueCalls.push(ChainCallback('orderbydesc', lmd));
                return this;
            }

            lmd = this._processLambda(lmd);

            this._collection = this._collection.sort(function(a, b) {
                var f = lmd.call(a, a), s = lmd.call(b, b);
                if (typeof f == 'number' && typeof s == 'number') {
                    return s - f;
                } else if (typeof f == 'boolean' && typeof s == 'boolean') {
                    return (s ? 1 : 0) - (f ? 1 : 0);
                } else {
                    return f < s;
                }
            });
            return this;
        },

        each: function(lmd) {
            if (this._mode) {
                this._queueCalls.push(ChainCallback('each', lmd));
                return this;
            }

            for (var i = 0, _length = this._collection.length; i < _length; ++i) {
                var item = this._collection[i];
                lmd.call(item, item);
            }
            return this;
        },

        distinct: function(lmd) {
            if (this._mode) {
                this._queueCalls.push(ChainCallback('distinct', lmd));
                return this;
            }

            var _newCollection = [];

            for (var i = 0, _length = this._collection.length; i < _length; ++i) {
                if (!_findElem.call(this, _newCollection, this._collection[i], lmd)) {
                    _newCollection.push(this._collection[i]);
                }
            }
            this._collection = _newCollection;
            return this;
        },

        reduce: function(lmd, initValue) {

            lmd = this._processLambda(lmd);

            memory = initValue && !isNaN(parseInt(initValue)) ? initValue : 0;
            for (var i = 0, _length = this._collection.length; i < _length; ++i) {
                var item = this._collection[i];
                memory += parseInt(lmd.call(item, item), 10) || 0;
            }
            return memory;
        },

        average: function(lmd) {
            var result = this.reduce(lmd);

            return result / this._collection.length;
        },

        take: function(count, isNotChain) {
            if (this._mode) {
                this._queueCalls.push(ChainCallback('take', lmd));
                return this;
            }

            var _newCollection = [];

            for (var i = 0, _length = this._collection.length; i < _length && i < count; ++i) {
                _newCollection.push(this._collection[i]);
            }
            if (!isNotChain) {
                this._collection = _newCollection;
                return this;
            } else {
                return _newCollection;
            }
        },

        takeWhile: function(lmd, isNotChain) {
            if (this._mode) {
                this._queueCalls.push(ChainCallback('takeWhile', lmd));
                return this;
            }

            var _newCollection = [];

            for (var i = 0, _length = this._collection.length; i < _length; ++i) {
                if (!lmd(this._collection[i])) break;
                _newCollection.push(this._collection[i]);
            }

            if (!isNotChain) {
                this._collection = _newCollection;
                return this;
            } else {
                return _newCollection;
            }
        },

        last: function(count, isNotChain) {
            if (this._mode) {
                this._queueCalls.push(ChainCallback('last', lmd));
                return this;
            }

            var _newCollection = [];
            var j = 0;
            for (var i = this._collection.length - 1; i >= 0 && j < count; --i, ++j) {
                _newCollection.push(this._collection[i]);
            }
            if (!isNotChain) {
                this._collection = _newCollection;
                return this;
            } else {
                return _newCollection;
            }
        },

        indexOf: function(key, lmd) {
            lmd = this._processLambda(lmd);

            for (var i = 0, _length = this._collection.length; i < _length; ++i) {
                var item = this._collection[i];
                if (key === lmd.call(item, item)) return i;
            }
            return -1;
        },

        any: function(lmd) {
            for (var i = 0, _length = this._collection.length; i < _length; ++i) {
                var item = this._collection[i];
                if (lmd.call(item, item)) {
                    return true;
                }
            }
            return false;
        },

        all: function(lmd) {
            for (var i = 0, _length = this._collection.length; i < _length; ++i) {
                 var item = this._collection[i];
                if (!lmd.call(item, item)) {
                    return false;
                }
            }
            return true;
        },

        max: function(lmd) {
            if (!this._collection.length) throw "max: length = 0";
            lmd = this._processLambda(lmd);

            var _max = lmd.call(this._collection[0], this._collection[0]);
            for (var i = 0, _length = this._collection.length; i < _length; ++i) {
                var item = this._collection[i], curElem = lmd.call(item, item);
                if (curElem > _max) {
                    _max = curElem;
                }
            }
            return _max;
        },

        min: function(lmd) {
            if (!this._collection.length) throw "min: length = 0";
            lmd = this._processLambda(lmd);

            var _min = lmd.call(this._collection[0], this._collection[0]);
            for (var i = 0, _length = this._collection.length; i < _length; ++i) {
                var item = this._collection[i], curElem = lmd.call(item, item);
                if (curElem < _min) {
                    _min = curElem;
                }
            }
            return _min;
        },

        max_: function(lmd) {
            if (!this._collection.length) throw "max_: length = 0";
            lmd = this._processLambda(lmd);

            var _max = this._collection[0];
            for (var i = 0, _length = this._collection.length; i < _length; ++i) {
                var item = this._collection[i];
                if (lmd.call(item, item) > lmd.call(_max, _max)) {
                    _max = item;
                }
            }
            return _max;
        },

        min_: function(lmd) {
            if (!this._collection.length) throw "min_: length = 0";
            lmd = this._processLambda(lmd);

            var _min = this._collection[0];
            for (var i = 0, _length = this._collection.length; i < _length; ++i) {
                var item = this._collection[i];
                if (lmd.call(item, item) < lmd.call(_min, _min)) {
                    _min = item;
                }
            }
            return _min;
        },

        skip: function(count, isNotChain) {
            if (this._mode) {
                this._queueCalls.push(('skip', lmd));
                return this;
            }

            var _newCollection = [];

            for (var i = count, _length = this._collection.length; i < _length; ++i) {
                _newCollection.push(this._collection[i]);
            }

            if (!isNotChain) {
                this._collection = _newCollection;
                return this;
            } else {
                return _newCollection;
            }
        },

        skipWhile: function(lmd, isNotChain) {
            if (this._mode) {
                this._queueCalls.push(ChainCallback('skipWhile', lmd));
                return this;
            }

            var _newCollection = [];
            var _alreadySkipped = false;
            for (var i = 0, _length = this._collection.length; i < _length; ++i) {
                if (!_alreadySkipped && lmd(this._collection[i])) continue;
                else _alreadySkipped = true;

                _newCollection.push(this._collection[i]);
            }
            if (!isNotChain) {
                this._collection = _newCollection;
                return this;
            } else {
                return _newCollection;
            }
        },

        reverse: function() {
            if (this._mode) {
                this._queueCalls.push(ChainCallback('reverse', lmd));
                return this;
            }

            this._collection = this._collection.reverse();
            return this;
        },

        first: function(lmd) {
            var collection;

            if (lmd) {
                collection = this.where(lmd, true);
            } else {
                collection = this._collection;
            }

            if (!collection.length) throw "first: length = 0";
            return collection[0];
        },

        firstOrDefault: function(lmd) {
            var collection;

            if (lmd) {
                collection = this.where(lmd, true);
            } else {
                collection = this._collection;
            }

            if (!collection.length) return null;
            return collection[0];
        },

        groupBy: function(lmd) {
            var _distinctedValues = jinq(this._collection).distinct(lmd).select(lmd).get();
            var _result = {};

            for (var i = 0, _length = _distinctedValues.length; i < _length; ++i) {
                _result[_distinctedValues[i]] = jinq(this._collection).where(function(e) {
                    return lmd.call(e, e) === _distinctedValues[i];
                }).get();
            }

            return _result;
        },

        get: function () {
            return this._collection;
        },
        
        schema: function (schema) {
            // biggest priority to extract data then _callbackExtracter
            this._schema = schema;
            return this;
        },

        callback: function(clbResult, clbContext) {
            this._callbackResult = clbResult;
            this._callbackContext = clbContext;
            _processEndRequest.call(this);
        }
    }
    
    window.jinq = jinq;
    
    jinq.utils = {
        'isDefinedAndArray'     : _isDefinedAndArray,
        'isDefinedAndFunction'  : _isDefinedAndFunction
    };
})(this)
