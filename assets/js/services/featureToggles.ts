import socketService from "./socket.service"

class FeatureToggles {
	config = {}

	constructor() {
		socketService.definitlyEmit("featureToggles", {}).then((response) => {
			if (response.toggles) {
				this.config = response.toggles
			}
		})
	}

	isFeatureEnabled(featureName) {
		if (!this.config.hasOwnProperty(featureName)) {
			// console.warn(`Unknown feature: ${featureName}`)

			return false
		}

		if (this.config[featureName] === false) {
			return false
		}

		return true
	}

	getFeatureConfig(featureName) {
		return this.config[featureName]
	}
}

export default new FeatureToggles()
