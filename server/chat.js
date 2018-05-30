var chat = {};

chat.init= function(socketIo, sockets)
{
	console.log("miaou");
	socketIo.sockets.on("connection",function(socket)
	{
		socket.on("chat nouveau message",function(msg){
			var message={
				auteur :socket.player.identity.id,
				auteurP: socket.player.identity.pseudo,
				time : Date.now(),
				message : msg,
			}
			console.log(message);
			//socket.emit("chat nouveau message",message);
			Object.keys(sockets).map(function(objectKey, index) {
			    var value = sockets[objectKey];
			    value.emit("chat nouveau message",message);
			});

		})
	});
}

exports.data = chat;