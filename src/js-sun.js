var sun = sun || {};

// ---------------------------------------------------------------------------------------------------------------------------------------------

let calculatedTimeInterval = 0; // Store the calculated time interval for use in the second form

// ---------------------------------------------------------------------------------------------------------------------------------------------

sun.sunPhotoSpacing = async function() {
	const outputDiv = document.getElementById("output");
	
	const resolutionWidth = parseInt(document.getElementById("resolutionWidth").value);
	const resolutionHeight = parseInt(document.getElementById("resolutionHeight").value);
	const focalLength = parseFloat(document.getElementById("focalLength").value);
	const sensorWidth = parseFloat(document.getElementById("sensorWidth").value);
	var timeBetweenPhotos;
	var sunSizePixels;
	var maxSuns;
	 
	if (!resolutionWidth || !resolutionHeight || !focalLength || !sensorWidth) {
		outputDiv.innerHTML = "<p style='color: red;'>Please fill in all fields.</p>";
		return;
	}

	// Default angular diameter if API fails
	let angularDiameterArcsec = 1920;

	try {
		
		let txt = await home.sendPostRequest(home.getFormData('sunForm'));
		txt = home.string2Dict(txt);
		timeBetweenPhotos = txt['time_between_photos_sec'];
		sunSizePixels = txt ['sun_size_pixels'];
		maxSuns = txt['max_sun'];
		// Generate dynamic start and stop times
		// throw new Error("Python script not connected");
	} catch (error) {
		outputDiv.textContent = "";
		console.error(error);
		outputDiv.innerHTML += '<p style="color: orange;">Warning: Using fallback angular diameter of 1920 arcseconds.</p>';
		// Perform calculations
		const angularSizeRad = angularDiameterArcsec * (Math.PI / 180) * (1 / 3600);
		const sensorPixelPitch = sensorWidth / resolutionWidth;
		const angularSizePerPixelRad = sensorPixelPitch / focalLength;
		sunSizePixels = (angularSizeRad / angularSizePerPixelRad).toFixed(0);

		const sunMotionRadPerSec = Math.PI / (180) * 0.004166;
		timeBetweenPhotos = (2 * angularSizeRad / sunMotionRadPerSec).toFixed(1);

		const diagonal = Math.sqrt(resolutionWidth ** 2 + resolutionHeight ** 2);
		maxSuns = (Math.floor(diagonal / (2 * sunSizePixels))).toFixed(0);
	}
	outputDiv.textContent = "";
	calculatedTimeInterval = timeBetweenPhotos; // Store for next page
	outputDiv.innerHTML += `
		<p>Sun Size: <strong>${sunSizePixels}</strong> pixels</p>
		<p>Recommended Time Interval: <strong>${timeBetweenPhotos}</strong> seconds</p>
		<p>Maximum Suns per Photo: <strong>${maxSuns}</strong></p>
	`;

	document.getElementById("nextButton").classList.remove("hidden");
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

sun.showNextPage = function() {
	document.getElementById("page1").classList.add("hidden");
	document.getElementById("page2").classList.remove("hidden");
	// Pre-fill the time interval
	document.getElementById("timeInterval").value = calculatedTimeInterval;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

sun.submitForm = function(formName) {
	event.preventDefault(); 
	
	home.sendPostRequest(home.getFormData('photoSettingsForm'));
	const outputDiv = document.getElementById("photoCountdown");
	outputDiv.innerHTML = "";
	const data = home.getFormData(formName);
	const totalTime = data['tmp_enregistrement']*(data['nb_photos']-1);
	const middleTime = data['tmp_enregistrement']*(Math.floor(data['nb_photos']/2));
	if (data['nb_photos']%2 === 0){
		outputDiv.innerHTML = '<p style="color: orange;">Warning: Even number of pictures, totality might be missed !</p>';
	}
	const now	= new Date().getTime();
	const middlePhoto = sun.timeConverter(now + middleTime*1000);
	const endPhoto = sun.timeConverter(now + totalTime * 1000);
	outputDiv.innerHTML += `<p>Number of photos: <strong>${data['nb_photos']}</strong></br>
	Expected totality phase: <strong>${middlePhoto}</strong></br>
	Expected end of the photoshoot: <strong>${endPhoto}</strong></br></p>`;
}

sun.timeConverter = function(now) {
	const countDownDateObj = new Date(now);
    const hours = countDownDateObj.getHours().toString().padStart(2, '0');
    const minutes = countDownDateObj.getMinutes().toString().padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;
	return currentTime;
}