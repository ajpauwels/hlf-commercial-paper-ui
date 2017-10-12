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
			getpapersErr.renderPageData = {
				identities: req.session.identities
			};
			return next(getPapersErr);
		}

		var issuedPapers = util.filterPapersByIssuer(getPapersRes, req.session.defaultIdentity.company);
		res.render('manage-paper', { issuedPapers: issuedPapers });
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

		res.render('purchase-paper', { availablePapers: getPapersRes });
	});
});

module.exports = router;
