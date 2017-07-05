export default class Memoizer {
	values: any[]
	cachedValue: any
	constructor(private selectors: Function[], private reduce: Function) {}

	getValue() {
		const newValues = this.selectors.map((selector) => selector())

		const changed = !this.values || newValues.some((val, index) => this.values[index] !== val)

		if (!changed) {
			return this.cachedValue
		}

		console.warn("Memoizer recalculated", this.values, newValues)

		this.values = newValues
		this.cachedValue = this.reduce(...this.values)

		return this.cachedValue
	}
}
