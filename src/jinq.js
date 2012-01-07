/*!
* Javascript INtergated Query :)
* http://dev/null
*
* Copyright 2011-2012, virpool
* Dual licensed under the MIT or GPL Version 2 licenses.
*
*/

;(function (window, $, undefined) {
    
    function jinq(collection, options) {
        if (this instanceof jinq) {
            this._collection = collection;
            this._queueCalls = [];
            this._mode = 0; // 0 - simple collection, 1 - async mode with chain of calls

            this._options = options || {};
            if (!this._options['dataType']) {
                this._options['dataType'] = 'json';
            }

            this._init();
        } else {
            return new jinq(collection, options);
        }

	    return this;
    }

    jinq.prototype = {

        _init: function() {
              if (Object.prototype.toString.call(this._collection) == "[object String]") {
                  this._mode = 1;
                  this._callbackExtracter = null;
                  this._callbackResult = null;

                  this._inProcess = true;

                  this._createRequest(this._collection);
              }
        },

        _createRequest: function(url) {
            $.ajax(url, $.extend(this._options, {
                'success' : $.proxy(function(result) {
                    if (this._testCallback('_callbackExtracter')) {
                        this._collection = this._callbackExtracter(result);
                    } else {
                        this._collection = result.list || result; // default
                    }

                    this._inProcess = false;
                }, this),
                'error' : $.proxy(function() {
                    // todo: notify about error state

                    this._collection = [];
                    this._inProcess = false;
                }, this)
            }));
        },

        _testCallback: function(callback) {
            return (this[callback] && Object.prototype.toString.call(this[callback]) == "[object Function]");
        },

        _processEndRequest: function() {
            var handler = function() {
                if (this._inProcess) {
                    setTimeout($.proxy(handler, this), 1);
                } else {
                    this._mode = 0;
                    for (var i = 0; i < this._queueCalls.length; i++) {
                        var call = this._queueCalls[i];
                        this[call.method](call.lmd);
                    }

                    if (this._testCallback('_callbackResult')) {
                        this._callbackResult(this._collection);
                    }
                }
            };
            setTimeout($.proxy(handler, this), 1);
        },

        _defaultLambda: function(e) {
            return e;
        },

        findElem: function(array, item, selector) {
            var i = 0,
                length = array.length;
            while (i < length) {
                var curItem = array[i];
                if (selector.call(curItem, curItem) === selector.call(item, item)) return true;
                i++;
            }
            return false;
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
                continue;
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
                this._queueCalls.push({'method':'select', 'lmd':lmd});
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
                this._queueCalls.push({'method':'where', 'lmd':lmd});
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
                this._queueCalls.push({'method':'orderby', 'lmd':lmd});
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
                this._queueCalls.push({'method':'orderbydesc', 'lmd':lmd});
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
                this._queueCalls.push({'method':'each', 'lmd':lmd});
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
                this._queueCalls.push({'method':'distinct', 'lmd':lmd});
                return this;
            }

            var _newCollection = [];

            for (var i = 0, _length = this._collection.length; i < _length; ++i) {
                if (!this.findElem(_newCollection, this._collection[i], lmd)) {
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
                memory += lmd.call(item, item);
            }
            return memory;
        },

        average: function(lmd) {
            var result = this.reduce(lmd);

            return result / this._collection.length;
        },

        take: function(count, isNotChain) {
            if (this._mode) {
                this._queueCalls.push({'method':'take', 'lmd':lmd});
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
                this._queueCalls.push({'method':'takeWhile', 'lmd':lmd});
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
                this._queueCalls.push({'method':'last', 'lmd':lmd});
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
                this._queueCalls.push({'method':'skip', 'lmd':lmd});
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
                this._queueCalls.push({'method':'skipWhile', 'lmd':lmd});
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
                this._queueCalls.push({'method':'reverse', 'lmd':lmd});
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

            for (var i = 0, _length = _distinctedValues.length; i < _length; i++) {
                _result[_distinctedValues[i]] = jinq(this._collection).where(function(e) {
                    return lmd.call(e, e) === _distinctedValues[i];
                }).get();
            }

            return _result;
        },

        get: function() {
            return this._collection;
        },

        callback: function(clb, clbResult) {
            this._callbackExtracter = clb;
            this._callbackResult = clbResult;
            this._processEndRequest();
        }
    }
    
    window.jinq = jinq;
})(this, jQuery)
