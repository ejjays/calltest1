//Video and Audio Permission
const user1Video = document.getElementById('user1-video');

// Function to request media permissions
async function requestMediaPermissions() {
  try {
    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    user1Video.srcObject = localStream; // Set the local video element's source to the local stream
  } catch (error) {
    console.error('Error accessing media devices:', error);
    alert('Could not access camera and microphone. Please check your permissions.');
  }
}

// Call the requestMediaPermissions function when the page loads
window.onload = requestMediaPermissions;