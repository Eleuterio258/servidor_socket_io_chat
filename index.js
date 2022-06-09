const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*"
    }
});


const mysql = require('mysql');
const moment = require('moment');
const sockets = {}

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Eleuterio@2022',
    database: 'chat'

});

connection.connect(function(err) {
    if (err) {
        console.error('error connecting');

    } else {
        console.log('connected as CHAT DATABASE');
    }
});

io.on('connection', function(socket) {

        if (!sockets[socket.handshake.query.user_id]) {
            sockets[socket.handshake.query.user_id] = [];
        }
        sockets[socket.handshake.query.user_id].push(socket);
        socket.broadcast.emit('user_connected', socket.handshake.query.user_id);
        connection.query('UPDATE users SET is_online = 1 WHERE id = ?', [socket.handshake.query.user_id], function(err, result) {
            if (err)
                throw err;
            console.log('user_connected', socket.handshake.query.user_id);
        })

        socket.on('disconnect', function() {
            socket.broadcast.emit('user_disconnected', socket.handshake.query.user_id);

            for (var i in sockets[socket.handshake.query.user_id]) {
                if (socket.id == sockets[socket.handshake.query.user_id][i].id) {
                    sockets[socket.handshake.query.user_id].splice(i, 1);
                }
            }

            connection.query('UPDATE users SET is_online = 0 WHERE id = ?', [socket.handshake.query.user_id], function(err, result) {
                if (err)
                    throw err;
                console.log('user_disconnected', socket.handshake.query.user_id);

            });
        })



        socket.on('send_message', function(data) {

            group_id = (data.user_id > data.other_user_id) ? data.user_id + data.other_user_id : data.other_user_id + data.user_id;
            var time = moment().format("h:mm A");
            data.time = time;



            connection.query(`INSERT INTO chats ( user_id, other_user_id, message, group_id) VALUES (${data.user_id}, ${data.other_user_id}, '${data.message}', ${data.group_id})`, function(err, res) {
                if (err)
                    throw err

                data.id = res.insertId;
                for (var index in sockets[data.user_id]) {
                    sockets[data.user_id][index].emit('receive_message', data);
                }
                for (var index in sockets[data.other_user_id]) {
                    sockets[data.other_user_id][index].emit('receive_message', data);
                }

                console.log('MESSAGE SENT')
            })

        })


        socket.on('read_message', function(data) {

            connection.query(`UPDATE chats SET is_read=1 where id${data.id}`, function(err, res) {
                if (err)
                    throw err
                console.log("MESSAGE READ")
            })

        })
    }

)

http.listen(5002, function() {
    console.log('listening on *:5002');

})