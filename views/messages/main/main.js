ssn.display.messages.main = {
	topic: null,
	receiver: null,
	lastSender: 0,

	load: function (done) {
			$("#sendMessageSubmit").val(ssn.translation.getValue("sendMessage")).click(ssn.display.messages.main.sendMessageFunc);
			$(".messageul").bind("mousewheel", function (ev, delta) {
				var scrollTop = $(this).scrollTop();
				$(this).scrollTop(scrollTop - Math.round(delta));
			});
			$("body").addClass("messageView");
			ssn.display.messages.main.doLoad();
			done();
	},
}