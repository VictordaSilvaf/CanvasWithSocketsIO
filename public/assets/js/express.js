      // Load do Jogo [SOCKET]
      var socket = io();
      socket.on("connect", () => {
        user = { id: socket.id };
        users[socket.id] = user;
        renderUsers();
      });

      // [Controle de Movimentos]
      window.addEventListener("keydown", (e) => {
        const moves = {
          ArrowUp: { x: 0, y: -10 },
          ArrowDown: { x: 0, y: 10 },
          ArrowLeft: { x: -10, y: 0 },
          ArrowRight: { x: 10, y: 0 },
        };

        const move = moves[e.key];
        if (move) socket.emit("ON_USER_MOVE", { id: socket.id, move });
      });

      // [RERENDER]
      socket.on("ON_USERS_UPDATE", (updatedUsers) => {
        users = JSON.parse(updatedUsers);
        renderUsers();
      });