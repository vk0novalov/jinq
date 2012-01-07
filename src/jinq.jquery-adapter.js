
(function (window) {
    var jinq = window.jinq,
        $ = window.jQuery,
        jUtils;
        
    if (typeof jinq === 'undefined') {
        throw 'jinq is required';
    }
    
    jUtils = jinq.utils;

    jinq.prototype.setRequestCreator(function (url) {
        $.ajax(url, $.extend(this._options, {
            'success' : function(result) {
                if (jUtils.isDefinedAndFunction(this['_callbackExtracter'])) {
                    this._collection = this._callbackExtracter(result);
                } else {
                    this._collection = jUtils.isDefinedAndArray(result.data) || 
                        jUtils.isDefinedAndArray(result.list) || 
                        result; // default
                }
            },
            'error' : function() {
                // todo: notify about error state

                this._collection = [];
            },
            'complete' : function () {
                this._inProcess = false;
            },
            'context' : this
        }));
    });
})(this)


