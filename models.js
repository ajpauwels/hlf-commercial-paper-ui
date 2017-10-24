var mongoose = require('mongoose');
var models = {};

// User model
var UserSchema = mongoose.Schema({
	username: String,
	password: String,
	salt: String,
	iterations: Number,
	oauthIDs: {
		githubID: String
	},
	roles: [{
		type: String
	}]
});

var User = mongoose.model('User', UserSchema);

models.User = User;

// Export the models
module.exports = models;
