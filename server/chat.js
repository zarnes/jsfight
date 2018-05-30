var chat = {};

chat.init= function(socketIo, sockets)
{
	socketIo.sockets.on("connection",function(socket)
	{
		socket.on("chat nouveau message",function(msg){
			var message={
				auteur :socket.player.identity.id,
				auteurP: socket.player.identity.pseudo,
				time : Date.now(),
				message : msg,
			};
			Object.keys(sockets).map(function(objectKey, index) {
			    var value = sockets[objectKey];
			    value.emit("chat nouveau message",message);
			});
		})
	});
};

exports.data = chat;