const videoElement = document.getElementsByClassName('input-video')[0];
const canvasElement = document.getElementsByClassName('output-canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

const DEBUG = false;
let time = performance.now()

const test = new Image();
// test.src = 'img/ring.png';
test.src = 'img/ring3.png';

function onResults(results) {
  let newtime = performance.now()
  let fps = Math.round(1000 / (newtime - time))
  document.querySelector('.performance').innerHTML = fps + ' fps';
  time = newtime
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
  if (results.multiHandLandmarks && results.multiHandedness) {
    for (const [index, landmarks] of results.multiHandLandmarks.entries()) {
      if (DEBUG) {
        const classification = results.multiHandedness[index];
        const lineColor = classification.label === 'Right' ? '#00FF00' : '#FF0000';
        const dotColor = classification.label === 'Right' ? '#FF0000' : '#00FF00';

        drawConnectors(
          canvasCtx, landmarks, HAND_CONNECTIONS, { color: lineColor, lineWidth: 5 }
        );
        drawLandmarks(canvasCtx, landmarks, { color: dotColor, lineWidth: 2 });
      }
      drawRing(canvasCtx, landmarks);
    }
  }
  canvasCtx.restore();
}

function drawRing(canvasCtx, landmarks) {
  canvasCtx.save();

  // Finger
  let fingerMCP = landmarks[13];
  let fingerPIP = landmarks[14];

  // Mid point
  let xCenter = canvasCtx.canvas.width * (fingerMCP.x + fingerPIP.x) / 2;
  let yCenter = canvasCtx.canvas.height * (fingerMCP.y + fingerPIP.y) / 2;

  // Distance
  let xDiff = canvasCtx.canvas.width * (fingerMCP.x - fingerPIP.x);
  let yDiff = canvasCtx.canvas.height * (fingerMCP.y - fingerPIP.y);
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
  let width = videoElement.videoWidth;
  let height = videoElement.videoHeight;
  const dpr = window.devicePixelRatio;
  canvasElement.width = width * dpr;
  canvasElement.height = height * dpr;

  // Set canvas css style to fit full viewport
  // canvasElement.style.width = window.innerWidth + 'px';
  // canvasElement.style.height = window.innerHeight + 'px';
}

let gest = false;
function pauseVideo(camera) {
  if (!gest) {
  	camera.start();
  	gest = true;
  	return;
  }

  const media = camera.video;
  const button = document.querySelector('.stop-button');
  if (media.paused) {
	media.play();
    button.innerHTML = 'Stop';
  } else {
    media.pause();
    button.innerHTML = 'Play';
  }
}

function main() {
  const handTrackerConfig = {
    selfieMode: false,
    maxNumHands: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  };

  const hands = new Hands({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.1.1614621970/${file}`;
    }
  });
  hands.setOptions(handTrackerConfig);
  hands.onResults(onResults);

  const camera = new Camera(videoElement, {
    width: { min: 1024, ideal: 1280, max: 1920 },
    height: { min: 576, ideal: 720, max: 1080 },
    // width: 640,
    // height: 360,
    // frameRate: { ideal: 10, max: 15 },
    facingMode: 'environment',
    onFrame: async () => {
      await hands.send({image: videoElement});
    }
  });
  // camera.start();

  videoElement.addEventListener('loadedmetadata', resizeCanvas);
  // videoElement.addEventListener('play', resizeCanvas);
  window.addEventListener('resize', resizeCanvas);

  /* PAUSE BUTTON */
  const button = document.querySelector('.stop-button');
  button.addEventListener('click', () => {
    pauseVideo(camera);

    // handTrackerConfig.selfieMode = !handTrackerConfig.selfieMode;
    // hands.setOptions(handTrackerConfig);
    // camera.b.facingMode = handTrackerConfig.selfieMode ? 'user' : 'environment';
    // camera.start();
    // console.log('SelfieMode:', handTrackerConfig.selfieMode)
    // console.log('FacingMode:', camera.b.facingMode)
  });

  document.addEventListener('keyup', logKey);
  function logKey(e) {
    // Escape key
    if (e.code === 'Escape') {
      pauseVideo(camera);
    }
  }
}

main();
