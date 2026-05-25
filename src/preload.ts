// See the Electron documentation for details on how to use preload scripts:

import { contextBridge, ipcRenderer } from "electron";

// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
contextBridge.exposeInMainWorld("electron", {
  startAuth: () => ipcRenderer.send("start-auth"),
  onAuthSuccess: (callback: (token: string) => void) =>
    ipcRenderer.on("auth-success", (_event, token) => callback(token)),
});
