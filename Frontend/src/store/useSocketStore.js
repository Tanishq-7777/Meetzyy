import { create } from "zustand";
import { createSocketConnection } from "./socket";
import { BASE_URL } from "../../constants";
import useAuthStore from "./useAuthStore";

const useSocketStore = create((set, get) => ({
  socket: null,
  isRecording: false,
  meetingId: null,
  intervalId: null,
  stream: null,
  keyPoints: [],
  transcripts: [],

  initSocket: (userId, navigate) => {
    if (get().socket?.connected) return;

    const socket = createSocketConnection(BASE_URL);

    socket.on("connect", () => console.log("Socket Connected"));

    socket.on("insufficient-tokens", async ({ message }) => {
      console.warn("Terminating meeting: Insufficient tokens.");

      get().stopMeeting();

      alert(message || "Your tokens have run out. Please upgrade to continue.");

      const authStore = useAuthStore.getState();
      await authStore.fetchUser();

      if (navigate) navigate("/payment");
    });

    socket.on("remainingToken", ({ remainingToken }) => {
      const authStore = useAuthStore.getState();
      const currentUser = authStore.user;
      const setUser = authStore.setUser;

      if (currentUser && remainingToken !== undefined) {
        setUser({
          ...currentUser,
          remainingToken: remainingToken,
        });
      }
    });

    socket.on("meetingStarted", ({ meetingId }) => {
      set({ isRecording: true, meetingId, transcripts: [], keyPoints: [] });
      localStorage.setItem("meetingId", meetingId);
      get().startActualRecording(userId, meetingId);
      if (navigate) navigate(`/meeting/newmeeting/${meetingId}`);
    });

    socket.on("live-transcript", (data) => {
      set((state) => ({
        transcripts: [...state.transcripts, data.text],
      }));
    });

    socket.on("key-points", ({ keyPoints }) => {
      set((state) => ({
        keyPoints: [...state.keyPoints, keyPoints],
      }));
    });

    socket.on("meetingResumed", ({ meetingId }) => {
      set({ isRecording: true, meetingId });
      localStorage.setItem("meetingId", meetingId);
      get().startActualRecording(userId, meetingId);
      if (navigate) navigate(`/meeting/newmeeting/${meetingId}`);
    });

    set({ socket });
  },

  emitStart: (userId) => {
    const { socket } = get();
    const mid = localStorage.getItem("meetingId");
    if (mid) socket.emit("resumeMeeting", { meetingId: mid });
    else socket.emit("startMeeting", { _id: userId });
  },

  startActualRecording: async (userId, meetingId) => {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const tabStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const audioContext = new (
        window.AudioContext || window.webkitAudioContext
      )();
      const destination = audioContext.createMediaStreamDestination();
      audioContext.createMediaStreamSource(micStream).connect(destination);
      audioContext.createMediaStreamSource(tabStream).connect(destination);

      const combinedStream = destination.stream;
      set({ stream: combinedStream });

      const recordChunk = () => {
        const { socket, meetingId: currentId } = get();
        if (!socket || !currentId || !get().isRecording) return;

        const recorder = new MediaRecorder(combinedStream, {
          mimeType: "audio/webm;codecs=opus",
        });

        recorder.ondataavailable = async (event) => {
          if (event.data.size > 0 && socket.connected) {
            const buffer = await event.data.arrayBuffer();
            socket.emit("audio-chunk", buffer, userId, currentId);
          }
        };

        recorder.start();
        setTimeout(() => {
          if (recorder.state !== "inactive") recorder.stop();
        }, 10000);
      };

      recordChunk();
      const interval = setInterval(recordChunk, 10000);
      set({ intervalId: interval });
    } catch (err) {
      console.error("Recording failed:", err);
    }
  },

  stopMeeting: () => {
    const { socket, intervalId, stream } = get();
    console.log("Cleaning up streams and socket... 🛑");

    if (intervalId) clearInterval(intervalId);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    if (socket) {
      socket.off("audio-chunk"); // Stop listening to avoid ghost emits
      socket.disconnect();
    }

    localStorage.removeItem("meetingId");
    set({
      socket: null,
      isRecording: false,
      meetingId: null,
      intervalId: null,
      stream: null,
    });
  },
}));

export default useSocketStore;
