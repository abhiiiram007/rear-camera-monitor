import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import socket from "../socket";
import { createPeer } from "./webrtc";
function Sender() {
  const navigate = useNavigate();
  const wakeLockRef = useRef(null);

  const roomRef = useRef("");
  const streamRef = useRef(null);
  const peerRef = useRef(createPeer());
  const [scannerStarted, setScannerStarted] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [paired, setPaired] = useState(false);
  const [status, setStatus] =
  useState("Scan Receiver QR");
  const [toast, setToast] = useState("");
  const showToast = (message) => {
  setToast(message);

  setTimeout(() => {
    setToast("");
  }, 2000);
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
  


  const startCamera = async () => {
    try {
      
    console.log("START CAMERA CALLED");
    console.log("Secure:", window.isSecureContext);
    console.log("MediaDevices:", navigator.mediaDevices);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
  facingMode: { ideal: "environment" }
},
        audio: false,
      });

      console.log("Camera Stream:", stream);
      streamRef.current = stream;

      const tracks = stream.getVideoTracks();

      console.log("Video Tracks:", tracks);

      tracks.forEach((track) => {
        console.log(
          "Adding Track:",
          track.kind,
          track.readyState
        );

        peerRef.current.addTrack(track, stream);
      });

      console.log(
        "Senders After Add:",
        peerRef.current.getSenders()
      );

      return stream;
    } catch (err) {
      console.error("Camera Error:", err);
      return null;
    }
  };
 const disconnectSession = () => {
  releaseWakeLock();
  
  try {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      streamRef.current = null;
    }

    socket.emit(
      "sender-disconnected",
      roomRef.current
    );

    peerRef.current.close();

    setPaired(false);
    setRoomId("");

    socket.emit(
      "leave-room",
      roomRef.current
    );

    roomRef.current = "";
  } catch (err) {
    console.error(err);
  }
};
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
  const handleUnload = () => {
    socket.emit(
      "sender-disconnected",
      roomRef.current
    );
  };

  window.addEventListener(
    "beforeunload",
    handleUnload
  );

  return () => {
    window.removeEventListener(
      "beforeunload",
      handleUnload
    );
  };
}, []);

  useEffect(() => {
    peerRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          roomId: roomRef.current,
          candidate: event.candidate,
        });
      }
    };

    peerRef.current.onconnectionstatechange = () => {
      const state = peerRef.current.connectionState;

if (state === "connected") {
  setStatus("🟢 Connected");
}

if (
  state === "disconnected" ||
  state === "failed"
) {
  setStatus("🔴 Connection Lost");
  setPaired(false);
}

if (state === "connecting") {
  setStatus("🟡 Connecting...");
}
      console.log(
        "Connection State:",
        peerRef.current.connectionState
      );
    };

    peerRef.current.oniceconnectionstatechange = () => {
      console.log(
        "ICE State:",
        peerRef.current.iceConnectionState
      );
    };

    peerRef.current.onsignalingstatechange = () => {
      console.log(
        "Signaling State:",
        peerRef.current.signalingState
      );
    };

    socket.on(
  "receiver-disconnected",
  () => {
    setPaired(false);

    setStatus(
      "❌ Receiver Disconnected"
    );
showToast("❌ Receiver Disconnected");
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) =>
          track.stop()
        );

      streamRef.current = null;
    }
  }
);

    socket.on("pair-accepted", async () => {
      
      setStatus(
  "🟢 Receiver accepted. Connecting..."
);
showToast("🟢Accepted");
      try {
      console.log("PAIR ACCEPTED EVENT FIRED");

        setPaired(true);
setStatus("📹 Streaming");
        const stream =
          await startCamera();
           await requestWakeLock();

        if (!stream) {
          console.error(
            "Camera stream unavailable"
          );
          return;
        }

        const offer =
          await peerRef.current.createOffer({
            offerToReceiveVideo: true,
            offerToReceiveAudio: false,
          });

        await peerRef.current.setLocalDescription(
          offer
        );

        console.log("Offer Created");

        socket.emit("offer", {
          roomId: roomRef.current,
          offer,
        });

        console.log("Offer Sent");
      } catch (err) {
        console.error(err);
      }
    });
    

    socket.on(
      "answer",
      async (answer) => {
        try {
          console.log(
            "ANSWER EVENT FIRED"
          );

          await peerRef.current.setRemoteDescription(
            answer
          );

          console.log(
            "Remote Description Set"
          );

          console.log(
            "Answer Received"
          );
        } catch (err) {
          console.error(err);
        }
      }
    );
    socket.on("pair-rejected", () => {
  showToast("❌Rejected ");

  setStatus("❌ Connection Rejected");
   setTimeout(() => {
    navigate("/sender");
  }, 2000);

  navigate("/sender");
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

    return () => {
      socket.off("pair-accepted");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("pair-rejected");
      socket.off(
  "receiver-disconnected"
);
socket.off("pair-rejected");
    };
  }, []);

  useEffect(() => {
  if (!scannerStarted) return;

  const html5QrCode = new Html5Qrcode("reader");

  const startScanner = async () => {
    try {
      // // Force permission request first
      // await navigator.mediaDevices.getUserMedia({
      //   video: true,
      // });

      
    

      await html5QrCode.start(
  { facingMode: "environment" },
  {
    fps: 5,
    qrbox: 250,
    aspectRatio: 1.0,
        },
        (decodedText) => {
          setStatus("✅ QR Scanned Successfully");
          showToast("✅Scanned");
        

          console.log(
            "QR Scanned:",
            decodedText
          );
   setStatus(
  "⏳ Waiting for receiver approval..."
);
          setRoomId(decodedText);

          roomRef.current =
            decodedText;

          socket.emit(
            "join-room",
            decodedText
          );

          socket.emit(
            "pair-request",
            decodedText
          );

          html5QrCode.stop();
        },
        () => {}
      );
    } catch (err) {
      console.error(
        "Scanner Error:",
        err
      );

      alert(
        "Scanner Error: " +
          JSON.stringify(err)
      );
    }
  };

  startScanner();

  return () => {
    html5QrCode
      .stop()
      .catch(() => {});
  };
}, [scannerStarted]);
        

  return (
    <>
      <Navbar />

      <div className="page">
        <div className="content-card">
          <h1>📱 Sender Device</h1>

          <p>
            Scan the receiver QR code.
          </p>

          <div className="preview-box">
            {paired ? (
              <div
                style={{
                  color:
                    "lightgreen",
                  fontSize: "20px",
                  fontWeight:
                    "bold",
                }}
              >
                📹 Streaming to Receiver
              </div>
            ) : !scannerStarted ? (
              "QR Scanner"
            ) : (
              <div
                id="reader"
                style={{
                  width: "300px",
                  margin:
                    "0 auto",
                }}
              />
            )}
          </div>

          {!scannerStarted ? (
            <button
              className="primary-btn"
              onClick={() =>
                setScannerStarted(
                  true
                )
              }
            >
              Start Scanner
            </button>
          ) : (
           <p
  style={{
    color: "white",
    fontWeight: "bold",
  }}
>
  {status}
</p>
          )}

          {paired && (
            <p
              style={{
                color:
                  "lightgreen",
                fontWeight:
                  "bold",
              }}
            >
              ✅ Pairing Accepted
            </p>
          )}

       <button
  className="secondary-btn"
  onClick={() => {
    disconnectSession();

    navigate("/sender", {
      replace: true,
    });

    window.location.reload();
  }}
>
  Back
</button>



          <button
            onClick={() => {
              const room =
                prompt(
                  "Enter Room ID"
                );

              if (!room) return;

              setRoomId(room);

              roomRef.current =
                room;

              socket.emit(
                "join-room",
                room
              );

              socket.emit(
                "pair-request",
                room
              );
            }}
          >
            Join Room Manually
          </button>
        </div>
      </div>
      {toast && (
  <div
    style={{
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(34,197,94,0.95)",
      color: "white",
      padding: "12px 24px",
      borderRadius: "14px",
      fontWeight: "600",
      fontSize: "15px",
      zIndex: 9999,
      boxShadow:
        "0 10px 25px rgba(0,0,0,0.25)",
      backdropFilter: "blur(10px)",
      animation: "slideDown 0.3s ease",
    }}
  >
    {toast}
  </div>
)}
    </>
  );
}

export default Sender;