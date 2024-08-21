// Dialog Box
let dialogBoxId = document.getElementById("dialogBox");
let countdownInterval;
let countDownDate;

startUp();

// Initial screen type and orientation detection
let current_screen_type = detectDevice() ? 'ordi' : 'tel';
let current_orientation = detectLandscapeOrientation() ? 'h' : 'v';
let last_screen_type = current_screen_type;
let last_orientation = current_orientation;

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

// Add event listeners for resize and orientationchange
window.addEventListener('resize', handleScreenChange);
window.addEventListener('orientationchange', handleScreenChange);
	
setInterval(function(){
    sendPostRequest("battery");},300000)

setInterval(function(){
    update_timer;},1000)

function showDialog(nbPhotos, exposureTime, timeBetweenPhotos) {
	const notificationMessage = document.getElementById("notificationMessage");
	const notificationTitle = document.getElementById("notificationTitle");
	
    dialogBoxId.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            e.preventDefault();
        }
    });
    document.getElementById("Compteur").innerHTML = "00:00:00"; // Initialize countdown display
    dialogBoxId.showModal();
    
    // Calculate the total time

    const totalTime = nbPhotos * exposureTime + timeBetweenPhotos * (nbPhotos - 1);
    
     // Set countdown date to current time plus total time
     
    const now = new Date().getTime();
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

function closeDialog() {
    dialogBoxId.close(); 
    // Clear the countdown interval when the dialog box is closed
    clearInterval(countdownInterval);
}

// Function to format time in hh:mm:ss
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

// Add event listener to the form submit event
document.getElementById("interval-Form").addEventListener("submit", handleSubmit);
document.getElementById("openDialogBox").addEventListener("click", handleButtonClick);
document.getElementById("test-shot").addEventListener("click", handleButtonClickTest);

let formData; // Define formData in the global scope

function handleSubmit(event) {
	// Prevent the default form submission behavior
	event.preventDefault();

	// Get the values of the form fields
	const nbPhotos = parseInt(document.getElementById("nb_photos").value);
	const exposureTime = parseFloat(document.getElementById("tmp_pose").value);
	const timeBetweenPhotos = parseFloat(document.getElementById("enregistrement").value);

	// Calculate the total time
	const totalTime = nbPhotos * exposureTime + timeBetweenPhotos * (nbPhotos - 1);
	console.log("Total time for the interval:", totalTime, "seconds");

	// Display formatted time in confirmation
	document.getElementById("estimation_tmp").innerHTML = formatTime(totalTime);
	document.getElementById("confirmation").style.display = "block";

	// Prepare form data for the POST request
	formData = new FormData(event.target);
}

function handleButtonClick() {
    if (formData) {
        const data = {};
        formData.forEach((value, key) => (data[key] = value));
		var now = new Date().getTime();
		data["date"] = now;
        sendPostRequest(data);
		
		const nbPhotos_button = parseInt(document.getElementById("nb_photos").value);
		const exposureTime_button = parseFloat(document.getElementById("tmp_pose").value);
		const timeBetweenPhotos_button = parseFloat(document.getElementById("enregistrement").value);
		
        showDialog(nbPhotos_button, exposureTime_button, timeBetweenPhotos_button); // Show the dialog box with the countdown
    } else {
        console.error('Form data is not available. Please submit the form first.');
    }
}

function handleButtonClickTest() {
    if (formData) {
        const data = {};
        formData.forEach((value, key) => (data[key] = value));
		data['nb_photos']=1;
		var now = new Date().getTime();
		data["date"] = now;
        sendPostRequest(data);
				
		const exposureTime_test = parseFloat(document.getElementById("tmp_pose").value);
		const timeBetweenPhotos_test = parseFloat(document.getElementById("enregistrement").value);
		
		showDialog(1, exposureTime_test, timeBetweenPhotos_test)
        } 
	else {
        console.error('Form data is not available. Please submit the form first.');
    }
}

function remoteTrigger(){
const triggerMessage = {"nb_photos":"1", "tmp_pose":"0.1", "tmp_enregistrement":"0"};
var now = new Date().getTime();
triggerMessage["date"] = now;
console.log(triggerMessage);
sendPostRequest(triggerMessage)
}

function sendPostRequest(data) {
    const xhr = new XMLHttpRequest();
    var ip = location.host;
    var http_head = 'http://'
    xhr.open('POST', http_head.concat(ip), true);
    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                console.log('Success:', xhr.responseText);
                if (data === 'battery'){
                    if (isNaN(xhr.responseText) === false){
                        update_battery(xhr.responseText);
                        } else {
                        update_battery("");
                        }
                }
            } else {
                console.error('Error:', xhr.statusText);
            }
        }
    };

    xhr.send(JSON.stringify(data));
}

