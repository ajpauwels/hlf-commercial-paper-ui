// Load external modules
const express = require('express');
const path = require('path');
var crypto = require('crypto');
var bodyParser = require('body-parser');
var http = require('http');
var session = require('express-session');
var rest = require('./rest-interface.js');
var util = require('./util.js');
var passport = require('passport');
var GithubStrategy = require('passport-github').Strategy;
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require('mongoose');
var models = require('./models.js');
var allConfigs = require('./server-configs.js');

// Routing modules
var paperRoutes = require('./routes/paper.js');

// Local and REST server config
var serverConfig = {};
if (process.argv.length == 3) {
	var configName = process.argv[2];
	var config = allConfigs[configName];

	if (config) {
		serverConfig = config;
	} else {
		console.log("[ERROR] No server configurations detected, exiting");
		process.exit();
	}
}
util.serverConfig = serverConfig;

var nsSubdomain = "fabric";
var nsDomain = "hyperledger";
var nsClient = "cp";
var namespace = nsSubdomain + '.' + nsDomain + '.' + nsClient;
util.namespace = namespace;

const composerServerConfig = {
	"protocol": "http://",
	"host": "localhost",
	"port": 3000,
	"loginPath": "/auth/github",
	"namespace": namespace
}
var loginURL = composerServerConfig.protocol + composerServerConfig.host + ':' + composerServerConfig.port + composerServerConfig.loginPath;
rest.setServerConfig(composerServerConfig);

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

// Mongoose config
mongoose.connect(serverConfig.dbURL, { useMongoClient: true });
var db = mongoose.connection;
db.on('error', (err) => {
	console.log("[ERROR]", err);
});
db.once('open', () => {
	console.log("[INFO]", "Connected to MongoDB");
});

// Get the express server
const app = express();

// Express settings
app.set('view engine', 'pug');

// Express middleware
app.use('/static', express.static(path.join(__dirname, serverConfig.staticDir)));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
	secret: 'kitty',
	resave: false,
	saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

// Routing
app.use('/paper', paperRoutes);

app.get('/', (req, res, next) => {
	if (req.user) {
		return res.redirect('/paper');
	}

	res.render('login', { flash: util.getFlash(req) });
});

app.get('/auth/github', passport.authenticate('github'));

app.get('/auth/github/callback', passport.authenticate('github'), (req, res) => {
	util.flashInfo(req, 'Successfully logged in');
	res.redirect('/paper');
});

app.get('/auth/local/register', (req, res) => {
	res.render('register', { flash: util.getFlash(req) });
});

app.post('/auth/local/register', (req, res, next) => {
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

				req.user = user;
				util.flashSuccess(req, 'Successfully registered new user');
				res.redirect('/paper');
			});
		});
	});
});

app.post('/auth/local', passport.authenticate('local'), (req, res) => {
	util.flashInfo(req, 'Successfully logged in');
	res.redirect('/paper');
});

app.get('/login', (req, res) => {
	if (req.user) {
		return res.redirect('/paper');
	}

	res.render('login', { flash: util.getFlash(req) });
});

app.get('/logout', (req, res) => {
	req.logout();

	util.flashInfo(req, 'Successfully logged out');
	res.redirect('/');
});

// Log HTTP errors
app.use((err, req, res, next) => {
	if (err.handler.type == util.ERROR_TYPES.COMPOSER_REST_HTTP_ERROR) {
		console.log("[ERROR]", err.msg);
	}

	return next(err);
});

// Handle displaying HTTP errors to the user
app.use((err, req, res, next) => {
	if (err.handler.type == util.ERROR_TYPES.COMPOSER_REST_HTTP_ERROR) {
		var msg = 'An HTTP error occurred during a call to the REST server, check server logs';
		var redirect = '/paper';

		if (err.handler.msg) {
			msg = err.handler.msg;
		}

		if (err.handler.redirect) {
			redirect = err.handler.redirect;
		}

		util.flashError(req, msg);
		return res.redirect(redirect);
	}

	return next(err);
});

