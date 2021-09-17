const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const shortid = require('shortid');

//import peer
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
  debug: true
});

app.use('/peerjs', peerServer);

app.set('view engine', 'ejs')
app.use(express.static(__dirname + '/public'));


app.get('/', (req, res) => {
  res.render('Home')
});

app.get('/room', (req, res) => {
  res.redirect(`/${shortid.generate()}`);
});

app.get('/:room', (req, res) => {
  return res.render('Room', {
    roomId: req.params.room
  });
});

// Handle 404 
// app.use(function(req, res, next) {
//   res.status(404).render("NotFound");
// });

app.get('/notfound', (req, res) => {
  res.render('NotFound')
});


const users = {};
io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    if (users[roomId])
      users[roomId].push({id: userId, video: true, audio: true});
    else
      users[roomId] = [{id: userId, video: true, audio: true }];

    socket.join(roomId);
    socket.to(roomId).emit("user-connected", userId);
    socket.on('send-message', message =>{
      socket.to(roomId).emit('receive-message', message, userId)
    })

    //start manage media of participants
    io.in(roomId).emit("participants", users[roomId]);

    socket.on("mute-mic", () => {
      users[roomId].forEach((user) => {
        if (user.id === userId) return (user.audio = false);
      });
      io.in(roomId).emit("participants", users[roomId]);
    });

    socket.on("unmute-mic", () => {
      users[roomId].forEach((user) => {
        if (user.id === userId) return (user.audio = true);
      });
      io.in(roomId).emit("participants", users[roomId]);
    });

    socket.on("stop-video", () => {
      users[roomId].forEach((user) => {
        if (user.id === userId) return (user.video = false);
      });
      io.in(roomId).emit("participants", users[roomId]);
    });

    socket.on("play-video", () => {
      users[roomId].forEach((user) => {
        if (user.id === userId) return (user.video = true);
      });
      io.in(roomId).emit("participants", users[roomId]);
    });
    // end manage media of participants

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId)
      //delete user from list participant
      users[roomId] = users[roomId].filter((user) => user.id !== userId);
            if (users[roomId].length === 0) delete users[roomId];
            else io.in(roomId).emit("participants", users[roomId]);
    })
  })
})


// app.use(function(err, req, res, next) {
//     res.status(err.status || 500);
//     res.render('NotFound');
// });


server.listen(process.env.PORT||3030)


