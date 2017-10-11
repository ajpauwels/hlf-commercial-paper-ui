var util = {};

// Error types
util.ERROR_TYPES = {
	COMPOSER_REST_HTTP_ERROR: 0,
	COMPOSER_REST_ERROR: 1,
	VALIDATION_ERROR: 2
};

util.COMPOSER_REST_ERROR_TYPES = {
	AUTH: 0,
	ENROLL: 1,
	OTHER: 2
};

util.getCompanyNameFromFullyQualifiedName = function(fqn) {
	var chunks = fqn.split('#');
	return chunks[chunks.length - 1];
}


util.findIdentityByName = function(name, identities) {
	var identity = null;

	identities.every((item) => {
		if (item.name == name) {
			identity = item;
			return false;
		}

		return true;
	});

	return identity;
}

util.findIdentityByID = function(id, identities) {
	var identity = null;

	identities.every((item) => {
		if (item.id == id) {
			identity = item;
			return false;
		}

		return true;
	});

	return identity;
}

util.filterPapersByIssuer = function(papers, companyName) {
	var filtered = [];

	papers.forEach((paper) => {
		if (paper.issuer == 'resource:fabric.ibm.commercialpaper.Company#' + companyName) {
			filtered.push(paper);
		}
	});

	return filtered;
}

module.exports = util;
