document.getElementById("signInBtn").addEventListener("click", async () => {
  try {
    const result = await window.electronAPI.googleSignIn();
    if (result.success) {
      handleSignInSuccess();
    } else {
      console.log(result.message);
      document.getElementById("signedInStatus").textContent =
        "Please complete the authentication in your browser.";
    }
  } catch (error) {
    console.error("Error during Google Sign-in:", error);
    document.getElementById("signedInStatus").textContent =
      "An error occurred during sign-in. Please try again.";
  }
});

window.electronAPI.onGoogleSignInSuccess(() => {
  handleSignInSuccess();
});

function handleSignInSuccess() {
  console.log("Successfully signed in with Google");
  document.getElementById("signInBtn").style.display = "none";
  document.getElementById("signedInStatus").textContent =
    "Signed in successfully";
  fetchMeetings();
}

async function fetchMeetings() {
  try {
    const meetings = await window.electronAPI.fetchMeetings();
    const meetingsList = document.getElementById("meetingsList");
    meetingsList.innerHTML = "<h2>Upcoming Meetings</h2>";
    if (meetings.length === 0) {
      meetingsList.innerHTML += "<p>No upcoming meetings found.</p>";
    } else {
      meetings.forEach((meeting) => {
        const meetingItem = document.createElement("div");
        meetingItem.innerHTML = `
          <p><strong>${meeting.summary}</strong></p>
          <p>Start: ${new Date(
            meeting.start.dateTime || meeting.start.date
          ).toLocaleString()}</p>
          <button class="startMeetingBtn" data-id="${
            meeting.id
          }">Start Meeting</button>
        `;
        meetingsList.appendChild(meetingItem);
      });

      document.querySelectorAll(".startMeetingBtn").forEach((btn) => {
        btn.addEventListener("click", (event) => {
          startMeeting(event.target.dataset.id);
        });
      });
    }
  } catch (error) {
    console.error("Error fetching meetings:", error);
    document.getElementById("meetingsList").innerHTML =
      "<p>Error fetching meetings. Please try again later.</p>";
  }
}

function startMeeting(meetingId) {
  console.log(`Starting meeting: ${meetingId}`);
  document.getElementById("noteArea").style.display = "block";
  // Reset UI for a new meeting
  document.getElementById("transcript").value = "";
  document.getElementById("summary").textContent = "";
  document.getElementById("audioPlayback").style.display = "none";
  document.getElementById("startRecordingBtn").disabled = false;
  document.getElementById("stopRecordingBtn").disabled = true;
  document.getElementById("playRecordingBtn").disabled = true;
}

document.getElementById("summarizeBtn").addEventListener("click", async () => {
  const transcript = document.getElementById("transcript").value;
  try {
    const response = await fetch("http://localhost:3000/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transcript }),
    });
    const data = await response.json();
    document.getElementById("summary").textContent = data.summary;
  } catch (error) {
    console.error("Error summarizing transcript:", error);
  }
});
