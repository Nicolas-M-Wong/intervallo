// Dialog Box
let dialogBoxId = document.getElementById("dialogBox");
let countdownInterval;
let countDownDate;

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

let formData; // Define formData in the global scope

function handleSubmit(event) {
	// Prevent the default form submission behavior
	event.preventDefault();
	
	let nbPhotos = getCurrentValue(document.getElementById('nb_photo'),step1);
	let exposureTime = getCurrentValue(document.getElementById('tmp_pose'),step2);
	let timeBetweenPhotos = getCurrentValue(document.getElementById('enregistrement'),step2);

	// Get the values of the form fields
	// Calculate the total time
	const totalTime = nbPhotos * exposureTime + timeBetweenPhotos * (nbPhotos - 1);
	console.log("Total time for the interval:", totalTime, "seconds");

	// Display formatted time in confirmation
	document.getElementById("estimation_tmp").innerHTML = formatTime(totalTime);
	document.getElementById("confirmation").style.display = "block";

	// Prepare form data for the POST request
	formData = new FormData(event.target);
}

function handleButtonClick(test_status) {
    if (formData) {
        const data = {};
        const nbPhotos = getCurrentValue(document.getElementById('nb_photo'),step1);
		data["nb_photo"] = nbPhotos;
		if (test_status === "Yes"){
            data["nb_photo"] = 1;
            }
		let exposureTime = getCurrentValue(document.getElementById('tmp_pose'),step2);
		let timeBetweenPhotos = getCurrentValue(document.getElementById('enregistrement'),step2);

		var now = new Date().getTime();
		
		data["tmp_pose"] = exposureTime;
		data["tmp_enregistrement"] = timeBetweenPhotos
		console.log(data["nb_photo"])
		data["date"] = now;
        sendPostRequest(data);
        showDialog(data["nb_photo"], exposureTime, timeBetweenPhotos); // Show the dialog box with the countdown
    } else {
        console.error('Form data is not available. Please submit the form first.');
    }
}

