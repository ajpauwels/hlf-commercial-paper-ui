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

util.getEntityNameFromFullyQualifiedName = function(fqn) {
	var chunks = fqn.split('#');
	return chunks[chunks.length - 1];
}

util.mergeOwnershipsAndPapers = function(requestingCompany, paperMap, ownershipArray) {
	ownershipArray.forEach((ownership) => {
		var cusip = util.getEntityNameFromFullyQualifiedName(ownership.paper);
		var owner = util.getEntityNameFromFullyQualifiedName(ownership.owner);
		var paper = paperMap[cusip];

		if (!paper.purchaseableQuantity) {
			paper.purchaseableQuantity = paper.quantityIssued;
		}

		if (!paper.ownerships) {
			paper.ownerships = [];
		}

		paper.ownerships.push(ownership);

		if (requestingCompany == owner) {
			paper.purchaseableQuantity -= ownership.quantity;
		} else {
			paper.purchaseableQuantity -= (ownership.quantity - ownership.quantityForSale);
		}

		if (paper.purchaseableQuantity == 0) {
			paperMap[cusip] = null;
		}
	});
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

util.filterOwnershipsByOwner = function(ownerships, owner, exclude) {
	var filteredOwnerships = [];

	if (!ownerships || ownerships.length == 0) {
		return filteredOwnerships;
	}

	if (exclude == null) {
		exclude = false;
	}	

	ownerships.forEach((ownership) => {
		var simpleOwner = util.getEntityNameFromFullyQualifiedName(ownership.owner);

		if (simpleOwner == owner) {
			if (!exclude) {
				filteredOwnerships.push(ownership);
			}
		} else {
			if (exclude) {
				filteredOwnerships.push(ownership);
			}
		}
	});

	return filteredOwnerships;
}

util.attachPapersToOwnerships = function(ownerships, papers) {
	ownerships.forEach((ownership) => {
		var cusip = util.getEntityNameFromFullyQualifiedName(ownership.paper);
		var paper = papers[cusip];

		if (paper) {
			ownership.paperObject = paper;
		}
	});
}

/**
 * Filters papers based on the issuer. If the exclude param is true,
 * papers by the specified issuer will be excluded from the final array;
 * otherwise, they will be included and all others excluded. Defaults
 * to false if the param is not included.
 */
util.filterPapersByIssuer = function(papers, companyName, exclude) {
	var filtered = [];

	if (!papers || papers.length == 0) {
		return filtered;
	}

	if (exclude == null) {
		exclude = false;
	}

	papers.forEach((paper) => {
		if (paper.issuer == 'resource:fabric.ibm.commercialpaper.Company#' + companyName) {
			if (!exclude) {
				filtered.push(paper);
			}
		} else {
			if (exclude) {
				filtered.push(paper);
			}
		}
	});

	return filtered;
}

util.paperArrayToMap = function(paperArray) {
	var paperMap = {};
	paperArray.forEach((paper) => {
		paperMap[paper.CUSIP] = paper;
	});

	return paperMap;
}

util.paperMapToArray = function(paperMap) {
	var paperArray = [];

	Object.keys(paperMap).forEach((key) => {
		if (paperMap[key]) {
			paperArray.push(paperMap[key]);
		}
	});

	return paperArray;
}

module.exports = util;
