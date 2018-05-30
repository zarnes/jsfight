function Chat(main)
{
	chat = this;
	this.mainContext = main;
	this.socket ;
	this.initsocket= function(){
		console.log('init sock')
		chat.socket.on('chat nouveau message', function (message) {
		console.log('nouveau message ' + message.message);
		$('.conversation').append("<div><span class='message-auteur'>"+message.auteurP+":</span><span class='message-text'>"+message.message+"</span></div>");
		$("form input[name=message]").val("");
	});
	}
	this.send=function(msg){
		chat.socket.emit('chat nouveau message',msg);
	}
}

