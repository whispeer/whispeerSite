import socketService from "./socket.service"
import sessionService from "./session.service"

class FeatureToggles {
	config = {}

	constructor() {
		sessionService.bootLogin()
			.then(() => this.loadToggles())

		sessionService.awaitLogin()
			.then(() => this.loadToggles())
	}

	private loadToggles = () =>
		socketService.definitlyEmit("featureToggles", {})
			.then((response) => response.toggles ? this.config = response.toggles : null)

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
