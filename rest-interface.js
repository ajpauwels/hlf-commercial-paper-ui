var restServer = {};
var http = require('http');
var util = require('./util.js');

restServer.setServerConfig = function(config) {
	restServer.serverConfig = config;
}

restServer.getAllPurchaseablePaper = function(requestingCompany, cb) {
	restServer.getAllIssuedPapers((getIssuedRes, getIssuedErr) => {
		if (getIssuedErr) {
			return cb(getIssuedRes, getIssuedErr);
		}

		restServer.getAllPaperOwnerships((getOwnedRes, getOwnedErr) => {
			if (getOwnedErr) {
				return cb(getOwnedRes, getOwnedErr);
			}

			var filteredPapers = util.filterPapersByIssuer(getIssuedRes, requestingCompany, true);
			if (filteredPapers.length == 0) {
				return cb(filteredPapers, getOwnedErr);
			}

			var paperMap = util.paperArrayToMap(filteredPapers);
			util.mergeOwnershipsAndPapers(requestingCompany, paperMap, getOwnedRes);
			var purchaseablePapers = util.paperMapToArray(paperMap);
			cb(purchaseablePapers, getOwnedErr);
		});
	});
}

restServer.getAllPaperOwnerships = function(cb) {
	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/PaperOwnership?access_token=' + restServer.serverConfig.token,
		method: 'GET',
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

			var error = restServer.handleErrors(req, dataObj, null);
			cb(dataObj, error);
		});
	});

	req.on('error', (err) => {
		var error = restServer.handleErrors(req, null, err);
		cb(null, error);
	});

	req.end();
}

restServer.purchasePaper = function(requestingCompany, cusip, quantity, cb) {
	var postParams = JSON.stringify({
		paper: 'resource:fabric.ibm.commercialpaper.CommercialPaper#' + cusip,
		buyer: 'resource:fabric.ibm.commercialpaper.Company#' + requestingCompany,
		quantity: quantity,
		quantityForSale: 0,
		timestamp: new Date()
	});

	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/PurchasePaper?access_token=' + restServer.serverConfig.token,
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

			var error = restServer.handleErrors(req, dataObj, null);
			cb(dataObj, error);
		});
	});

	req.on('error', (err) => {
		var error = restServer.handleErrors(req, null, err);
		cb(null, error);
	});

	req.write(postParams);
	req.end();
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

			var error = restServer.handleErrors(req, dataObj, null);
			cb(dataObj, error);
		});
	});

	req.on('error', (err) => {
		var error = restServer.handleErrors(req, null, err);
		cb(null, error);
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
			var dataObj = null;
			if (data.length > 0) {
				dataObj = JSON.parse(data);
			}

			var error = restServer.handleErrors(req, dataObj, null);
			cb(dataObj, error);
		});
	});

	req.on('error', (err) => {
		var error = restServer.handleErrors(req, null, err);
		cb(null, error);
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
			var dataObj = null;

			if (data.length > 0) {
				dataObj = JSON.parse(data);
			}

			var error = restServer.handleErrors(req, dataObj, null);
			cb(dataObj, error);
		});		
	});

	req.on('error', (err) => {
		var error = restServer.handleErrors(req, null, err);
		cb(null, error);
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
			var dataObj = null;

			if (data.length > 0) {
				dataObj = JSON.parse(data);
			}

			var error = restServer.handleErrors(req, dataObj, null);
			cb(dataObj, error);
		});
	});

	req.on('error', (err) => {
		var error = restServer.handleErrors(req, null, err);
		cb(null, error);
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
			var dataObj = null;

			if (data.length > 0) {
				dataObj = JSON.parse(data);
			}


			var error = restServer.handleErrors(req, dataObj, null);
			cb(dataObj, error);
		});
	});

	req.on('error', (err) => {
		var error = restServer.handleErrors(req, null, err);
		cb(null, error);
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

			var error = restServer.handleErrors(req, dataObj, null);
			cb(dataObj, error);
		});
	});

	req.on('error', (err) => {
		var error = restServer.handleErrors(req, null, err);
		cb(null, error);
	});

	req.end();
}

restServer.handleErrors = function(req, res, httpErr) {
	var error = {};

	if (httpErr) {
		var httpErrMsg = "Could not " + req.method + " to " + req.host + ":" + req.port + req.path + " due to: " + httpErr.toString();

		error.type = util.ERROR_TYPES.COMPOSER_REST_HTTP_ERROR;
		error.msg = httpErrMsg;

		return error;
	}

	if (res && res.error) {
		var restErrMsg = res.error.message;

		error.type = util.ERROR_TYPES.COMPOSER_REST_ERROR;

		if (res.error.statusCode == 401) {
			error.subtype = util.COMPOSER_REST_ERROR_TYPES.AUTH;
		}
		else if (res.error.statusCode == 500 && res.error.messae == "No enrollment ID or enrollment secret has been provided") {
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
