const express = require('express');
var router = express.Router();
var util = require('../util.js');
var models = require('../models.js');

function isAdmin(req, res, next) {
	if (!req.user.is('admin')) {
		var err = util.makeError();
		err.handler.type = util.ERROR_TYPES.NOT_ALLOWED_ERROR;
		err.handler.redirect = '/paper';

		return next(err);
	}

	next();
}

router.get('/', util.checkLoggedIn, isAdmin, (req, res, next) => {
	models.User.find((err, users) => {
		if (err) {
			var err = util.makeError(err);
			err.handler.type = util.ERROR_TYPES.MONGOOSE_ERROR;
			err.handler.redirect = '/paper';

			return next(err);
		}

		util.clearGuards(req);
		res.viewData.users = users;
		res.viewData.flash = util.getFlash(req);
		res.render('manage-users', res.viewData);
	});
});

router.post('/update', util.checkLoggedIn, isAdmin, (req, res, next) => {
	var userID = req.body.submit;
	var roles = [];
	if (Object.prototype.toString.call(req.body[userID]) === '[object Array]') {
		roles = req.body[userID];
	} else {
		roles.push(req.body[userID]);
	}

	models.User.findOneAndUpdate({ _id: userID }, { $set: { roles: roles } }, (err, user) => {
		if (err) {
			err = util.makeError(err);
			err.handler.type = util.ERROR_TYPES.MONGOOSE_ERROR;
			err.handler.redirect = '/users';

			return next(err);
		}

		util.flashSuccess(req, "Successfully updated user");
		res.redirect('/users');
	});
});

module.exports = router;
