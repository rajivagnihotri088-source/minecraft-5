
(function () {
  // Check that Three.js has loaded
  if (!window.THREE) {
    alert("Internet on karke page reload karo!");
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);

  const camera = new THREE.PerspectiveCamera(
    75, innerWidth / innerHeight, 0.1, 150
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x667744, 2));

  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(15, 30, 10);
  scene.add(sun);

  const materials = {
    grass: new THREE.MeshLambertMaterial({ color: 0x55a83b }),
    dirt: new THREE.MeshLambertMaterial({ color: 0x80552f }),
    stone: new THREE.MeshLambertMaterial({ color: 0x888888 }),
    wood: new THREE.MeshLambertMaterial({ color: 0x80502c }),
    leaves: new THREE.MeshLambertMaterial({ color: 0x237333 }),
    planks: new THREE.MeshLambertMaterial({ color: 0xb88b52 }),
    roof: new THREE.MeshLambertMaterial({ color: 0x984334 }),
    iron: new THREE.MeshLambertMaterial({ color: 0xd0b5a0 }),
    gold: new THREE.MeshLambertMaterial({ color: 0xffd52a }),
    diamond: new THREE.MeshLambertMaterial({ color: 0x36e9df })
  };

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const blocks = new Map();
  const meshes = [];
  const key = (x, y, z) => `${x},${y},${z}`;

  let selected = "grass";
  let blockCount = 30;
  let playing = false;
  let yaw = 0, pitch = 0, velocityY = 0, grounded = false;

  const player = { x: 0, y: 3, z: 5 };
  const keys = {};

  function addBlock(x, y, z, type) {
    const id = key(x, y, z);
    if (blocks.has(id)) return null;

    const mesh = new THREE.Mesh(
      cube, materials[type] || materials.dirt
    );
    mesh.position.set(x, y, z);
    mesh.userData = { x, y, z, type };

    scene.add(mesh);
    blocks.set(id, mesh);
    meshes.push(mesh);
    return mesh;
  }

  // Create terrain
  for (let x = -25; x <= 25; x++) {
    for (let z = -25; z <= 25; z++) {
      addBlock(x, -2, z, "stone");
      addBlock(x, -1, z, "dirt");
      addBlock(x, 0, z, "grass");
    }
  }

  // Village houses
  function makeHouse(cx, cz) {
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        addBlock(cx + x, 1, cz + z, "planks");
      }
    }

    for (let y = 2; y <= 4; y++) {
      for (let n = -3; n <= 3; n++) {
        if (!(n === 0 && y <= 3)) {
          addBlock(cx + n, y, cz - 3, "planks");
          addBlock(cx + n, y, cz + 3, "planks");
        }
        addBlock(cx - 3, y, cz + n, "planks");
        addBlock(cx + 3, y, cz + n, "planks");
      }
    }

    for (let n = -3; n <= 3; n++) {
      addBlock(cx + n, 5, cz - 3, "roof");
      addBlock(cx + n, 5, cz + 3, "roof");
    }
  }

  makeHouse(-9, -9);
  makeHouse(9, -9);
  makeHouse(-9, 9);
  makeHouse(9, 9);

  // Trees
  function makeTree(x, z) {
    for (let y = 1; y <= 4; y++) addBlock(x, y, z, "wood");

    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let y = 3; y <= 5; y++) {
          if (Math.abs(dx) + Math.abs(dz) < 4) {
            addBlock(x + dx, y, z + dz, "leaves");
          }
        }
      }
    }
  }

  [[-17, -15], [17, -16], [-18, 15], [18, 16]]
    .forEach(([x, z]) => makeTree(x, z));

  // Hotbar
  const hotbar = ["grass", "dirt", "stone", "wood", "planks"];
  const bar = document.getElementById("bar");

  function drawBar() {
    bar.innerHTML = "";
    hotbar.forEach((name, i) => {
      const button = document.createElement("button");
      button.className = "slot" + (name === selected ? " active" : "");
      button.textContent = `${i + 1}: ${name}`;
      button.onclick = () => {
        selected = name;
        drawBar();
      };
      bar.appendChild(button);
    });
  }
  drawBar();

  document.getElementById("start").onclick = () => {
    playing = true;
    document.getElementById("menu").style.display = "none";
    document.getElementById("hud").style.display = "block";
    bar.style.display = "flex";
    renderer.domElement.requestPointerLock();
  };

  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== renderer.domElement && playing) {
      document.getElementById("menu").style.display = "flex";
      document.querySelector("#menu h1").textContent = "Game Paused";
    } else if (document.pointerLockElement === renderer.domElement) {
      document.getElementById("menu").style.display = "none";
    }
  });

  document.addEventListener("mousemove", e => {
    if (!playing || document.pointerLockElement !== renderer.domElement) return;
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-1.5, Math.min(1.5, pitch));
  });

  document.addEventListener("keydown", e => {
    keys[e.code] = true;
    if (e.code.startsWith("Digit")) {
      const i = Number(e.code.slice(5)) - 1;
      if (hotbar[i]) {
        selected = hotbar[i];
        drawBar();
      }
    }
  });

  document.addEventListener("keyup", e => keys[e.code] = false);
  document.addEventListener("contextmenu", e => e.preventDefault());

  const raycaster = new THREE.Raycaster();

  function getTarget() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = 6;
    const hits = raycaster.intersectObjects(meshes);
    return hits.length ? hits[0] : null;
  }

  document.addEventListener("mousedown", e => {
    if (!playing || document.pointerLockElement !== renderer.domElement) return;

    const hit = getTarget();
    if (!hit) return;

    if (e.button === 0) {
      const obj = hit.object;
      blocks.delete(key(obj.userData.x, obj.userData.y, obj.userData.z));
      scene.remove(obj);
      const i = meshes.indexOf(obj);
      if (i >= 0) meshes.splice(i, 1);
      blockCount++;
    }

    if (e.button === 2 && blockCount > 0) {
      const p = hit.object.position.clone().add(hit.face.normal);
      if (Math.hypot(p.x - player.x, p.z - player.z) > 1.2 && p.y >= 1) {
        if (addBlock(Math.round(p.x), Math.round(p.y), Math.round(p.z), selected)) {
          blockCount--;
        }
      }
    }

    document.getElementById("count").textContent = "Blocks: " + blockCount;
  });

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.04);

    if (playing) {
      const speed = 5 * dt;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      const rx = Math.cos(yaw), rz = -Math.sin(yaw);

      if (keys.KeyW) { player.x += fx * speed; player.z += fz * speed; }
      if (keys.KeyS) { player.x -= fx * speed; player.z -= fz * speed; }
      if (keys.KeyA) { player.x -= rx * speed; player.z -= rz * speed; }
      if (keys.KeyD) { player.x += rx * speed; player.z += rz * speed; }

      if (keys.Space && grounded) {
        velocityY = 7;
        grounded = false;
      }

      velocityY -= 18 * dt;
      player.y += velocityY * dt;

      if (player.y < 2) {
        player.y = 2;
        velocityY = 0;
        grounded = true;
      }

      player.x = THREE.MathUtils.clamp(player.x, -24, 24);
      player.z = THREE.MathUtils.clamp(player.z, -24, 24);

      camera.position.set(player.x, player.y + 0.4, player.z);
      camera.rotation.order = "YXZ";
      camera.rotation.set(pitch, yaw, 0);
    }

    renderer.render(scene, camera);
  }

  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  animate();
})();
