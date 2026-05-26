import { app, BrowserWindow, shell, ipcMain, dialog } from "electron";
import path from "node:path";
import fs from "node:fs";
import https from "node:https";
import http from "node:http";
import crypto from "node:crypto";
import started from "electron-squirrel-startup";
import dotenv from "dotenv";
import AdmZip from "adm-zip";

const envPath = app.isPackaged
  ? path.join(process.resourcesPath, ".env")
  : path.join(__dirname, "../../.env");

dotenv.config({ path: envPath });

if (started) {
  app.quit();
}

let codeVerifier: string | null = null;
const clientId = process.env.VITE_SPOTIFY_CLIENT_ID;

let accessToken: string | null = null;

const generatePKCE = () => {
  codeVerifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  return challenge;
};

ipcMain.on("start-auth", () => {
  const challenge = generatePKCE();
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=tunesaver://callback&scope=user-read-private%20user-read-email%20playlist-read-private%20playlist-read-collaborative&code_challenge_method=S256&code_challenge=${challenge}`;
  shell.openExternal(authUrl);
});

const exchangeCodeForToken = async (code: string) => {
  fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId!,
      grant_type: "authorization_code",
      code,
      redirect_uri: "tunesaver://callback",
      code_verifier: codeVerifier!,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Access Token:", data.access_token);
      accessToken = data.access_token;
      BrowserWindow.getAllWindows()[0].webContents.send(
        "auth-success",
        data.access_token,
      );
    })
    .catch((err) => {
      console.error("Error exchanging code for token:", err);
    });
};

const handleCallback = (url: string) => {
  const code = new URL(url).searchParams.get("code");
  if (code) exchangeCodeForToken(code);
};

ipcMain.on("open-external", (_event, url: string) => {
  shell.openExternal(url);
});

ipcMain.handle("select-directory", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openDirectory"] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle(
  "scan-custom-levels",
  async (_event, customLevelsPath: string) => {
    try {
      const entries = fs.readdirSync(customLevelsPath, { withFileTypes: true });
      return entries
        .filter((e) => e.isDirectory())
        .map((e) => {
          const match = e.name.match(/^([0-9a-f]+)\s/i);
          return match ? match[1].toLowerCase() : null;
        })
        .filter(Boolean) as string[];
    } catch {
      return [];
    }
  },
);

function downloadFile(
  url: string,
  dest: string,
  onProgress: (p: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const attempt = (u: string) => {
      const protocol = u.startsWith("https") ? https : http;
      protocol
        .get(u, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            res.resume(); // drain so the socket is released
            const location = res.headers.location;
            if (!location) {
              reject(new Error("Redirect with no location"));
              return;
            }
            attempt(location);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          const total = parseInt(res.headers["content-length"] ?? "0", 10);
          let received = 0;
          const file = fs.createWriteStream(dest);
          res.on("data", (chunk: Buffer) => {
            received += chunk.length;
            if (total > 0) onProgress(Math.round((received / total) * 100));
          });
          res.pipe(file);
          file.on("finish", () => {
            file.close();
            resolve();
          });
          file.on("error", reject);
          res.on("error", reject);
        })
        .on("error", reject);
    };
    attempt(url);
  });
}

ipcMain.handle(
  "download-map",
  async (
    _event,
    args: {
      selectionId: string;
      mapId: string;
      downloadURL: string;
      songName: string;
      artistName: string;
      beatSaberPath: string;
    },
  ) => {
    const {
      selectionId,
      mapId,
      downloadURL,
      songName,
      artistName,
      beatSaberPath,
    } = args;
    const customLevelsPath = path.join(
      beatSaberPath,
      "Beat Saber_Data",
      "CustomLevels",
    );
    const safe = (s: string) => s.replace(/[<>:"/\\|?*\x00-\x1f]/g, "");
    const destDir = path.join(
      customLevelsPath,
      `${mapId} (${safe(songName)} - ${safe(artistName)})`,
    );
    const tmpFile = path.join(
      app.getPath("temp"),
      `tunesaver_${mapId}_${Date.now()}.zip`,
    );

    try {
      fs.mkdirSync(customLevelsPath, { recursive: true });

      await downloadFile(downloadURL, tmpFile, (progress) => {
        BrowserWindow.getAllWindows()[0]?.webContents.send(
          "download-progress",
          {
            selectionId,
            progress,
          },
        );
      });

      const zip = new AdmZip(tmpFile);
      zip.extractAllTo(destDir, true);
      try {
        fs.unlinkSync(tmpFile);
      } catch {}

      return { success: true };
    } catch (error) {
      try {
        fs.unlinkSync(tmpFile);
      } catch {}
      return { success: false, error: String(error) };
    }
  },
);

ipcMain.handle(
  "create-bplist",
  async (
    _event,
    args: {
      title: string;
      imageBase64: string;
      songs: { hash: string; songName: string }[];
      beatSaberPath: string;
    },
  ) => {
    const { title, imageBase64, songs, beatSaberPath } = args;
    const playlistsDir = path.join(beatSaberPath, "Playlists");
    try {
      fs.mkdirSync(playlistsDir, { recursive: true });
      const safe = (s: string) => s.replace(/[<>:"/\\|?*\x00-\x1f]/g, "");
      const filename = `TuneSaver - ${safe(title)}.bplist`;
      const dest = path.join(playlistsDir, filename);
      const content: Record<string, unknown> = {
        playlistTitle: title,
        playlistAuthor: "TuneSaver",
        songs,
      };
      if (imageBase64) content.image = imageBase64;
      fs.writeFileSync(dest, JSON.stringify(content, null, 2), "utf-8");
      console.log(`[create-bplist] wrote ${dest} with ${songs.length} songs`);
      return { success: true };
    } catch (error) {
      console.error("[create-bplist] failed:", error);
      return { success: false, error: String(error) };
    }
  },
);

const createWindow = () => {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, "assets", "icon.png")
    : path.join(__dirname, "../../assets/icon.png");

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    title: "TuneSaver",
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
};

app.on("open-url", (event, url) => {
  handleCallback(url);
});

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine) => {
    const url = commandLine.find((arg) => arg.startsWith("tunesaver://"));
    if (url) handleCallback(url);
  });
}

app.setAsDefaultProtocolClient("tunesaver");
app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
