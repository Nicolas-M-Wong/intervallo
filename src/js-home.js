// Dialog Box
let dialogBoxId = document.getElementById("dialogBox");
let countdownInterval;
let countDownDate;

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

createWheel('nb_photos', step_photo);
createWheel('tmp_pose', step_pose);
createWheel('enregistrement', step_enregistrement);

attachWheelEvents('nb_photos');
attachWheelEvents('tmp_pose');
attachWheelEvents('enregistrement');
 
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
    update_time;},1000)

if (sessionStorage.nb_photos_page_change){
	updateWheel('nb_photos',parseInt(sessionStorage.nb_photos_page_change,10),step_photo);
}

if (sessionStorage.tmp_pose_page_change){
	updateWheel('tmp_pose',parseFloat(sessionStorage.tmp_pose_page_change,10).toFixed(1),step_pose);
}

if (sessionStorage.enregistrement_page_change){
	updateWheel('enregistrement',parseFloat(sessionStorage.enregistrement_page_change,10).toFixed(1),step_enregistrement);
}


// ---------------------------------------------------------------------------------------------------------------------------------------------

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

let formData; // Define formData in the global scope

document.getElementById('wheelForm').addEventListener('submit', function(event) {
	event.preventDefault();

	const nb_photos = getCurrentValue(document.getElementById('nb_photos'),step_photo);
	const tmp_pose = getCurrentValue(document.getElementById('tmp_pose'),step_pose);
	const tmp_enregistrement = getCurrentValue(document.getElementById('enregistrement'),step_enregistrement);
	
	// Get the values of the form fields
	// Calculate the total time
	const totalTime = nb_photos * tmp_pose + tmp_enregistrement * (nb_photos - 1);
	console.log("Total time for the interval:", totalTime, "seconds");

	// Display formatted time in confirmation
	document.getElementById("estimation_tmp").innerHTML = formatTime(Math.round(totalTime));
	document.getElementById("confirmation").style.display = "block";

	// Prepare form data for the POST request
	formData = new FormData(event.target);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------

function handleButtonClick(test_status) {
    if (formData) {
        const data = {};
        const nb_photos = getCurrentValue(document.getElementById('nb_photos'),step_photo);
		data["nb_photos"] = nb_photos;
		if (test_status === "Yes"){
            data["nb_photos"] = 1;
            }
		let tmp_pose = getCurrentValue(document.getElementById('tmp_pose'),step_pose);
		let tmp_enregistrement = getCurrentValue(document.getElementById('enregistrement'),step_enregistrement);

		var now = new Date().getTime();
		
		data["tmp_pose"] = tmp_pose;
		data["tmp_enregistrement"] = tmp_enregistrement
		data["date"] = now;
        sendPostRequest(data);
        showDialog(data["nb_photos"], tmp_pose, tmp_enregistrement); // Show the dialog box with the countdown
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
    }, 350); // Temps en millisecondes
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function update_time() {
    const now = new Date();
    const hoursHeader = now.getHours().toString().padStart(2, '0');
    const minutesHeader = now.getMinutes().toString().padStart(2, '0');
    const secondsHeader = now.getSeconds().toString().padStart(2, '0');
    const currentTimeHeader = `${hoursHeader}:${minutesHeader}`;
    const timerHeader = document.getElementById('timer-header');
    timerHeader.textContent = currentTimeHeader;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function update_battery(batteryLevel) {
    const batteryHeader = document.getElementById('battery-header');
    batteryHeader.textContent = `${batteryLevel}%`;
    if (batteryLevel === ""){
        sendPostRequest("battery");
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function startUp() {
   update_time();
   sendPostRequest("battery");
 }
 
// ---------------------------------------------------------------------------------------------------------------------------------------------
		
function createWheel(elementId, step) {
    const wheel = document.getElementById(elementId);
    const paddingDiv = document.createElement('div');
    paddingDiv.style.height = '50px';
    wheel.appendChild(paddingDiv);

    // Flag to determine if this is the first element
    let isFirst = true;

    step.forEach(({ start, end, step, fixed }) => {
        for (let i = start; i <= end; i += step) {
            const numberDiv = document.createElement('div');
            numberDiv.className = 'number';
            numberDiv.innerText = fixed ? i.toFixed(countDecimalPlaces(step)) : i;

            // Apply attributes to the first numberDiv
            if (isFirst) {
                numberDiv.id = 'number_selected_' + elementId;
                numberDiv.classList.add('selected');
                isFirst = false;
            }

            wheel.appendChild(numberDiv);
        }
    });

    const paddingDivEnd = document.createElement('div');
    paddingDivEnd.style.height = '50px';
    wheel.appendChild(paddingDivEnd);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------
		
function getCurrentValue(wheel, step_array) {
	const numbers = wheel.querySelectorAll('.number');
	const middleIndex = Math.round((wheel.scrollTop + wheel.clientHeight/3 - 50)/50);
	const currentValue = parseFloat(numbers[middleIndex].innerText, 10);

	// Function to get the current step based on value and step_pose
	function getStep(value, step_array) {
		for (let i = 0; i < step_array.length; i++) {
			if (value >= step_array[i].start && value < step_array[i].end) {
				return step_array[i].step;
			}
		}
		return step_array[step_array.length - 1].step; // Default to the last step if not found
	}

	const step = getStep(currentValue, step_array);
	return currentValue.toFixed(countDecimalPlaces(step));
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function adjustScroll(wheel,wheelId) {
	// Wheel = document.getElementById
	// WheelId = Id of the element
	const numbers = wheel.querySelectorAll('.number');
	const middleIndex = Math.round((wheel.scrollTop + wheel.clientHeight/3 - 50)/50);
	const targetScrollTop = middleIndex * 50 - wheel.clientHeight/3 + 50;

	wheel.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
	updateSelectedNumber(wheel,wheelId);
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function attachWheelEvents(wheelId) {
	// Wheel = document.getElementById
	// WheelId = Id of the element
	const wheel = document.getElementById(wheelId);
	let scrollTimeout;
	wheel.addEventListener('scroll', () => {
		clearTimeout(scrollTimeout);
		scrollTimeout = setTimeout(() => {
			adjustScroll(wheel,wheelId);
		}, 100);
	});
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function updateSelectedNumber(wheel,wheelId) {
	// Wheel = document.getElementById
	// WheelId = Id of the element
	const numbers = wheel.querySelectorAll('.number');
	const middleIndex = Math.round((wheel.scrollTop + wheel.clientHeight/12 - 25)/50);
	numbers.forEach(num => {
		num.classList.remove('selected'); 
		delete num.dataset.mode;
		num.removeAttribute('id');
		});
		
	if (middleIndex >= 0 && middleIndex < numbers.length) {
		numbers[middleIndex].classList.add('selected');
		let selectedElements = document.getElementsByClassName('number selected');
		let themeMode = sessionStorage.getItem('theme') || 'dark';
		
		for (let i = 0; i < selectedElements.length; i++) {
			selectedElements[i].id = 'number_selected_'+wheelId;
			selectedElements[i].dataset.mode = themeMode;
		}
	}
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function updateWheel(wheelId, startValue, steps) {
    const wheel = document.getElementById(wheelId);

    // Ensure the element with the provided id exists
    if (!wheel) {
        console.error(`Element with id "${wheelId}" not found.`);
        return;
    }

    // Ensure the steps array is not empty
    if (!Array.isArray(steps) || steps.length === 0) {
        console.error('Steps array is either not an array or is empty.');
        return;
    }

    // Flatten the step ranges into a single array of possible values
    let possibleValues = [];
    for (let i = 0; i < steps.length; i++) {
        let step = steps[i];
        if (step.fixed) {
            if (step.start === step.end) {
                possibleValues.push(step.start);
            } else {
                for (let j = step.start; j <= step.end; j += step.step) {
                    possibleValues.push(j);
                }
            }
        } else {
            for (let j = step.start; j <= step.end; j += step.step) {
                possibleValues.push(j);
            }
        }
    }

    // Find the closest value in the possibleValues array to the startValue
    let closestValue = possibleValues[0];
    let smallestDifference = Math.abs(startValue - closestValue);

    for (let i = 1; i < possibleValues.length; i++) {
        const currentDifference = Math.abs(startValue - possibleValues[i]);
        if (currentDifference < smallestDifference) {
            closestValue = possibleValues[i];
            smallestDifference = currentDifference;
        }
    }

    // Find the index of the closest value
    const startIndex = possibleValues.indexOf(closestValue);
    if (startIndex === -1) {
        console.error(`Closest value "${closestValue}" not found in possible values.`);
        return;
    }

    // Calculate the initial scroll position based on the index of the closest value
    const initialScrollPosition = startIndex * 50; // Assuming each step occupies 50px height
    wheel.scrollTo({ top: initialScrollPosition, behavior: 'smooth' });

    // Update the selected number
    updateSelectedNumber(wheel, wheelId);
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

function updating_values(pageName,currentPage) {
	//pageName = requested page
	//currentPage = the page currently displayed to the client
	
	if (currentPage === 'home'){
		
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
	if (currentPage === 'home-V1'){
		createWheel('nb_photos', step_photo);
		createWheel('tmp_pose', step_pose);
		createWheel('enregistrement', step_enregistrement);

		attachWheelEvents('nb_photos');
		attachWheelEvents('tmp_pose');
		attachWheelEvents('enregistrement');
		
		const nbPhotosElement = document.getElementById('nb_photos');
		const tmpPoseElement = document.getElementById('tmp_pose');
		const enregistrementElement = document.getElementById('enregistrement');
		
		if (nbPhotosElement) {
			updateWheel("nb_photos", parseInt(sessionStorage.getItem("nb_photos_page_change"), 10), step_photo);
			document.getElementById('nb_photos').offsetHeight;
			updateWheel("tmp_pose", parseFloat(sessionStorage.getItem("tmp_pose_page_change"), 10), step_pose);
			document.getElementById('tmp_pose').offsetHeight;
			updateWheel("enregistrement", parseFloat(sessionStorage.getItem("enregistrement_page_change"), 10), step_enregistrement);
			document.getElementById('enregistrement').offsetHeight;
		}
	}
}

// ---------------------------------------------------------------------------------------------------------------------------------------------

function changePage(pageName,currentPage) {
	//pageName = requested page
	//currentPage = the page currently displayed to the client
    // Store current data in the session storage to fill the next page with the current values set
	saveFormData(currentPage);
	sendPostRequest(pageName);
	setTimeout(() => {
    location.reload();
	}, 250);

}

function saveFormData(currentPage){
	if (currentPage === 'home'){
		sessionStorage.nb_photos_page_change = getCurrentValue(nb_photos, step_photo);
		sessionStorage.tmp_pose_page_change = getCurrentValue(tmp_pose, step_pose);
		sessionStorage.enregistrement_page_change = getCurrentValue(enregistrement, step_enregistrement);
	}
	else if (currentPage === 'home-V1'){
		sessionStorage.nb_photos_page_change = document.getElementById('nb_photos').value;
		sessionStorage.tmp_pose_page_change = parseFloat(document.getElementById('tmp_pose').value).toFixed(1);
		sessionStorage.enregistrement_page_change = parseFloat(document.getElementById('enregistrement').value).toFixed(1);
	}
	}

window.addEventListener('beforeunload', function(event) {
            saveFormData();
        });