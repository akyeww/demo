const video = document.querySelector(".input-video");
const canvasElement = document.getElementsByClassName('output-canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

const DEBUG = false;

const test = new Image();
// test.src = 'img/ring.png';
test.src = 'img/ring3.png';

const state = {
    backend: 'webgl',
    // backend: 'cpu',
    // backend: 'wasm',
}

const constraint = {
    video: {
        width: { min: 1024, ideal: 1280, max: 1920 },
        height: { min: 576, ideal: 720, max: 1080 },
        // width: 640,
        // height: 360,
        // frameRate: { ideal: 10, max: 15 },
        facingMode: 'environment'
    }
}

function isMobile() {
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    return isAndroid || isiOS;
}

function setupCamera() {
    (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
        alert("No navigator.mediaDevices.getUserMedia exists.");

    navigator.mediaDevices.getUserMedia(constraint)
        .then(function (stream) {
            video.srcObject = stream;
            video.onloadedmetadata = function () {
                video.play();
                resizeCanvas();
            };
        })
        .catch(function (err) {
            console.error("Failed to acquire camera feed: " + err);
            alert("Failed to acquire camera feed: " + err);
            throw err;
        });
}

function processVideo(model) {
    window.requestAnimationFrame(() => checkFrame(model));
}

let videoTime = 0;
function checkFrame(model) {
    let process = null;

    video.paused || video.currentTime === videoTime ||
        ((videoTime = video.currentTime), (process = detect(model)));

    process ? process.then(processVideo(model)) : processVideo(model);
}

let time = performance.now()
const detect = async (model) => {
    let newtime = performance.now();
    let fps = Math.round(1000 / (newtime - time));
    document.querySelector('.performance').innerHTML = `${fps} fps`;
    time = newtime;

    const predictions = await model.estimateHands(video);
    /*
    `predictions` is an array of objects describing each detected hand, for example:
    [
        {
            handInViewConfidence: 1, // The probability of a hand being present.
            boundingBox: { // The bounding box surrounding the hand.
                topLeft: [162.91, -17.42],
                bottomRight: [548.56, 368.23],
            },
            landmarks: [ // The 3D coordinates of each hand landmark.
                [472.52, 298.59, 0.00],
                [412.80, 315.64, -6.18],
                ...
            ],
            annotations: { // Semantic groupings of the `landmarks` coordinates.
                thumb: [
                    [412.80, 315.64, -6.18]
                    [350.02, 298.38, -7.14],
                    ...
                ],
                ...
            }
        }
    ]
    */

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);

    if (predictions.length > 0) {
        for (const result of predictions) {
            // drawLandmarks(canvasCtx, result.landmarks);
            drawRing(canvasCtx, result.landmarks);
        }
    }

    canvasCtx.restore();
}

function drawLandmarks(canvasCtx, landmarks) {
    canvasCtx.save();
    // Log hand keypoints.
    for (let i = 0; i < landmarks.length; i++) {
        const [x, y, z] = landmarks[i];
        // console.log(`Landmarks ${i}: [${x}, ${y}, ${z}]`);
        const dpr = window.devicePixelRatio;

        canvasCtx.beginPath();
        canvasCtx.arc(x * dpr, y * dpr, 6 * dpr, 0, 2 * Math.PI);
        //canvasCtx.arc(x * canvasCtx.canvas.width, y * canvasCtx.canvas.height, 5, 0, 3*Math.PI);
        canvasCtx.fillStyle = (i === 13 || i === 14) ? 'red' : '#00FF00';
        canvasCtx.fill();
    }
    canvasCtx.restore();
}

function drawRing(canvasCtx, landmarks) {
    canvasCtx.save();

    // Finger
    let fingerMCP = landmarks[13];
    let fingerPIP = landmarks[14];

    // TODO
    // let width = canvasCtx.canvas.width / video.videoWidth;
    // let height = canvasCtx.canvas.height / video.videoHeight;
    const dpr = window.devicePixelRatio;
    //console.info('sad',canvasCtx.canvas.width, video.videoWidth);
    fingerMCP.x = fingerMCP[0];
    fingerMCP.y = fingerMCP[1];
    fingerPIP.x = fingerPIP[0];
    fingerPIP.y = fingerPIP[1];

    // Mid point
    let xCenter = dpr * (fingerMCP.x + fingerPIP.x) / 2;
    let yCenter = dpr * (fingerMCP.y + fingerPIP.y) / 2;

    // Distance
    let xDiff = dpr * (fingerMCP.x - fingerPIP.x);
    let yDiff = dpr * (fingerMCP.y - fingerPIP.y);
    let distance = Math.sqrt(xDiff ** 2 + yDiff ** 2);

    // Calculate angle and deduct offset by 90 degree (1.571 radian)
    let angle = Math.atan2(yDiff, xDiff) - 1.571;
    // let angle = Math.atan2(delta_y, delta_x) - (95 * Math.PI / 180);  // Alternative

    // Normalize distance (hard coded)
    // const dpr = window.devicePixelRatio;
    // let norm = (distance - 0.1) / (0.24 - 0.1)
    // let radius = (20 * dpr) + (25 * norm);
    let radius = distance / 3.7;

    // Draw ring
    canvasCtx.translate(xCenter, yCenter);
    canvasCtx.rotate(angle);
    // canvasCtx.scale(dpr, dpr);  // Not needed??
    // canvasCtx.fillStyle = 'pink';  // For debug
    // canvasCtx.fillRect(-radius, -radius, radius * 2, radius);
    canvasCtx.drawImage(test, -radius, -radius, radius * 2, radius * 2);
    canvasCtx.translate(-xCenter, -yCenter);

    canvasCtx.restore();

    if (DEBUG) {
        // console.log('check angle', angle * 180 / Math.PI)
        console.log('check distance', distance)
        // console.log('check norm', norm)
        console.log('check xCenter', xCenter)
        console.log('check radius', radius)
        console.log('check x', fingerPIP.x, fingerMCP.x)
        console.log('check y', fingerPIP.y, fingerMCP.y)
        // console.log('check depth', fingerPIP.z, fingerMCP.z)
    }
}

function resizeCanvas() {
    // Set canvas dimension the same as video
    let width = video.videoWidth;
    let height = video.videoHeight;
    const dpr = window.devicePixelRatio;
    canvasElement.width = width * dpr;
    canvasElement.height = height * dpr;

    // Set canvas css style to fit full viewport
    // canvasElement.style.width = window.innerWidth + 'px';
    // canvasElement.style.height = window.innerHeight + 'px';
}

function pauseVideo() {
    const button = document.querySelector('.stop-button');
    if (video.paused) {
        video.play();
        button.innerHTML = 'Stop';
    } else {
        video.pause();
        button.innerHTML = 'Play';
    }
}

function addListener() {
    window.addEventListener('resize', resizeCanvas);
    // video.addEventListener('loadedmetadata', resizeCanvas);
    // videoElement.addEventListener('play', resizeCanvas);

    /* PAUSE BUTTON */
    const button = document.querySelector('.stop-button');
    button.addEventListener('click', pauseVideo);

    document.addEventListener('keyup', logKey);
    function logKey(e) {
        // Escape key
        if (e.code === 'Escape') {
            pauseVideo();
        }
    }
}

async function main() {
    // Set backend.
    await tf.setBackend(state.backend);

    // Set event listeners.
    addListener();

    // Setup camera.
    setupCamera(constraint);

    // Load the MediaPipe handpose model.
    const model = await handpose.load();

    // Pass in a video stream (or an image, canvas, or 3D tensor) to obtain a
    // hand prediction from the MediaPipe graph.
    processVideo(model);
}

main();
