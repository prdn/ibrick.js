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
		tag = ('id-' + Math.random()).replace('.', '')
	}	

	var hooks = this._hooks[key];
	if (hooks.every(function(hook) {
		if (hook.tag === tag) {
			return false;
		}
		return true;
	})) {
		hooks.push({tag: tag, deps: deps, cb: cb});
		return true;
	}
	return false;
};

ibrick.prototype.removeHook = function(key, tag) {
	// NOT IMPLEMENTED
};

ibrick.prototype.runHook = function(key, input, output, complete) {
	var self = this;

	if (input === undefined) {
		input = {};
	}
	if (output === undefined) {
		output = {};
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

	_hooks.every(function(hook) {
		hooks[hook.tag] = ['@data', '@out'].concat(hook.deps || []).concat([hook.cb]);
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
