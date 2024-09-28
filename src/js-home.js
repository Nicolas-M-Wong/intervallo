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
	{ start: 1, end: 5-5*step_ms, step: 5 * step_ms, fixed: true }, //Between 1 and 5, 0.5s step
	{ start: 5, end: 60-step_s, step: step_s, fixed: false }, //Between 5 and 60, 1s step
	{ start: 60, end: length_pose, step: 10*step_s, fixed: false } //Between 60 to the end, 10s step
];

const step_enregistrement = [
	{ start: step_ms, end: 1-step_ms, step: step_ms, fixed: true }, //Between 0 and 1, 0.1s step
	{ start: 1, end: 5-5*step_ms, step: 5 * step_ms, fixed: true }, //Between 1 and 5, 0.5s step
	{ start: 5, end: 60-step_s, step: step_s, fixed: false }, //Between 5 and 60, 1s step
	{ start: 60, end: length_enregistrement, step: 10*step_s, fixed: false } //Between 60 to the end, 10s step
];

// Initial screen type and orientation detection
let current_screen_type = home.detectDevice() ? 'ordi' : 'tel';
let current_orientation = home.detectLandscapeOrientation() ? 'h' : 'v';
let last_screen_type = current_screen_type;
let last_orientation = current_orientation;

// Add event listeners for resize and orientationchange
window.addEventListener('resize', home.handleScreenChange);
window.addEventListener('orientationchange', home.handleScreenChange);
	
setInterval(function(){
    home.sendPostRequest("battery");},300000)

requestAnimationFrame(() => home.updateTime);

window.addEventListener('load', function() {
  home.sendGetRequest("token").then(() => {
    home.updateTime();
    home.updateValues();
    home.sendPostRequest("battery");
  }).catch(error => {
    console.error('Error fetching token:', error);
  });
});

window.addEventListener('beforeunload', function(event) {
            home.saveFormData();
        });

// ---------------------------------------------------------------------------------------------------------------------------------------------

// Prevent the dialog box from closing when the confirm button is clicked
document.getElementById("confirmation").addEventListener("click", function(event) {
    event.preventDefault();

});

// ---------------------------------------------------------------------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-mode');
    const body = document.body;
	let currentFileName = document.body.getAttribute('data-page');
	const elementsToToggle = [
	  body, 
	  document.getElementById('dialogBox'),
	  document.getElementById('main'),
	  document.getElementById('navbar-id'),
	  document.getElementById('nb_photos'),
	  document.getElementById('enregistrement'),
	  document.getElementById('shutdown'),
	  document.getElementById('big-screen'),
	  document.getElementById('landscape-screen'),
	  document.getElementById('shutdown-wrapper'),
	  document.getElementById('half-circle')
	];

	// Elements that vary based on currentFileName
	if (currentFileName === "home-V3") {
	  // Add `tmp_pose_start` and `tmp_pose_end` only for "home-V3"
	  elementsToToggle.push(
		document.getElementById('tmp_pose_start'), 
		document.getElementById('tmp_pose_end')
	  );
	} else {
	  // Add `tmp_pose` for other cases
	  elementsToToggle.push(document.getElementById('tmp_pose'));
	}
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