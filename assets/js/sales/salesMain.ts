import { goToPrivate } from "../services/location.manager"

document.getElementById("switchToPrivate").addEventListener("click", function () {
	debugger
	goToPrivate()
});

document.getElementById("trial").addEventListener("click", function () {
	alert("trial")
})
