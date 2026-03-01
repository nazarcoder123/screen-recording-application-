# screen-recording-application-

NexRecord is a highly responsive, in-browser screen recording web application built with Python (Flask) and HTML5, CSS3, and Vanilla JavaScript. It leverages modern Web APIs like `MediaRecorder`, `MediaDevices`, and `AudioContext` to capture screen, audio, and webcam recordings directly in the browser — with zero additional software required.

## 🌟 Features

- **Screen + Audio Recording**: Record your active screen or specific application windows along with your system/microphone audio.
- **Audio Only**: Record high-fidelity microphone audio accompanied by a sleek and dynamic audio visualizer.
- **Screen + Camera**: Record your screen and your webcam simultaneously for presentations and tutorials.
- **Modern UI**: Features a dark premium glassmorphism design with a responsive layout.
- **Local Privacy**: Media recording happens strictly in the browser. No video or audio data is sent to an external server. Everything is localized and secure.

## 📋 Requirements

To run this application, you will need:
- **Python 3.6+** (For running the web server)
- **pip** (Python package installer)
- A modern web browser supporting the `MediaRecorder` API (e.g., Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari).
- *(Optional)* **Docker**, if you would prefer to run the application securely in a container.

## 🚀 How to Run the Project (Local Installation)

Follow these steps to run the application on your computer:

### 1. Clone or Download the Repository
If you haven't already, download the project folder and extract it. Open a terminal (or Command Prompt/PowerShell) inside the project's root directory.

### 2. Set Up a Virtual Environment (Recommended)
It is best practice to install dependencies in an isolated environment.
```bash
python -m venv .venv
```

### 3. Activate the Virtual Environment
- **On Windows**:
  ```powershell
  .\.venv\Scripts\activate
  ```
- **On Mac/Linux**:
  ```bash
  source .venv/bin/activate
  ```

### 4. Install Dependencies
Install the required packages listed in `requirements.txt`:
```bash
pip install -r requirements.txt
```
*(Alternatively, you can skip the requirements file and directly run `pip install flask` since Flask is the only dependency)*

### 5. Start the Application Server
Start the Flask backend:
```bash
python app.py
```
You should see output indicating that the server is running (e.g., `* Running on http://127.0.0.1:5000`).

### 6. Use the Screen Recorder
Open your web browser and go to:
[http://localhost:5000](http://localhost:5000)

1. Select your desired recording mode (Screen + Audio, Audio Only, or Screen + Camera).
2. Click **Start Recording**. Your browser will ask you to grant permission for your microphone/camera/screen depending on the mode.
3. Once completed, click **Stop Recording**. 
4. Click **Download Recording** to save it to your computer as a `.webm` file.

---

## 🐳 How to Run the Project (Using Docker)

If you have Docker installed, you can skip the Python installation entirely and run the app safely inside an isolated container.

### 1. Build the Docker Image
Run this command in the project directory where the `Dockerfile` is located:
```bash
docker build -t nexrecord .
```

### 2. Run the Docker Container
Launch the container and map the required port:
```bash
docker run -d -p 5000:5000 nexrecord
```

### 3. Use the Screen Recorder
Open your browser and navigate to:
[http://localhost:5000](http://localhost:5000)

*(Note: If you run into any camera/microphone permission errors in your browser via Docker, make sure you access the site via `localhost` (not an explicit IP), as most web browsers only allow Media APIs locally or over a secure HTTPS connection.)*

---

## 📂 Folder Structure

- `app.py`: The lightweight Python Flask backend server.
- `requirements.txt`: Python package requirements list.
- `Dockerfile` / `.dockerignore`: Configuration files for running the app in a Docker container.
- `templates/index.html`: The modern frontend HTML structure.
- `static/style.css`: All the premium CSS styling, animations, and typography.
- `static/script.js`: The Javascript logic handling the browser's `MediaRecorder` and `MediaDevices` APIs.

---

*Created by Nazar Mohammed*
*LinkedIn: https://www.linkedin.com/in/nazar-mohammed-8aa571228/*