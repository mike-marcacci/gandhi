error_codes = {
	100 : 'Continue',
	101 : 'Switching Protocols',
	102 : 'Processing',
	200 : 'OK',
	201 : 'Created',
	202 : 'Accepted',
	203 : 'Non-Authoritative Information',
	204 : 'No Content',
	205 : 'Reset Content',
	206 : 'Partial Content',
	207 : 'Multi-Status',
	300 : 'Multiple Choices',
	301 : 'Moved Permanently',
	302 : 'Found',
	303 : 'See Other',
	304 : 'Not Modified',
	305 : 'Use Proxy',
	306 : 'Switch Proxy',
	307 : 'Temporary Redirect',
	400 : 'Bad Request',
	401 : 'Unauthorized',
	402 : 'Payment Required',
	403 : 'Forbidden',
	404 : 'Not Found',
	405 : 'Method Not Allowed',
	406 : 'Not Acceptable',
	407 : 'Proxy Authentication Required',
	408 : 'Request Timeout',
	409 : 'Conflict',
	410 : 'Gone',
	411 : 'Length Required',
	412 : 'Precondition Failed',
	413 : 'Request Entity Too Large',
	414 : 'Request-URI Too Long',
	415 : 'Unsupported Media Type',
	416 : 'Requested Range Not Satisfiable',
	417 : 'Expectation Failed',
	418 : 'I\'m a teapot',
	422 : 'Unprocessable Entity',
	423 : 'Locked',
	424 : 'Failed Dependency',
	425 : 'Unordered Collection',
	426 : 'Upgrade Required',
	449 : 'Retry With',
	450 : 'Blocked by Windows Parental Controls',
	500 : 'Internal Server Error',
	501 : 'Not Implemented',
	502 : 'Bad Gateway',
	503 : 'Service Unavailable',
	504 : 'Gateway Timeout',
	505 : 'HTTP Version Not Supported',
	506 : 'Variant Also Negotiates',
	507 : 'Insufficient Storage',
	509 : 'Bandwidth Limit Exceeded',
	510 : 'Not Extended'
}


module.exports = function(req, res, next){

	// time the request
	req.start = process.hrtime();

	res.error = function error(code, err, message){
		if(!err){
			if(message){
				err = message;
			} else if(typeof code == 'number'){
				err = message = error_codes[code];
			} else {
				err = message = code;
				code = 500;
			}
		} else if(!message){
			message = 'string' == typeof err ? err : err.message || error_codes[code];
		}

		// log the error
		console.error(err);


		if(typeof message == 'string')
			message = {message: message};

		if(req.start)
			res.set( 'Took', (process.hrtime(req.start)[1] / 1000000).toFixed(4) + "ms");


		res.send(code, message);
	};

	res.data = function data(code, data){
		
		if(!data && typeof code != 'number')
				data = code;

		if(typeof code != 'number')
			code = 200;


		if(req.start)
			res.set( 'Took', (process.hrtime(req.start)[1] / 1000000).toFixed(4) + "ms");

		// if(data && data.constructor.name == 'Array')
		// 	meta.count = data.length;

		// send the response
		return res.send(code, data);
	};
	
	next();
};


