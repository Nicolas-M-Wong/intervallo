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

home.submitForm = function(event){
	event.preventDefault();
	let currentFileName = document.body.getAttribute('data-page');
	
	let nb_photos = 0;
	let tmp_pose = 0;
	let tmp_pose_start = 0;
	let tmp_pose_end = 0;
	let tmp_enregistrement = 0;
	
	const doc_photos = document.getElementById('nb_photos');
	const doc_save = document.getElementById('enregistrement');
	
	if (currentFileName != "home-V3"){
		const doc_pose = document.getElementById('tmp_pose');
		if (currentFileName === "home"){
			// console.log("success home");
			nb_photos = WheelConstruct.getCurrentValue(doc_photos,step_photo);
			tmp_pose = WheelConstruct.getCurrentValue(doc_pose,step_pose);
			tmp_enregistrement = WheelConstruct.getCurrentValue(doc_save,step_enregistrement);
		}
		
		if (currentFileName === "home-V1"){
			// console.log("success home-V1");
			nb_photos = parseInt(doc_photos.value);
			tmp_pose = parseFloat(doc_pose.value);
			tmp_enregistrement = parseFloat(doc_save.value);
		}
		
		var totalTime = nb_photos * tmp_pose + tmp_enregistrement * (nb_photos - 1);
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
		const doc_pose_start = document.getElementById('tmp_pose_start');
		const doc_pose_end = document.getElementById('tmp_pose_end');
		console.log("success home-V3");
		nb_photos = parseInt(doc_photos.value);
		tmp_pose_start = parseFloat(doc_pose_start.value);
		tmp_pose_end = parseFloat(doc_pose_end.value);
		tmp_enregistrement = parseFloat(doc_save.value);		
		
		var totalTime = tmp_enregistrement * (nb_photos - 1)+tmp_pose_end;
		var intervalTimeCondition = Math.max(tmp_pose_start,tmp_pose_end) + 1.5;
		console.log("Total time for the interval:", totalTime, "seconds");
		if (Number.isNaN(totalTime) || totalTime <= 0){
			totalTime=0;
			document.getElementById("confirmation").style.display = "none";
		}
		else if (intervalTimeCondition>tmp_enregistrement){
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

home.handleButtonClick = function(test_status) {
    if (formData) {
		let currentFileName = document.body.getAttribute('data-page');
        const data = {};
		var now = new Date().getTime();
		const doc_photos = document.getElementById('nb_photos');
		const doc_save = document.getElementById('enregistrement');
		var nb_photos = 1
		
		if (currentFileName === "home"){
			const doc_pose = document.getElementById('tmp_pose');
			data["tmp_pose"] = WheelConstruct.getCurrentValue(doc_pose,step_pose);
			data["tmp_enregistrement"] = WheelConstruct.getCurrentValue(doc_save,step_enregistrement);
			data["date"] = now;
			if (test_status === "No"){
				nb_photos = WheelConstruct.getCurrentValue(doc_photos,step_photo);
            }
		}
		
		if (currentFileName === "home-V1"){
			const doc_pose = document.getElementById('tmp_pose');
			data["tmp_pose"] = parseFloat(doc_pose.value);
			data["tmp_enregistrement"] = parseFloat(doc_save.value);
			data["date"] = now;
			if (test_status === "No"){
				nb_photos = parseInt(doc_photos.value);
            }
		}
        
		if (currentFileName === "home-V3"){
			const doc_pose_start = document.getElementById('tmp_pose_start');
			const doc_pose_end = document.getElementById('tmp_pose_end');
			data["variable_start"] = parseFloat(doc_pose_start.value);
			data["variable_end"] = parseFloat(doc_pose_end.value);
			data["tmp_enregistrement"] = parseFloat(doc_save.value);
			data["date"] = now;
			data["variable_expo"] = true;
			if (test_status === "No"){
				nb_photos = parseInt(doc_photos.value);
            }
		}
		data["nb_photos"] = nb_photos;
			
        home.sendPostRequest(data).then(() => {
		if (http_status_post === 200){
			const nowDate = new Date().getTime()
			if (currentFileName === "home-V3"){
				home.showDialog(data["nb_photos"], data["variable_end"], data["tmp_enregistrement"],nowDate); // Show the dialog box with the countdown
				//
			}
			else{
				home.showDialog(data["nb_photos"], data["tmp_pose"], data["tmp_enregistrement"],nowDate); // Show the dialog box with the countdown
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
	var now = new Date().getTime();
	triggerMessage["date"] = now;
	console.log(triggerMessage);
	home.sendPostRequest(triggerMessage)
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

home.sendPostRequest =  function(data) {
	console.log("Sending data :",data);
    return new Promise((resolve, reject) => {
        data = home.ensureDict(data);
        data["token"] = sessionStorage.getItem("sessionToken");
        const xhr = new XMLHttpRequest();
        const ip = location.host;
        const http_head = 'http://';
        xhr.open('POST', http_head.concat(ip), true);
        xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        xhr.onreadystatechange = function() {
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
					// construction d'un graph à partir des info retourné par le serveur
/* 					if (data.variable) {
						console.log(xhr.responseText);
						const dataY = GraphConstruct.ParseData(xhr.responseText);
						GraphConstruct.drawGraph(dataY);
					} */
                    resolve(xhr.responseText); // Resolve the promise with the response text
                } else if (xhr.status === 400) {
                    http_status_post = 400;
                    console.log('Fail:', xhr.responseText);
					
					if (xhr.responseText === "Unavailable"){
						document.getElementById("dialogBoxTitle").innerHTML = " ";
						document.getElementById("Compteur").innerHTML = "<span>Prise de vue en cours</span></br><span style='font-weight: 300;'>APN Indisponible</span>";
						dialogBoxId.showModal();
					}
					if (xhr.responseText === "Interval too short"){
						document.getElementById("dialogBoxTitle").innerHTML = " ";
						const max_pose = Math.max(data["tmp_pose_start"],data["tmp_pose_end"])+1.5;
						document.getElementById("Compteur").innerHTML = `<span>Intervalle trop court</span></br><span style='font-weight: 300;'>Intervalle minimum de ${max_pose}s</span>`;
						dialogBoxId.showModal();
					}
                    reject(new Error('Bad Request')); // Reject the promise with an error
                } else {
                    http_status_post = 0;
                    console.error('Error:', xhr.statusText);
                    reject(new Error(xhr.statusText)); // Reject the promise with the error status text
                }
            }
        };
        
        xhr.send(JSON.stringify(data));
    });
	return xhr.responseText
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
