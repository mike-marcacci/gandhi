'use strict';

var e = require('./errors.js');


function parseError(err) {

	// parse a query error
	if(typeof err.msg === 'string') try {
		err = JSON.parse(err.msg);
	} catch(e) {}

	switch(err.error){
		case 'ValidationError':
			err = new e.ValidationError(err.message, err.validation);
			break;
		case 'NotFoundError':
			err = new e.NotFoundError(err.message);
			break;
		case 'UnauthorizedError':
			err = new e.UnauthorizedError(err.message);
			break;
		case 'ForbiddenError':
			err = new e.ForbiddenError(err.message);
			break;
		case 'LockedError':
			err = new e.LockedError(err.message);
			break;
		case 'ConflictError':
			err = new e.ConflictError(err.message);
			break;
	}

	return err;
}

module.exports = {
	parseError: parseError,
	throwError: function(err){ throw parseError(err); }
};