// Prevent the dialog box from closing when the confirm button is clicked
document.getElementById("confirmation").addEventListener("click", function(event) {
    event.preventDefault();

});

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
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
       
	   // Replace the contents of <head>
       // document.head.innerHTML = doc.head.innerHTML;
		
        // Replace the contents of <body>
        document.body.innerHTML = doc.body.innerHTML;
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
}

function detectDevice() {
    // Check for touch capabilities to infer mobile devices
    let isMobile = window.matchMedia("(pointer: coarse)").matches;
    
    if (isMobile === false) {
        //document.getElementById('phone-screen').style.display = "none";
        sendGetRequest('home-big-screen.html');
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
        return true;
    }
    // Return false if none of the conditions are met
    return false;
}

function toggleNotif(){
	// Update notification message and title
	var locPhotos = sessionStorage.getItem("nbPhotosNotif");
	var locExpo = sessionStorage.getItem("exposureTimeNotif");
	var locTime = sessionStorage.getItem("currentTimeNotif");

	notificationMessage.textContent = `${locPhotos} photos prises, exposition ${locExpo}.`;
	notificationTitle.textContent = `Session se termine à ${locTime}`;

	const elementsToToggle = [document.getElementById('notification')];
	elementsToToggle.forEach(element => {
		sessionStorage.setItem('notifState', 'show');
		element.dataset.mode = 'show';
	});
}

function handleButtonClickBack(event) {
	event.preventDefault();
	closeDialog();
}

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

function shutDown() { 
    document.getElementById('main').style.display = "none";
    document.getElementById('shutdown').style.display = "flex";
	document.getElementById('shutdown').style.justifyContent = 'center';
    sendPostRequest("shutdown");
}

function serverEnd(status_var) { 

	const theme = sessionStorage.getItem('theme');
	
	const titleElement = document.querySelector('.shutdown-title');
	const messageElement = document.querySelector('.shutdown-message');
	const rotatingObject = document.querySelector('.rotating-object');
	
	if (theme === 'dark'){
			// Update title
            titleElement.textContent = "Hop au dodo";}

    if (theme === 'light'){
            // Update title
            titleElement.textContent = "Hop ça dégage";}

    document.getElementById('main').style.display = "none";
    document.getElementById('shutdown').style.display = "flex";
    document.getElementById('shutdown').style.justifyContent = 'center';

    setTimeout(() => {
        rotatingObject.style.animation = 'none';
        if (theme === 'dark'){
                // Update title
                titleElement.textContent = "Bonne nuit";}
                //messageElement.textContent = "L'intervallomètre est éteint";}
        if (theme === 'light'){
            // Update title
        titleElement.textContent = "Bonne journée";}
        //messageElement.textContent = "L'intervallomètre est éteint";}
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

function changeColor(side) {
    document.getElementById(`photo-distance-${side}`).style.backgroundColor = "#C70039"
    setTimeout(() => {
    document.getElementById(`photo-distance-${side}`).style.backgroundColor = "transparent";
    }, 350); // Temps en millisecondes
}
function update_time() {
    const now = new Date();
    const hoursHeader = now.getHours().toString().padStart(2, '0');
    const minutesHeader = now.getMinutes().toString().padStart(2, '0');
    const secondsHeader = now.getSeconds().toString().padStart(2, '0');
    const currentTimeHeader = `${hoursHeader}:${minutesHeader}`;
    const timerHeader = document.getElementById('timer-header');
    timerHeader.textContent = currentTimeHeader;
}

function update_battery(batteryLevel) {
    const batteryHeader = document.getElementById('battery-header');
    batteryHeader.textContent = `${batteryLevel}%`;
    if (batteryLevel === ""){
        sendPostRequest("battery");
    }
}
function startUp() {
   update_time();
   sendPostRequest("battery");
 }
 

function changePage(pageName,currentPage) {
	//pageName = requested page
	//currentPage = the page currently displayed to the client
    // Store current data in the session storage to fill the next page with the current values set

	sessionStorage.nb_photos_page_change = document.getElementById('nb_photos').value;
	sessionStorage.tmp_pose_page_change = parseFloat(document.getElementById('tmp_pose').value).toFixed(1);
	sessionStorage.enregistrement_page_change = parseFloat(document.getElementById('enregistrement').value).toFixed(1);

	sendPostRequest(pageName);
	setTimeout(() => {
    location.reload();
	}, 250);

}

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