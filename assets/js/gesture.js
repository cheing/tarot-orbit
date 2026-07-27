class OrbitGesture {
  constructor({ video, canvas, onMove, onPoint, onStatus }) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onMove = onMove;
    this.onPoint = onPoint;
    this.onStatus = onStatus;
    this.hands = null;
    this.camera = null;
    this.running = false;
    this.lastPalmX = null;
    this.lastPointAt = 0;
  }

  async start() {
    if (!window.Hands || !window.Camera) {
      this.status('手势库未载入，可使用拖动操作');
      return false;
    }

    try {
      this.hands = new Hands({
        locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.6
      });
      this.hands.onResults(results => this.handleResults(results));

      this.camera = new Camera(this.video, {
        onFrame: async () => {
          if (this.running) await this.hands.send({ image: this.video });
        },
        width: 640,
        height: 480
      });

      await this.camera.start();
      this.running = true;
      this.status('手势已开启：开掌左右移动，食指选牌');
      return true;
    } catch (error) {
      this.status('摄像头不可用，可使用拖动和点击');
      return false;
    }
  }

  stop() {
    this.running = false;
    if (this.camera) this.camera.stop();
  }

  handleResults(results) {
    this.drawPreview(results);

    const landmarks = results.multiHandLandmarks && results.multiHandLandmarks[0];
    if (!landmarks) {
      this.lastPalmX = null;
      this.status('等待手势，或直接拖动牌环');
      return;
    }

    const gesture = this.classify(landmarks);
    const palmX = landmarks[0].x;
    const palmY = landmarks[0].y;

    if (gesture === 'open') {
      const dx = this.lastPalmX === null ? 0 : palmX - this.lastPalmX;
      this.onMove(dx * -850);
      this.status('开掌旋转中');
    }

    if (gesture === 'point') {
      const now = Date.now();
      if (now - this.lastPointAt > 850) {
        this.lastPointAt = now;
        this.onPoint({
          x: (1 - landmarks[8].x) * window.innerWidth,
          y: landmarks[8].y * window.innerHeight
        });
      }
      this.status('食指选择牌');
    }

    this.lastPalmX = palmX;
    if (palmY < 0.05 || palmY > 0.95) this.lastPalmX = null;
  }

  classify(lm) {
    const extended = [
      Math.abs(lm[4].x - lm[2].x) > 0.05,
      lm[8].y < lm[6].y - 0.025,
      lm[12].y < lm[10].y - 0.025,
      lm[16].y < lm[14].y - 0.025,
      lm[20].y < lm[18].y - 0.025
    ];
    const count = extended.filter(Boolean).length;
    if (extended[1] && !extended[2] && !extended[3] && !extended[4]) return 'point';
    if (count >= 4) return 'open';
    return 'neutral';
  }

  drawPreview(results) {
    const { width, height } = this.canvas;
    this.ctx.save();
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.translate(width, 0);
    this.ctx.scale(-1, 1);
    this.ctx.drawImage(results.image, 0, 0, width, height);
    this.ctx.restore();

    const lm = results.multiHandLandmarks && results.multiHandLandmarks[0];
    if (!lm) return;

    this.ctx.save();
    this.ctx.translate(width, 0);
    this.ctx.scale(-1, 1);
    this.ctx.fillStyle = 'rgba(246, 214, 137, .95)';
    for (const point of lm) {
      this.ctx.beginPath();
      this.ctx.arc(point.x * width, point.y * height, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.fillStyle = '#7ef7d4';
    this.ctx.beginPath();
    this.ctx.arc(lm[8].x * width, lm[8].y * height, 5, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  status(text) {
    if (this.onStatus) this.onStatus(text);
  }
}
