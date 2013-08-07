"use strict";

function makeEncryptedValidator(data) {
	var result = {};
	if (data.type) {
		result.type = data.type;
		result.required = data.required;

		if (data.type === "string") {
			result.hex = true;
		} else if (data.type === "object") {
			result.additionalProperties = data.additionalProperties;
			result.properties = makeEncryptedValidator(data.properties);
		} else if (data.type === "Array") {
			result.items = makeEncryptedValidator(data.items);
		}
	} else {
		var attr;
		for (attr in data) {
			if (data.hasOwnProperty(attr)) {
				result[attr] = makeEncryptedValidator(data[attr]);
			}
		}
	}

	return result;
}

var profileJSON = {
	"type": "object",
	"additionalProperties": false,
	"properties": {
		"basic": {
			"type": "object",
			"additionalProperties": false,
			"properties": {
				"firstname": {
					"type": "string",
					"minLength": 2,
					"maxLength": 64
				},
				"lastname": {
					"type": "string",
					"minLength": 2,
					"maxLength": 64
				}
			}
		},

		"location": {
			"type": "object",
			"additionalProperties": false,
			"properties": {
				"road": {
					"type": "string"
				},
				"number": {
					"type": "string"
				},
				"town": {
					"type": "string"
				},
				"state": {
					"type": "string"
				},
				"country": {
					"type": "string"
				}
			}
		},

		"contact": {
			"type": "object",
			"additionalProperties": false,
			"properties": {
				"im": {
					"type": "Array",
					"items": {
						"type": "object",
						"additionalProperties": false,
						"properties": {
							"messenger": {
								"required": true,
								"type": "string",
								"enum": ["icq", "skype", "jabber"]
							},
							"address": {
								"type": "string"
							}
						}
					}
				},
				"mail": {
					"type": "Array",
					"items": {
						"type": "string",
						"format": "email"
					}
				},
				"telephone": {
					"type": "Array",
					"items": {
						"type": "object",
						"additionalProperties": false,
						"properties": {
							"where": {
								"type": "string"
							},
							"number": {
								"required": true,
								"type": "string",
								"format": "phone"
							}
						}
					}
				},
				"mobile": {
					"type": "Array",
					"items": {
						"type": "object",
						"additionalProperties": false,
						"properties": {
							"where": {
								"type": "string"
							},
							"number": {
								"required": true,
								"type": "string",
								"format": "phone"
							}
						}
					}
				},
				"website": {
					"type": "Array",
					"items": {
						"type": "string",
						"format": "url"
					}
				}
			}
		},

		"relationship": {
			"type": "object",
			"additionalProperties": false,
			"properties": {
				"partner": {
					"type": "object",
					"additionalProperties": false,
					"properties": {
						"user": {
							"type": "integer",
							"minimum": 1
						},
						"since": {
							"type": "string",
							"format": "date",
							"after": "1900-01-01"
						},
						"partnerSignature": {
							"type": "string",
							"hex": true
						}
					}
				},
				"status": {
					"type": "string",
					"enum": ["single", "relationship", "engaged", "married", "divorced", "widowed", "complicated", "open", "inlove"]
				}
			}
		},

		"relatives": {
			"type": "array",
			"items": {
				"type": "object",
				"additionalProperties": false,
				"properties": {
					"user": {
						"type": "integer"
					},
					"status": {
						"type": "string",
						"enum": [
							"sister",
							"brother",

							"mother",
							"father",

							"daughter",
							"son",

							"aunt",
							"uncle",

							"niece",
							"nephew",

							"femalecousin",
							"malecousin",

							"grandmother",
							"grandfather",

							"granddaughter",
							"grandson",

							"stepsister",
							"stepbrother",

							"stepmother",
							"stepfather",

							"stepdaughter",
							"stepson",

							"sister-in-law",
							"brother-in-law",

							"mother-in-law",
							"father-in-law",

							"daughter-in-law",
							"son-in-law"
						]
					}
				}
			}
		},

		"extended": {
			"type": "object",
			"additionalProperties": false,
			"properties": {
				"sex": {
					"type": "string",
					"enum": ["f", "m"]
				},
				"birthday": {
					"type": "string",
					"format": "date",
					"after": "1900-01-01"
				},
				"religion": {
					"type": "string"
				},
				"political": {
					"type": "string"
				}
			}
		},

		"knowledge": {
			"type": "object",
			"additionalProperties": false,
			"properties": {
				"education": {
					"type": "array",
					"items": {
						"type": "object",
						"additionalProperties": false,
						"properties": {
							"name": {
								"type": "string"
							},
							"startDate": {
								"type": "string",
								"format": "date"
							},
							"endDate": {
								"type": "string",
								"format": "date"
							},
							"edutype": {
								"type": "string"
							},
							"titles": {
								"type": "Array",
								"items": {
									"type": "object",
									"additionalProperties": false,
									"properties": {
										"name": {
											"required": true,
											"type": "string"
										},
										"date": {
											"type": "string",
											"format": "date"
										}
									}
								}
							}
						}
					}
				},
				"knowledge": {
					"type": "string"
				},
				"languages": {
					"type": "array",
					"items": {
						"type": "string"
					}
				}
			}
		},

		"jobs": {
			"type": "array",
			"items": {
				"type": "object",
				"additionalProperties": false,
				"properties": {
					"title": {
						"type": "string"
					},
					"company": {
						"type": "string"
					},
					"startDate": {
						"type": "string",
						"format": "date"
					},
					"endDate": {
						"type": "string",
						"format": "date"
					}
				}
			}
		}
	}
};

var profileJSONCrypted = makeEncryptedValidator(profileJSON);

if (typeof module !== "undefined" && module.exports) {
	module.exports = profileJSON;
} else if (typeof define !== "undefined") {
	define(function() {
		return profileJSON;
	});
}
