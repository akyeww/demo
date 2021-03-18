document.querySelector('button').addEventListener('click', activateXR);

async function activateXR() {
    // Add a canvas element and initialize a WebGL context that is compatible with WebXR.
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const gl = canvas.getContext("webgl", { xrCompatible: true });

    // To be continued in upcoming steps.
    const scene = new THREE.Scene();

    // The cube will have a different color on each side.
    // const materials = [
    //     new THREE.MeshBasicMaterial({ color: 0xff0000 }),
    //     new THREE.MeshBasicMaterial({ color: 0x0000ff }),
    //     new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
    //     new THREE.MeshBasicMaterial({ color: 0xff00ff }),
    //     new THREE.MeshBasicMaterial({ color: 0x00ffff }),
    //     new THREE.MeshBasicMaterial({ color: 0xffff00 })
    // ];

    // Create the cube and add it to the demo scene.
    // const cube = new THREE.Mesh(new THREE.BoxBufferGeometry(0.2, 0.2, 0.2), materials);
    // cube.position.set(1, 1, 1);
    // scene.add(cube);

    // Set up the WebGLRenderer, which handles rendering to the session's base layer.
    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        preserveDrawingBuffer: true,
        canvas: canvas,
        context: gl
    });
    renderer.autoClear = false;

    // The API directly updates the camera matrices.
    // Disable matrix auto updates so three.js doesn't attempt
    // to handle the matrices independently.
    const camera = new THREE.PerspectiveCamera();
    camera.matrixAutoUpdate = false;

    // Initialize a WebXR session using "immersive-ar".
    const session = await navigator.xr.requestSession(
        "immersive-ar", { requiredFeatures: ['anchors', 'hit-test'] }
    );
    session.updateRenderState({
        baseLayer: new XRWebGLLayer(session, gl)
    });

    // A 'local' reference space has a native origin that is located
    // near the viewer's position at the time the session was created.
    const referenceSpace = await session.requestReferenceSpace('local');

    // Create another XRReferenceSpace that has the viewer as the origin.
    const viewerSpace = await session.requestReferenceSpace('viewer');
    // Perform hit testing using the viewer as origin.
    const hitTestSource = await session.requestHitTestSource({ space: viewerSpace });

    const loader = new THREE.GLTFLoader();
    let reticle;
    loader.load("https://immersive-web.github.io/webxr-samples/media/gltf/reticle/reticle.gltf", function (gltf) {
        reticle = gltf.scene;
        reticle.visible = false;
        scene.add(reticle);
    })

    let flower;
    loader.load("https://immersive-web.github.io/webxr-samples/media/gltf/sunflower/sunflower.gltf", function (gltf) {
        flower = gltf.scene;
    });

    session.addEventListener("select", (event) => {
        if (reticle.visible && flower) {
            const clone = flower.clone();
            clone.position.copy(reticle.position);
            scene.add(clone);
        }
    });

    let allAnchors = new Set();
    let anchorPose = new XRRigidTransform();
    let previousFrameAnchors = new Set();

    // Use to remove all anchors.
    const removeAllAnchors = () => {
        for (const anchor of allAnchors) {
            anchor.delete();
        }
        allAnchors.clear();
    }

    // Create a render loop that allows us to draw on the AR view.
    const onXRFrame = (time, frame) => {
        // Queue up the next draw request.
        session.requestAnimationFrame(onXRFrame);

        // Bind the graphics framebuffer to the baseLayer's framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, session.renderState.baseLayer.framebuffer);

        reticle.visible = false;

        const trackedAnchors = frame.trackedAnchors;

        // // Create a free-floating anchor.
        // frame.createAnchor(anchorPose, referenceSpace).then((anchor) => {
        //     // Anchor created successfully - handle it.
        //     allAnchors.add(anchor);

        //     // For example, assign a model that will be placed relative to this anchor
        //     // & add it to the scene. The location of the newly created anchor is not
        //     // yet known but it should be by the time the application has a chance to
        //     // render the object.
        // }, (error) => {
        //     console.error(`Could not create anchor: ${error}`);
        // });

        for (const anchor of previousFrameAnchors) {
            if (!trackedAnchors.has(anchor)) {
                // Handle anchor tracking loss - `anchor` was present
                // in the present frame but is no longer tracked.
                console.log('Anchor tracked lost.');
            }
        }

        // for (const anchor of trackedAnchors) {
        //     // Query most recent pose of the anchor relative to some reference space:
        //     const pose = frame.getPose(anchor.anchorSpace, referenceSpace);
        // }

        // previousFrameAnchors = trackedAnchors;

        // Retrieve the pose of the device.
        // XRFrame.getViewerPose can return null while the session attempts to establish tracking.
        const pose = frame.getViewerPose(referenceSpace);
        if (pose) {
            // In mobile AR, we only have one view.
            const view = pose.views[0];

            const viewport = session.renderState.baseLayer.getViewport(view);
            renderer.setSize(viewport.width, viewport.height)

            // Use the view's transform matrix and projection matrix to configure the THREE.camera.
            camera.matrix.fromArray(view.transform.matrix);
            camera.projectionMatrix.fromArray(view.projectionMatrix);
            camera.updateMatrixWorld(true);

            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0 && reticle) {
                const hitPose = hitTestResults[0].getPose(referenceSpace);
                reticle.visible = true;
                reticle.position.set(hitPose.transform.position.x, hitPose.transform.position.y, hitPose.transform.position.z)
                reticle.updateMatrixWorld(true);
                // if (allAnchors.size < 1) {
                //     let anchor = hitTestResults[0].createAnchor();
                //     allAnchors.add(anchor);
                // }
            }

            // Render the scene with THREE.WebGLRenderer.
            renderer.render(scene, camera);
        }
    }
    session.requestAnimationFrame(onXRFrame);
}
