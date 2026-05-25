import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import "./index.css";

type UserData = {
  playlists: any[];
};

function App() {
  const [token, setToken] = useState<string | null>(
    import.meta.env.VITE_TEMP_TOKEN,
  );
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  useEffect(() => {
    /*window.electron.onAuthSuccess((token) => {
      console.log("token:", token);
      setToken(token);
      setLoggedIn(true);
    });*/
    if (token) {
      setLoggedIn(true);
      fetch("https://api.spotify.com/v1/me/playlists?limit=6", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Playlists:", data);
          setUserData({ playlists: data.items });
        });
    }
  }, []);
  return (
    <>
      {loggedIn ? (
        <p>Logged in successfully!</p>
      ) : (
        <button onClick={() => electron.startAuth()}>
          Start Authentication
        </button>
      )}
      {userData?.playlists && (
        <div>
          <h2>Your Playlists:</h2>
          <ul>
            {userData.playlists.map((playlist: any) => (
              <li key={playlist.id}>{playlist.name}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
