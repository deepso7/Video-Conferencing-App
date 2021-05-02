import React, { useEffect, useRef, useState, createRef } from "react";
import io from "socket.io-client";

let socket;

const Landing = () => {
  const ENDPOINT = "localhost:5000";

  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteStreamRef2 = useRef(null);

  const [userId, setUserId] = useState("");
  const [userList, setUserList] = useState([]);
  const [selectedUser, setSelectedUser] = useState([]);
  const [disableCallButton, setDisableCallButton] = useState(true);
  const [peer, setPeer] = useState(
    new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.stunprotocol.org" }],
    })
  );

  useEffect(() => {
    console.log({ peer });
  }, [peer]);

  useEffect(() => {
    socket = io(ENDPOINT);

    // To start, both sides need to get user media, create peer connection and add tracks to peer, so that ICE candidates are being sent out
    socket.on("connect", onSocketConnect);
    // Try adding remote candidate
    socket.on("remotePeerIceCandidate", onRemotePeerIceCandidate);
    // Update user list
    // socket.on("update-user-list", onUpdateUserList);
    // Receive call from a user
    socket.on("mediaOffer", onMediaOffer);
    // Receive answer from callee
    socket.on("mediaAnswer", onMediaAnswer);
  }, []);

  const onSocketConnect = async () => {
    setUserId(socket.id);

    const constraints = {
      audio: true,
      video: true,
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current.srcObject = stream;
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    setDisableCallButton(false);
  };

  const onIceCandidateEvent = (event) => {
    socket.emit("iceCandidate", {
      candidate: event.candidate,
    });
  };

  const onRemotePeerIceCandidate = async (data) => {
    try {
      const candidate = new RTCIceCandidate(data.candidate);
      await peer.addIceCandidate(candidate);
    } catch (error) {
      alert(error);
    }
  };

  // const onUpdateUserList = ({ userIds }) => {
  //   const usersToDisplay = userIds.filter((id) => id !== socket.id);
  //   setUserList(usersToDisplay);
  // };

  const onMediaOffer = async (data) => {
    try {
      await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
      const peerAnswer = await peer.createAnswer();
      await peer.setLocalDescription(new RTCSessionDescription(peerAnswer));

      socket.emit("mediaAnswer", {
        answer: peerAnswer,
        from: socket.id,
        // to: data.from,
      });
    } catch (err) {
      console.log(err);
    }
  };

  const onMediaAnswer = async (data) => {
    await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
  };

  const call = async () => {
    console.log(selectedUser);
    setDisableCallButton(true);

    const localPeerOffer = await peer.createOffer();

    await peer.setLocalDescription(new RTCSessionDescription(localPeerOffer));

    socket.emit("mediaOffer", {
      offer: localPeerOffer,
      from: socket.id,
      // to: su,
    });
  };

  const gotRemoteStream = (event) => {
    const [stream] = event.streams;

    remoteStreamRef.current.srcObject = stream;
  };

  // Gets possible ICE candidate and sends it to other peer
  peer.onicecandidate = onIceCandidateEvent;

  // Update remote video element when connection between peers is established
  peer.addEventListener("track", gotRemoteStream);

  return (
    <div>
      <div>{`My user id is ${userId}`}</div>
      <video
        ref={remoteStreamRef}
        className="remoteVideo"
        playsInline
        autoPlay
        muted
      ></video>
      <div className="videos"></div>
      <video
        className="localVideo"
        ref={localStreamRef}
        playsInline
        autoPlay
        muted
      ></video>

      <div>Users: {!userList.length && "No users connected"}</div>
      {userList.map((u, i) => (
        <button key={i} onClick={() => setSelectedUser((pu) => [...pu, u])}>
          {u}
        </button>
      ))}

      <div>
        <button className="call" onClick={call} disabled={disableCallButton}>
          Call
        </button>
      </div>
    </div>
  );
};

export default Landing;
