'use strict';

var e = require('./errors.js');


function parseError(err) {

	// parse a query error
	if(typeof err.msg === 'string') try {
		err = JSON.parse(err.msg);
	} catch(e) {}

	switch(err.code){
		case 400:
			err = new e.ValidationError(err.message, err.validation);
			break;
		case 404:
			err = new e.NotFoundError(err.message);
			break;
		case 401:
			err = new e.UnauthorizedError(err.message);
			break;
		case 403:
			err = new e.ForbiddenError(err.message);
			break;
		case 409:
			err = new e.ConflictError(err.message);
			break;
	}

	return err;
}

return {
	parseError: parseError,
	throwError: function(err){ throw parseError(err); }
};