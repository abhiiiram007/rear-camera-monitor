import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import ModeCard from "../components/ModeCard";

function Home() {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />

      <main className="home">

        <div className="hero">

          <h1>Rear Camera Monitor</h1>

          <p>
            Turn your smartphone into a wireless camera
            and monitor it from any device in real time.
          </p>

        </div>

        <div className="cards">

          <ModeCard
            icon="📱"
            title="Send Camera"
            description="Share your phone's rear camera"
            onClick={() => navigate("/sender")}
          />

          <ModeCard
            icon="🖥️"
            title="Receive Feed"
            description="View the live camera stream"
            onClick={() => navigate("/receiver")}
          />

        </div>

      </main>
    </>
  );
}

export default Home;