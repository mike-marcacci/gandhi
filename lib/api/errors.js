'use strict';

function ValidationError(message, validation) {
	this.name = 'ValidationError';
	this.message = message || 'The input is invalid.';
	this.validation = validation || {};
	this.code = 400;
}
ValidationError.prototype = new Error();
ValidationError.prototype.constructor = ValidationError;


function NotFoundError(message) {
	this.name = 'NotFoundError';
	this.message = message || 'Resource not found.';
	this.code = 404;
}
NotFoundError.prototype = new Error();
NotFoundError.prototype.constructor = NotFoundError;


function UnauthorizedError(message) {
	this.name = 'UnauthorizedError';
	this.message = message || 'You must be logged in..';
	this.code = 401;
}
UnauthorizedError.prototype = new Error();
UnauthorizedError.prototype.constructor = UnauthorizedError;


function ForbiddenError(message) {
	this.name = 'ForbiddenError';
	this.message = message || 'You lack permissions to do that.';
	this.code = 403;
}
ForbiddenError.prototype = new Error();
ForbiddenError.prototype.constructor = ForbiddenError;


function ConflictError(message) {
	this.name = 'ConflictError';
	this.message = message || 'Unable to proceed because of a duplicate record.';
	this.code = 409;
}
ConflictError.prototype = new Error();
ConflictError.prototype.constructor = ConflictError;

module.exports = {
	ValidationError: ValidationError,
	ConflictError: ConflictError,
	UnauthorizedError: UnauthorizedError,
	ForbiddenError: ForbiddenError
};