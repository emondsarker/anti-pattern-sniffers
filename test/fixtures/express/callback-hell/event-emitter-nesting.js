// True positive: deeply nested event handlers
server.on('connection', (socket) => {
  socket.on('data', (chunk) => {
    parser.on('message', (msg) => {
      db.query('SELECT * FROM users', (err, rows) => {
        socket.write(JSON.stringify(rows));
      });
    });
  });
});
