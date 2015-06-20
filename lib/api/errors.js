'use strict';

function ValidationError(message, validation) {
	this.name = 'ValidationError';
	this.message = message || 'The input is invalid.';
	this.validation = validation || {};
}
ValidationError.prototype = new Error();
ValidationError.prototype.httpStatusCode = 400;
ValidationError.prototype.constructor = ValidationError;
ValidationError.prototype.logLevel = 'info';
ValidationError.prototype.toJSON = function(){
	return { error: this.name, message: this.message, validation: this.validation };
};


function NotFoundError(message) {
	this.name = 'NotFoundError';
	this.message = message || 'Resource not found.';
}
NotFoundError.prototype = new Error();
NotFoundError.prototype.httpStatusCode = 404;
NotFoundError.prototype.constructor = NotFoundError;
NotFoundError.prototype.logLevel = 'info';
NotFoundError.prototype.toJSON = function(){
	return { error: this.name, message: this.message };
};


function UnauthorizedError(message) {
	this.name = 'UnauthorizedError';
	this.message = message || 'You must be logged in..';
}
UnauthorizedError.prototype = new Error();
UnauthorizedError.prototype.httpStatusCode = 401;
UnauthorizedError.prototype.constructor = UnauthorizedError;
UnauthorizedError.prototype.logLevel = 'info';
UnauthorizedError.prototype.toJSON = function(){
	return { error: this.name, message: this.message };
};


function ForbiddenError(message) {
	this.name = 'ForbiddenError';
	this.message = message || 'You lack permissions to do that.';
}
ForbiddenError.prototype = new Error();
ForbiddenError.prototype.httpStatusCode = 403;
ForbiddenError.prototype.constructor = ForbiddenError;
ForbiddenError.prototype.logLevel = 'info';
ForbiddenError.prototype.toJSON = function(){
	return { error: this.name, message: this.message };
};


function ConflictError(message) {
	this.name = 'ConflictError';
	this.message = message || 'Unable to proceed because of a duplicate record.';
}
ConflictError.prototype = new Error();
ConflictError.prototype.httpStatusCode = 409;
ConflictError.prototype.constructor = ConflictError;
ConflictError.prototype.logLevel = 'info';
ConflictError.prototype.toJSON = function(){
	return { error: this.name, message: this.message };
};

module.exports = {
	ValidationError: ValidationError,
	ConflictError: ConflictError,
	UnauthorizedError: UnauthorizedError,
	ForbiddenError: ForbiddenError
};