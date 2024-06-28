function shutDown() { 
    document.getElementById('main').style.display = "none";
    document.getElementById('shutdown').style.display = "block";
    sendPostRequest("shutdown")
}

function serverSleep() { 
    document.getElementById('main').style.display = "none";
    document.getElementById('shutdown').style.display = "block";
    sendPostRequest("sleep")
}

// Dialog Box
let dialogBoxId = document.getElementById("dialogBox");
let countdownInterval;
let countDownDate;

function showDialog(nbPhotos, exposureTime, timeBetweenPhotos) {
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
    countDownDate = new Date().getTime() + totalTime * 1000;

    // Start the countdown
    countdownInterval = setInterval(function() {
        var now = new Date().getTime();
        var distance = (countDownDate - now);
        document.getElementById("Compteur").innerHTML = formatTime(distance / 1000);
        if (distance < 0) {
            clearInterval(countdownInterval);
            document.getElementById("Compteur").innerHTML = "00:00:00";
			navigator.vibrate([1000, 200, 1000]); // vibrate for 200ms
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
document.getElementById("test_shot").addEventListener("click", handleButtonClickTest);

let formData; // Define formData in the global scope

function handleSubmit(event) {
	// Prevent the default form submission behavior
	event.preventDefault();

	// Get the values of the form fields
	const nbPhotos = parseInt(document.getElementById("nb_photo").value);
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
		
		const nbPhotos_button = parseInt(document.getElementById("nb_photo").value);
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
		data['nb_photo']=1;
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
const triggerMessage = {"nb_photo":"1", "tmp_pose":"0.1", "tmp_enregistrement":"0"};
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

    // Add any additional actions you want to perform on confirm
});

function DetectDevice() {
    let isMobile = window.matchMedia || window.msMatchMedia;
    if(isMobile) {
        let match_mobile = isMobile("(pointer:coarse)");
        return match_mobile.matches;
    }
    return false;
}

const phone = DetectDevice()

if (phone == false) {
	document.getElementById('landscape-screen').style.display = "none";
	document.getElementById('phone-screen').style.display = "none";
	document.getElementById('big-screen').style.display = "block";
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
	document.getElementById('big-screen'),document.getElementById('landscape-screen')];

    toggleBtn.addEventListener('click', () => {
        const newMode = body.dataset.mode === 'dark' ? 'light' : 'dark';
        elementsToToggle.forEach(element => {
            element.dataset.mode = newMode;
        });
    });
});