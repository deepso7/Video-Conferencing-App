import { createServer } from "http";
import express from "express";
import { Server } from "socket.io";
import chalk from "chalk";
import cors from "cors";

const app = express();
app.use(cors());

const server = createServer(app);
const options = {
  cors: true,
  origin: "http://localhost:3000",
};
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

let connectedUsers = [];
const room = "123";

io.on("connect", (socket) => {
  connectedUsers.push(socket.id);
  socket.join(room);
  socket.broadcast.emit("update-user-list", { userIds: connectedUsers });

  socket.on("mediaOffer", (data) => {
    socket.broadcast.to(room).emit("mediaOffer", {
      from: data.from,
      offer: data.offer,
    });
  });

  socket.on("mediaAnswer", (data) => {
    socket.broadcast.to(room).emit("mediaAnswer", {
      from: data.from,
      answer: data.answer,
    });
  });

  socket.on("iceCandidate", (data) => {
    socket.broadcast.to(room).emit("remotePeerIceCandidate", {
      candidate: data.candidate,
    });
  });

  socket.on("disconnect", () => {
    connectedUsers = connectedUsers.filter((user) => user !== socket.id);
    socket.broadcast.emit("update-user-list", { userIds: connectedUsers });
  });
});

//////////////////////////
app.get("/", (req, res) => {
  res.send("Woring");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(chalk.yellow.bold("Server is running on port:", PORT))
);

// const express = require("express");
// const path = require("path");

// const app = express();

// const http = require("http").createServer(app);
// const io = require("socket.io")(http, {
//   cors: {
//     origin: "http://localhost:3000",
//     methods: ["GET", "POST"],
//   },
// });

// let connectedUsers = [];
// let connectCounter = 0;

// let room = "123";

// io.on("connection", (socket) => {
//   connectedUsers.push(socket.id);
//   connectCounter++;
//   console.log(connectCounter);

//   console.log("A user connected");

//   io.sockets.emit("user-joined", socket.id, connectCounter, connectedUsers);

//   socket.on("signal", (toId, message) => {
//     io.to(toId).emit("signal", socket.id, message);
//   });

//   socket.on("message", function (data) {
//     io.sockets.emit("broadcast-message", socket.id, data);
//   });

//   socket.on("disconnect", () => {
//     io.sockets.emit("user-left", socket.id);
//     connectedUsers = connectedUsers.filter((user) => user !== socket.id);
//     connectCounter--;
//   });
// });

// http.listen(5000, () => {
//   console.log("listening on localhost:5000");
// });
