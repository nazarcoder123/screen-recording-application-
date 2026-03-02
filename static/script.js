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
    let streams = [];
    let composedStream = null;

    // HD Video Constraints (1080p @ 60fps)
    const HD_VIDEO = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 60 }
    };

    // High-quality audio constraints
    const HD_AUDIO = {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 48000
    };

    // UI Handle Option Selection
    cards.forEach(card => {
        card.addEventListener('click', () => {
            if (mediaRecorder && mediaRecorder.state === 'recording') {
                return;
            }
            cards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            card.querySelector('input').checked = true;
            statusIndicator.textContent = 'Mode selected. Click Start Recording when ready.';
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
                // HD Screen capture
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: HD_VIDEO,
                    audio: true
                });
                streams.push(displayStream);

                // Optional microphone with HD audio
                try {
                    const micStream = await navigator.mediaDevices.getUserMedia({
                        audio: HD_AUDIO,
                        video: false
                    });
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
                const micStream = await navigator.mediaDevices.getUserMedia({ audio: HD_AUDIO, video: false });
                streams.push(micStream);
                micStream.getTracks().forEach(track => composedStream.addTrack(track));

                previewContainer.classList.remove('hidden');
                screenWrapper.classList.add('hidden');
                cameraWrapper.classList.add('hidden');
                audioVisualizerBlock.classList.remove('hidden');

            } else if (mode === 'screen-camera') {
                // HD Screen capture
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: HD_VIDEO,
                    audio: true
                });
                streams.push(displayStream);

                // HD Webcam capture
                const webCamStream = await navigator.mediaDevices.getUserMedia({
                    video: HD_VIDEO,
                    audio: HD_AUDIO
                });
                streams.push(webCamStream);

                screenPreview.srcObject = displayStream;
                cameraPreview.srcObject = webCamStream;

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

        // Handle user stopping screen share from browser controls
        composedStream.getVideoTracks().forEach(track => {
            track.onended = () => {
                if (mediaRecorder && mediaRecorder.state === 'recording') {
                    stopRecording();
                }
            };
        });

        // HD Bitrate settings: 8 Mbps video + 192 kbps audio
        const hdBitrate = 8_000_000;
        const audioBitrate = 192_000;

        let options;
        if (mode === 'audio-only') {
            options = { mimeType: 'audio/webm', audioBitsPerSecond: audioBitrate };
        } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9')) {
            options = { mimeType: 'video/webm; codecs=vp9', videoBitsPerSecond: hdBitrate, audioBitsPerSecond: audioBitrate };
        } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8')) {
            options = { mimeType: 'video/webm; codecs=vp8', videoBitsPerSecond: hdBitrate, audioBitsPerSecond: audioBitrate };
        } else {
            options = { mimeType: 'video/webm', videoBitsPerSecond: hdBitrate, audioBitsPerSecond: audioBitrate };
        }

        // Create MediaRecorder first
        try {
            mediaRecorder = new MediaRecorder(composedStream, options);
        } catch (e) {
            console.warn("MediaRecorder with HD options failed. Trying fallback.", e);
            try {
                mediaRecorder = new MediaRecorder(composedStream, { mimeType: 'video/webm' });
            } catch (e2) {
                mediaRecorder = new MediaRecorder(composedStream);
            }
        }

        // Attach event handlers before starting
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
                a.download = `NexRecord_${new Date().getTime()}.webm`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            };

            downloadBtn.classList.remove('hidden');
            statusIndicator.textContent = 'Recording saved! Click Download to save the file.';
            stopAllStreams();
            previewContainer.classList.add('hidden');
        };

        // Start recording after everything is ready
        mediaRecorder.start(200);

        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        downloadBtn.classList.add('hidden');
        statusIndicator.textContent = 'Recording in progress... (HD 1080p)';
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
