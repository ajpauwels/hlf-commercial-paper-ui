module.exports = {
	ibm: {
		token: '84rdR1SCFwf5gboiqAsSrKBYCtRDkC7aMMMkOT0HpuZXWqqelCI4oT6FnH4wnn96',
		port: 4200,
		displayName: 'IBM',
		staticDir: 'public',
		company: 'IBM',
		dbURL: 'mongodb://ajp:trainisland@ds227525.mlab.com:27525/cp-ui',
		debug: true
	},
	redhat: {
		token: 'AbxYJ8PhPE9jsTvY6YJmIPUBEMIg2x0VkqXB0s3oaWPyegZuQJKI7L6YFFCcXngt',
		port: 4201,
		displayName: 'RedHat',
		staticDir: 'public',
		company: 'RedHat',
		dbURL: 'mongodb://ajp:trainisland@ds227525.mlab.com:27525/cp-ui',
		debug: false
	},
	google: {
		token: 'B7EWZXpVGrPxFQucZNELbCQyCPCVU9SRazs27ZBgYXZAcoqjxjx94hEWSwneY55i',
		port: 4202,
		displayName: 'Google',
		staticDir: 'public',
		company: 'Google',
		dbURL: 'mongodb://ajp:trainisland@ds227525.mlab.com:27525/cp-ui',
		debug: false
	},
	default: {
		token: '',
		port: 4200,
		displayName: 'Default',
		staticDir: 'public',
		company: 'Default',
		dbURL: 'mongodb://ajp:trainisland@ds227525.mlab.com:27525/cp-ui',
		debug: false
	}
}
