import { goToPrivate } from "../services/location.manager"

require("../runners/serviceWorkerRunner")

document.getElementById("switchToPrivate").addEventListener("click", function () {
	goToPrivate()
});

document.getElementById("trial").addEventListener("click", function () {
	alert("trial")
})
