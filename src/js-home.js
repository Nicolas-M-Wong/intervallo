// Dialog Box
let dialogBoxId = document.getElementById("dialogBox");
let countdownInterval;
let countDownDate;
let formData; // Define formData in the global scope
var http_status_post = 0;
var token = 0;

const step_s = 1
const step_ms = 0.1
const length_photo = 500;
const length_pose = 240;
const length_enregistrement = 600;

const step_photo = [
	{ start: 0, end: length_photo, step: step_s, fixed: false } //Between 0 and 500, 1 picture step
];

const step_pose = [
	{ start: step_ms, end: 1-step_ms, step: step_ms, fixed: true }, //Between 0 and 1, 0.1s step
	{ start: 1, end: 5, step: 5 * step_ms, fixed: true }, //Between 1 and 5, 0.5s step
	{ start: 5, end: 60-step_s, step: step_s, fixed: false }, //Between 5 and 60, 1s step
	{ start: 60, end: length_pose, step: 10*step_s, fixed: false } //Between 60 to the end, 10s step
];

const step_enregistrement = [
	{ start: step_ms, end: 1-step_ms, step: step_ms, fixed: true }, //Between 0 and 1, 0.1s step
	{ start: 1, end: 5, step: 5 * step_ms, fixed: true }, //Between 1 and 5, 0.5s step
	{ start: 5, end: 60-step_s, step: step_s, fixed: false }, //Between 5 and 60, 1s step
	{ start: 60, end: length_enregistrement, step: 10*step_s, fixed: false } //Between 60 to the end, 10s step
];

// Initial screen type and orientation detection
let current_screen_type = detectDevice() ? 'ordi' : 'tel';
let current_orientation = detectLandscapeOrientation() ? 'h' : 'v';
let last_screen_type = current_screen_type;
let last_orientation = current_orientation;

// Add event listeners for resize and orientationchange
window.addEventListener('resize', handleScreenChange);
window.addEventListener('orientationchange', handleScreenChange);
	
setInterval(function(){
    sendPostRequest("battery");},300000)

requestAnimationFrame(updateTime);

window.addEventListener('load', function() {
  sendGetRequest("token").then(() => {
    updateTime();
    updateValues();
    sendPostRequest("battery");
  }).catch(error => {
    console.error('Error fetching token:', error);
  });
});

window.addEventListener('beforeunload', function(event) {
            saveFormData();
        });

// ---------------------------------------------------------------------------------------------------------------------------------------------

