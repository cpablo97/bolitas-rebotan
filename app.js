// app.js

// 1. UI Elements Mapping
const sliders = {
    spawnInterval: document.getElementById('spawn-interval'),
    spawnX: document.getElementById('spawn-x'),
    restitution: document.getElementById('restitution'),
    colorTolerance: document.getElementById('color-tolerance'),
    sMin: document.getElementById('s-min'),
    vMin: document.getElementById('v-min'),
    boxOpacity: document.getElementById('box-opacity')
};

const labels = {
    spawnInterval: document.getElementById('interval-val'),
    spawnX: document.getElementById('spawn-x-val'),
    restitution: document.getElementById('restitution-val'),
    colorTolerance: document.getElementById('color-tolerance-val'),
    sMin: document.getElementById('s-min-val'),
    vMin: document.getElementById('v-min-val'),
    boxOpacity: document.getElementById('box-opacity-val')
};

const targetColorPicker = document.getElementById('target-color');


const cameraSelect = document.getElementById('camera-select');
const startBtn = document.getElementById('start-btn');
const toggleBgBtn = document.getElementById('toggle-bg-btn');
const clearBtn = document.getElementById('clear-balls');
const statusMsg = document.getElementById('status-msg');
const uiPanel = document.getElementById('ui-panel');
const videoBgContainer = document.getElementById('video-bg-container');

// Update labels on input
Object.keys(sliders).forEach(key => {
    sliders[key].addEventListener('input', (e) => {
        labels[key].textContent = e.target.value;
    });
});

window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'h') {
        uiPanel.style.display = uiPanel.style.display === 'none' ? 'block' : 'none';
    }
});

toggleBgBtn.addEventListener('click', () => {
    videoBgContainer.style.display = videoBgContainer.style.display === 'none' ? 'block' : 'none';
});

// Wait for OpenCV.js
let cvReady = false;
window.onOpenCvReady = function () {
    cvReady = true;
    statusMsg.textContent = "OpenCV Ready! Waiting to start...";
    console.log('OpenCV.js is ready.');
};

// 2. Matter.js Initialization
const { Engine, Render, Runner, World, Bodies, Composite, Events } = Matter;

const engine = Engine.create();
const world = engine.world;

const render = Render.create({
    element: document.getElementById('canvas-container'),
    engine: engine,
    options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: 'transparent'
    }
});

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

// 3. Environment boundaries (floor & walls)
let walls = [];
function createBoundaries() {
    if (walls.length > 0) Composite.remove(world, walls);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const thickness = 100;

    // Left, Right (Removed Bottom wall so balls fall through)
    walls = [
        Bodies.rectangle(0 - thickness / 2, h / 2, thickness, h * 2, { isStatic: true }),
        Bodies.rectangle(w + thickness / 2, h / 2, thickness, h * 2, { isStatic: true })
    ];
    Composite.add(world, walls);
}
createBoundaries();

// Handle window resize
window.addEventListener('resize', () => {
    render.options.width = window.innerWidth;
    render.options.height = window.innerHeight;
    render.canvas.width = window.innerWidth;
    render.canvas.height = window.innerHeight;
    createBoundaries();
});

// 4. Webcam Setup & OpenCV Processing Loop
const video = document.getElementById('webcam');
const hiddenCanvas = document.getElementById('hidden-canvas');
const ctx = hiddenCanvas.getContext('2d', { willReadFrequently: true });
const videoBgCanvas = document.getElementById('video-bg');
const bgCtx = videoBgCanvas.getContext('2d');

let webcamActive = false;
let procCols = 640;
let procRows = 480;

startBtn.addEventListener('click', async () => {
    if (webcamActive) return;
    if (!cvReady) {
        alert("Please wait for OpenCV to load.");
        return;
    }

    try {
        statusMsg.textContent = "Requesting webcam access...";
        let constraints = { video: { width: { ideal: 1280 }, height: { ideal: 720 } } };

        if (cameraSelect.value) {
            constraints.video.deviceId = { exact: cameraSelect.value };
        } else {
            constraints.video.facingMode = 'user';
        }

        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (e1) {
            console.warn("First camera request failed, trying fallback...", e1);
            // Fallback to any available video without specific constraints
            constraints = { video: cameraSelect.value ? { deviceId: { exact: cameraSelect.value } } : true };
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        }

        video.srcObject = stream;
        video.play();

        // Populate camera selector if not already populated
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        if (cameraSelect.options.length <= 1) {
            cameraSelect.innerHTML = ''; // clear default
            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Camera ${index + 1}`;
                if (stream.getVideoTracks()[0].label === device.label) {
                    option.selected = true; // highlight currently used
                }
                cameraSelect.appendChild(option);
            });
        }

        video.onloadedmetadata = () => {
            // Keep aspect ratio for processing
            let aspect = video.videoWidth / video.videoHeight;
            procRows = 400; // lower res for faster cv processing
            procCols = Math.floor(procRows * aspect);

            hiddenCanvas.width = procCols;
            hiddenCanvas.height = procRows;

            // Background canvas matches screen size
            videoBgCanvas.width = window.innerWidth;
            videoBgCanvas.height = window.innerHeight;

            if (!webcamActive) {
                webcamActive = true;
                statusMsg.textContent = "Webcam active. Reading pink regions...";
                startProcessingLoop();
                startSpawner();
                startBtn.textContent = "Running Simulation";
                startBtn.style.opacity = 0.5;
            }
        };
    } catch (err) {
        statusMsg.textContent = "Error: " + err.message;
        console.error("Webcam error:", err);
    }
});

// Change camera handle
cameraSelect.addEventListener('change', () => {
    if (webcamActive) {
        // Stop current stream tracks
        const stream = video.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        // simulate click to restart with new settings
        webcamActive = false;
        startBtn.textContent = 'Restarting...';
        startBtn.click();
    }
});

cameraSelect.addEventListener('focus', async () => {
    // Attempt to load device list before starting stream if not populated
    if (cameraSelect.options.length <= 1) {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            cameraSelect.innerHTML = '';
            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Camera ${index + 1}`;
                cameraSelect.appendChild(option);
            });
        } catch (e) {
            console.error("Could not enumerate devices ahead of time", e);
        }
    }
});

