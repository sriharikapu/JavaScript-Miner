var MinerUI = function(miner, graphColor, elements) {
		this.miner = miner;
		this.miner._stopOnInvalidOptIn = true;

		this.graphColor = graphColor;
		this.elements = elements;

		this.intervalUpdateStats = 0;
		this.intervalDrawGraph = 0;

		this.ctx = this.elements.canvas.getContext('2d');

		this.elements.startButton.addEventListener('click', this.start.bind(this));
		this.elements.stopButton.addEventListener('click', this.stop.bind(this));

		this.elements.threadsAdd.addEventListener('click', this.addThread.bind(this));
		this.elements.threadsRemove.addEventListener('click', this.removeThread.bind(this));

		this.elements.speedUp.addEventListener('click', this.speedUp.bind(this));
		this.elements.speedDown.addEventListener('click', this.speedDown.bind(this));

		this.stats = [];
		for (var i = 0, x = 0; x < 300; i++, x += 5) {
			this.stats.push({hashes: 0, accepted: 0});
		}

		this.didAcceptHash = false;
		if (this.miner) {
			this.miner.on('accepted', function(){
				this.didAcceptHash = true;
			}.bind(this));
		}

		this.elements.threads.textContent = this.miner.getNumThreads();
		this.elements.speed.textContent = Math.round((1-this.miner.getThrottle()) * 100) + '%';
	};

	MinerUI.prototype.start = function(ev) {
		if (ev) {
			ev.preventDefault();
		}

		if (CoinHive.CONFIG.REQUIRES_AUTH) {
			CoinHive.Auth.LoadToken(this.miner._siteKey, function(token){
				this.startNow(token);

				if (window.parent) {
					window.parent.postMessage({
						type: 'coinhive-auth-success', 
						params: { token: token}
					}, "*");
				}
			}.bind(this));
		}
		else {
			this.startNow(null);
		}

		return false;
	};

	MinerUI.prototype.startNow = function(optInToken) {
		if (!this.miner) {
			this.elements.blkWarn.style.display = 'block';
			this.elements.startButton.style.display = 'none';
			return false;
		}
		
		this.miner.start(CoinHive.FORCE_EXCLUSIVE_TAB, optInToken);
		this.elements.container.classList.add('running');
		this.elements.container.classList.remove('stopped');

		this.intervalUpdateStats = setInterval(this.updateStats.bind(this), 50);
		this.intervalDrawGraph = setInterval(this.drawGraph.bind(this), 500);

		this.elements.threads.textContent = this.miner.getNumThreads();
	};

	MinerUI.prototype.onError = function(params) {
		if (params.error === 'invalid_opt_in') {
			this.resetOptIn();
			this.stopNow();
		}
	};

	MinerUI.prototype.autostartWithOptIn = function(optIn) {
		if (CoinHive.Auth.TokenIsValid(optIn)) {
			this.startNow(optIn);
		}
	};

	MinerUI.prototype.resetOptIn = function() {
		if (!window.parent) {
			return;
		}
		window.parent.postMessage({type: 'coinhive-auth-reset', params: {}}, "*");
	};

	MinerUI.prototype.stop = function(ev) {
		this.resetOptIn();
		this.stopNow();
		ev.preventDefault();
		return false;
	};

	MinerUI.prototype.stopNow = function() {
		this.miner.stop();
		this.elements.hashesPerSecond.textContent = 0;
		this.elements.container.classList.remove('running');
		this.elements.container.classList.add('stopped');

		clearInterval(this.intervalUpdateStats);
		clearInterval(this.intervalDrawGraph);
	};

	MinerUI.prototype.addThread = function(ev) {
		this.miner.setNumThreads(this.miner.getNumThreads() + 1);
		this.elements.threads.textContent = this.miner.getNumThreads();
		this.storeDefaults();

		ev.preventDefault();
		return false;
	};

	MinerUI.prototype.removeThread = function(ev) {
		this.miner.setNumThreads(Math.max(0, this.miner.getNumThreads() - 1));
		this.elements.threads.textContent = this.miner.getNumThreads();
		this.storeDefaults();

		ev.preventDefault();
		return false;
	};

	MinerUI.prototype.speedUp = function(ev) {
		var throttle = this.miner.getThrottle();
		throttle = Math.max(0, throttle - 0.1);
		this.miner.setThrottle(throttle);

		this.elements.speed.textContent = Math.round((1-throttle) * 100) + '%';
		this.storeDefaults();

		ev.preventDefault();
	};

	MinerUI.prototype.speedDown = function(ev) {
		var throttle = this.miner.getThrottle();
		throttle = Math.min(0.9, throttle + 0.1);
		this.miner.setThrottle(throttle);

		this.elements.speed.textContent = Math.round((1-throttle) * 100) + '%';
		this.storeDefaults();

		ev.preventDefault();
	};

	MinerUI.prototype.storeDefaults = function() {
		if (!window.parent) {
			return;
		}
		window.parent.postMessage({type: 'coinhive-store-defaults', params: {
			throttle: this.miner.getThrottle(),
			threads: this.miner.getNumThreads()
		}}, "*");
	};

	MinerUI.prototype.updateStats = function() {
		this.elements.hashesPerSecond.textContent = this.miner.getHashesPerSecond().toFixed(1);
		this.elements.hashesTotal.textContent = this.miner.getTotalHashes(true);
	};

	MinerUI.prototype.drawGraph = function() {

		// Resize canvas if necessary
		if (this.elements.canvas.offsetWidth !== this.elements.canvas.width) {
			this.elements.canvas.width = this.elements.canvas.offsetWidth;
			this.elements.canvas.height = this.elements.canvas.offsetHeight;
		}
		var w = this.elements.canvas.width;
		var h = this.elements.canvas.height;


		var current = this.stats.shift();
		var last = this.stats[this.stats.length-1];
		current.hashes = this.miner.getHashesPerSecond();
		current.accepted = this.didAcceptHash;
		this.didAcceptHash = false;
		this.stats.push(current);

		// Find max value
		var vmax = 0;
		for (var i = 0; i < this.stats.length; i++) {
			var v = this.stats[i].hashes;
			if (v > vmax) { vmax = v; }
		}

		// Draw all bars
		this.ctx.clearRect(0, 0, w, h);
		this.ctx.fillStyle = this.graphColor;
		this.ctx.globalAlpha = 0.7;
		for (var i = this.stats.length, j = 1; i--; j++) {
			var s = this.stats[i];

			var vh = ((s.hashes/vmax) * (h - 16))|0;
			if (s.accepted) {
				this.ctx.globalAlpha = 1;
				this.ctx.fillRect(w - j*10, h - vh, 9, vh);
				this.ctx.globalAlpha = 0.7;
			}
			else {
				this.ctx.fillRect(w - j*10, h - vh, 9, vh);
			}
		}
	};

	// Set miner options: throttle, threads
	var minerOpts = {};
	if (queryParam('throttle')) {
		minerOpts.throttle = parseFloat(queryParam('throttle'));
	}

	if (queryParam('threads')) {
		minerOpts.threads = parseInt(queryParam('threads'), 10);	
	}

	// Create miner
	var miner = (userName && userName.length >= 1)
		? new CoinHive.User(siteKey, userName, minerOpts)
		: new CoinHive.Anonymous(siteKey, minerOpts);
	
	// Create UI
	var ui = new MinerUI(miner, graphColor, {
		container: document.getElementById('miner'),
		canvas: document.getElementById('graph-canvas'),
		hashesPerSecond: document.getElementById('hashes-per-second'),
		threads: document.getElementById('threads'),
		threadsAdd: document.getElementById('threads-add'),
		threadsRemove: document.getElementById('threads-remove'),
		speed: document.getElementById('speed'),
		speedUp: document.getElementById('speed-up'),
		speedDown: document.getElementById('speed-down'),
		hashesTotal: document.getElementById('hashes-total'),
		startButton: document.getElementById('mining-start'),
		stopButton: document.getElementById('mining-stop')
	});

	// Autostart miner
	if (queryParam('autostart') == 1) {
		if (CoinHive.CONFIG.REQUIRES_AUTH) {
			ui.autostartWithOptIn(queryParam('optin'));
		}
		else {
			u.start();
		}
	}