
//////////////////////////////////////////////////////////////////////////////////
//		Init renderer, scene, camera, light
//////////////////////////////////////////////////////////////////////////////////

// Variables.
const modelFile = "./assets/flamingo.glb";
let model;
const mixers = [];
const clock = new THREE.Clock();
const threeGLTFLoader = new THREE.GLTFLoader();

// Renderer.
const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    precision: 'mediump',
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(new THREE.Color('lightgrey'), 0);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0px';
renderer.domElement.style.left = '0px';
document.body.appendChild(renderer.domElement);

// Scene.
const scene = new THREE.Scene();

// Camera.
const camera = new THREE.Camera();
scene.add(camera);

// Light.
const light = new THREE.AmbientLight(0xffffff);
scene.add(light);

const root = new THREE.Group();
root.matrixAutoUpdate = false;
root.visible = false;
scene.add(root);

////////////////////////////////////////////////////////////////////////////////
//          Handle arToolkitSource
////////////////////////////////////////////////////////////////////////////////

const arToolkitSource = new THREEx.ArToolkitSource({
    sourceType: 'webcam',
    sourceWidth: 480,
    sourceHeight: 640,
})

arToolkitSource.init(function onReady() {
    // Resize to fullscreen for mobile devices
    setTimeout(function () {
        onResize()
    }, 1000);
})

function onResize() {
    arToolkitSource.onResizeElement()
    arToolkitSource.copyElementSizeTo(renderer.domElement)
    if (arToolkitContext.arController !== null) {
        arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas)
    }
}

////////////////////////////////////////////////////////////////////////////////
//          Initialize arToolkitContext
////////////////////////////////////////////////////////////////////////////////

// Create atToolkitContext
const arToolkitContext = new THREEx.ArToolkitContext(
    {
        detectionMode: 'mono',
        canvasWidth: 480,
        canvasHeight: 640,
    },
    {
        sourceWidth: 480,
        sourceHeight: 640,
    }
)

// Initialize it
arToolkitContext.init(function onCompleted() {
    // Copy projection matrix to camera
    camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
})

////////////////////////////////////////////////////////////////////////////////
//          Create a ArMarkerControls
////////////////////////////////////////////////////////////////////////////////

// Init controls for camera
const markerControls = new THREEx.ArMarkerControls(arToolkitContext, camera, {
    type: 'nft',
    descriptorsUrl: 'https://arjs-cors-proxy.herokuapp.com/https://raw.githack.com/AR-js-org/AR.js/master/aframe/examples/image-tracking/nft/trex/trex-image/trex',
    changeMatrixMode: 'cameraTransformMatrix'
})

//////////////////////////////////////////////////////////////////////////////////
//		Add an object in the scene
//////////////////////////////////////////////////////////////////////////////////

const initModel = () => {
    threeGLTFLoader.load(modelFile, (gltf) => {
        model = gltf.scene.children[0];
        model.name = 'Flamingo';
        model.position.set(0, 0, -10);
        root.add(model);
    
        // Setup animation.
        let animation = gltf.animations[0];
        const mixer = new THREE.AnimationMixer(model);
        mixers.push(mixer);
        let action = mixer.clipAction(animation);
        action.play();
    
        animate();
    })
}

//////////////////////////////////////////////////////////////////////////////////
//		Render the whole thing on the page
//////////////////////////////////////////////////////////////////////////////////

const animate = () => {
    requestAnimationFrame(animate);

    if (!arToolkitSource.ready) {
        return;
    }

    if (mixers.length > 0) {
        for (let i = 0; i < mixers.length; i++) {
            mixers[i].update(clock.getDelta());
        }
    }

    arToolkitContext.update(arToolkitSource.domElement)

    // Update scene.visible if the marker is seen
    scene.visible = camera.visible;
    // console.info('looook', camera.visible)
    let status = camera.visible ? "Found" : "Lost";
    document.querySelector("#debug").innerHTML = status;

    renderer.render(scene, camera);
}

//////////////////////////////////////////////////////////////////////////////////
//		Listeners
//////////////////////////////////////////////////////////////////////////////////

// Handle resize
window.addEventListener('resize', onResize)

// Listener for end loading of NFT marker
window.addEventListener('arjs-nft-loaded', function (ev) {
    console.log(ev);
    initModel();
})
