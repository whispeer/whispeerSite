import Observer from "../asset/observer";
import "jquery";

class ScreenSizeService extends Observer {
	private mobile: any;

	constructor() {
		super();

		jQuery(window.top).on("resize", this.updateMobile);
		this.updateMobile();
	}

	updateMobile = () => {
		var width = window.top.document.documentElement.clientWidth;
		var mobile = width < 1025;

		if (mobile !== this.mobile) {
			this.mobile = mobile;

			setTimeout(() => {
				this.notify(mobile);
			});
		}
	}
}

export default new ScreenSizeService();
