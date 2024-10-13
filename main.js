const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");
const { Configuration, OpenAIApi } = require("openai");
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
require("dotenv").config();
// Set up Express server for API
const expressApp = express();
expressApp.use(bodyParser.json());
const port = 3000;

let mainWindow;
let oAuth2Client;
let calendar;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile("index.html");
}

// Google OAuth2 configuration
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/oauth2callback";
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

expressApp.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  if (code) {
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);
      calendar = google.calendar({ version: "v3", auth: oAuth2Client });

      // Store the credentials for future use
      fs.writeFileSync("credentials.json", JSON.stringify(tokens));

      res.send("Authentication successful! You can close this window.");
      mainWindow.webContents.send("google-sign-in-success");
    } catch (err) {
      console.error("Error getting tokens:", err);
      res.status(500).send("Authentication failed. Please try again.");
    }
  } else {
    res.status(400).send("No code provided");
  }
});

const server = expressApp.listen(port, () => {
  console.log(`Express server running on port ${port}`);
});

app.on("will-quit", () => {
  server.close();
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// Handle Google Sign-in
ipcMain.handle("google-sign-in", async () => {
  try {
    oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

    // Check if we have stored credentials
    try {
      const credentials = fs.readFileSync("credentials.json");
      oAuth2Client.setCredentials(JSON.parse(credentials));
      calendar = google.calendar({ version: "v3", auth: oAuth2Client });
      return { success: true };
    } catch (err) {
      // If no stored credentials, proceed with new auth flow
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
      });

      // Open the auth URL in the default browser
      require("electron").shell.openExternal(authUrl);

      return {
        success: false,
        message: "Please complete the authentication in your browser.",
      };
    }
  } catch (error) {
    console.error("Error during Google Sign-in:", error);
    return { success: false, error: error.message };
  }
});
// Fetch upcoming meetings
ipcMain.handle("fetch-meetings", async () => {
  try {
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });
    return res.data.items;
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return [];
  }
});

// Set up OpenAI API
const configuration = new Configuration({
  apiKey: "YOUR_OPENAI_API_KEY",
});
const openai = new OpenAIApi(configuration);

expressApp.post("/summarize", async (req, res) => {
  try {
    const { transcript } = req.body;
    const response = await openai.createCompletion({
      model: "gpt-4o-mini",
      prompt: `Summarize the following interview transcript, focusing on key hiring aspects like background, skills, experience, motivation, fit, availability, salary expectations, thoughts, and next steps:\n\n${transcript}`,
      max_tokens: 500,
    });
    res.json({ summary: response.data.choices[0].text.trim() });
  } catch (error) {
    console.error("Error summarizing transcript:", error);
    res.status(500).json({ error: "Error summarizing transcript" });
  }
});
