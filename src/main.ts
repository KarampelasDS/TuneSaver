import { app, BrowserWindow, shell, ipcMain } from "electron";
import path from "node:path";
import crypto from "node:crypto";
import started from "electron-squirrel-startup";
import dotenv from "dotenv";
const envPath = app.isPackaged
  ? path.join(process.resourcesPath, ".env")
  : path.join(__dirname, "../../.env");

dotenv.config({ path: envPath });

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let codeVerifier: string | null = null;
const clientId = process.env.VITE_SPOTIFY_CLIENT_ID;

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
  const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=tunesaver://callback&scope=user-read-private%20user-read-email&code_challenge_method=S256&code_challenge=${challenge}`;
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
    })
    .catch((err) => {
      console.error("Error exchanging code for token:", err);
    });
};

const handleCallback = (url: string) => {
  const code = new URL(url).searchParams.get("code");
  if (code) exchangeCodeForToken(code);
};

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// Mac/Linux
app.on("open-url", (event, url) => {
  handleCallback(url);
});

// Windows
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine) => {
    const url = commandLine.find((arg) => arg.startsWith("tunesaver://"));
    if (url) handleCallback(url);
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.setAsDefaultProtocolClient("tunesaver");
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
