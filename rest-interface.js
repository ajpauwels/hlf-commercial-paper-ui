var restServer = {};
var http = require('http');
var util = require('./util.js');

restServer.setServerConfig = function(config) {
	restServer.serverConfig = config;
}

restServer.issueNewPaper = function(par, quantity, discount, maturity, issuingCompanyName, cb) {
	var postParams = JSON.stringify({
		CUSIP: '000000',
		par: par,
		quantityIssued: quantity,
		discount: discount,
		maturity: maturity,
		issuer: 'resource:fabric.ibm.commercialpaper.Company#' + issuingCompanyName,
		issuedTimestamp: new Date()
	});


	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/IssuePaper?access_token=' + restServer.serverConfig.token,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(postParams)
		}
	};

	var req = http.request(reqOptions, (res) => {
		var data = '';
		res.setEncoding('utf8');

		res.on('data', (chunk) => {
			data += chunk;
		});

		res.on('end', () => {
			var dataObj = null;

			if (data.length > 0) {
				dataObj = JSON.parse(data);
			}

			cb(req, dataObj, null);
		});
	});

	req.on('error', (err) => {
		cb(req, null, err);
	});

	req.write(postParams);
	req.end();
}

restServer.setDefaultIdentity = function(walletID, userID, cb) {
	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/wallets/' + walletID + '/identities/' + userID + '/setDefault?access_token=' + restServer.serverConfig.token,
		method: 'POST'
	};

	var req = http.request(reqOptions, (res) => {
		var data = '';

		res.setEncoding('utf8');

		res.on('data', (chunk) => {
			data += chunk;
		});
		
		res.on('end', () => {
			var dataObj = {};
			if (data.length > 0) {
				dataObj = JSON.parse(data);
			}

			cb(req, dataObj, null);
		});
	});

	req.on('error', (err) => {
		cb(req, null, err);
	});
	
	req.end();
}

restServer.getWallets = function(cb) {
	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/wallets?access_token=' + restServer.serverConfig.token,
		method: 'GET'
	};

	var req = http.request(reqOptions, (res) => {
		var data = '';

		res.setEncoding('utf8');

		res.on('data', (chunk) => {
			data += chunk;
		});

		res.on('end', () => {
			var dataObj = JSON.parse(data);
			cb(req, dataObj, null);
		});		
	});

	req.on('error', (err) => {
		cb(req, null, err);
	});

	req.end();
}

restServer.getIdentitiesInWallet = function(walletID, cb) {
	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/wallets/' + walletID + '/identities?access_token=' + restServer.serverConfig.token,
		method: 'GET'
	};

	var req = http.request(reqOptions, (res) => {
		var data = '';

		res.setEncoding('utf8');

		res.on('data', (chunk) => {
			data += chunk;
		});

		res.on('end', () => {
			var dataObj = JSON.parse(data);
			cb(req, dataObj, null);
		});
	});

	req.on('error', (err) => {
		cb(req, null, err);
	});

	req.end();
}

restServer.getAllIdentities = function(cb) {
	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/system/identities?access_token=' + restServer.serverConfig.token,
		method: 'GET'
	};

	var req = http.request(reqOptions, (res) => {
		var data = '';

		res.on('data', (chunk) => {
			data += chunk;
		});

		res.on('end', () => {
			var dataObj = JSON.parse(data);

			cb(req, dataObj, null);
		});
	});

	req.on('error', (err) => {
		cb(req, null, err);
	});

	req.end();
}

restServer.getAllIssuedPapers = function(cb) {
	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/CommercialPaper?access_token=' + restServer.serverConfig.token,
		method: 'GET'
	};

	var req = http.request(reqOptions, (res) => {
		var data = '';

		res.on('data', (chunk) => {
			data += chunk;
		});

		res.on('end', () => {
			var dataObj = null;

			if (data.length > 0) {
				dataObj = JSON.parse(data);
			}

			cb(req, dataObj, null);
		});
	});

	req.on('error', (err) => {
		cb(req, null, err);
	});

	req.end();
}

restServer.handleErrors = function(req, res, httpErr) {
	var error = {};

	if (httpErr) {
		var httpErrMsg = "Could not " + req.method + " to " + req.originalURL + " due to: " + httpErr.toString();

		error.type = util.ERROR_TYPES.COMPOSER_REST_HTTP_ERROR;
		error.msg = httpErrMsg;

		return error;
	}

	if (res.error) {
		var restErrMsg = "Could not " + req.method + " to " + req.originalURL + " due to: " + res.error.message;

		error.type = util.ERROR_TYPES.COMPOSER_REST_ERROR;

		if (res.error.statusCode == 401) {
			error.subtype = util.COMPOSER_REST_ERROR_TYPES.AUTH;
		}
		else if (res.error.statusCode == 500) {
			error.subtype = util.COMPOSER_REST_ERROR_TYPES.ENROLL;
		} else {
			error.subtype = util.COMPOSER_REST_ERROR_TYPES.OTHER;
		}
		error.msg = restErrMsg;

		return error;
	}

	return null;
}


module.exports = restServer;
