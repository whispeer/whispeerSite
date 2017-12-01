#!/usr/bin/env node

const fs = require("fs");
const equal = require("deep-equal");
const basePath = "./assets/js/i18n/";

const localeDict = JSON.parse(fs.readFileSync(basePath + "l_en.json"))
const businessDict = JSON.parse(fs.readFileSync(basePath + "l_business_en.json"))

const same = (val1, val2) => {
	if (val1 === val2) {
		return true
	}

	if (equal(val1, val2, { strict: true })) {
		return true
	}

	return false
}

let c = 0

const check = (baseDict, duplicateDict, baseKey) => {
	Object.keys(baseDict).forEach((key) => {
		const dupEntry = duplicateDict[key]
		const baseEntry = baseDict[key]

		if (same(dupEntry, baseEntry)) {
			console.log(`Duplicate at ${baseKey}.${key}`)

			c++

			if (c > 10) {
				process.exit(1)
			}
			return
		}

		if (typeof dupEntry === "object" && typeof baseEntry === "object") {
			check(baseEntry, dupEntry, `${baseKey}.${key}`)
		}
	})
}

check(localeDict, businessDict, "")
