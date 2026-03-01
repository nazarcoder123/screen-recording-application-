document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.option-card');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const downloadBtn = document.getElementById('downloadBtn');

    const previewContainer = document.getElementById('previewContainer');
    const screenWrapper = document.getElementById('screenWrapper');
    const cameraWrapper = document.getElementById('cameraWrapper');
    const audioVisualizerBlock = document.getElementById('audioVisualizerBlock');

    const screenPreview = document.getElementById('screenPreview');
    const cameraPreview = document.getElementById('cameraPreview');
    const statusIndicator = document.getElementById('statusIndicator');

    let mediaRecorder;
    let recordedChunks = [];
    let streams = []; // Array to hold active streams to stop them later
    let composedStream = null;

    // UI Handle Option Selection
    cards.forEach(card => {
        card.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                return; // Prevent changing mode while recording
            }
            cards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            card.querySelector('input').checked = true;
            statusIndicator.textContent = 'Mode selected. Click Start Recording when ready.';

            // Hide download button if they select a new mode
            downloadBtn.classList.add('hidden');
        });
    });

    const getSelectedMode = () => {
        return document.querySelector('input[name="record-mode"]:checked').value;
    };

    const stopAllStreams = () => {
        streams.forEach(stream => {
            stream.getTracks().forEach(track => track.stop());
        });
        streams = [];
        screenPreview.srcObject = null;
        cameraPreview.srcObject = null;
    };

    const setupStreamProcessing = async (mode) => {
        try {
            composedStream = new MediaStream();
            streams = [];

            if (mode === 'screen-audio') {
                // Screen + System Audio + Mic Audio possible combo
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                });
                streams.push(displayStream);

                // Optional microphone
                try {
                    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                    streams.push(micStream);

                    // Mix audio tracks
                    const audioContext = new AudioContext();
                    const dest = audioContext.createMediaStreamDestination();

                    if (displayStream.getAudioTracks().length > 0) {
                        audioContext.createMediaStreamSource(new MediaStream([displayStream.getAudioTracks()[0]])).connect(dest);
                    }
                    if (micStream.getAudioTracks().length > 0) {
                        audioContext.createMediaStreamSource(micStream).connect(dest);
                    }

                    displayStream.getVideoTracks().forEach(track => composedStream.addTrack(track));
                    dest.stream.getAudioTracks().forEach(track => composedStream.addTrack(track));

                } catch (e) {
                    console.warn("No mic added", e);
                    displayStream.getTracks().forEach(track => composedStream.addTrack(track));
                }

                screenPreview.srcObject = displayStream;
                previewContainer.classList.remove('hidden');
                screenWrapper.classList.remove('hidden');
                cameraWrapper.classList.add('hidden');
                audioVisualizerBlock.classList.add('hidden');

            } else if (mode === 'audio-only') {
                const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                streams.push(micStream);
                micStream.getTracks().forEach(track => composedStream.addTrack(track));

                previewContainer.classList.remove('hidden');
                screenWrapper.classList.add('hidden');
                cameraWrapper.classList.add('hidden');
                audioVisualizerBlock.classList.remove('hidden');

            } else if (mode === 'screen-camera') {
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: true,
                    audio: true
                });
                streams.push(displayStream);

                const webCamStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });
                streams.push(webCamStream);

                screenPreview.srcObject = displayStream;
                cameraPreview.srcObject = webCamStream;

                // For simplicity, we just record the screen video + mixed audio in the composed stream
                // (Picture-in-picture recording requires mapping to an HTML canvas context, but keeping it simple here: Record Screen Video + Both Audios)

                const audioContext = new AudioContext();
                const dest = audioContext.createMediaStreamDestination();

                if (displayStream.getAudioTracks().length > 0) {
                    audioContext.createMediaStreamSource(new MediaStream([displayStream.getAudioTracks()[0]])).connect(dest);
                }
                if (webCamStream.getAudioTracks().length > 0) {
                    audioContext.createMediaStreamSource(webCamStream).connect(dest);
                }

                displayStream.getVideoTracks().forEach(track => composedStream.addTrack(track));
                dest.stream.getAudioTracks().forEach(track => composedStream.addTrack(track));

                previewContainer.classList.remove('hidden');
                screenWrapper.classList.remove('hidden');
                cameraWrapper.classList.remove('hidden');
                audioVisualizerBlock.classList.add('hidden');
            }

            return true;
        } catch (err) {
            console.error(err);
            statusIndicator.textContent = `Error accessing media devices: ${err.message}`;
            stopAllStreams();
            return false;
        }
    };

    startBtn.addEventListener('click', async () => {
        recordedChunks = [];
        const mode = getSelectedMode();
        statusIndicator.textContent = 'Requesting permissions...';

        const success = await setupStreamProcessing(mode);

        if (!success) return;

        // Automatically handle user stopping screen share from browser controls
        composedStream.getVideoTracks().forEach(track => {
            track.onended = () => {
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    stopRecording();
                }
            };
        });

        const options = { mimeType: MediaRecorder.isTypeSupported('video/webm; codecs=vp9') ? 'video/webm; codecs=vp9' : 'video/webm' };
        if (mode === 'audio-only') {
            options.mimeType = 'audio/webm';
        }

        try {
            mediaRecorder = new MediaRecorder(composedStream, options);
        } catch (e) {
            mediaRecorder = new MediaRecorder(composedStream); // Fallback
        }

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, {
                type: mode === 'audio-only' ? 'audio/webm' : 'video/webm'
            });
            const url = URL.createObjectURL(blob);

            downloadBtn.onclick = () => {
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `NexRecord_${new Date().getTime()}.${mode === 'audio-only' ? 'webm' : 'webm'}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            };

            downloadBtn.classList.remove('hidden');
            statusIndicator.textContent = 'Recording completely saved. Ready to download.';
            stopAllStreams();
            previewContainer.classList.add('hidden');
        };

        mediaRecorder.start(200); // collect 200ms chunks

        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        downloadBtn.classList.add('hidden');
        statusIndicator.textContent = 'Recording in progress...';

        // Add recording pulse to body
        document.body.style.boxShadow = "inset 0 0 50px rgba(255,59,48,0.2)";
    });

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            startBtn.classList.remove('hidden');
            stopBtn.classList.add('hidden');
            statusIndicator.textContent = 'Processing recording...';
            document.body.style.boxShadow = "none";
        }
    };

    stopBtn.addEventListener('click', stopRecording);
});
