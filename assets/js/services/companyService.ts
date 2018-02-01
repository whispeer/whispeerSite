import * as Bluebird from "bluebird"

import socketService from "../services/socket.service"
import ObjectLoader from "../services/mutableObjectLoader"
import { withPrefix } from "../services/storage.service"

const sessionStorage = withPrefix("whispeer.session")

type CompanyResponse = {
	name: string,
	id: number,
	userIDs: number[]
}

export class Company {
	constructor(private company: CompanyResponse) {}

	get = () => this.company

	getUserIDs = () => this.company.userIDs

	set(company: CompanyResponse) {
		this.company = company
	}
}

export default class CompanyLoader extends ObjectLoader<Company, CompanyResponse>({
	download: (id) => socketService.definitlyEmit("company.get", { id }).then(response => response.company),
	load: company => Bluebird.resolve(company),
	getID: (company) => company.id,
	restore: (company, previousInstance) => {
		if (previousInstance) {
			previousInstance.set(company)

			return previousInstance
		}

		return new Company(company)
	},
	shouldUpdate: () => Bluebird.delay(2000).thenReturn(true),
	cacheName: "company"
}) {}

export const getOwnCompanyID = () => {
	const companyID = sessionStorage.get("companyID")
	if (companyID) {
		return Bluebird.resolve(companyID)
	}

	return socketService.definitlyEmit("company.ownCompanyID", {})
		.then(({ companyID }) => companyID)
		.then((companyID) => {
			if (!companyID) {
				throw new Error("No company id")
			}

			sessionStorage.set("companyID", companyID)
			return companyID
		})
}