// Try to aggressively get device IDs on load
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length > 0) {
            cameraSelect.innerHTML = '';
            videoDevices.forEach((device, index) => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || `Camera ${index + 1}`;
                cameraSelect.appendChild(option);
            });
        }
    } catch(e) {}
});



let webcamBodies = [];

function startProcessingLoop() {
    // OpenCV Mats
    let src = new cv.Mat(procRows, procCols, cv.CV_8UC4);
    let hsv = new cv.Mat();
    let mask = new cv.Mat();
    let hierarchy = new cv.Mat();

    function processFrame() {
        if (!webcamActive) return;

        let destW = window.innerWidth;
        let destH = window.innerHeight;
        let destAsp = destW / destH;

        if (destAsp > 1) {
            procCols = 400;
            procRows = Math.floor(400 / destAsp);
        } else {
            procRows = 400;
            procCols = Math.floor(400 * destAsp);
        }

        if (hiddenCanvas.width !== procCols) hiddenCanvas.width = procCols;
        if (hiddenCanvas.height !== procRows) hiddenCanvas.height = procRows;

        if (src.cols !== procCols || src.rows !== procRows) {
            src.delete();
            src = new cv.Mat(procRows, procCols, cv.CV_8UC4);
        }

        let vW = video.videoWidth;
        let vH = video.videoHeight;
        
        function drawVideoCover(targetCtx, tW, tH) {
            targetCtx.save();
            targetCtx.translate(tW / 2, tH / 2);
            
            let flipNode = document.getElementById('cam-flip');
            let isFlipped = flipNode ? flipNode.checked : true;
            if (isFlipped) {
                targetCtx.scale(-1, 1); // Mirror
            }
            
            let drawW = tW; 
            let drawH = tH;
            let targetAsp = tW / tH;
            let srcAsp = vW / vH;
            let sWidth = vW;
            let sHeight = vH;
            
            if (vH > 0 && vW > 0) {
                if (srcAsp > targetAsp) {
                    sWidth = vH * targetAsp;
                } else {
                    sHeight = vW / targetAsp;
                }
            }
            
            let sX = (vW - sWidth) / 2;
            let sY = (vH - sHeight) / 2;

            targetCtx.drawImage(video, sX, sY, sWidth, sHeight, -drawW / 2, -drawH / 2, drawW, drawH);
            targetCtx.restore();
        }

        // Draw background natively
        videoBgCanvas.width = destW;
        videoBgCanvas.height = destH;
        drawVideoCover(bgCtx, destW, destH);

        // Draw to hidden canvas for OpenCV
        drawVideoCover(ctx, procCols, procRows);

        let imageData = ctx.getImageData(0, 0, procCols, procRows);
        src.data.set(imageData.data);

        // Convert to HSV
        cv.cvtColor(src, hsv, cv.COLOR_RGBA2RGB);
        cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);

        // Convert RGB Hex to OpenCV HSV Space helper function
        function hexToOpencvHsv(hex) {
            let r = parseInt(hex.substring(1,3), 16) / 255;
            let g = parseInt(hex.substring(3,5), 16) / 255;
            let b = parseInt(hex.substring(5,7), 16) / 255;
            let max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h, s, v = max;
            let d = max - min;
            s = max === 0 ? 0 : d / max;
            if (max === min) {
                h = 0; // achromatic
            } else {
                switch(max){
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            return {
                h: Math.round(h * 180), // OpenCV Hue is 0-179
                s: Math.round(s * 255),
                v: Math.round(v * 255)
            };
        }

        // Get threshold values
        let targetHex = targetColorPicker ? targetColorPicker.value : "#ff1493";
        let targetHsv = hexToOpencvHsv(targetHex);
        let tolerance = parseInt(sliders.colorTolerance.value);

        let hMin = (targetHsv.h - tolerance) % 180;
        if (hMin < 0) hMin += 180;
        let hMax = (targetHsv.h + tolerance) % 180;
        if (hMax < 0) hMax += 180;

        let sMin = parseInt(sliders.sMin.value);
        let vMin = parseInt(sliders.vMin.value);

        // Handle Hue Wrap Around (OpenCV Hue is 0-179)
        if (hMin <= hMax) {
            let low = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [hMin, sMin, vMin, 0]);
            let high = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [hMax, 255, 255, 0]);
            cv.inRange(hsv, low, high, mask);
            low.delete(); high.delete();
        } else {
            // If wrapping, we need two masks
            let mask1 = new cv.Mat();
            let mask2 = new cv.Mat();
            let low1 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [hMin, sMin, vMin, 0]);
            let high1 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [179, 255, 255, 0]);
            cv.inRange(hsv, low1, high1, mask1);

            let low2 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [0, sMin, vMin, 0]);
            let high2 = new cv.Mat(hsv.rows, hsv.cols, hsv.type(), [hMax, 255, 255, 0]);
            cv.inRange(hsv, low2, high2, mask2);

            cv.bitwise_or(mask1, mask2, mask);
            mask1.delete(); mask2.delete(); low1.delete(); high1.delete(); low2.delete(); high2.delete();
        }

        // Clean up noise
        let M = cv.Mat.ones(5, 5, cv.CV_8U);
        cv.erode(mask, mask, M, new cv.Point(-1, -1), 1);
        cv.dilate(mask, mask, M, new cv.Point(-1, -1), 1);
        M.delete();

        // Find Contours
        let contours = new cv.MatVector();
        cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let scaleX = window.innerWidth / procCols;
        let scaleY = window.innerHeight / procRows;

        let alpha = parseInt(sliders.boxOpacity.value) / 100;
        
        let newWebcamBodies = [];

        // Process each contour
        for (let i = 0; i < contours.size(); ++i) {
            let cnt = contours.get(i);
            let area = cv.contourArea(cnt);

            // Ignore tiny noise
            if (area > 500) {
                let rotatedRect = cv.minAreaRect(cnt);

                // OpenCV angle is clockwise in degrees, Matter.js is radians
                let width = rotatedRect.size.width * scaleX;
                let height = rotatedRect.size.height * scaleY;
                let cx = rotatedRect.center.x * scaleX;
                let cy = rotatedRect.center.y * scaleY;
                let angle = rotatedRect.angle * (Math.PI / 180);

                let body = Bodies.rectangle(cx, cy, width, height, {
                    isStatic: true,
                    angle: angle,
                    render: {
                        fillStyle: `rgba(255, 255, 255, ${alpha * 0.3})`,
                        strokeStyle: `rgba(255, 255, 255, ${alpha})`,
                        lineWidth: 3
                    }
                });
                newWebcamBodies.push(body);
                Composite.add(world, body);
            }
            cnt.delete();
        }

        // Clean up any bodies from last frame
        if (webcamBodies.length > 0) {
            Composite.remove(world, webcamBodies);
        }
        
        webcamBodies = newWebcamBodies;

        contours.delete();

        // Delay next frame slightly to save CPU
        setTimeout(() => { requestAnimationFrame(processFrame); }, 1000 / 30);
    }

    // Start loop
    processFrame();
}

