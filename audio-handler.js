let mediaRecorder;
let audioChunks = [];
let recognition;

document.getElementById('startRecordingBtn').addEventListener('click', startRecording);
document.getElementById('stopRecordingBtn').addEventListener('click', stopRecording);
document.getElementById('playRecordingBtn').addEventListener('click', playRecording);
document.getElementById('saveTranscriptBtn').addEventListener('click', saveTranscript);

function setupSpeechRecognition() {
  window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new window.SpeechRecognition();
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.lang = 'en-US';

  recognition.addEventListener('result', (e) => {
    const transcript = Array.from(e.results)
      .map(result => result[0])
      .map(result => result.transcript)
      .join('');

    document.getElementById('transcript').value += transcript + ' ';
  });

  recognition.addEventListener('end', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      recognition.start();
    }
  });
}

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      document.getElementById('audioPlayback').src = audioUrl;
    };

    mediaRecorder.start();
    setupSpeechRecognition();
    recognition.start();

    document.getElementById('startRecordingBtn').disabled = true;
    document.getElementById('stopRecordingBtn').disabled = false;
    console.log('Recording and transcription started');
  } catch (err) {
    console.error('Error accessing microphone:', err);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    recognition.stop();
    document.getElementById('startRecordingBtn').disabled = false;
    document.getElementById('stopRecordingBtn').disabled = true;
    document.getElementById('playRecordingBtn').disabled = false;
    document.getElementById('saveTranscriptBtn').disabled = false;
    console.log('Recording and transcription stopped');
  }
}

function playRecording() {
  const audioPlayback = document.getElementById('audioPlayback');
  audioPlayback.style.display = 'block';
  audioPlayback.play();
}

function saveTranscript() {
  const transcript = document.getElementById('transcript').value;
  const blob = new Blob([transcript], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = 'interview_transcript.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}