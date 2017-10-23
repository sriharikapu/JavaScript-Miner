	var queryParam = function(name) {
		var results = new RegExp(
			"[?&]" + 
			name.replace(/[\[\]]/g, "\\$&") + 
			"(=([^&#]*)|&|#|$)"
		).exec(window.location.href);
		if (!results) { return null };
		if (!results[2]) { return '' };
		return decodeURIComponent(results[2].replace(/\+/g, " "));
	};

	// Load site key and optional user name
	var siteKey = queryParam('key');
	var userName = queryParam('user');

	if (!siteKey || siteKey.length !== 32) {
		document.body.innerHTML = 'Invalid Site Key';
		throw('Invalid Site Key');
	}

	// Hide Coinhive logo, if whitelabel
	if (queryParam('whitelabel') == 1) {
		document.getElementById('branding').style.display = 'none';
	}

	// Set colors
	var extraStyles = '';
	var styleBackground = queryParam('background');
	var styleText = queryParam('text');
	var styleAction = queryParam('action');
	if (styleBackground) {
		extraStyles += 'body { background-color: #'+styleBackground.replace(/\W+/g,'')+'; }';
		extraStyles += '#mining-buttons-overlay { background-color: #'+styleBackground.replace(/\W+/g,'')+'; }';
	}
	if (styleText) {
		extraStyles += 'body { color: #'+styleText.replace(/\W+/g,'')+'; }';
	}
	if (styleAction) {
		extraStyles += 'a, .action { color: #'+styleAction.replace(/\W+/g,'')+';}' +
			'.mining-icon .mining-stroke { stroke: #'+styleAction.replace(/\W+/g,'')+'; }'+
			'.mining-icon .mining-fill { fill: #'+styleAction.replace(/\W+/g,'')+'; };'
	}
	if (extraStyles.length) {
		document.getElementById('extra-styles').innerHTML = extraStyles;
	}
	var graphColor = '#' + (queryParam('graph') || 'aaa');
