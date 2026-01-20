// js/core/AnimationLoop.js
export class AnimationLoop {
    constructor(sceneManager, cameraController) {
        this.sceneManager = sceneManager;
        this.cameraController = cameraController;
        this.isRunning = false;
        this.callbacks = [];
    }

    addCallback(fn) {
        this.callbacks.push(fn);
    }

    start() {
        this.isRunning = true;
        this.loop();
    }

    stop() {
        this.isRunning = false;
    }

    loop() {
        if (!this.isRunning) return;

        requestAnimationFrame(() => this.loop());

        this.cameraController.update();
        this.callbacks.forEach(cb => cb());

        this.sceneManager.renderer.render(
            this.sceneManager.scene,
            this.sceneManager.camera
        );
    }
}