function showDialog(nbPhotos, exposureTime, timeBetweenPhotos, now) {
	const notificationMessage = document.getElementById("notificationMessage");
	const notificationTitle = document.getElementById("notificationTitle");
	
    dialogBoxId.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            e.preventDefault();
        }
    });
	document.getElementById("dialogBoxTitle").innerHTML = "Temps restant :";
    document.getElementById("Compteur").innerHTML = "00:00:00"; // Initialize countdown display
    dialogBoxId.showModal();
    // Calculate the total time

    const totalTime = nbPhotos * exposureTime + timeBetweenPhotos * (nbPhotos - 1);
    
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

	toggleNotif();
    // Start the countdown
    countdownInterval = setInterval(function() {
        var now = new Date().getTime();
        var distance = (countDownDate - now);
        document.getElementById("Compteur").innerHTML = formatTime(distance / 1000);
        if (distance < 0) {
            clearInterval(countdownInterval);
            document.getElementById("Compteur").innerHTML = "00:00:00";
			navigator.vibrate([1000, 250, 1000, 500, 2500]);
        }
    }, 1000);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function closeDialog() {
    dialogBoxId.close(); 
    // Clear the countdown interval when the dialog box is closed
    clearInterval(countdownInterval);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

// Function to format time in hh:mm:ss
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function submitForm(event){
	event.preventDefault();
	let currentFileName = document.body.getAttribute('data-page');
	
	let nb_photos = 0;
	let tmp_pose = 0;
	let tmp_enregistrement = 0;
	
	const doc_photos = document.getElementById('nb_photos');
	const doc_pose = document.getElementById('tmp_pose');
	const doc_save = document.getElementById('enregistrement');
	
	if (currentFileName === "home"){
		console.log("success home");
		nb_photos = WheelConstruct.getCurrentValue(doc_photos,step_photo);
		tmp_pose = WheelConstruct.getCurrentValue(doc_pose,step_pose);
		tmp_enregistrement = WheelConstruct.getCurrentValue(doc_save,step_enregistrement);
	}
	
	if (currentFileName === "home-V1"){
		console.log("success home-V1");
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
	document.getElementById("estimation_tmp").innerHTML = formatTime(Math.round(totalTime));
	document.getElementById("confirmation").style.display = "block";
	// Prepare form data for the POST request
	formData = new FormData(document.getElementById('interval-Form'));
	}
}

	
	
// ---------------------------------------------------------------------------------------------------------------------------------------------

function handleButtonClick(test_status) {
    if (formData) {
		let currentFileName = document.body.getAttribute('data-page');
        const data = {};
		var now = new Date().getTime();
		const doc_photos = document.getElementById('nb_photos');
		const doc_pose = document.getElementById('tmp_pose');
		const doc_save = document.getElementById('enregistrement');
		var nb_photos = 1
		
		if (currentFileName === "home"){
			data["tmp_pose"] = WheelConstruct.getCurrentValue(doc_pose,step_pose);
			data["tmp_enregistrement"] = WheelConstruct.getCurrentValue(doc_save,step_enregistrement);
			data["date"] = now;
			if (test_status === "No"){
				nb_photos = WheelConstruct.getCurrentValue(doc_photos,step_photo);
            }
		}
		
		if (currentFileName === "home-V1"){
			data["tmp_pose"] = parseFloat(doc_pose.value);
			data["tmp_enregistrement"] = parseFloat(doc_save.value);
			data["date"] = now;
			if (test_status === "No"){
				nb_photos = parseInt(doc_photos.value);
            }
		}
        
		data["nb_photos"] = nb_photos;
			
        sendPostRequest(data).then(() => {
		if (http_status_post === 200){
			const nowDate = new Date().getTime()
			showDialog(data["nb_photos"], data["tmp_pose"], data["tmp_enregistrement"],nowDate); // Show the dialog box with the countdown
		}
		});
    } else {
        console.error('Form data is not available. Please submit the form first.');
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function remoteTrigger(){
	const triggerMessage = {"nb_photos":"1", "tmp_pose":"0.1", "tmp_enregistrement":"0"};
	var now = new Date().getTime();
	triggerMessage["date"] = now;
	console.log(triggerMessage);
	sendPostRequest(triggerMessage)
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function sendPostRequest(data) {
    return new Promise((resolve, reject) => {
        data = ensureDict(data);
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
                            updateBattery(xhr.responseText);
                        } else {
                            updateBattery("");
                        }
                    }
                    resolve(xhr.responseText); // Resolve the promise with the response text
                } else if (xhr.status === 400) {
                    http_status_post = 400;
                    console.log('Fail:', xhr.responseText);
					if (xhr.responseText === "Unavailable"){
						document.getElementById("dialogBoxTitle").innerHTML = " ";
						document.getElementById("Compteur").innerHTML = "Prise de vue en cours</br>APN Indisponible";
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
}

	
// ---------------------------------------------------------------------------------------------------------------------------------------------

function sendGetRequest(fileName) {
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

// Prevent the dialog box from closing when the confirm button is clicked
document.getElementById("confirmation").addEventListener("click", function(event) {
    event.preventDefault();

});

// ---------------------------------------------------------------------------------------------------------------------------------------------

function detectDevice() {
    // Check for touch capabilities to infer mobile devices
    let isMobile = window.matchMedia("(pointer: coarse)").matches;
    
    if (isMobile === false) {
        //document.getElementById('phone-screen').style.display = "none";
        sendGetRequest('home-big-screen.html');
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

function detectLandscapeOrientation() {
    // Check if the device is in landscape orientation
    const isLandscape = window.matchMedia("(orientation: landscape)").matches;
    // Check if the screen width is greater than 800 pixels
    const isWideScreen = window.innerWidth > 800;
    // If either condition is true
    if (isLandscape || isWideScreen) {
        //document.getElementById('phone-screen').style.display = "none";
        sendGetRequest('home-landscape-screen.html');
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
function handleScreenChange() {
    const new_screen_type = detectDevice() ? 'ordi' : 'tel';
    const new_orientation = detectLandscapeOrientation() ? 'h' : 'v';

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

function toggleNotif(){
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

function handleButtonClickBack(event) {
	event.preventDefault();
	closeDialog();
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-mode');
    const body = document.body;
    const elementsToToggle = [body, document.getElementById('dialogBox'),
	document.getElementById('main'),document.getElementById('navbar-id'),
	document.getElementById('nb_photos'),document.getElementById('tmp_pose'),
	document.getElementById('enregistrement'),document.getElementById('shutdown'),
	document.getElementById('big-screen'),document.getElementById('landscape-screen'),
	document.getElementById('shutdown-wrapper'),document.getElementById('half-circle')];

    const currentTheme = sessionStorage.getItem('theme') || 'dark';
    elementsToToggle.forEach(element => {
        element.dataset.mode = currentTheme;
    });

    toggleBtn.addEventListener('click', () => {
        const newMode = body.dataset.mode === 'dark' ? 'light' : 'dark';
        elementsToToggle.forEach(element => {
            element.dataset.mode = newMode;
        });
        sessionStorage.setItem('theme', newMode);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('toggle-notif');
	const body = document.getElementById('notification');
	const elementsToToggle = [document.getElementById('notification')];
	
	const notifState = sessionStorage.getItem('notifState') || 'hide';

	if (notifState === 'show'){
		var locPhotos = sessionStorage.getItem("nbPhotosNotif");
		var locExpo = sessionStorage.getItem("exposureTimeNotif");
		var locTime = sessionStorage.getItem("currentTimeNotif");

		notificationMessage.textContent = `${locPhotos} photos, exposition ${locExpo} sec.`;
		notificationTitle.textContent = `La série se termine à ${locTime}`;
	}

	elementsToToggle.forEach(element => {
		element.dataset.mode = notifState;
	});
	
    closeBtn.addEventListener('click', () => {
        const newMode = body.dataset.mode === 'show' ? 'hide' : 'show';
        elementsToToggle.forEach(element => {
            element.dataset.mode = newMode;
        });
        console.log(newMode);
		sessionStorage.setItem('notifState', newMode);
    });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------

function changeColor(side) {
    document.getElementById(`photo-distance-${side}`).style.backgroundColor = "#C70039"
    setTimeout(() => {
    document.getElementById(`photo-distance-${side}`).style.backgroundColor = "transparent";
    }, 250); // Temps en millisecondes
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function updateTime() {
    const now = new Date();
    const hoursHeader = now.getHours().toString().padStart(2, '0');
    const minutesHeader = now.getMinutes().toString().padStart(2, '0');
    const currentTimeHeader = `${hoursHeader}:${minutesHeader}`;
    const timerHeader = document.getElementById('timer-header');
    timerHeader.textContent = currentTimeHeader;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function updateBattery(batteryLevel) {
    const batteryHeader = document.getElementById('battery-header');
    batteryHeader.textContent = `${batteryLevel}%`;
    if (batteryLevel === ""){
        sendPostRequest("battery");
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function countDecimalPlaces(num) {
	let numStr = num.toString();
	let decimalIndex = numStr.indexOf('.');
	if (decimalIndex === -1) {
		return 0;
	}
	return numStr.length - decimalIndex - 1;
	//Compte les chiffres après la virgule du pas décimal
	//Compte les caractères pour éviter une boucle while
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function serverEnd(status_var) { 

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
    sendPostRequest(status_var);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function updateValues() {
	//pageName = requested page
	//currentPage = the page currently displayed to the client
	let currentFileName = document.body.getAttribute('data-page');
	console.log(currentFileName);
	if (currentFileName === 'home-V1'){
		
		const nbPhotosElement = document.getElementById('nb_photos');
		const tmpPoseElement = document.getElementById('tmp_pose');
		const enregistrementElement = document.getElementById('enregistrement');
		
		if (nbPhotosElement) {
			nbPhotosElement.value = parseInt(sessionStorage.getItem("nb_photos_page_change"), 10) || 0;
			console.log(nbPhotosElement.value);
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

function changePage(pageName) {
	//pageName = requested page
	//currentPage = the page currently displayed to the client
    // Store current data in the session storage to fill the next page with the current values set
	saveFormData();
	sendPostRequest({"file_request":pageName}).then(() => {
    location.reload();
	});
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function saveFormData(){
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

function ensureDict(data) {
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
