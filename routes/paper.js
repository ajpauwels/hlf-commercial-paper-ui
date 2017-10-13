const express = require('express');
var router = express.Router();
var rest = require('../rest-interface.js');
var util = require('../util.js');

function checkIdentitySelected(req, res, next) {
	if (!req.session.defaultIdentity) {
		var error = {};
		if (!rest.serverConfig.token || rest.serverConfig.token.length == 0) {
			error.type = util.ERROR_TYPES.COMPOSER_REST_ERROR;
			error.subtype = util.COMPOSER_REST_ERROR_TYPES.AUTH;
		} else {
			error.type = util.ERROR_TYPES.COMPOSER_REST_ERROR;
			error.subtype = util.COMPOSER_REST_ERROR_TYPES.ENROLL;
		}

		return next(error);
	}

	return next();
}

router.get('/', checkIdentitySelected, (req, res, next) => {
	rest.getAllIssuedPapers((getPapersRes, getPapersErr) => {
		if (getPapersErr) {
			getPapersErr.renderPage = 'manage-paper';
			if (getPapersErr.type == util.ERROR_TYPES.COMPOSER_REST_ERROR && getPapersErr.subtype == util.COMPOSER_REST_ERROR_TYPES.AUTH) {
				return next(getPapersErr);
			}
			else if (getPapersErr.type == util.ERROR_TYPES.COMPOSER_REST_ERROR && getPapersErr.subtype == util.COMPOSER_REST_ERROR_TYPES.ENROLL) {
				return next(getPapersErr);
			}
		}

		rest.getAllPaperOwnerships((ownershipsRes, ownershipsErr) => {
			if (ownershipsErr) {
				ownershipsErr.renderPage = 'manage-paper';
				if (ownershipsErr.type == util.ERROR_TYPES.COMPOSER_REST_ERROR && ownershipsErr.subtype == util.COMPOSER_REST_ERROR_TYPES.AUTH) {
					return next(ownershipsErr);
				}
				else if (ownershipsErr.type == util.ERROR_TYPES.COMPOSER_REST_ERROR && ownershipsErr.subtype == util.COMPOSER_REST_ERROR_TYPES.ENROLL) {
					return next(ownershipsErr);
				}
			}

			if (getPapersErr && ownershipsErr) {
				ownershipsErr.msgs = ownershipsErr.msgs.concat(getPapersErr.msgs);
				return next(ownershipsErr);
			}

			if (getPapersErr) {
				return next(getPapersErr);
			}

			var issuedPapers = util.filterPapersByIssuer(getPapersRes, req.session.defaultIdentity.company);

			if (ownershipsErr) {
				ownershipsErr.renderPageData = { issuedPapers: issuedPapers };
				return next(ownershipsErr);
			}

			var userOwnerships = util.filterOwnershipsByOwner(ownershipsRes, req.session.defaultIdentity.company);
			var paperMap = util.paperArrayToMap(getPapersRes);
			util.attachPapersToOwnerships(ownershipsRes, paperMap);
			res.render('manage-paper', { issuedPapers: issuedPapers, ownerships: ownershipsRes, getEntityNameFromFullyQualifiedName: util.getEntityNameFromFullyQualifiedName });
		});
	});
});
		
router.get('/issue', checkIdentitySelected, (req, res, next) => {
	res.render('issue-paper');
});

router.post('/issue', checkIdentitySelected, (req, res, next) => {
	var parVal = parseFloat(req.body.par);
	var quantVal = parseInt(req.body.quantity);
	var discountVal = parseFloat(req.body.discount);
	var maturityVal = parseInt(req.body.maturity);

	var error = {
		type: util.ERROR_TYPES.VALIDATION_ERROR,
		renderPage: 'issue-paper',
		msgs: []
	};
	if (isNaN(parVal)) { error.msgs.push({ msg: "Par value must be a number" }); }
	if (isNaN(quantVal)) { error.msgs.push({ msg: "Quantity value must be a number" }); }
	if (isNaN(discountVal)) { error.msgs.push({ msg: "Discount value must be a number" }); }
	if (isNaN(maturityVal)) { error.msgs.push({ msg: "Maturity value must be a number" }); }

	if (error.msgs.length > 0) {
		return next(error);
	}

	rest.issueNewPaper(parVal, quantVal, discountVal, maturityVal, req.session.defaultIdentity.company, (issueRes, issueErr) => {
		if (issueErr) {
			issueErr.renderPage = 'issue-paper';
			return next(issueErr);
		}

		res.redirect('/paper');
	});
});

router.get('/purchase', checkIdentitySelected, (req, res, next) => {
	rest.getAllPurchaseablePaper(req.session.defaultIdentity.company, (getPapersRes, getPapersErr) => {
		if (getPapersErr) {
			getPapersErr.renderPage = 'purchase-paper';
			return next(getPapersErr);
		}

		res.render('purchase-paper', { availablePapers: getPapersRes, getEntityNameFromFullyQualifiedName: util.getEntityNameFromFullyQualifiedName });
	});
});

router.get('/purchase/confirm', checkIdentitySelected, (req, res, next) => {
	res.render('purchase-paper-confirmation', { purchaseParams: req.query });
});

router.post('/purchase', checkIdentitySelected, (req, res, next) => {
	var quantity = parseInt(req.body.quantity);
	var cusip = req.body.cusip;

	var error = {
		type: util.ERROR_TYPES.VALIDATION_ERROR,
		renderPage: 'purchase-paper-confirmation',
		renderPageData: { purchaseParams: req.body },
		msgs: []
	};

	if (isNaN(quantity) || quantity == 0) { error.msgs.push({ msg: 'Quantity must be a non-zero positive number' }); }
	if (cusip.length != 9) { error.msgs.push({ msg: 'Invalid CUSIP' }); }

	if (error.msgs.length > 0) {
		return next(error)
	}

	rest.purchasePaper(req.session.defaultIdentity.company, cusip, quantity, (purchaseRes, purchaseErr) => {
		if (purchaseErr) {
			purchaseErr.renderPage = 'purchase-paper-confirmation';
			purchaseErr.renderPageData = { purchaseParams: req.body };
			return next(purchaseErr);
		}

		res.redirect('/paper');
	});
});

module.exports = router;
