const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  googleSignIn: () => ipcRenderer.invoke("google-sign-in"),
  fetchMeetings: () => ipcRenderer.invoke("fetch-meetings"),
  onGoogleSignInSuccess: (callback) =>
    ipcRenderer.on("google-sign-in-success", callback),
});
