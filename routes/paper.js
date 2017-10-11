const express = require('express');
var router = express.Router();
var rest = require('../rest-interface.js');
var util = require('../util.js');

function checkIdentitySelected(req) {
	if (!req.session.defaultIdentity) {
		var error = {
			type: util.ERROR_TYPES.COMPOSER_REST_ERROR,
			subtype: util.COMPOSER_REST_ERROR_TYPES.ENROLL,
		};

		return error;
	}

	return null;
}

router.get('/', (req, res, next) => {
	rest.getAllIssuedPapers((getPapersReq, getPapersRes, getPapersErr) => {
		var error = rest.handleErrors(getPapersReq, getPapersRes, getPapersErr);

		if (error) {
			error.renderPage = 'manage-paper';
			error.renderPageData = {
				identities: req.session.identities
			};
			return next(error);
		}

		var noSelectedIdentityErr = checkIdentitySelected(req, res);
		if (noSelectedIdentityErr) {
			return next(noSelectedIdentityErr);
		}

		var issuedPapers = util.filterPapersByIssuer(getPapersRes, req.session.defaultIdentity.company);
		res.render('manage-paper', { issuedPapers: issuedPapers });
	});
});
		
router.get('/issue', (req, res, next) => {
	var noSelectedIdentityErr = checkIdentitySelected(req);
	if (noSelectedIdentityErr) {
		return res.redirect('/paper');
	}

	res.render('issue-paper');
});

router.post('/issue', (req, res, next) => {
	var noSelectedIdentityErr = checkIdentitySelected(req);
	if (noSelectedIdentityErr) {
		return res.redirect('/paper');
	}

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

	rest.issueNewPaper(parVal, quantVal, discountVal, maturityVal, req.session.defaultIdentity.company, (issueReq, issueRes, issueErr) => {
		var error = rest.handleErrors(issueReq, issueRes, issueErr);

		if (error) {
			req.renderPage('issue-paper');
			return next(error);
		}

		res.redirect('/paper');
	});
});

module.exports = router;
