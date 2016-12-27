var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 2000);
console.log("Server started.");

var User = function(id,nick){
	var self = {
		id:id,
		nick:nick
	}
	return self;
}

var io = require('socket.io')(serv,{});
var SOCKET_LIST = {};
var USER_LIST = {};
var messageToBroadcast = "";

io.sockets.on('connection', function(socket){
	socket.id = Math.floor(Math.random()*1000000);
	SOCKET_LIST[socket.id] = socket;
	console.log("new connection: id " + socket.id);
	
	// create new user
	var user = User(socket.id, "Guest_" + socket.id);
	USER_LIST[socket.id] = user;
	console.log(USER_LIST);	
	
	// send the ID for creating a guest nick
	socket.emit('newId',socket.id);
	messageToBroadcast = "Guest_" + socket.id + " joined the conversation!";
	
	socket.on('newNick',function(data){
		messageToBroadcast = USER_LIST[socket.id]['nick'] + " changed his nickname to " + data;
		USER_LIST[socket.id]['nick'] = data;
		console.log(USER_LIST);	
	});
	
	socket.on('messageSent',function(data){
		for(var i in SOCKET_LIST){
			var socket = SOCKET_LIST[i];
			socket.emit('messageReceived',data.nick + ": " + data.message);
		}
	});
	
	socket.on('disconnect',function(){
		messageToBroadcast = USER_LIST[socket.id]['nick'] + " left!"
		console.log("connection ended: id " + socket.id);
		delete USER_LIST[socket.id];
		delete SOCKET_LIST[socket.id];
		console.log(USER_LIST);	
	});

});

// refresh user list and send status messages
setInterval(function(){
	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('userList',USER_LIST);
	}
	
	if (messageToBroadcast != "") {
		for(var i in SOCKET_LIST){
			var socket = SOCKET_LIST[i];
			socket.emit('messageReceived',messageToBroadcast);
		}
		messageToBroadcast = "";
	}
	
},1000/25);