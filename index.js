// Load external modules
const express = require('express');
const path = require('path');
var bodyParser = require('body-parser');
var http = require('http');
var session = require('express-session');
var rest = require('./rest-interface.js');
var util = require('./util.js');

// Routing modules
var paperRoutes = require('./routes/paper.js');

// Config
const serverConfig = {
	"port": 4200,
	"staticDir": "public",
}

const composerServerConfig = {
	"protocol": "http://",
	"host": "localhost",
	"port": 3000,
	"loginPath": "/auth/github",
	"token": require('./access-token.js').token
}
var loginURL = composerServerConfig.protocol + composerServerConfig.host + ':' + composerServerConfig.port + composerServerConfig.loginPath;
rest.setServerConfig(composerServerConfig);

// Get the express server
const app = express();

// Express settings
app.set('view engine', 'pug');

// Express middleware
app.use('/static', express.static(path.join(__dirname, serverConfig.staticDir)));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
	secret: 'hfiuref9832jr3982n3n3i',
	resave: false,
	saveUninitialized: true
}));

app.use((req, res, next) => {
	if (!req.session.identities) {
		req.session.identities = [];
	}

	next();
});

// Routing
app.use('/paper', paperRoutes);

app.get('/', (req, res, next) => {
	rest.getWallets((getWalletsRes, getWalletsErr) => {
		if (getWalletsErr) {
			getWalletsErr.renderPage = 'login';
			getWalletsErr.renderPageData = {
				loginLink: loginURL
			};
			return next(getWalletsErr);
		}

		var userWallet = getWalletsRes[0];

		rest.getIdentitiesInWallet(userWallet.id, (getWalletIDsRes, getWalletIDsErr) => {
			if (getWalletIDsErr) {
				getWalletIDsErr.renderPage = 'login';
				getWalletIDsErr.renderPageData = {
					loginLink: loginURL
				};
				return next(getWalletIDsErr);
			}


			// Consume each ID and condense for the front-end
			var condensedIDs = [];

			getWalletIDsRes.forEach((walletID) => {
				condensedIDs.push({
					id: walletID.id,
					walletID: userWallet.id,
					username: walletID.enrollmentID
				});
			});

			req.session.identities = condensedIDs;
			res.render('identity-selection', { identities: condensedIDs });
		});
	});
});

app.post('/token', (req, res) => {
	rest.serverConfig.token = req.body.token;
	res.redirect('/');
});

app.get('/logout', (req, res) => {
	rest.serverConfig.token = '';
	req.session.identities = null;
	req.session.defaultIdentity = null;
	res.redirect('/');
});


app.post('/select/identity', (req, res) => {
	rest.setDefaultIdentity(req.body['identity-wallet'], req.body['identity-id'], (setDefaultRes, setDefaultErr) => {
		if (setDefaultErr) {
			setDefaultErr.renderPage = 'identity-selection';
			return next(setDefaultErr);
		}

		var defaultIdentity = util.findIdentityByID(req.body['identity-id'], req.session.identities);
		req.session.defaultIdentity = defaultIdentity;

		rest.getAllIdentities((getIDsRes, getIDsErr) => {
			if (getIDsErr) {
				getIDsErr.renderPage = 'identity-selection';
				return next(getIDsErr);
			}

			var systemID = util.findIdentityByName(defaultIdentity.username, getIDsRes);
			req.session.defaultIdentity.company = util.getEntityNameFromFullyQualifiedName(systemID.participant);

			res.redirect('/paper');
		});
	});
});

// Log HTTP errors
app.use((err, req, res, next) => {
	if (err.type == util.ERROR_TYPES.COMPOSER_REST_HTTP_ERROR) {
		console.log("[ERROR]", err.msg);
	}

	next(err);
});

// Handle displaying HTTP errors to the user
app.use((err, req, res, next) => {
	// HTTP errors should render the same page the user was on with an error callout
	if (err.type == util.ERROR_TYPES.COMPOSER_REST_HTTP_ERROR) {
		var errorMsg = "An HTTP error occurred during a call to the REST server, check server logs";
		if (!err.renderPageData) {
			err.renderPageData = {};
		}

		err.renderPageData.errors = [ { msg: errorMsg } ];

		if (!err.renderPage) {
			err.renderPage = 'login';
			err.renderPageData.loginLink = loginURL;
		}

		return res.render(err.renderPage, err.renderPageData);
	} else {
		next(err);
	}
});

// Handle displaying REST server errors to the user
app.use((err, req, res, next) => {
	// REST server error handling behavior changes depending on the error type
	if (err.type == util.ERROR_TYPES.COMPOSER_REST_ERROR) {
		if (!err.renderPageData) {
			err.renderPageData = {};
		}

		// Authentication errors should render the login page
		if (err.subtype == util.COMPOSER_REST_ERROR_TYPES.AUTH) {
			err.renderPageData.loginLink = loginURL;
			err.renderPageData.errors = [
				{ msg: "Not authenticated to REST server" }
			];
			return res.render('login', err.renderPageData);
		}
		// Enrollment errors should render the identity selection page
		else if (err.subtype == util.COMPOSER_REST_ERROR_TYPES.ENROLL) {
			err.renderPageData.errors = [
				{ msg: "Must select an identity to authenticate action" }
			];
			err.renderPageData.identities = req.session.identities;
			return res.render('identity-selection', err.renderPageData);
		}
		// All other errors should render the given page with an error pop-up
		else {
			err.renderPageData.error = [ { msg: err.msg } ];
			
			if (!err.renderPage) {
				err.renderPage = 'login';
				err.renderPageData.loginLink = loginURL;
			}

			return res.render(err.renderPage, err.renderPageData);
		}
	} else {
		next(err);
	}
});

// Handle displaying validation errors to the user
app.use((err, req, res, next) => {
	// Validation errors should render the given page with an error pop-up
	if (err.type == util.ERROR_TYPES.VALIDATION_ERROR) {
		if (!err.renderPageData) {
			err.renderPageData = {};
		}

		err.renderPageData.errors = err.msgs;

		if (!err.renderPage) {
			err.renderPage = 'login';
			err.renderPageData.loginLink = loginURL;
		}

		return res.render(err.renderPage, err.renderPageData);
	} else {
		next(err);
	}
});

// Start listening
app.listen(serverConfig.port, () => {
	console.log("[INFO] Started listening on", serverConfig.port);
});
