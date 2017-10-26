const express = require('express');
var router = express.Router();
var models = require('../models.js');
var util = require('../util.js');
var crypto = require('crypto');
var passport = require('passport');
var GithubStrategy = require('passport-github').Strategy;
var LocalStrategy = require('passport-local').Strategy;

// Passport authentication config
passport.use(new GithubStrategy({
	clientID: 'fae8ec868745f9865dcd',
	clientSecret: '5ba45029e329a1e4d2516ee01bc32f0b7ca81089',
	callbackURL: 'http://localhost:4200/auth/github/callback'
},
(accessToken, refreshToken, profile, cb) => {
	models.User.findOne({ oauthIDs: { githubID: profile.id }}, (err, user) => {
		if (err) {
			var err = util.makeError(err);
			err.handler.type = util.ERROR_TYPES.MONGOOSE_ERROR;
			err.handler.redirect = '/login';

			return cb(err, null);
		}

		if (!user) {
			var newUser = new models.User({ oauthIDs: { githubID: profile.id }, roles: [ 'admin' ] });
			newUser.save((err, user) => {
				if (err) {
					err = util.makeError(err);
					err.handler.type = util.ERROR_TYPES.MONGOOSE_ERROR;
					err.handler.redirect = '/login';
				}

				return cb(err, user);
			});
		}

		return cb(null, user);
	});
}));

passport.use(new LocalStrategy({
	usernameField: 'username',
	passwordField: 'password'
},
(username, password, cb) => {
	if (!username || username.length == 0 || !password || password.length == 0) {
		var err = util.makeError(err);
		err.handler.type = util.ERROR_TYPES.AUTHENTICATION_ERROR;
		err.handler.redirect = '/login';
		err.handler.msg = 'Either your username or your password is incorrect';

		return cb(err, null);
	}

	models.User.findOne({ username: username }, (err, user) => {
		if (err) {
			var err = util.makeError(err);
			err.handler.type = util.ERROR_TYPES.MONGOOSE_ERROR;
			err.handler.redirect = '/login';

			return cb(err, null);
		}

		if (!user) {
			var err = util.makeError();
			err.handler.type = util.ERROR_TYPES.AUTHENTICATION_ERROR;
			err.handler.redirect = '/login';
			err.handler.msg = 'Either your username or your password is incorrect';
			
			return cb(err, null);
		}

		var salt = user.salt;
		var iterations = user.iterations;
		crypto.pbkdf2(password, salt, iterations, 256, 'sha256', (err, key) => {
			if (err) {
				var err = util.makeError(err);
				err.handler.type = util.ERROR_TYPES.CRYPTO_ERROR;
				err.handler.redirect = '/login';
				err.handler.msg = 'There was an issue handling your password, try again';

				return cb(err, null);
			}

			if (key == user.password) {
				return cb(null, user);
			} else {
				var err = util.makeError();
				err.handler.type = util.ERROR_TYPES.AUTHENTICATION_ERROR;
				err.handler.redirect = '/login';
				err.handler.msg = 'Either your username or your password is incorrect';

				return cb(err, null)
			}
		});

	});
}));

passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser((id, done) => {
	models.User.findById(id, (err, user) => {
		if (user) {
			user.is = function(desiredRole) {
				for (var i = 0; i < this.roles.length; ++i) {
					var role = this.roles[i];
					if (desiredRole == role) {
						return true;
					}
				}

				return false;
			}
		}

		if (err) {
			var err = util.makeError(err);
			err.handler.type = util.ERROR_TYPES.MONGOOSE_ERROR;
			err.handler.redirect = '/login';

			return done(err, user);
		}

		done(null, user);
	});
});

router.get('/github', passport.authenticate('github'));

router.get('/github/callback', passport.authenticate('github'), (req, res) => {
	res.redirect('/paper');
});

router.get('/local/register', (req, res) => {
	util.clearGuards(req);
	res.viewData.flash = util.getFlash(req);
	res.render('register', res.viewData);
});

router.post('/local/register', (req, res, next) => {
	models.User.findOne({ username: req.body.email }, (err, user) => {
		if (err) {
			var err = util.makeError(err);
			err.handler.type = util.ERROR_TYPES.MONGOOSE_ERROR;
			err.handler.redirect = '/auth/local/register';

			return next(err);
		}

		if (user) {
			var err = util.makeError();
			err.handler.type = util.ERROR_TYPES.USER_ALREADY_EXISTS_ERROR;
			err.handler.redirect = '/auth/local/register';

			return next(err);
		}

		var salt = crypto.randomBytes(256).toString('base64');
		var iterations = 10000;
		crypto.pbkdf2(req.body.password, salt, iterations, 256, 'sha256', (err, key) => {
			if (err) {
				var err = util.makeError(err);
				err.handler.type = util.ERROR_TYPES.CRYPTO_ERROR;
				err.handler.redirect = '/auth/local/register';

				return next(err);
			}
			var roles = [];

			if (Object.prototype.toString.call(req.body.roles) === '[object Array]') {
				req.body.roles.forEach((role) => {
					if (role == 'admin' || role == 'issuer' || role == 'investor') {
						roles.push(role);
					}
				});
			} else {
				var role = req.body.roles;
				if (role == 'admin' || role == 'issuer' || role == 'investor') {
					roles.push(role);
				} else {
					var err = util.makeError();
					err.handler.type = util.ERROR_TYPES.INVALID_ROLE_ERROR;
					err.handler.redirect = '/auth/local/register';

					return next(err);
				}
			}

			var user = new models.User({ username: req.body.email, salt: salt, iterations: iterations, password: key, roles: roles });

			user.save((err, user) => {
				if (err) {
					var err = util.makeError(err);
					err.handler.type = util.ERROR_TYPES.MONGOOSE_ERROR;
					err.handler.redirect = '/auth/local/register';

					return next(err);
				}

				req.login(user, (err) => {
					if (err) {
						util.flashError(req, 'Successfully registered new user but there was an error logging you in, try again with your new username and password');
						return res.redirect('/login');
					}

					util.flashSuccess(req, 'Successfully registered new user');
					res.redirect('/paper');
				});
			});
		});
	});
});

router.post('/local', passport.authenticate('local'), (req, res) => {
	res.redirect('/paper');
});

module.exports = function (passportModule) {
	this.passport = passportModule;
	return router;
}
