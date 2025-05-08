    function checkOrientation() {
      const notice = document.getElementById('rotateNotice');
      const game = document.getElementById('gameContainer');
      const isPortrait = window.innerHeight > window.innerWidth;
      const isMobile = window.innerWidth < 500;

      if (isMobile && isPortrait) {
        // Portrait mode on small device. Display content
        notice.style.display = 'flex';
        notice.style.opacity = '1';
        game.style.opacity = '0';
        setTimeout(() => {
          game.style.display = 'none';
        }, 500);
      } else {
        notice.style.opacity = '0';
        setTimeout(() => {
          notice.style.display = 'none';
          game.style.display = 'block';
          requestAnimationFrame(() => {
            game.style.opacity = '1';
          });
        }, 500);
      }
    }

    window.addEventListener('load', checkOrientation);
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
	
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    const startOverlay = document.getElementById('startOverlay');
    const startBtn = document.getElementById('startBtn');

    const jumpSound = document.getElementById('jumpSound');
    const starSound = document.getElementById('starSound');
    const failSound = document.getElementById('failSound');
    
    const humanImg = new Image();
      humanImg.src = 'game/human.png';

    const human = {
      x: 50,
      y: 130,
      width: 40,
      height: 40,
      velocityY: 0,
      gravity: 1.2,
      isJumping: false,
      jumpPower: -18
    };

    let bottles = [];
    let cars = [];
    let stars = [];
    let boxes = [];
    let clouds = [];

    const bottleImages = [
      'game/bottle1.png',
      'game/bottle2.png',
      'game/bottle3.png'
    ];
    const carImage = new Image();
    carImage.src = 'game/car1.png';

    const starImage = new Image();
    starImage.src = 'game/star.png';

    const boxImage = new Image();
    boxImage.src = 'game/box.png';

    const cloudImage = new Image();
    cloudImage.src = 'game/cloud.png';

    const loadedBottles = [];
    bottleImages.forEach(src => {
      const img = new Image();
      img.onerror = () => console.error('Failed to load image:', src);
      img.src = src;
      loadedBottles.push(img);
    });

    let score = 0;
    let gameOver = false;
    let gameStarted = false;

    function spawnBottle() {
      const img = loadedBottles[Math.floor(Math.random() * loadedBottles.length)];
      bottles.push({
        x: canvas.width,
        y: 150,
        width: 40,
        height: 60,
        img: img
      });
    }

    function spawnCar() {
      const carImages = [
        'game/car1.png',
        'game/car2.png',
        'game/car3.png'
      ];

      const loadedCars = carImages.map(src => {
        const img = new Image();
        img.src = src;
        return img;
      });

      cars.push({
        x: canvas.width,
        y: 135,
        width: 80,
        height: 85,
        img: loadedCars[Math.floor(Math.random() * loadedCars.length)]
      });
    }

    function spawnStar() {
      const groundOrSky = Math.random() > 0.5 ? 150 : 80;
      stars.push({
        x: canvas.width,
        y: groundOrSky,
        width: 30,
        height: 30,
        img: starImage
      });
    }

    function spawnBox() {
      if (Math.random() < 0.4) {
        const newBox = {
          x: canvas.width,
          y: 160,
          width: 40,
          height: 40,
          img: boxImage
        };

        const noOverlap = [...bottles, ...cars, ...boxes].every(ob => {
          return newBox.x + newBox.width < ob.x || newBox.x > ob.x + ob.width + 20;
        });

        if (noOverlap) {
          boxes.push(newBox);
        }
      }
    }

    function spawnCloud() {
      clouds.push({
        x: canvas.width + Math.random() * 200,
        y: Math.random() * 60,
        width: 100 + Math.random() * 50,
        height: 70,
        speed: 1 + Math.random()
      });
    }

    setInterval(() => {
      if (!gameOver && gameStarted) spawnCloud();
    }, 3000);

    function update(deltaTime) {
      if (gameOver || !gameStarted) return;
    
      // Jump Physics
      human.velocityY += human.gravity * deltaTime * 60; // умножаем на 60, чтобы сохранить прежнюю "силу"
      human.y += human.velocityY * deltaTime * 60;
    
      if (human.y >= 150) {
        human.y = 150;
        human.velocityY = 0;
        human.isJumping = false;
      }
    
      // Move objects considering Deltatime
      const speed = 6 * deltaTime * 60; // Normalize speed
    
      bottles.forEach(b => b.x -= speed);
      bottles = bottles.filter(b => b.x + b.width > 0);
    
      cars.forEach(c => c.x -= speed);
      cars = cars.filter(c => c.x + c.width > 0);
    
      stars.forEach(s => s.x -= speed);
      stars = stars.filter(s => s.x + s.width > 0);
    
      boxes.forEach(b => b.x -= speed);
      boxes = boxes.filter(b => b.x + b.width > 0);
    
      clouds.forEach(cloud => cloud.x -= cloud.speed * deltaTime * 60);
      clouds = clouds.filter(cloud => cloud.x + cloud.width > 0);
    
      // Collisions
      const obstacles = [...bottles, ...cars, ...boxes];
      obstacles.forEach(ob => {
        const isCar = cars.includes(ob);
        const isBottle = bottles.includes(ob);
        const isBox = boxes.includes(ob);
        const paddingX = isCar || isBottle ? 10 : isBox ? 15 : 0;
        const paddingY = isCar ? 15 : 0;
    
        if (
          human.x < ob.x + ob.width - paddingX &&
          human.x + human.width > ob.x + paddingX &&
          human.y < ob.y + ob.height - paddingY &&
          human.y + human.height > ob.y + paddingY
        ) {
          gameOver = true;
          failSound.play();
          gameOverOverlay.style.display = 'flex';
          document.getElementById('finalScore').textContent = 'Доездились! Твой счет: ' + score;
        }
      });
    
      stars.forEach((s, index) => {
        if (
          human.x < s.x + s.width &&
          human.x + human.width > s.x &&
          human.y < s.y + s.height &&
          human.y + human.height > s.y
        ) {
          score += 50;
          document.getElementById('starSound').volume = 0.2;
          starSound.play();
          stars.splice(index, 1);
          document.getElementById('score').textContent = 'Очки: ' + score;
        }
      });
    }
    

      stars.forEach((s, index) => {
        if (
          human.x < s.x + s.width &&
          human.x + human.width > s.x &&
          human.y < s.y + s.height &&
          human.y + human.height > s.y
        ) {
          score += 50;
          document.getElementById('starSound').volume = 0.3; // Value between 0.0 (mute) and 1.0 (max)
          starSound.play();
          stars.splice(index, 1);
          document.getElementById('score').textContent = 'Очки: ' + score;
        }
      });
    

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      clouds.forEach(cloud => {
        ctx.drawImage(cloudImage, cloud.x, cloud.y, cloud.width, cloud.height);
      });

      ctx.fillStyle = '#654321';
      ctx.fillRect(0, 190, canvas.width, 10);

      
      ctx.drawImage(humanImg, human.x, human.y, human.width, human.height);

      bottles.forEach(b => {
        ctx.drawImage(b.img, b.x, b.y, b.width, b.height);
      });

      cars.forEach(c => {
        ctx.drawImage(c.img, c.x, c.y, c.width, c.height);
      });

      stars.forEach(s => {
        ctx.drawImage(s.img, s.x, s.y, s.width, s.height);
      });

      boxes.forEach(b => {
        ctx.drawImage(b.img, b.x, b.y, b.width, b.height);
      });
    }

    function gameLoop() {
      update();
      draw();
      if (!gameOver) requestAnimationFrame(gameLoop);
    }

    function jump() {
      if (!human.isJumping && gameStarted) {
        human.velocityY = human.jumpPower;
        human.isJumping = true;
        jumpSound.play();
      }
    }

    // Reset game with R button on Desktop on Game Over
    document.addEventListener('keydown', function (e) {
      if (e.code === 'KeyR' && gameOver) {
        resetGame();
      }
    });

    // Esc to Exit Game Overlay on Desktop
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('gameOverlay');
        if (overlay) {
          overlay.style.display = 'none';
          gameOver = true; // optionally stop game loop
        }
      }
    });

    let lastFrameTime = performance.now();

    function gameLoop(currentTime) {
      const deltaTime = (currentTime - lastFrameTime) / 1000; // in seconds
      lastFrameTime = currentTime;

      update(deltaTime);
      draw();
      if (!gameOver) requestAnimationFrame(gameLoop);
    }

    function resetGame() {
      score = 0;
      gameOver = false;
      gameStarted = true;
      bottles = [];
      cars = [];
      stars = [];
      boxes = [];
      human.y = 150;
      human.velocityY = 0;
      human.isJumping = false;
      document.getElementById('score').textContent = 'Очки: 0';
      gameOverOverlay.style.display = 'none';
      lastFrameTime = performance.now();
      requestAnimationFrame(gameLoop);
    }

    document.addEventListener('keydown', e => {
      if (e.code === 'Space' || e.code === 'ArrowUp') jump();
    });

    document.addEventListener('touchstart', () => jump());
    startBtn.addEventListener('click', () => {
      gameStarted = true;
      startOverlay.style.display = 'none';
      lastFrameTime = performance.now();
      requestAnimationFrame(gameLoop);
    });

    setInterval(() => {
      if (!gameOver && gameStarted) spawnBottle();
    }, 1500);

    setInterval(() => {
      if (!gameOver && gameStarted) spawnCar();
    }, 4000);

    setInterval(() => {
      if (!gameOver && gameStarted) spawnStar();
    }, 5000);

    setInterval(() => {
      if (!gameOver && gameStarted) spawnBox();
    }, 3000);

    setInterval(() => {
      if (!gameOver && gameStarted) {
        score++;
        document.getElementById('score').textContent = 'Очки: ' + score;
      }
    }, 1000);