function remoteTrigger(){
const triggerMessage = {"nb_photo":"1", "tmp_pose":"0.1", "tmp_enregistrement":"0"};
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

function DetectDevice() {
    let isMobile = window.matchMedia || window.msMatchMedia;
    if(isMobile) {
        let match_mobile = isMobile("(pointer:coarse)");
        return match_mobile.matches;
    }
    return false;
}

function sendGetRequest(fileName) {
    const url = `/${fileName}`;

    fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'text/plain', // Adjust the content type if necessary
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text(); // You can change this to response.json() if the response is JSON
    })
    .then(data => {
	document.getElementById('screen-container').innerHTML = data;
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
}

function detectLandscapeOrientation() {
    const orientation = window.matchMedia("(orientation: landscape)").matches;
    const wideScreen= window.innerWidth > 800;
    return orientation||wideScreen;
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

const phone = DetectDevice()

if (phone == false) {
	document.getElementById('phone-screen').style.display = "none";
	sendGetRequest(document.getElementById('big-screen').getAttribute('href'));
}

else if (detectLandscapeOrientation()) {
	document.getElementById('phone-screen').style.display = "none";
	sendGetRequest(document.getElementById('landscape-screen').getAttribute('href'));
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
	document.getElementById('nb_photo'),document.getElementById('tmp_pose'),
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

		notificationMessage.textContent = `${locPhotos} photos prises, exposition ${locExpo}.`;
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

function update_battery(batteyLevel) {
    const batteryHeader = document.getElementById('battery-header');
    batteryHeader.textContent = `${batteyLevel}%`;
    if (batteryLevel === ""){
        sendPostRequest("battery");
    }
}
function startUp() {
   update_time();
   sendPostRequest("battery");
 }
 
       function createWheel_sec(elementId, step, length) {
            const wheel = document.getElementById(elementId);
            const paddingDiv = document.createElement('div');
            paddingDiv.style.height = '75px';
            wheel.appendChild(paddingDiv);
            for (let i = 0; i <= length; i += step) {  // <--- LIGNE POUR DÉFINIR LE PAS DES ROUES
                const numberDiv = document.createElement('div');
                numberDiv.className = 'number';
                numberDiv.innerText = i;
                wheel.appendChild(numberDiv);
            }
            const paddingDivEnd = document.createElement('div');
            paddingDivEnd.style.height = '75px';
            wheel.appendChild(paddingDivEnd);
        }
		
        function createWheel_sec_ms(elementId, step_s, step_ms, length) {
            const wheel = document.getElementById(elementId);
            const paddingDiv = document.createElement('div');
            paddingDiv.style.height = '75px';
            wheel.appendChild(paddingDiv);
            for (let i = 0; i <= 1-step_ms; i += step_ms) {  // <--- LIGNE POUR DÉFINIR LE PAS DES ROUES
                const numberDiv = document.createElement('div');
                numberDiv.className = 'number';
                numberDiv.innerText = i.toFixed(countDecimalPlaces(step_ms));
                wheel.appendChild(numberDiv);
            }
			for (let i = 1; i <= 5-5*step_ms; i += 5*step_ms) {  // <--- LIGNE POUR DÉFINIR LE PAS DES ROUES
                const numberDiv = document.createElement('div');
                numberDiv.className = 'number';
                numberDiv.innerText = i.toFixed(countDecimalPlaces(step_ms));
                wheel.appendChild(numberDiv);
            }
			for (let i = 5; i < 60; i += step_s) {  // <--- LIGNE POUR DÉFINIR LE PAS DES ROUES
                const numberDiv = document.createElement('div');
                numberDiv.className = 'number';
                numberDiv.innerText = i;
                wheel.appendChild(numberDiv);
            }
			
			for (let i = 60; i <= length; i += 10*step_s) {  // <--- LIGNE POUR DÉFINIR LE PAS DES ROUES
                const numberDiv = document.createElement('div');
                numberDiv.className = 'number';
                numberDiv.innerText = i;
                wheel.appendChild(numberDiv);
            }
			
            const paddingDivEnd = document.createElement('div');
            paddingDivEnd.style.height = '75px';
            wheel.appendChild(paddingDivEnd);
        }
		
		function getCurrentValue(wheel,step_ms) {
			const numbers = wheel.querySelectorAll('.number');
			const middleIndex = Math.round((wheel.scrollTop + wheel.clientHeight/ - 25)/50);
			return parseFloat(numbers[middleIndex].innerText, 10).toFixed(countDecimalPlaces(step_ms));
		}

		function adjustScroll(wheel) {
			const numbers = wheel.querySelectorAll('.number');
			const middleIndex = Math.round((wheel.scrollTop + wheel.clientHeight/3 - 25)/50);
			const targetScrollTop = middleIndex * 50 - wheel.clientHeight/3 + 25;

			wheel.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
			updateSelectedNumber(wheel);
		}


        function attachWheelEvents(wheelId) {
            const wheel = document.getElementById(wheelId);
            let scrollTimeout;
            wheel.addEventListener('scroll', () => {
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(() => {
                    adjustScroll(wheel);
                }, 100);
            });
        }

		function updateSelectedNumber(wheel) {
			const numbers = wheel.querySelectorAll('.number');
			const middleIndex = Math.round((wheel.scrollTop + wheel.clientHeight/12 - 25)/50);
			console.log(middleIndex, wheel.scrollTop, wheel.clientHeight/12)
			
			numbers.forEach(num => num.classList.remove('selected'));
			if (middleIndex >= 0 && middleIndex < numbers.length) {
				numbers[middleIndex].classList.add('selected');
			}
		}

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

		const step1 = 1
		const step2 = 0.1
		
        createWheel_sec('nb_photo', step1, 500);  // Changez le pas ici pour chaque roue
        createWheel_sec_ms('tmp_pose', step1, step2, 240);  // Changez le pas ici pour chaque roue
        createWheel_sec_ms('enregistrement', step1, step2, 600);  // Changez le pas ici pour chaque roue

        attachWheelEvents('nb_photo');
        attachWheelEvents('tmp_pose');
        attachWheelEvents('enregistrement');

		document.getElementById('wheelForm').addEventListener('submit', function(event) {
			event.preventDefault();

			const nbPhotos = getCurrentValue(document.getElementById('nb_photo'),step1);
			const tmp_pose = getCurrentValue(document.getElementById('tmp_pose'),step2);
			const tmp_enregistrement = getCurrentValue(document.getElementById('enregistrement'),step2);

			// Simulate form submission
			// sendPostRequest(nbPhotos,tmp_pose,tmp_enregistrement);
			// showDialog(value1,value2,value3);
		});
 
startUp();
setInterval(function(){update_time();}, 1000)
setInterval(function(){
    sendPostRequest("battery");},300000)
