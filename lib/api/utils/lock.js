'use strict';

var Q = require('q');

var prefix = 'gandhi:lock:';


module.exports = function(config, resources) {


	function Lock(key){
		if(!this instanceof Lock)
			return new Lock(key);

		this.key = prefix + key;
		this.id = Math.random();
		this._locked = false;
	}

	Lock.prototype.acquire = function acquire(timeout) {
		var self = this;
		return Q.Promise(function(resolve, reject){
			if(self._locked) return reject(new Error('`acquire` has already been called on this lock.'))
			self._locked = true;
			self._attemptAcquisition(timeout ? Date.now() + timeout : null, resolve, reject);
		});
	};


	Lock.prototype.release = function release() {
		resources.redis.eval('if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end', 1, this.key, this.id, function(err, res){
			if(err) console.error(err);
		});
		
		return this;
	};


	Lock.prototype._attemptAcquisition = function _attemptAcquisition(timestamp, resolve, reject){
		var self = this;

		if(timestamp && Date.now() > timestamp)
			return reject(new Error('Acquisition timeout exceeded.'));

		// try to get a lock in redis
		resources.redis.set(this.key, this.id, 'PX', config.lock.timeout, 'NX', function(err, result) {

			// retry
			if (err || result === null)
				self._attemptAcquisition(timestamp, resolve, reject)

			// done
			else
				resolve(self);
		});
	};

	return Lock;
};