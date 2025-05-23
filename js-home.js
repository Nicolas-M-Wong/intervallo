// Ensures the code only runs once the DOM is fully loaded
    document.addEventListener("DOMContentLoaded", () => {
      // DOM Elements
      const exposureInput = document.getElementById("exposureTime");
      const intervalInput = document.getElementById("intervalTime");
      const countInput = document.getElementById("photoCount");
      const startBtn = document.getElementById("startButton");
      const testBtn = document.getElementById("testButton");
      const shutdownBtn = document.getElementById("shutdownButton");
      const estimatedTimeSpan = document.getElementById("estimatedTime");
      const endTimeSpan = document.getElementById("endTime");
      const statusSpan = document.getElementById("status");
      const statusIndicator = document.querySelector(".status-indicator");

      // Confirmation Modal Elements
      const confirmModal = document.getElementById("confirmModal");
      const confirmPhotoCount = document.getElementById("confirmPhotoCount");
      const confirmExposure = document.getElementById("confirmExposure");
      const confirmInterval = document.getElementById("confirmInterval");
      const confirmTotalTime = document.getElementById("confirmTotalTime");
      const confirmSessionBtn = document.getElementById("confirmSessionBtn");
      const cancelSessionBtn = document.getElementById("cancelSessionBtn");

      // Shutdown Modal Elements
      const shutdownModal = document.getElementById("shutdownModal");
      const confirmShutdownBtn = document.getElementById("confirmShutdownBtn");
      const cancelShutdownBtn = document.getElementById("cancelShutdownBtn");
      const shutdownProgress = document.getElementById("shutdownProgress");
      const progressBar = document.querySelector(".progress-bar");

      // State variables
      let sessionRunning = false;
      let unblockTimeout = null;
      let pendingAction = null;

      // Helper Functions
      function disableButtonUI(message = "Session en cours") {
        startBtn.disabled = true;
        testBtn.disabled = true;
        statusSpan.textContent = message;
        statusIndicator.style.backgroundColor = "#03DAC6"; // Success color
      }

      function enableButtonUI(message = "En attente") {
        startBtn.disabled = false;
        testBtn.disabled = false;
        statusSpan.textContent = message;
        statusIndicator.style.backgroundColor = "#BB86FC"; // Primary light color
      }

      function showModal(modal) {
        modal.classList.add("active");
      }

      function hideModal(modal) {
        modal.classList.remove("active");
      }

      function calculateTotalTime(exposure, interval, count) {
        return (exposure + interval) * count - interval;
      }

      function formatEndTime(totalSeconds) {
        const endTime = new Date(Date.now() + totalSeconds * 1000);
        return endTime.toLocaleTimeString();
      }

      function updateStatusInfo(exposure, interval, count) {
        const totalTime = calculateTotalTime(exposure, interval, count);
        const endTimeStr = formatEndTime(totalTime);
        
        estimatedTimeSpan.textContent = totalTime.toFixed(1);
        endTimeSpan.textContent = endTimeStr;
        
        return totalTime;
      }

      async function checkServerStatus() {
        try {
          const response = await fetch("/startSession", { method: "GET" });
          const text = await response.text();

          let statusObj = {};
          try {
            statusObj = JSON.parse(text);
          } catch (e) {
            console.warn("Réponse inattendue du serveur :", text);
            return enableButtonUI();
          }

          if (statusObj.status === "busy" && typeof statusObj.remaining === "number") {
            disableButtonUI(`Serveur occupé (${statusObj.remaining}s)`);

            // Clear any existing timeout
            if (unblockTimeout) clearTimeout(unblockTimeout);

            unblockTimeout = setTimeout(() => {
              sessionRunning = false;
              enableButtonUI("En attente");
            }, statusObj.remaining * 1000);

            sessionRunning = true;
          } else {
            enableButtonUI("En attente");
            sessionRunning = false;
          }
        } catch (e) {
          console.warn("Impossible de vérifier le statut du serveur :", e);
          enableButtonUI("Statut inconnu");
          
          // For offline mode, we'll assume the server is available
          sessionRunning = false;
        }
      }

      async function sendPostRequest(data) {
        try {
          const response = await fetch("/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
          });

          if (!response.ok) {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
          }

          const result = await response.text();
          console.log("Succès :", result);
          return true;
        } catch (error) {
          console.error("Erreur lors de l'envoi :", error.message);
          
          // For offline mode, we'll simulate a successful request
          console.log("Mode hors ligne - simulation de réponse réussie");
          return true; 
        }
      }

      async function sendShutdownRequest() {
        try {
          const response = await fetch("/shutdown", {
            method: "POST"
          });

          if (!response.ok) {
            throw new Error(`Erreur ${response.status}: ${response.statusText}`);
          }

          return true;
        } catch (error) {
          console.error("Erreur lors de l'extinction :", error.message);
          
          // For offline mode, simulate successful shutdown
          console.log("Mode hors ligne - simulation d'extinction réussie");
          return true;
        }
      }

      async function startSession(isTest = false) {
        if (sessionRunning) return;

        const exposure = parseFloat(exposureInput.value);
        const interval = parseFloat(intervalInput.value);
        const count = isTest ? 1 : parseFloat(countInput.value);

        // Update UI with calculated timings
        const totalTime = updateStatusInfo(exposure, interval, count);
        
        // Prepare payload
        const payload = { 
          exposure, 
          interval, 
          count,
          test: isTest 
        };

        // Set session as running and update UI
        sessionRunning = true;
        disableButtonUI(isTest ? "Test en cours" : "Session en cours");

        // Send the request
        await sendPostRequest(payload);

        // Set timeout for automatic UI reset based on calculated completion time
        if (unblockTimeout) clearTimeout(unblockTimeout);
        unblockTimeout = setTimeout(() => {
          sessionRunning = false;
          enableButtonUI("En attente");
        }, totalTime * 1000 + 500); // Add a small buffer
      }

      // Event Handlers
      startBtn.addEventListener("click", () => {
        if (sessionRunning) return;
        
        // Get values for confirmation
        const exposure = parseFloat(exposureInput.value);
        const interval = parseFloat(intervalInput.value);
        const count = parseFloat(countInput.value);
        const totalTime = calculateTotalTime(exposure, interval, count);
        
        // Update confirmation modal
        confirmPhotoCount.textContent = count;
        confirmExposure.textContent = exposure;
        confirmInterval.textContent = interval;
        confirmTotalTime.textContent = totalTime.toFixed(1);
        
        // Store pending action
        pendingAction = "start";
        
        // Show confirmation modal
        showModal(confirmModal);
      });

      testBtn.addEventListener("click", () => {
        if (sessionRunning) return;
        startSession(true);
      });

      shutdownBtn.addEventListener("click", () => {
        showModal(shutdownModal);
      });

      // Confirmation handlers
      confirmSessionBtn.addEventListener("click", () => {
        hideModal(confirmModal);
        if (pendingAction === "start") {
          startSession(false);
        }
        pendingAction = null;
      });

      cancelSessionBtn.addEventListener("click", () => {
        hideModal(confirmModal);
        pendingAction = null;
      });

      // Shutdown handlers
      confirmShutdownBtn.addEventListener("click", async () => {
        // Disable cancel button and change confirm button text
        cancelShutdownBtn.disabled = true;
        confirmShutdownBtn.disabled = true;
        confirmShutdownBtn.textContent = "Extinction en cours...";
        
        // Show progress bar
        shutdownProgress.style.display = "block";
        
        // Animate progress
        let progress = 0;
        const updateProgress = () => {
          progress += 1;
          progressBar.style.width = `${progress}%`;
          
          if (progress < 100) {
            setTimeout(updateProgress, 50);
          } else {
            // When progress completes
            confirmShutdownBtn.textContent = "Système éteint";
            
            // Optional: redirect or show final message
            setTimeout(() => {
              hideModal(shutdownModal);
              statusSpan.textContent = "Système éteint";
              statusIndicator.style.backgroundColor = "#CF6679";
              disableButtonUI("Système éteint");
            }, 1000);
          }
        };
        
        // Start progress animation
        updateProgress();
        
        // Send shutdown request
        await sendShutdownRequest();
      });

      cancelShutdownBtn.addEventListener("click", () => {
        hideModal(shutdownModal);
        
        // Reset progress bar for next time
        setTimeout(() => {
          progressBar.style.width = "0%";
          shutdownProgress.style.display = "none";
          confirmShutdownBtn.disabled = false;
          cancelShutdownBtn.disabled = false;
          confirmShutdownBtn.textContent = "Éteindre";
        }, 500);
      });

      // Close modal if clicking outside (for better UX)
      window.addEventListener("click", (event) => {
        if (event.target === confirmModal) {
          hideModal(confirmModal);
          pendingAction = null;
        }
        if (event.target === shutdownModal && !confirmShutdownBtn.disabled) {
          hideModal(shutdownModal);
        }
      });

      // Check server status on page load with a slight delay to ensure DOM is fully loaded
      setTimeout(checkServerStatus, 100);

      // Update total time estimation when inputs change
      [exposureInput, intervalInput, countInput].forEach(input => {
        input.addEventListener("input", () => {
          const exposure = parseFloat(exposureInput.value) || 0;
          const interval = parseFloat(intervalInput.value) || 0;
          const count = parseFloat(countInput.value) || 1;
          
          // Just update the displayed values without making any requests
          updateStatusInfo(exposure, interval, count);
        });
      });
    });