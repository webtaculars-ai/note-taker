document.getElementById('signInBtn').addEventListener('click', async () => {
  try {
    const result = await window.electronAPI.googleSignIn();
    if (result) {
      console.log('Successfully signed in with Google');
      fetchMeetings();
    } else {
      console.error('Failed to sign in with Google');
    }
  } catch (error) {
    console.error('Error during Google Sign-in:', error);
  }
});

async function fetchMeetings() {
  try {
    const meetings = await window.electronAPI.fetchMeetings();
    const meetingsList = document.getElementById('meetingsList');
    meetingsList.innerHTML = '<h2>Upcoming Meetings</h2>';
    meetings.forEach(meeting => {
      const meetingItem = document.createElement('div');
      meetingItem.innerHTML = `
        <p><strong>${meeting.summary}</strong></p>
        <p>Start: ${new Date(meeting.start.dateTime || meeting.start.date).toLocaleString()}</p>
        <button class="startMeetingBtn" data-id="${meeting.id}">Start Meeting</button>
      `;
      meetingsList.appendChild(meetingItem);
    });

    document.querySelectorAll('.startMeetingBtn').forEach(btn => {
      btn.addEventListener('click', (event) => {
        startMeeting(event.target.dataset.id);
      });
    });
  } catch (error) {
    console.error('Error fetching meetings:', error);
  }
}

function startMeeting(meetingId) {
  console.log(`Starting meeting: ${meetingId}`);
  document.getElementById('noteArea').style.display = 'block';
  // Reset UI for a new meeting
  document.getElementById('transcript').value = '';
  document.getElementById('summary').textContent = '';
  document.getElementById('audioPlayback').style.display = 'none';
  document.getElementById('startRecordingBtn').disabled = false;
  document.getElementById('stopRecordingBtn').disabled = true;
  document.getElementById('playRecordingBtn').disabled = true;
}

document.getElementById('summarizeBtn').addEventListener('click', async () => {
  const transcript = document.getElementById('transcript').value;
  try {
    const response = await fetch('http://localhost:3000/summarize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript }),
    });
    const data = await response.json();
    document.getElementById('summary').textContent = data.summary;
  } catch (error) {
    console.error('Error summarizing transcript:', error);
  }
});