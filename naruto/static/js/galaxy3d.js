/**
 * galaxy3d.js — Three.js 3D Cosmic Starfield & Nebula Particle Universe
 * Renders an interactive, dynamic galaxy with mouse parallax and warp acceleration.
 */

class GalaxyUniverse {
  constructor() {
    this.canvas = document.getElementById('galaxy-canvas');
    if (!this.canvas || typeof THREE === 'undefined') {
      console.warn('Three.js or galaxy canvas not available.');
      return;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 1, 3000);
    this.camera.position.z = 1000;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.starCount = 4500;
    this.speedMultiplier = 1.0;
    this.targetSpeed = 1.0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetMouseX = 0;
    this.targetMouseY = 0;

    this.initStars();
    this.initNebulaClouds();
    this.initShootingStars();
    this.bindEvents();
    this.animate();
  }

  initStars() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.starCount * 3);
    const colors = new Float32Array(this.starCount * 3);
    const sizes = new Float32Array(this.starCount);

    const palette = [
      new THREE.Color(0x00f2fe), // Cyan
      new THREE.Color(0x8b5cf6), // Violet
      new THREE.Color(0xffffff), // White
      new THREE.Color(0x38bdf8), // Sky blue
      new THREE.Color(0xf43f5e), // Nebula pink
      new THREE.Color(0xfde047)  // Stellar gold
    ];

    for (let i = 0; i < this.starCount; i++) {
      const i3 = i * 3;
      // Spread stars in a cylindrical/spherical galaxy volume
      const radius = 250 + Math.random() * 1600;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.9;

      positions[i3] = radius * Math.cos(theta) * Math.cos(phi);
      positions[i3 + 1] = radius * Math.sin(phi);
      positions[i3 + 2] = radius * Math.sin(theta) * Math.cos(phi);

      const color = palette[Math.floor(Math.random() * palette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = Math.random() * 3.2 + 0.8;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Custom shader or PointMaterial
    const texture = this.createStarTexture();
    const material = new THREE.PointsMaterial({
      size: 4,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.starPoints = new THREE.Points(geometry, material);
    this.scene.add(this.starPoints);
  }

  createStarTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(180, 220, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(100, 140, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  initNebulaClouds() {
    this.nebulaGroup = new THREE.Group();
    const cloudCount = 12;
    const cloudGeometry = new THREE.PlaneGeometry(600, 600);

    for (let i = 0; i < cloudCount; i++) {
      const cloudCanvas = document.createElement('canvas');
      cloudCanvas.width = 128;
      cloudCanvas.height = 128;
      const ctx = cloudCanvas.getContext('2d');
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      
      const isCyan = i % 2 === 0;
      if (isCyan) {
        grad.addColorStop(0, 'rgba(0, 242, 254, 0.12)');
        grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.04)');
      } else {
        grad.addColorStop(0, 'rgba(139, 92, 246, 0.14)');
        grad.addColorStop(0.5, 'rgba(244, 63, 94, 0.03)');
      }
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);

      const texture = new THREE.Texture(cloudCanvas);
      texture.needsUpdate = true;

      const mat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(cloudGeometry, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 1400,
        (Math.random() - 0.5) * 1000,
        (Math.random() - 0.5) * 800 - 300
      );
      mesh.rotation.z = Math.random() * Math.PI * 2;
      this.nebulaGroup.add(mesh);
    }

    this.scene.add(this.nebulaGroup);
  }

  initShootingStars() {
    this.shootingStars = [];
    for (let i = 0; i < 3; i++) {
      const lineGeom = new THREE.BufferGeometry();
      const pos = new Float32Array([0, 0, 0, -80, -40, -60]);
      lineGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3));

      const lineMat = new THREE.LineBasicMaterial({
        color: 0x00f2fe,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
      });

      const line = new THREE.Line(lineGeom, lineMat);
      line.visible = false;
      this.scene.add(line);

      this.shootingStars.push({
        mesh: line,
        active: false,
        timer: Math.random() * 200 + 100,
        speedX: 0,
        speedY: 0,
        speedZ: 0
      });
    }
  }

  triggerShootingStar(star) {
    star.active = true;
    star.mesh.visible = true;
    star.mesh.position.set(
      (Math.random() - 0.5) * 1200,
      Math.random() * 500 + 200,
      Math.random() * 400
    );
    star.mesh.material.opacity = 0.9;
    star.speedX = -(Math.random() * 18 + 12);
    star.speedY = -(Math.random() * 12 + 8);
    star.speedZ = -(Math.random() * 8 + 4);
  }

  setWarpSpeed(active) {
    this.targetSpeed = active ? 4.5 : 1.0;
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('mousemove', (e) => {
      this.targetMouseX = (e.clientX - window.innerWidth / 2) * 0.15;
      this.targetMouseY = (e.clientY - window.innerHeight / 2) * 0.15;
    });

    const speedSlider = document.getElementById('galaxy-speed-slider');
    const speedDisplay = document.getElementById('galaxy-speed-val');
    if (speedSlider) {
      speedSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.speedMultiplier = val;
        if (speedDisplay) speedDisplay.textContent = `${val.toFixed(1)}x`;
      });
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Smooth speed transitions
    this.speedMultiplier += (this.targetSpeed - this.speedMultiplier) * 0.05;

    // Smooth mouse parallax
    this.mouseX += (this.targetMouseX - this.mouseX) * 0.05;
    this.mouseY += (this.targetMouseY - this.mouseY) * 0.05;

    this.camera.position.x = this.mouseX;
    this.camera.position.y = -this.mouseY;
    this.camera.lookAt(this.scene.position);

    // Rotate starfield
    if (this.starPoints) {
      this.starPoints.rotation.y += 0.0006 * this.speedMultiplier;
      this.starPoints.rotation.x += 0.0002 * this.speedMultiplier;
    }

    if (this.nebulaGroup) {
      this.nebulaGroup.rotation.z += 0.0003 * this.speedMultiplier;
    }

    // Update shooting stars
    this.shootingStars.forEach(star => {
      if (!star.active) {
        star.timer--;
        if (star.timer <= 0) {
          this.triggerShootingStar(star);
          star.timer = Math.random() * 400 + 200;
        }
      } else {
        star.mesh.position.x += star.speedX * this.speedMultiplier;
        star.mesh.position.y += star.speedY * this.speedMultiplier;
        star.mesh.position.z += star.speedZ * this.speedMultiplier;
        star.mesh.material.opacity *= 0.96;

        if (star.mesh.material.opacity < 0.05) {
          star.active = false;
          star.mesh.visible = false;
        }
      }
    });

    this.renderer.render(this.scene, this.camera);
  }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
  window.galaxyApp = new GalaxyUniverse();
});