// Handle displaying REST server errors to the user
app.use((err, req, res, next) => {
	if (err.handler.type == util.ERROR_TYPES.COMPOSER_REST_ERROR) {
		var msg = 'A REST server error occurred, could not perform action';
		var redirect = '/paper'

		if (err.handler.msg) {
			msg = err.handler.msg;
		} else {
			if (err.handler.subtype == util.COMPOSER_REST_ERROR_TYPES.AUTH) {
				msg = 'Not authenticated to the REST server, could not perform action';
			}
			else if (err.handler.subtype == util.COMPOSER_REST_ERROR_TYPES.ENROLL) {
				msg = 'No default identity enrolled or selected on the REST server, could not perform action';
			}
		}
		
		if (err.handler.redirect) {
			redirect = err.handler.redirect;
		}
		util.flashError(req, msg);
		return res.redirect(redirect);
	}

	return next(err);
});

// Handle displaying permission errors to the user
app.use((err, req, res, next) => {
	if (err.handler.type == util.ERROR_TYPES.NOT_ALLOWED_ERROR) {
		var msg = 'You do not have sufficient permissions to perform this action';
		var redirect = '/paper';

		if (err.handler.msg) {
			msg = err.handler.msg;
		}

		if (err.handler.redirect) {
			redirect = err.handler.redirect;
		}

		util.flashError(req, msg);
		return res.redirect(redirect);
	}

	return next(err);
});

// Handle displaying authentication errors to the user
app.use((err, req, res, next) => {
	if (err.handler.type == util.ERROR_TYPES.AUTHENTICATION_ERROR) {
		var msg = 'You must be authenticated to perform this action';
		var redirect = '/login';

		if (err.handler.msg) {
			msg = err.handler.msg;
		}

		if (err.handler.redirect) {
			redirect = err.handler.redirect;
		}

		util.flashError(req, msg);
		return res.redirect(redirect);
	}

	return next(err);
});

// Handle displaying registration errors to the user
app.use((err, req, res, next) => {
	if (err.handler.type == util.ERROR_TYPES.USER_ALREADY_EXISTS_ERROR || err.handler.type == util.ERROR_TYPES.INVALID_ROLE_ERROR) {
		var msg = '';
		var redirect = '/auth/local/register';

		if (err.handler.type == util.ERROR_TYPES.USER_ALREADY_EXISTS_ERROR) {
			msg = 'This user already exist';
		} else {
			msg = 'Invalid role type selected';
		}

		if (err.handler.msg) {
			msg = err.handler.msg;
		}

		if (err.handler.redirect) {
			redirect = err.handler.redirect;
		}

		util.flashError(req, msg);
		return res.redirect(redirect);
	}

	next(err);
});

// Handle displaying Mongoose errors to the user
app.use((err, req, res, next) => {
	if (err.handler.type == util.ERROR_TYPES.MONGOOSE_ERROR) {
		var msg = 'There was a database error, could not perform action';
		var redirect = '/paper';

		if (err.handler.msg) {
			msg = err.handler.msg;
		}

		if (err.handler.redirect) {
			redirect = err.handler.redirect;
		}

		util.flashError(req, msg);
		return res.redirect(redirect);
	}

	next(err);
});

// Handle displaying validation errors to the user
app.use((err, req, res, next) => {
	if (err.handler.type == util.ERROR_TYPES.VALIDATION_ERROR) {
		var msg = 'A field was inputted incorrectly';
		var redirect = '/paper';

		if (err.handler.msg) {
			msg = err.handler.msg;
		}

		if (err.handler.redirect) {
			redirect = err.handler.redirect;
		}

		util.flashError(req, msg);
		return res.redirect(redirect);
	}

	next(err);
});

app.use((err, req, res, next) => {
	var msg = "You've found an unhandled error, please call the developers and berate them about improper error handling";
	var redirect = '/';

	if (err.handler) {
		if (err.handler.msg) {
			msg = err.handler.msg;
		}

		if (err.handler.redirect) {
			redirect = err.handler.redirect;
		}
	}

	util.flashError(req, msg);
	res.redirect(redirect);
});

// Start listening
app.listen(serverConfig.port, () => {
	console.log("[INFO] Started listening on", serverConfig.port);
});

// On exit, close MongoDB connection
process.on('SIGINT', cleanup);

function cleanup() {
	console.log("[INFO] Closing MongoDB connection");
	mongoose.disconnect();

	process.exit();
}
