var isClient = true;
if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
	isClient = false;
    }
}

if (!isClient) {
    async = require("async");
}

function ibrick() {};

ibrick.prototype.init = function(conf) {
    this._hooks = {};
};

ibrick.prototype.addHook = function(key, tag, deps, cb) {
    if (this._hooks[key] === undefined) {
	this._hooks[key] = [];
    }
    
    if (tag === undefined) {
	tag = ('id-' + Math.random()).replace('.', '');
    }
    
    deps = deps || [];
    
    var hooks = this._hooks[key];
    if (hooks.every(function(hook) {
	if (hook.tag === tag) {
	    return false;
	}
	return true;
    })) {
	hooks.push({ tag: tag, deps: deps, cb: cb });
	return true;
    }
    throw new Error("IBRICK: hook tag already existing " + key + ' ' + tag);
};

ibrick.prototype.removeHook = function(key, tag) {
    // NOT IMPLEMENTED
};

ibrick.prototype.hasHook = function(key) {
    if (this._hooks[key]) {
	return true;
    }
    return false;
};

ibrick.prototype.runHook = function(key, input, output, complete) {    
    if (input === undefined) {
	input = {};
    }
    if (output === undefined) {
	output = {};
    }
    
    if (!this.hasHook(key)) {
	complete(null, output);
	return;
    }
    
    var _hooks = this._hooks[key] || [];
    
    var hooks = {
	'@data': function(callback) {
	    callback(null, input);
	},
	'@out': function(callback) {
	    callback(null, output);
	}
    };
    
    var self = this;
    _hooks.every(function(hook) {
	var deps = [],
	    _deps = hook.deps;
	_deps.every(function(dep) {
	    var found = false;
	    _hooks.every(function(_hook) {
		if (_hook.tag === dep) {
		    found = true;
		    return false;
		}
		return true;
	    });
	    if (found) {
		deps.push(dep);
	    }
	    return true;
	});
	hooks[hook.tag] = ['@data', '@out'].concat(deps).concat([hook.cb]);
	return true;
    });
    
    async.auto(hooks, function(err) {
	if (typeof complete === 'function') {
	    complete(err, err ? undefined : output);
	}
    });
};

if (!isClient) {
    module.exports = ibrick;
}
