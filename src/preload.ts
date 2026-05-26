import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  startAuth: () => ipcRenderer.send("start-auth"),
  openExternal: (url: string) => ipcRenderer.send("open-external", url),
  onAuthSuccess: (callback: (token: string) => void) =>
    ipcRenderer.on("auth-success", (_event, token) => callback(token)),

  selectDirectory: (): Promise<string | null> =>
    ipcRenderer.invoke("select-directory"),

  scanCustomLevels: (customLevelsPath: string): Promise<string[]> =>
    ipcRenderer.invoke("scan-custom-levels", customLevelsPath),

  downloadMap: (args: {
    selectionId: string;
    mapId: string;
    downloadURL: string;
    songName: string;
    artistName: string;
    beatSaberPath: string;
  }): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("download-map", args),

  onDownloadProgress: (
    callback: (data: { selectionId: string; progress: number }) => void,
  ) =>
    ipcRenderer.on("download-progress", (_event, data) => callback(data)),

  createBplist: (args: {
    title: string;
    imageBase64: string;
    songs: { hash: string; songName: string }[];
    beatSaberPath: string;
  }): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("create-bplist", args),
});
