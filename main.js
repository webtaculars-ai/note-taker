const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const { Configuration, OpenAIApi } = require("openai");
const express = require('express');
const bodyParser = require('body-parser');

let mainWindow;
let oAuth2Client;
let calendar;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Google OAuth2 configuration
const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'http://localhost';
const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly'];

// Handle Google Sign-in
ipcMain.handle('google-sign-in', async () => {
  try {
    oAuth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    const authWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      'node-integration': false,
      'web-security': false
    });

    authWindow.loadURL(authUrl);
    authWindow.show();

    return new Promise((resolve, reject) => {
      authWindow.webContents.on('will-redirect', async (event, url) => {
        const urlObj = new URL(url);
        const code = urlObj.searchParams.get('code');
        if (code) {
          authWindow.close();
          try {
            const { tokens } = await oAuth2Client.getToken(code);
            oAuth2Client.setCredentials(tokens);
            calendar = google.calendar({ version: 'v3', auth: oAuth2Client });
            resolve(tokens);
          } catch (err) {
            reject(err);
          }
        }
      });

      authWindow.on('closed', () => {
        reject(new Error('Auth window was closed'));
      });
    });
  } catch (error) {
    console.error('Error during Google Sign-in:', error);
    return null;
  }
});

// Fetch upcoming meetings
ipcMain.handle('fetch-meetings', async () => {
  try {
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: (new Date()).toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return res.data.items;
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return [];
  }
});

// Set up OpenAI API
const configuration = new Configuration({
  apiKey: 'YOUR_OPENAI_API_KEY',
});
const openai = new OpenAIApi(configuration);

// Set up Express server for API
const expressApp = express();
expressApp.use(bodyParser.json());

expressApp.post('/summarize', async (req, res) => {
  try {
    const { transcript } = req.body;
    const response = await openai.createCompletion({
      model: "gpt-4o-mini",
      prompt: `Summarize the following interview transcript, focusing on key hiring aspects like background, skills, experience, motivation, fit, availability, salary expectations, thoughts, and next steps:\n\n${transcript}`,
      max_tokens: 500
    });
    res.json({ summary: response.data.choices[0].text.trim() });
  } catch (error) {
    console.error('Error summarizing transcript:', error);
    res.status(500).json({ error: 'Error summarizing transcript' });
  }
});

const port = 3000;
expressApp.listen(port, () => {
  console.log(`API server running on port ${port}`);
});