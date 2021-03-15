const video = document.querySelector(".input-video");
const canvasElement = document.getElementsByClassName('output-canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

const DEBUG = false;

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

function processVideo() {
    window.requestAnimationFrame(checkFrame);
}

let videoTime = 0;
function checkFrame() {
    let process = null;

    video.paused || video.currentTime === videoTime ||
        ((videoTime = video.currentTime), (process = addFilter()));

    process ? process.then(processVideo) : processVideo();
}

let time = performance.now()
function printFps() {
    let newtime = performance.now();
    let fps = Math.round(1000 / (newtime - time));
    document.querySelector('.performance').innerHTML = `${fps} fps`;
    time = newtime;
}

const addFilter = async () => {
    printFps();  // For DEBUG

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    filterImage();
    canvasCtx.restore();
}

let filterMode = 0;
function filterImage() {
    let imgWidth = canvasElement.width;
    let imgHeight = canvasElement.height;

    canvasCtx.drawImage(video, 0, 0, imgWidth, imgHeight);

    if (filterMode === 0) return;

    let imageData = canvasCtx.getImageData(0, 0, imgWidth, imgHeight);

    switch (filterMode) {
        case 1:
            // Grayscale
            // Same as: canvasElement.style.filter = "grayscale(100%)";
            for (let i = 0; i < imageData.data.length; i += 4) {
                let r = imageData.data[i];
                let g = imageData.data[i + 1];
                let b = imageData.data[i + 2];
                let averageColour = (r + g + b) / 3;
                imageData.data[i] = averageColour;
                imageData.data[i + 1] = averageColour;
                imageData.data[i + 2] = averageColour;
            }
            break;
        case 2:
            // Inverted colours
            // Same as: canvasElement.style.filter = "invert(100%)";
            for (let i = 0; i < imageData.data.length; i += 4) {
                let r = imageData.data[i];
                let g = imageData.data[i + 1];
                let b = imageData.data[i + 2];
                imageData.data[i] = 255 - r;
                imageData.data[i + 1] = 255 - g;
                imageData.data[i + 2] = 255 - b;
            }
            break;
        case 3:
            // Complementary colours
            // Same as: canvasElement.style.filter = "hue-rotate(180deg)";
            for (let i = 0; i < imageData.data.length; i += 4) {
                let r = imageData.data[i];
                let g = imageData.data[i + 1];
                let b = imageData.data[i + 2];
                let sum = Math.max(r, g, b) + Math.min(r, g, b);
        
                imageData.data[i] = sum - r;
                imageData.data[i + 1] = sum - g;
                imageData.data[i + 2] = sum - b;
            }
            break;
    }

    canvasCtx.putImageData(imageData, 0, 0);
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

function nextFilter() {
    filterMode = (filterMode >= 3) ? 0 : filterMode + 1;

    let mode = '';
    switch (filterMode) {
        case 0:
            mode = 'None';
            break;
        case 1:
            mode = 'Grayscale';
            break;
        case 2:
            mode = 'Inverted';
            break;
        case 3:
            mode = 'Complementary';
            break;
    }
    document.querySelector('.filter-button').innerHTML = `Filter: ${mode}`;
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

    /* NEXT BUTTON */
    const filterButton = document.querySelector('.filter-button');
    filterButton.addEventListener('click', nextFilter);

    /* PAUSE BUTTON */
    const stopButton = document.querySelector('.stop-button');
    stopButton.addEventListener('click', pauseVideo);

    document.addEventListener('keyup', logKey);
    function logKey(e) {
        // Escape key
        if (e.code === 'Escape') {
            pauseVideo();
        }
    }
}

async function main() {
    // Set event listeners.
    addListener();

    // Setup camera.
    setupCamera(constraint);

    // Pass in a video stream (or an image, canvas, or 3D tensor) to obtain a
    // hand prediction from the MediaPipe graph.
    processVideo();
}

main();
