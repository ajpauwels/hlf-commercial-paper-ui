var restServer = {};
var http = require('http');
var util = require('./util.js');

restServer.setServerConfig = function(config) {
	restServer.serverConfig = config;
}

restServer.sellPaper = function(company, cusip, quantity, token, cb) {
	var postParams = JSON.stringify({
		ownership: 'resource:' + restServer.serverConfig.namespace + '.PaperOwnership#' + company + ',' + cusip,
		quantityToSell: quantity
	});

	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/SellPaper?access_token=' + token,
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

restServer.getAllPurchaseablePaper = function(requestingCompany, token, cb) {
	restServer.getAllIssuedPapers(token, (getIssuedRes, getIssuedErr) => {
		if (getIssuedErr) {
			return cb(getIssuedRes, getIssuedErr);
		}

		restServer.getAllPaperOwnerships(token, (getOwnedRes, getOwnedErr) => {
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

restServer.getAllPaperOwnerships = function(token, cb) {
	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/PaperOwnership?access_token=' + token,
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

restServer.purchasePaper = function(requestingCompany, cusip, quantity, token, cb) {
	var postParams = JSON.stringify({
		paper: 'resource:' + restServer.serverConfig.namespace + '.CommercialPaper#' + cusip,
		buyer: 'resource:' + restServer.serverConfig.namespace + '.Company#' + requestingCompany,
		quantity: quantity,
		quantityForSale: 0,
		timestamp: new Date()
	});

	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/PurchasePaper?access_token=' + token,
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

restServer.issueNewPaper = function(par, quantity, discount, maturity, issuingCompanyName, token, cb) {
	var postParams = JSON.stringify({
		CUSIP: '000000',
		par: par,
		quantityIssued: quantity,
		discount: discount,
		maturity: maturity,
		issuer: 'resource:' + restServer.serverConfig.namespace + '.Company#' + issuingCompanyName,
		issuedTimestamp: new Date()
	});


	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/IssuePaper?access_token=' + token,
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

restServer.setDefaultIdentity = function(walletID, userID, token, cb) {
	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/wallets/' + walletID + '/identities/' + userID + '/setDefault?access_token=' + token,
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

restServer.getWallets = function(token, cb) {
	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/wallets?access_token=' + token,
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

restServer.getIdentitiesInWallet = function(walletID, token, cb) {
	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/wallets/' + walletID + '/identities?access_token=' + token,
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

restServer.getAllIdentities = function(token, cb) {
	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/system/identities?access_token=' + token,
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

restServer.getAllIssuedPapers = function(token, cb) {
	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/CommercialPaper?access_token=' + token,
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

restServer.getCompany = function(company, token, cb) {
	var reqOptions = {
		host: restServer.serverConfig.host,
		port: restServer.serverConfig.port,
		path: '/api/Company/' + company + '?access_token=' + token,
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
	if (httpErr) {
		var err = util.makeError(httpErr);
		err.handler.type = util.ERROR_TYPES.COMPOSER_REST_HTTP_ERROR;

		return err;
	}

	if (res && res.error) {
		var err = util.makeError(res.error);
		err.handler.type = util.ERROR_TYPES.COMPOSER_REST_ERROR;

		if (res.error.statusCode == 401) {
			err.handler.subtype = util.COMPOSER_REST_ERROR_TYPES.AUTH;
		}
		else if (res.error.statusCode == 500 && res.error.message == "No enrollment ID or enrollment secret has been provided") {
			err.handler.subtype = util.COMPOSER_REST_ERROR_TYPES.ENROLL;
		} else {
			err.handler.subtype = util.COMPOSER_REST_ERROR_TYPES.OTHER;
		}

		return err;
	}

	return null;
}

module.exports = restServer;
