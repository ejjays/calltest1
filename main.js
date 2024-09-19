 import './styles.css';

import firebase from 'firebase/app';
import 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB4BpQYfuGgom3VlUJONNR92weDC5BMJf0",
  authDomain: "fir-rtc-68de1.firebaseapp.com",
  projectId: "fir-rtc-68de1",
  storageBucket: "fir-rtc-68de1.appspot.com",
  messagingSenderId: "266450816523",
  appId: "1:266450816523:web:4259a31e69f908d792410e",
  measurementId: "G-XHC9DY0ZDX"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global State
const pc = new RTCPeerConnection(servers);
let localStream = null;
let remoteStream = null;

// HTML elements
const callButton = document.getElementById('callButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const user1Video = document.getElementById('user1-video');
const user2Video = document.getElementById('user2-video');
const micIcon = document.getElementById('mic-icon');
const videoIcon = document.getElementById('video-icon');
const settingsIcon = document.getElementById('settings-icon');

// 1. Setup media sources
callButton.onclick = async () => {
  // Reference Firestore collections for signaling
  const callDoc = firestore.collection('calls').doc();
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');

  callInput.value = callDoc.id;

  // Get candidates for caller, save to db
  pc.onicecandidate = (event) => {
    event.candidate && offerCandidates.add(event.candidate.toJSON());
  };

  // Create offer
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  await callDoc.set({ offer });

  // Listen for remote answer
  callDoc.onSnapshot((snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  answerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });

  // Push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Pull tracks from remote stream, add to video stream
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  user1Video.srcObject = localStream;
  user2Video.srcObject = remoteStream;
};

answerButton.onclick = async () => {
  const callId = callInput.value;
  const callDoc = firestore.collection('calls').doc(callId);
  const answerCandidates = callDoc.collection('answerCandidates');
  const offerCandidates = callDoc.collection('offerCandidates');

  pc.onicecandidate = (event) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  };

  const callData = (await callDoc.get()).data();

  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await callDoc.update({ answer });

  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });

  // Push tracks from local stream to peer connection
  localStream.getTracks().forEach((track) => {
    pc.addTrack(track, localStream);
  });

  // Pull tracks from remote stream, add to video stream
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  user1Video.srcObject = localStream;
  user2Video.srcObject = remoteStream;
};

// Toggle mic
micIcon.addEventListener('click', () => {
  micIcon.classList.toggle('active');
  if (micIcon.classList.contains('active')) {
    micIcon.classList.remove('fa-microphone');
    micIcon.classList.add('fa-microphone-slash');
    // Mute local audio track
  } else {
    micIcon.classList.remove('fa-microphone-slash');
    micIcon.classList.add('fa-microphone');
    // Unmute local audio track
  }
});

// Toggle video
videoIcon.addEventListener('click', () => {
  videoIcon.classList.toggle('active');
  if (videoIcon.classList.contains('active')) {
    videoIcon.classList.remove('fa-video');
    videoIcon.classList.add('fa-video-slash');
    // Disable local video track
  } else {
    videoIcon.classList.remove('fa-video-slash');
    videoIcon.classList.add('fa-video');
    // Enable local video track
  }
});