// 5. Ball Spawner
const ballImageSrcs = ['assets/IMG_6659.PNG', 'assets/IMG_6660.PNG'];
const ballImages = ballImageSrcs.map(src => {
    const img = new Image();
    img.src = src;
    return img;
});

let balls = [];
let lastSpawnTime = 0;

function startSpawner() {
    Events.on(engine, 'beforeUpdate', () => {
        const now = Date.now();
        const interval = parseInt(sliders.spawnInterval.value);

        if (now - lastSpawnTime > interval) {
            spawnBall();
            lastSpawnTime = now;
        }

        // Cleanup fallen balls
        balls = balls.filter(ball => {
            if (ball.position.y > window.innerHeight + 20) {
                Composite.remove(world, ball);
                return false;
            }
            return true;
        });
    });
}

function spawnBall() {
    const xPct = parseInt(sliders.spawnX.value) / 100;
    const xPos = window.innerWidth * xPct;
    const rest = parseFloat(sliders.restitution.value);

    const radius = 40;
    const diameter = radius * 2;
    const jitter = (Math.random() - 0.5) * 50;

    const img = ballImages[Math.floor(Math.random() * ballImages.length)];
    const xScale = img.naturalWidth > 0 ? diameter / img.naturalWidth : 5;
    const yScale = img.naturalHeight > 0 ? diameter / img.naturalHeight : 5;

    const ball = Bodies.circle(xPos + jitter, -30, radius, {
        restitution: rest,
        friction: 0.05,
        render: {
            sprite: {
                texture: img.src,
                xScale: xScale,
                yScale: yScale
            }
        }
    });

    balls.push(ball);
    Composite.add(world, ball);
}

clearBtn.addEventListener('click', () => {
    balls.forEach(b => Composite.remove(world, b));
    balls = [];
});


