var isClient = true;
if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
	isClient = false;
    }
}

if (!isClient) {
    async = require("async"),
	_ = require("lodash");
}

function ibrick() {};

ibrick.prototype.init = function(conf) {
	this._unique = 0;
	this._hooks = {};
	this._hqueue = {};
};

ibrick.prototype.addHook = function(key, tag, deps, cb) {
	if (this._hooks[key] === undefined) {
		this._hooks[key] = [];
	}

	if (tag === undefined) {
		tag = 'id-' + (++this._unique); 
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

ibrick.prototype._runHook = function(key, env, input, output, complete) {
	if (env === undefined) {
		env = {};
	}
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

	var hooks = this._hooks[key] || [];

	var queue = {
		'@env': function(callback) {
			callback(null, env);
		},
		'@data': function(callback) {
			callback(null, input);
		},
		'@out': function(callback) {
			callback(null, output);
		}
	};

	var self = this;
	hooks.every(function(hook) {
		var deps = [],
		_deps = hook.deps;
		_deps.every(function(dep) {
			var found = false;
			hooks.every(function(_hook) {
				if (_hook.tag === dep) {
					found = true;
					return false;
				}
				return true;
			});
			if (!found) {
				throw new Error("ibrick.js: Unmet dependency for hook:" + key + ", dep:" + dep);
			}
			deps.push(dep);
			return true;
		});
		queue[hook.tag] = ['@env', '@data', '@out'].concat(deps).concat([hook.cb]);
		return true;
	});

	async.auto(queue, function(err) {
		if (typeof complete === 'function') {
			complete(err, err ? undefined : output);
		}
	});
};

ibrick.prototype.runHook = function() {
	var args = arguments,
	key = args[0],
	env = _.isObject(args[1]) ? args[1] : {},
	data = _.isObject(args[2]) ? args[2] : {},
	out = _.isObject(args[3]) ? args[3] : {},
	callback = args[4];

	var qid;
	if (env.qid) {
		qid = env.qid
		if (_.isArray(this._hqueue[qid])) {
			this._hqueue[qid].push([key, env, data, out, callback]);
			return;
		}
		this._hqueue[qid] = [];
	}
	delete env.qid;

	var run = function(key, env, data, out, callback) {
		var asq = {};
		if (this.hasHook(key + 'Before')) {
			asq.pre = function(next) {
				this._runHook(key + 'Before', env, data, out, next);
			}.bind(this);
		}
		asq.hook = function(next) {
			this._runHook(key, env, data, out, next)
		}.bind(this);
		if (this.hasHook(key + 'After')) {
			asq.post = function(next) {
				this._runHook(key + 'After', env, data, out, next);
			}.bind(this);
		}
		async.series(
			asq, 
			function(err, res) {
				if (_.isArray(this._hqueue[qid])) {
					if (this._hqueue[qid].length) {
						var chook = this._hqueue[qid].pop();
						_.defer(run, chook[0], chook[1], chook[2], chook[3]);
					}
					if (!this._hqueue[qid].length) {
						delete this._hqueue[qid];
					} 
				}
				if (err) {
					callback(err);
					return;
				}
				callback(null, asq.post ? res.post : res.hook);
			}.bind(this)
		);
	}.bind(this);

	run(key, env, data, out, callback);
};

if (!isClient) {
    module.exports = ibrick;
}
