import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import socket from "../socket";
import { QRCodeCanvas } from "qrcode.react";
import { createPeer } from "./webrtc";
import { v4 as uuidv4 } from "uuid";

function Receiver() {
  const navigate = useNavigate();

  const remoteVideoRef = useRef(null);
  const peerRef = useRef(createPeer());
  const wakeLockRef = useRef(null);
  const videoContainerRef = useRef(null);
 const [isFullscreen, setIsFullscreen] = useState(false);

  const [roomId, setRoomId] = useState("");
  const [connected, setConnected] = useState(false);
  const [showPairRequest, setShowPairRequest] =
    useState(false);
    const [status, setStatus] =
  useState("Waiting for sender...");
  const mediaRecorderRef = useRef(null);
const recordedChunksRef = useRef([]);
const [recording, setRecording] = useState(false);
const toggleRecording = () => {
  const stream =
    remoteVideoRef.current?.srcObject;

  if (!stream) return;

  if (!recording) {
    recordedChunksRef.current = [];

    const recorder =
      new MediaRecorder(stream);

    mediaRecorderRef.current =
      recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunksRef.current.push(
          e.data
        );
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(
        recordedChunksRef.current,
        {
          type: "video/webm",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download = `recording-${Date.now()}.webm`;

      link.click();

      URL.revokeObjectURL(url);
    };

    recorder.start();

    setRecording(true);
  } else {
    mediaRecorderRef.current.stop();
    setRecording(false);
  }
};
 
const capturePhoto = () => {
  const video = remoteVideoRef.current;

  if (!video) return;

  const canvas = document.createElement("canvas");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext("2d");

  ctx.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const link = document.createElement("a");

  link.download = `snapshot-${Date.now()}.png`;

  link.href = canvas.toDataURL("image/png");

  link.click();
};
  const requestWakeLock = async () => {
  try {
    if ("wakeLock" in navigator) {
      wakeLockRef.current =
        await navigator.wakeLock.request("screen");

      console.log("✅ Wake Lock Active");

      wakeLockRef.current.addEventListener(
        "release",
        () => {
          console.log("❌ Wake Lock Released");
        }
      );
    }
  } catch (err) {
    console.error(
      "Wake Lock Error:",
      err
    );
  }
};
const releaseWakeLock = async () => {
  try {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  } catch (err) {
    console.error(err);
  }
};
const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      await videoContainerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  } catch (err) {
    console.error(err);
  }
};
useEffect(() => {
  const handleFullscreenChange = () => {
    setIsFullscreen(
      !!document.fullscreenElement
    );
  };

  document.addEventListener(
    "fullscreenchange",
    handleFullscreenChange
  );

  return () => {
    document.removeEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );
  };
}, []);
  
