
(function (window) {
    var jinq = window.jinq,
        $ = window.jQuery;
        
    if (typeof jinq === 'undefined') {
        throw 'jinq is required';
    }
    
    jinq.prototype.setRequestCreator(function (url) {
        var ctx = this;
        
        // this._options - object that passed within constructor parameters
        if (!this._options['dataType']) {
            this._options['dataType'] = 'json';
        }
        
        $.ajax(url, $.extend(this._options, {
            'success' : function(result) {
                ctx.endRequestHandler(true, result);
            },
            'error' : function() {
                ctx.endRequestHandler(false);
            }
        }));
    });
})(this)


