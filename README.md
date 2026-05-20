# Real-Time Interactive Webcam Physics Simulation 🟢📸
Created by Bunyan | IG: [@bongyunng](https://instagram.com/bongyunng)

Welcome! This tool turns any live webcam feed into a real-time, interactive physics playground. By tracking specific colors in the real world using OpenCV, it generates responsive 2D physical boundary blocks that countless bouncing balls collide with effortlessly. It is designed to be lightweight, easy to map, and highly customizable for visual installations, interactive mapping, and generative art.

## 🚀 Features
- **Dynamic Color Picking**: Click the color UI to pick ANY target real-world color instantly.
- **Smart Tracking**: Adjust the tolerance slider to map perfectly mapping against uneven room lighting.
- **2D Physics Simulation**: High-performance physics rendering with Matter.js.
- **Visual Mapping Support**: Comes with automatic camera mirroring built-in for intuitive interaction when setting up projectors and cameras.
- **Clean UI overlay**: Hotkeys to strip away the UI controls for a pure visual output on projectors or installations.

## 💻 Installation & Usage Setup

Since this application utilizes advanced browser features like direct Webcam Access (`getUserMedia`), it **must be run through a local HTTP server.** Double-clicking the `index.html` file in your browser directly will block camera access for security reasons.

### Step 1: Start a Local Server
If you're on Mac/Windows and have Python installed, you can simply open your terminal/command prompt, navigate to this folder, and run:
```bash
python -m http.server 8080
```
> *(Don't have Python? You can also use Node.js `http-server`, or the "Live Server" extension in VS Code!)*

### Step 2: Open Your Browser
Once your server is running, open Google Chrome (or any modern browser) and go to:
[http://localhost:8080](http://localhost:8080)

### Step 3: Start your Webcam!
1. Under the **Camera Input** section, select your webcam (or virtual camera like OBS/TouchDesigner).
2. Click **Start Webcam**. Your browser will ask for permission; click "Allow".
3. Point your camera at something bright and colorful! 

### Step 4: Map your Collision Color
1. Under **Color Detection**, click the **Target Color** bar.
2. Use your native color picker to select the real-world color you want the balls to bounce off of from the screen.
3. Slide the **Color Tolerance** until the physics blocks nicely hug the shapes on the screen.
4. Have fun playing with the bounciness (Restitution), Spawn Interval, and X Spawn locations!

## ⌨️ Shortcuts:
- Press **`H`** on your keyboard to completely toggle the UI panel on and off.
- The **Toggle Webcam BG** button hides the real-world camera feed, letting you see *only* the white blocks and white glowing canvas, a stylistic effect fantastic for VJs and dark-room installations!

---

*Thank you so much for your support on Patreon! Have fun experimenting!*
