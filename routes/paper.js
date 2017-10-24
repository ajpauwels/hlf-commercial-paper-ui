const express = require('express');
var router = express.Router();
var rest = require('../rest-interface.js');
var util = require('../util.js');

function checkLoggedIn(req, res, next) {
	if (!req.user) {
		var error = util.makeError();
		error.handler.type = util.ERROR_TYPES.AUTHENTICATION_ERROR;

		return next(error);
	}

	return next();
}

router.get('/', checkLoggedIn, (req, res, next) => {
	rest.getCompany(util.serverConfig.company, util.serverConfig.token, (getCompanyRes, getCompanyErr) => {
		if (getCompanyErr) {
			getCompanyErr.handler.redirect = '/login';

			return next(getCompanyErr);
		}

		rest.getAllIssuedPapers(util.serverConfig.token, (getPapersRes, getPapersErr) => {
			if (getPapersErr) {
				getPapersErr.handler.redirect = '/login';

				return next(getPapersErr);
			}

			rest.getAllPaperOwnerships(util.serverConfig.token, (ownershipsRes, ownershipsErr) => {
				if (ownershipsErr) {
					ownershipsErr.handler.redirect = '/login';

					return next(ownershipsErr);
				}

				var issuedPapers = util.filterPapersByIssuer(getPapersRes, util.serverConfig.company);
				var userOwnerships = util.filterOwnershipsByOwner(ownershipsRes, util.serverConfig.company);
				var paperMap = util.paperArrayToMap(getPapersRes);
				util.attachPapersToOwnerships(userOwnerships, paperMap);
				res.render('manage-paper', {	flash: util.getFlash(req),
												balance: getCompanyRes.balance,
												issuedPapers: issuedPapers,
												ownerships: userOwnerships,
												getEntityNameFromFullyQualifiedName: util.getEntityNameFromFullyQualifiedName });
			});
		});
	});
});
		
router.get('/issue', checkLoggedIn, (req, res, next) => {
	if (req.user.is('issuer') || req.user.is('admin')) {
		res.render('issue-paper', { flash: util.getFlash(req) });
	} else {
		var err = util.makeError();
		err.handler.type = util.ERROR_TYPES.NOT_ALLOWED_ERROR;
		err.handler.redirect = '/paper';

		return next(err);
	}
});

router.post('/issue', checkLoggedIn, (req, res, next) => {
	if (!req.user.is('issuer') && !req.user.is('admin')) {
		var err = util.makeError();
		err.handler.type = util.ERROR_TYPES.NOT_ALLOWED_ERROR;
		err.handler.redirect = '/paper';

		return next(err);
	}

	var parVal = parseFloat(req.body.par);
	var quantVal = parseInt(req.body.quantity);
	var discountVal = parseFloat(req.body.discount);
	var maturityVal = parseInt(req.body.maturity);

	var err = util.makeError();
	var errMsgs = [];
	err.handler.type = util.ERROR_TYPES.VALIDATION_ERROR;
	err.handler.redirect = '/paper/issue';

	if (isNaN(parVal)) { errMsgs.push("par value must be a number"); }
	if (isNaN(quantVal)) { errMsgs.push("quantity value must be a number"); }
	if (isNaN(discountVal)) { errMsgs.push("discount value must be a number"); }
	if (isNaN(maturityVal)) { errMsgs.push("maturity value must be a number"); }

	if (errMsgs.length > 0) {
		err.handler.msg = errMsgs.join(', ');
		return next(err);
	}

	rest.issueNewPaper(parVal, quantVal, discountVal, maturityVal, util.serverConfig.company, util.serverConfig.token, (issueRes, issueErr) => {
		if (issueErr) {
			issueErr.handler.redirect = '/paper/issue';

			return next(issueErr);
		}

		res.redirect('/paper');
	});
});

router.get('/purchase', checkLoggedIn, (req, res, next) => {
	if (!req.user.is('investor') && !req.user.is('admin')) {
		var err = util.makeError();
		err.handler.type = util.ERROR_TYPES.NOT_ALLOWED_ERROR;
		err.handler.redirect = '/paper';

		return next(err);
	}

	rest.getAllPurchaseablePaper(util.serverConfig.company, util.serverConfig.token, (getPapersRes, getPapersErr) => {
		if (getPapersErr) {
			getPapersErr.handler.redirect = '/paper/purchase';

			return next(getPapersErr);
		}

		res.render('purchase-paper', { flash: util.getFlash(req), availablePapers: getPapersRes, getEntityNameFromFullyQualifiedName: util.getEntityNameFromFullyQualifiedName });
	});
});

router.get('/purchase/confirm', checkLoggedIn, (req, res, next) => {
	if (!req.user.is('investor') && !req.user.is('admin')) {
		var err = util.makeError();
		err.handler.type = util.ERROR_TYPES.NOT_ALLOWED_ERROR;
		err.handler.redirect = '/paper';

		return next(err);
	}

	res.render('purchase-paper-confirmation', { flash: util.getFlash(req), purchaseParams: req.query });
});

router.post('/purchase', checkLoggedIn, (req, res, next) => {
	if (!req.user.is('investor') && !req.user.is('admin')) {
		var err = util.makeError();
		err.handler.type = util.ERROR_TYPES.NOT_ALLOWED_ERROR;
		err.handler.redirect = '/paper';

		return next(err);
	}

	var quantity = parseInt(req.body.quantity);
	var cusip = req.body.cusip;

	var err = util.makeError();
	var errMsgs = [];
	err.handler.type = util.ERROR_TYPES.VALIDATION_ERROR;
	err.handler.redirect = '/paper/purchase';

	if (isNaN(quantity) || quantity == 0) { errMsgs.push('quantity must be a non-zero positive number'); }
	if (cusip.length != 9) { errMsgs.push('invalid CUSIP'); }

	if (errMsgs.length > 0) {
		err.handler.msg = errMsgs.join(', ');
		return next(err)
	}

	rest.purchasePaper(util.serverConfig.company, cusip, quantity, util.serverConfig.token, (purchaseRes, purchaseErr) => {
		if (purchaseErr) {
			purchaseErr.handler.redirect = '/paper/purchase';

			return next(purchaseErr);
		}

		res.redirect('/paper');
	});
});

router.post('/sell', checkLoggedIn, (req, res, next) => {
	if (!req.user.is('investor') && !req.user.is('admin')) {
		var err = util.makeError();
		err.handler.type = util.ERROR_TYPES.NOT_ALLOWED_ERROR;
		err.handler.redirect = '/paper';

		return next(err);
	}

	var quantity = parseInt(req.body.quantity);
	var cusip = req.body.cusip;

	var err = util.makeError();
	var errMsgs = [];
	err.handler.type = util.ERROR_TYPES.VALIDATION_ERROR;
	err.handler.redirect = '/paper';

	if (isNaN(quantity)) { errMsgs.push('quantity must be a positive number less than the number of papers owned'); }
	if (cusip.length != 9) { errMsgs.push('invalid CUSIP'); }

	if (errMsgs.length > 0) {
		err.handler.msg = errMsgs.join(', ');
		return next(err);
	}

	rest.sellPaper(util.serverConfig.company, cusip, quantity, util.serverConfig.token, (sellRes, sellErr) => {
		if (sellErr) {
			sellErr.handler.redirect('/paper');

			return next(sellErr);
		}

		res.redirect('/paper');
	});
});

module.exports = router;
