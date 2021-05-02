import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

let socket;
const peerConnectionConfig = {
  iceServers: [
    { urls: "stun:stun.stunprotocol.org" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

const Video = () => {
  const ENDPOINT = "localhost:5000";

  const [connections, setConnections] = useState([]);
  const [localStream, setLocalStream] = useState(null);

  const localStreamRef = useRef();

  useEffect(() => {
    (async () => {
      const constraints = {
        audio: true,
        video: true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      localStreamRef.current.srcObject = stream;
    })();
  }, []);

  useEffect(() => {
    socket = io(ENDPOINT);

    socket.on("user-left", function (id) {
      var video = document.querySelector('[data-socket="' + id + '"]');
      var parentDiv = video.parentElement;
      video.parentElement.parentElement.removeChild(parentDiv);
    });
  }, [ENDPOINT]);

  useEffect(() => {
    socket.on("signal", gotMessageFromServer);
  }, []);

  useEffect(() => {
    socket.on("user-joined", async (id, count, clients) => {
      clients.forEach((socketListId) => {
        if (!connections[socketListId]) {
          connections[socketListId] = new RTCPeerConnection(
            peerConnectionConfig
          );

          console.log(connections[socketListId]);

          connections[socketListId].onicecandidate = (event) => {
            if (event.candidate !== null) {
              console.log("SENDING ICE");
              socket.emit(
                "signal",
                socketListId,
                JSON.stringify({ ice: event.candidate })
              );

              connections[socketListId].onaddstream = () => {
                gotRemoteStream(event, socketListId);
              };

              connections[socketListId].addStream(localStream);
            }
          };
        }
      });

      try {
        if (count >= 2) {
          const desc = await connections[id].createOffer();
          await connections[id].setLocalDescription(desc);

          socket.emit(
            "signal",
            id,
            JSON.stringify({ sdp: connections[id].localDescription })
          );
        }
      } catch (error) {
        alert(error);
      }
    });
  }, []);

  const gotRemoteStream = (event, id) => {
    console.log({ event, id });
    let video = document.createElement("video");
    let div = document.createElement("div");

    video.setAttribute("data-socket", id);
    video.src = window.URL.createObjectURL(event.stream);
    video.autoplay = true;
    video.muted = true;
    video.playsinline = true;

    div.appendChild(video);
    document.querySelector(".videos").appendChild(div);
  };

  const gotMessageFromServer = async (fromId, message) => {
    try {
      const signal = JSON.parse(message);

      if (fromId !== socket.id) {
        if (signal.sdp) {
          await connections[fromId].setRemoteDescription(
            new RTCSessionDescription(signal.sdp)
          );

          if (signal.sdp.type === "offer") {
            const description = await connections[fromId].createAnswer();

            await connections[fromId].setLocalDescription(description);

            await socket.emit(
              "signal",
              fromId,
              JSON.stringify({ sdp: connections[fromId].localDescription })
            );
          }
        }

        if (signal.ice) {
          await connections[fromId].addIceCandidate(
            new RTCIceCandidate(signal.ice)
          );
        }
      }
    } catch (error) {
      alert(error);
    }
  };

  return (
    <>
      <div className="videos">
        <div>
          <video ref={localStreamRef} playsInline autoPlay muted></video>
        </div>
      </div>
    </>
  );
};

export default Video;