useEffect(() => {

  const handleVisibility = async () => {

    if (
      document.visibilityState ===
        "visible" &&
      !wakeLockRef.current
    ) {
      await requestWakeLock();
    }
  };

  document.addEventListener(
    "visibilitychange",
    handleVisibility
  );

  return () => {
    document.removeEventListener(
      "visibilitychange",
      handleVisibility
    );
  };

}, []);

  useEffect(() => {
   const id = uuidv4();
    setRoomId(id);

    socket.emit("join-room", id);

    console.log("Room ID:", id);

    peerRef.current.ontrack = (event) => {
  console.log("Track Received");

  const stream = event.streams[0];

  console.log(stream);

  if (remoteVideoRef.current) {
    remoteVideoRef.current.srcObject = stream;

    remoteVideoRef.current
      .play()
      .then(() => console.log("Video Playing"))
      .catch((err) =>
        console.error("Play Error:", err)
      );
  }
};

    peerRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          roomId: id,
          candidate: event.candidate,
        });
      }
    };
    peerRef.current.onconnectionstatechange = () => {
      const state =
    peerRef.current.connectionState;
   
     console.log(
    "Connection State:",
    state
  );


  if (state === "connected") {
    requestWakeLock();
    setConnected(true);
    setStatus("🟢 Connected");
  }

  if (
    state === "disconnected" ||
    state === "failed"
  ) {
    setConnected(false);
    setStatus("🔴 Connection Lost");
  }

  if (state === "connecting") {
    setStatus("🟡 Connecting...");
  }
 
};

    socket.on("peer-joined", () => {
      console.log("Sender Connected");
    });

    socket.on("pair-request", () => {
      console.log("Pair Request Received");

      setShowPairRequest(true);
    });
   


    socket.on("offer", async (offer) => {
      console.log("Offer Received");

     await peerRef.current.setRemoteDescription(offer);

console.log("Remote Description Set");

      const answer =
        await peerRef.current.createAnswer();

      await peerRef.current.setLocalDescription(answer);

      console.log("Answer Created");

      socket.emit("answer", {
        roomId: id,
        answer,
      });

      console.log("Answer Sent");
    });
    

    socket.on(
      "ice-candidate",
      async (candidate) => {
        try {
          await peerRef.current.addIceCandidate(
            candidate
          );

          console.log(
            "ICE Candidate Added"
          );
        } catch (err) {
          console.error(err);
        }
      }
    );
    socket.on(
  "sender-disconnected",
  () => {
    console.log(
      "Sender Disconnected"
    );

    setConnected(false);

    setStatus(
      "Sender stopped streaming"
    );

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject =
        null;
    }
  }
);

    return () => {
   socket.off("peer-joined");
  socket.off("pair-request");
  socket.off("offer");
  socket.off("ice-candidate");
  socket.off(
  "sender-disconnected"
);

    };
  }, []);

  const acceptPairing = () => {
  
  socket.emit("pair-accepted", roomId);

  setConnected(true);

  setShowPairRequest(false);
};

 const rejectPairing = () => {
  console.log("REJECT CLICKED");

  socket.emit(
    "pair-rejected",
    roomId
  );

  setShowPairRequest(false);
};

  return (
    <>
      <Navbar />

      <div className="page">
        <div className="content-card"
        style={{
    width: connected
      ? "95vw"
      : "700px",
    maxWidth: "1400px",
  }}>
          <h1>🖥️ Receiver Device</h1>

         <p>{status}</p>
        <div
  ref={videoContainerRef}
  className="preview-box"
  style={{
    position: "relative",
    width: "93%",
    height: connected ? "80vh" : "400px",
    margin: "0 auto",
    overflow: "hidden",
    borderRadius: "16px",
    background: "#000",
  }}
>
  <video
    ref={remoteVideoRef}
    autoPlay
    playsInline
    muted
    style={{
       width: "75%",
    height: "auto",
    transform: "rotate(90deg)",
    objectFit: "cover",
    borderRadius: "12px",
      display: connected ? "block" : "none",
    }}
  />

  {!connected && roomId && (
    <div
  style={{
    background: "rgba(255,255,255,0.05)",
    padding: "25px",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.1)",
    display: "inline-block",
    boxShadow:
      "0 10px 30px rgba(0,0,0,0.3)",
  }}
>
  <QRCodeCanvas
    value={roomId}
    size={350}
    includeMargin={true}
    bgColor="#ffffff"
    fgColor="#000000"
  />
</div>
  )}
  

  {connected && (
    <>
      {/* TOP RIGHT */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          display: "flex",
          gap: "10px",
          zIndex: 999,
        }}
      >
        
        <button
  onClick={toggleFullscreen}
  style={{
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    border: "none",
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(10px)",
    color: "white",
    cursor: "pointer",
    fontSize: "20px",
  }}
>
  {isFullscreen ? "🗗" : "⛶"}
</button>

        <button
        onClick={async () => {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  }

  await releaseWakeLock();

  socket.emit(
    "receiver-disconnected",
    roomId
  );

  navigate("/receiver", { replace: true });

  window.location.reload();
}}
          style={{
            width: "45px",
            height: "45px",
            borderRadius: "50%",
            border: "none",
            background: "rgba(0,0,0,0.6)",
            color: "white",
            cursor: "pointer",
            fontSize: "20px",
          }}
        >
          ←
        </button>
      </div>

      {/* BOTTOM CAMERA CONTROLS */}
      <div
        style={{
          position: "absolute",
          bottom: "0px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "35px",
          alignItems: "center",
          zIndex: 999,
        }}
      >
        <div
         style={{
    position: "absolute",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: "30px",
    alignItems: "center",
    padding: "15px 30px",
    borderRadius: "50px",
    background: "rgba(0,0,0,0.1)",
    backdropFilter: "blur(12px)",
    zIndex: 999,
  }}
 >

     <button
  onClick={capturePhoto}
  style={{
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "5px solid white",
    background: "#ffffff",
    cursor: "pointer",
    boxShadow:
      "0 0 25px rgba(255,255,255,0.4)",
    transition: "0.2s",
  }}
/>


   <button
  onClick={toggleRecording}
  style={{
    width: "40px",
    height: "40px",
    borderRadius: recording
      ? "8px"
      : "50%",
    border: "4px solid white",
    background: "#ff2d55",
    cursor: "pointer",
    boxShadow:
      "0 0 20px rgba(255,45,85,0.5)",
  }}
/>

        </div>
     


      </div>
    </>
  )}
</div>
          {showPairRequest && (
            <div
              style={{
                marginTop: "20px",
                padding: "20px",
                border: "1px solid white",
                borderRadius: "10px",
              }}
            >
              <h3>Connection Request</h3>

              <p>
                A sender device wants to
                connect.
              </p>

              <button
                className="primary-btn"
                onClick={acceptPairing}
              >
                Accept
              </button>

              <button
                className="secondary-btn"
                onClick={rejectPairing}
              >
                Reject
              </button>
            </div>
          )}


        
        </div>
      </div>
    </>
  );
}

export default Receiver;