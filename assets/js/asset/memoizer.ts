export default class Memoizer {
	values: any[]
	cachedValue: any
	constructor(private selectors: Function[], private reduce: Function) {}

	hasChanged(newValues) {
		if (!this.values) {
			return true
		}

		const index = newValues.findIndex((val, index) => {
			const previousVal = this.values[index]

			if (previousVal === val) {
				return false
			}

			if (Array.isArray(val) && Array.isArray(previousVal) && val.length  === 0 && previousVal.length === 0) {
				return false
			}

			return true
		})

		if (index > -1) {
			// console.warn(`Memoizer recalculated at ${index}`, this.values, newValues)
		}

		return index > -1
	}

	getValue() {
		const newValues = this.selectors.map((selector) => selector())

		if (!this.hasChanged(newValues)) {
			return this.cachedValue
		}

		this.values = newValues
		this.cachedValue = this.reduce(...this.values, this.cachedValue)

		return this.cachedValue
	}
}
