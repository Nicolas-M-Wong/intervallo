var home = home || {};
// ---------------------------------------------------------------------------------------------------------------------------------------------

home.showDialog = function(nbPhotos, exposureTime, timeBetweenPhotos,now) {
	const notificationMessage = document.getElementById("notificationMessage");
	const notificationTitle = document.getElementById("notificationTitle");
	let currentFileName = document.body.getAttribute('data-page');
    dialogBoxId.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            e.preventDefault();
        }
    });
	document.getElementById("dialogBoxTitle").innerHTML = "Temps restant :";
    document.getElementById("Compteur").innerHTML = "00:00:00"; // Initialize countdown display
    dialogBoxId.showModal();
	var totalTime = nbPhotos * exposureTime + timeBetweenPhotos * (nbPhotos - 1);
    // Calculate the total time
	if (currentFileName === "home-V3"){
		totalTime = timeBetweenPhotos*(nbPhotos- 1)+exposureTime;
	}

     // Set countdown date to current time plus total time
     
    const countDownDate = now + totalTime * 1000;

    // Convert countdown date to readable format
    const countDownDateObj = new Date(countDownDate);
    const hours = countDownDateObj.getHours().toString().padStart(2, '0');
    const minutes = countDownDateObj.getMinutes().toString().padStart(2, '0');
    const currentTime = `${hours}:${minutes}`;
    sessionStorage.nbPhotosNotif = nbPhotos;
    sessionStorage.exposureTimeNotif = exposureTime;
    sessionStorage.currentTimeNotif = currentTime;

	home.toggleNotif();
    // Start the countdown
    countdownInterval = setInterval(function() {
        var now = new Date().getTime();
        var distance = (countDownDate - now);
        document.getElementById("Compteur").innerHTML = home.formatTime(distance / 1000);
        if (distance < 0) {
            clearInterval(countdownInterval);
            document.getElementById("Compteur").innerHTML = "00:00:00";
			navigator.vibrate([1000, 250, 1000, 500, 2500]);
        }
    }, 1000);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.closeDialog = function() {
    dialogBoxId.close(); 
    // Clear the countdown interval when the dialog box is closed
    clearInterval(countdownInterval);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

// Function to format time in hh:mm:ss
home.formatTime = function(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.getFormData = function(formName){
	let currentFileName = document.body.getAttribute('data-page');
	let data = {};
	
	const form = document.getElementById(formName);
	const inputs = form.querySelectorAll("input"); // Collect all inputs
	inputs.forEach(input => data[input.name] = parseFloat(input.value)); // Log each input's name and value
	
/*	if (formName === "photoSettingsForm"){
		data["tmp_pose"]=0.01;
	} */
	
	if (currentFileName === "home"){
		data = {};
		// console.log("success home");
		data["nb_photos"] = WheelConstruct.getCurrentValue(document.getElementById('nb_photos'),step_photo);
		data["tmp_pose"] = WheelConstruct.getCurrentValue(document.getElementById('tmp_pose'),step_pose);
		data["tmp_enregistrement"] = WheelConstruct.getCurrentValue(document.getElementById('enregistrement'),step_enregistrement);
	}
	console.log("updated form dataquery ", data);
	return (data);
}

home.submitForm = function(event, formName){
	event.preventDefault();
	var data = home.getFormData(formName);
	let currentFileName = document.body.getAttribute('data-page');
	if (currentFileName != "home-V3"){
		const doc_pose = document.getElementById('tmp_pose');

		var totalTime = data["nb_photos"] * data["tmp_pose"] + data["tmp_enregistrement"] * (data["nb_photos"] - 1);
		console.log("Total time for the interval:", totalTime, "seconds");
		if (Number.isNaN(totalTime) || totalTime <= 0){
			totalTime=0;
			document.getElementById("confirmation").style.display = "none";
		}
		else{
		// Display formatted time in confirmation
		document.getElementById("estimation_tmp").innerHTML = home.formatTime(Math.round(totalTime));
		document.getElementById("confirmation").style.display = "block";
		// Prepare form data for the POST request
		formData = new FormData(document.getElementById('interval-Form'));
		}
	}
	else{		
		
		var totalTime = data["tmp_enregistrement"] * (data["nb_photos"] - 1)+data["tmp_pose_end"];
		var intervalTimeCondition = Math.max(data["tmp_pose_start"],data["tmp_pose_end"]) + 1.5;
		console.log("Total time for the interval:", totalTime, "seconds");
		if (Number.isNaN(totalTime) || totalTime <= 0){
			totalTime=0;
			document.getElementById("confirmation").style.display = "none";
		}
		else if (intervalTimeCondition>data["tmp_enregistrement"]){
			document.getElementById("openDialogBox").disabled = true;
			totalTime=0;
			document.getElementById("confirmation").style.display = "block";
			document.getElementById("title_tmp_estime").style.display = "none";
			document.getElementById("estimation_tmp").innerHTML = `<span>Intervalle trop court</span></br><span style='font-weight: 300;'>Intervalle minimum de ${intervalTimeCondition}s</span>`;
		}
		else{
			document.getElementById("title_tmp_estime").style.display = "block";
			document.getElementById("openDialogBox").disabled = false;
			// Display formatted time in confirmation
			document.getElementById("estimation_tmp").innerHTML = home.formatTime(Math.round(totalTime));
			document.getElementById("confirmation").style.display = "block";
			// Prepare form data for the POST request
			formData = new FormData(document.getElementById('interval-Form'));
		}
	}
}	
	
// ---------------------------------------------------------------------------------------------------------------------------------------------

home.handleButtonClick = function(test_status,formName) {
    if (formData) {
		var data = home.getFormData(formName);
		let currentFileName = document.body.getAttribute('data-page');
		if (test_status === "Yes"){
			data["nb_photos"] = 1;
		}
        home.sendPostRequest(data)
            .then((answer) => {
                console.log(answer, http_status_post);
                if (http_status_post === 200) {
                    const nowDate = new Date().getTime();
                    if (currentFileName === "home-V3") {
                        home.showDialog(data["nb_photos"], Math.max(data["tmp_pose_start"],data["tmp_pose_end"]), data["tmp_enregistrement"], nowDate); // Show the dialog box with the countdown
                    } else {
                        home.showDialog(data["nb_photos"], data["tmp_pose"], data["tmp_enregistrement"], nowDate); // Show the dialog box with the countdown
                    }
                }
            })
            .catch(({ error, responseText }) => {
                console.error("Request failed:", error.message);
                console.log("Server response:", responseText);

                // Handle the 400 error specifically if needed
                if (http_status_post === 400) {
					
					if (responseText === "Unavailable") {
                    document.getElementById("dialogBoxTitle").innerHTML = " ";
                    document.getElementById("Compteur").innerHTML = "<span>Prise de vue en cours</span></br><span style='font-weight: 300;'>APN Indisponible</span>";
                    dialogBoxId.showModal();
								
					} else{
                    // Example: Display an error dialog
                    document.getElementById("dialogBoxTitle").innerHTML = "Error";
                    document.getElementById("Compteur").innerHTML = `<span>${responseText}</span>`;
                    dialogBoxId.showModal();
					}
                }
            });
			
    } else {
        console.error('Form data is not available. Please submit the form first.');
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.remoteTrigger = function(){
	const triggerMessage = {"nb_photos":"1", "tmp_pose":"0.1", "tmp_enregistrement":"0"};
	console.log(triggerMessage);
	home.sendPostRequest(triggerMessage)
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.sendPostRequest = function (data) {
    return new Promise((resolve, reject) => {
        data = home.ensureDict(data);
        data["token"] = sessionStorage.getItem("sessionToken");
        const now = new Date().getTime();
        data["date"] = now;
        console.log("Sending data:", data);
        const xhr = new XMLHttpRequest();
        const ip = location.host;
        const http_head = 'http://';
        xhr.open('POST', http_head.concat(ip), true);
        xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) { // Request is complete
                if (xhr.status === 200) {
					
                    http_status_post = 200;
                    console.log('Success:', xhr.responseText);
                    if (data.battery) {
                        if (!isNaN(xhr.responseText)) {
                            home.updateBattery(xhr.responseText);
                        } else {
                            home.updateBattery("");
                        }
                    }
                    http_status_post = 200;
                    console.log('Success:', xhr.responseText);
                    resolve(xhr.responseText); // Resolve with the response text
                } else if (xhr.status === 400) {
                    http_status_post = 400;
                    console.log('Fail:', xhr.responseText);
                    reject({
                        error: new Error('Bad Request'),
                        responseText: xhr.responseText // Include responseText in the rejection
                    });
                } else {
                    http_status_post = 0;
                    console.error('Error:', xhr.statusText);
                    reject({
                        error: new Error(xhr.statusText),
                        responseText: xhr.responseText || null
                    });
                }
            }
        };

        xhr.send(JSON.stringify(data));
    });
}
	


	
// ---------------------------------------------------------------------------------------------------------------------------------------------

home.sendGetRequest = function(fileName) {
    const url = `/${fileName}`;

    return fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'text/html',
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
    })
    .then(html => {
		
		const tokenPattern = /Token:\s*([^\s]+)/; // Regex to match "token: [unique_token]"
        const match = html.match(tokenPattern);

        if (match && match[1]) {
            // If token found, store it in sessionStorage and return early
            sessionStorage.setItem('sessionToken', match[1]);
            return; // Exit the function without updating the DOM
        }
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // Replace the contents of <body>
        document.body.innerHTML = doc.body.innerHTML;
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.detectDevice = function() {
    // Check for touch capabilities to infer mobile devices
    let isMobile = window.matchMedia("(pointer: coarse)").matches;
    
    if (isMobile === false) {
        //document.getElementById('phone-screen').style.display = "none";
        home.sendGetRequest('home-big-screen.html');
		document.addEventListener('DOMContentLoaded', () => {
		
		const body = document.body;
		const elementsToToggle = [body, document.getElementById('big-screen')];

		const currentTheme = sessionStorage.getItem('theme') || 'dark';
		elementsToToggle.forEach(element => {
			element.dataset.mode = currentTheme;
			});
		});
		
        return true;
    }
    
    return false; // Return false if not mobile
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.detectLandscapeOrientation = function() {
    // Check if the device is in landscape orientation
    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    // Check if the screen width is greater than 800 pixels
    const isWideScreen = window.innerWidth > 800;
    // If either condition is true
    if (isLandscape || isWideScreen) {
        //document.getElementById('phone-screen').style.display = "none";
        home.sendGetRequest('home-landscape-screen.html');
		document.addEventListener('DOMContentLoaded', () => {
		
		const body = document.body;
		const elementsToToggle = [body, document.getElementById('landscape-screen')];

		const currentTheme = sessionStorage.getItem('theme') || 'dark';
		elementsToToggle.forEach(element => {
			element.dataset.mode = currentTheme;
			});
		});
        return true;
    }
    // Return false if none of the conditions are met
    return false;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

// Function to handle screen and orientation changes
home.handleScreenChange = function() {
    const new_screen_type = home.detectDevice() ? 'ordi' : 'tel';
    const new_orientation = home.detectLandscapeOrientation() ? 'h' : 'v';

    console.log(`Screen type: ${last_screen_type} -> ${new_screen_type}`);
	console.log(`Orientation: ${last_orientation} -> ${new_orientation}`);

    // Reload if orientation changes from horizontal to vertical
    if (last_orientation === 'h' && new_orientation === 'v') {
        location.reload();
    }
    
    // Reload if screen type changes from 'ordi' to 'tel'
    if (last_screen_type === 'ordi' && new_screen_type === 'tel') {
        location.reload();
    }

    // Update the last known screen type and orientation
    last_screen_type = new_screen_type;
    last_orientation = new_orientation;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.toggleNotif = function(){
	// Update notification message and title
	var locPhotos = sessionStorage.getItem("nbPhotosNotif");
	var locExpo = sessionStorage.getItem("exposureTimeNotif");
	var locTime = sessionStorage.getItem("currentTimeNotif");

	notificationMessage.textContent = `${locPhotos} photos, exposition ${locExpo} sec.`;
	notificationTitle.textContent = `Session se termine à ${locTime}`;

	const elementsToToggle = [document.getElementById('notification')];
	elementsToToggle.forEach(element => {
		sessionStorage.setItem('notifState', 'show');
		element.dataset.mode = 'show';
	});
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.handleButtonClickBack = function(event) {
	event.preventDefault();
	home.closeDialog();
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.changeColor = function(side) {
    document.getElementById(`photo-distance-${side}`).style.backgroundColor = "#C70039"
    setTimeout(() => {
    document.getElementById(`photo-distance-${side}`).style.backgroundColor = "transparent";
    }, 250); // Temps en millisecondes
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.updateTime = function() {
    const now = new Date();
    const hoursHeader = now.getHours().toString().padStart(2, '0');
    const minutesHeader = now.getMinutes().toString().padStart(2, '0');
    const currentTimeHeader = `${hoursHeader}:${minutesHeader}`;
    const timerHeader = document.getElementById('timer-header');
    timerHeader.textContent = currentTimeHeader;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.updateBattery = function(batteryLevel) {
    const batteryHeader = document.getElementById('battery-header');
    batteryHeader.textContent = `${batteryLevel}%`;
    if (batteryLevel === ""){
        home.sendPostRequest("battery");
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.serverEnd = function(status_var){ 

	const theme = sessionStorage.getItem('theme');
	
	const titleElement = document.querySelector('.shutdown-title');
	const messageElement = document.querySelector('.shutdown-message');
	const rotatingObject = document.querySelector('.rotating-object');
	
	if (theme === 'dark'){
			// Update title
            titleElement.textContent = "Bonne nuit";}

    if (theme === 'light'){
            // Update title
            titleElement.textContent = "Bonne journée";}

    document.getElementById('main').style.display = "none";
    document.getElementById('shutdown').style.display = "flex";
    document.getElementById('shutdown').style.justifyContent = 'center';

    setTimeout(() => {
        rotatingObject.style.animation = 'none';
        messageElement.textContent = "L'intervallomètre est éteint";
            rotatingObject.style.animation = 'none';

        titleElement.transition = 'opacity 0.7s ease-in-out';
        messageElement.transition = 'opacity 0.7s ease-in-out';
        //Optionally, redirect or perform other actions after a delay
        // Stop rotating animation
        rotatingObject.style.animation = 'none';
        
        // Smoothly hide rotating object
        rotatingObject.style.transition = 'opacity 0.7s ease-in-out';
        rotatingObject.style.opacity = '0';
    }, 15000); // 15 seconds (15000 milliseconds)
    home.sendPostRequest(status_var);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.updateValues = function() {
	//pageName = requested page
	//currentPage = the page currently displayed to the client
	let currentFileName = document.body.getAttribute('data-page');
	console.log(currentFileName);
	if (currentFileName != 'home'){
		
		const nbPhotosElement = document.getElementById('nb_photos');
		const tmpPoseElement = document.getElementById('tmp_pose');
		const enregistrementElement = document.getElementById('enregistrement');
		
		if (nbPhotosElement) {
			nbPhotosElement.value = parseInt(sessionStorage.getItem("nb_photos_page_change"), 10) || 0;
			// console.log(nbPhotosElement.value);
		}
		
		if (tmpPoseElement) {
			tmpPoseElement.value = parseFloat(sessionStorage.getItem("tmp_pose_page_change"), 10) || 0;
		}
		
		if (enregistrementElement) {
			enregistrementElement.value = parseFloat(sessionStorage.getItem("enregistrement_page_change"), 10) || 0;
		}
	}
	if (currentFileName === 'home'){
		WheelConstruct.createWheel('nb_photos', step_photo);
		WheelConstruct.createWheel('tmp_pose', step_pose);
		WheelConstruct.createWheel('enregistrement', step_enregistrement);

		WheelConstruct.attachWheelEvents('nb_photos');
		WheelConstruct.attachWheelEvents('tmp_pose');
		WheelConstruct.attachWheelEvents('enregistrement');
		
		const nbPhotosElement = document.getElementById('nb_photos');
		const tmpPoseElement = document.getElementById('tmp_pose');
		const enregistrementElement = document.getElementById('enregistrement');
		
		if (nbPhotosElement) {
			WheelConstruct.updateWheel("nb_photos", parseInt(sessionStorage.getItem("nb_photos_page_change"), 10), step_photo);
			//document.getElementById('nb_photos').offsetHeight;
			WheelConstruct.updateWheel("tmp_pose", parseFloat(sessionStorage.getItem("tmp_pose_page_change"), 10), step_pose);
			//document.getElementById('tmp_pose').offsetHeight;
			WheelConstruct.updateWheel("enregistrement", parseFloat(sessionStorage.getItem("enregistrement_page_change"), 10), step_enregistrement);
			//document.getElementById('enregistrement').offsetHeight;
		}
	}
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.changePage = function(direction) {
	//pageName = requested page
	//currentPage = the page currently displayed to the client
    // Store current data in the session storage to fill the next page with the current values set
	const currentPage = document.body.getAttribute('data-page');
	
	const pageMappingLeft = {
        'home': 'home-V1',
        'home-V1': 'home-V3',
		'home-V3': 'home'
    };
	const pageMappingRight = {
        'home': 'home-V3',
        'home-V3': 'home-V1',
		'home-V1': 'home'
    };
	// Find the URL of the other page
	var pageName = pageMappingLeft[currentPage];
	if (direction === "right"){
		pageName = pageMappingRight[currentPage];
	}
	if (direction === "sun"){
		//going from regular intervallometer mode to eclipse mode
		pageName = "temp sun2";
	}
	if (direction === "home"){
		//going from eclipse mode to regular intervallometer mode
		pageName = "home";
	}
	console.log(pageName,currentPage);
	home.saveFormData();
	home.sendPostRequest({"file_request":pageName}).then(() => {
    location.reload();
	});
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.saveFormData = function(){
	let currentFileName = document.body.getAttribute('data-page');
	if (currentFileName === 'home'){
		sessionStorage.nb_photos_page_change = WheelConstruct.getCurrentValue(nb_photos, step_photo);
		sessionStorage.tmp_pose_page_change = WheelConstruct.getCurrentValue(tmp_pose, step_pose);
		sessionStorage.enregistrement_page_change = WheelConstruct.getCurrentValue(enregistrement, step_enregistrement);
	}
	else if (currentFileName === 'home-V1'){
		sessionStorage.nb_photos_page_change = document.getElementById('nb_photos').value;
		sessionStorage.tmp_pose_page_change = parseFloat(document.getElementById('tmp_pose').value).toFixed(1);
		sessionStorage.enregistrement_page_change = parseFloat(document.getElementById('enregistrement').value).toFixed(1);
	}
	}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.ensureDict = function(data) {
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        // If data is already an object, return it as is

        return data;
    } else {
        // If data is not an object, treat it as a string
        const words = String(data).split(/\s+/); // Split data into words using whitespace
        const dict = {};
        
        words.forEach(word => {
            dict[word] = word; // Set each word as both key and value
        });
        
        return dict;
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.string2Dict = function(input){
    if (!input || typeof input !== "string") {
        throw new Error("Input must be a non-empty string.");
    }

    // Split the string into key-value pairs and build the dictionary
    return input.split(";").reduce((acc, pair) => {
        const [key, value] = pair.split("="); // Split each pair into key and value
        if (key && value) {
            acc[key.trim()] = value.trim(); // Add the key-value pair to the object
        }
        return acc;
    }, {});
}