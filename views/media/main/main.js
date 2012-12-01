"use strict";

ssn.display.friends.main = {
	load: function (done) {
		$("body").addClass("mediaView");
		done();
	},

	hashChange: function (done) {
		done();
	},

	unload: function () {
		$("body").removeClass("mediaView");
	}
};

/*
TODO: Append pictues and videos in rows and if a element is clicked switch them to active:
how the pictures / videos have to be appended: divide the width of #mediaWrap by 200.
The outcome will be the number of pictures that will fit in one row! It may NOT be a number like 2,3 it HAS to be a number like 2 or 3.
Each row has an id like 1,2,3 and so on. When a image or a video of the row is clicked, the row and the element go into the active state, and the droplet will be apended under the row (so it's the next element in the code, after the div of the row is closed).
In the droplet itself the following info has to be loaded: People on the picture eg: "Daniel Melchior (user who postet the image / video) with Igor(Link to profile) and Olaf(Link to profile)", how many awesomes? eg: "50 People think this is awesome!", how many comments? eg: "300 comments". Also the option of giving an awesome or a whatever is given.
*/