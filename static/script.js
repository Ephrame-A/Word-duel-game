 // DOM Elements
 const startButton = document.getElementById('start-btn');
 const submitButton = document.getElementById('submit-btn');
 const userInputBox = document.getElementById('user-input-box');
 const gameBoard = document.getElementById('game-board');
 const infoMessage = document.getElementById('info-message');
 const turnMessageElement = document.getElementById('turn-message');
 const lastPrefixDisplay = document.getElementById('last-prefix-display');
 const errorMessage = document.getElementById('error-message');
 const boostMessage = document.getElementById('boost-message');
 const penaltyMessage = document.getElementById('penalty-message');
 const timerDisplay = document.getElementById('timer');
 const currentScoreDisplay = document.querySelector('#current-score .score-value');
 const highScoreDisplay = document.querySelector('#high-score .score-value');
 const difficultySelector = document.getElementById('difficulty-level');
 const rulesBtn = document.getElementById('rules-btn');
 const rulesModal = document.getElementById('rules-modal');
 const closeModal = document.querySelector('.close-btn');
 const interruptBtn = document.getElementById('interrupt-btn');
 const hintButton = document.getElementById('hint-btn');
 const hintMessageDisplay = document.getElementById('hint-message');
 const hintsDisplay = document.getElementById('hints-display');
 
 // Game State
 let isUserTurn = false;
 let timeRemaining = 0;
 let hintsRemaining = 2;
 let timerInterval;
 let turnStartTime = 0;

 // Event Listeners
 startButton.addEventListener('click', startGame);
 submitButton.addEventListener('click', submitWord);
 userInputBox.addEventListener('keypress', (e) => {
     if (e.key === 'Enter') submitWord();
 });
 rulesBtn.addEventListener('click', () => rulesModal.style.display = "block");
 closeModal.addEventListener('click', () => rulesModal.style.display = "none");
 window.addEventListener('click', (event) => {
     if (event.target == rulesModal) rulesModal.style.display = "none";
 });
 interruptBtn.addEventListener('click', interruptGame);
 hintButton.addEventListener('click', getHint);

 // Timer Functions
 function startTimer() {
     stopTimer();
     turnStartTime = Date.now();
     timerInterval = setInterval(() => {
         timeRemaining--;
         const timerText = timerDisplay.querySelector('span');
         timerText.textContent = `Time Remaining: ${timeRemaining}s`;
         if (timeRemaining <= 0) {
             clearInterval(timerInterval);
             gameOver('Time\'s up! You lose.', currentScoreDisplay.textContent, false);
         }
     }, 1000);
 }

 function stopTimer() {
     clearInterval(timerInterval);
 }

 // Game Functions
 async function startGame() {
     const difficulty = difficultySelector.value;
     try {
         const response = await fetch('/start_game', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ difficulty: difficulty })
         });
         const data = await response.json();

         if (data.status === 'success') {
             document.getElementById('start-section').style.display = 'none';
             document.getElementById('user-section').style.display = 'block';
             gameBoard.innerHTML = '';
             appendWord('program', data.word);
             lastPrefixDisplay.textContent = data.prefix.toUpperCase();
             isUserTurn = true;
             userInputBox.focus();
             // Ensure all user turn elements are visible
             turnMessageElement.style.display = 'block';
             userInputBox.style.display = 'block';
             submitButton.style.display = 'block';
             hintButton.style.display = 'block';
             hintMessageDisplay.style.display = 'none';
             errorMessage.textContent = '';
             penaltyMessage.style.display = 'none';
             timeRemaining = data.time_limit;
             currentScoreDisplay.textContent = data.score;
             hintsRemaining = data.hints_remaining;
             updateHintsDisplay();
             hintButton.disabled = false;
             startTimer();
         } else {
             showError(data.error || 'Failed to start game');
         }
     } catch (error) {
         showError('Network error');
     }
 }

 async function submitWord() {
     if (!isUserTurn) return;
     const word = userInputBox.value.trim();
     if (!word) {
         errorMessage.textContent = 'Please enter a word.';
         return;
     }
     
     stopTimer();
     const timeTaken = (Date.now() - turnStartTime) / 1000;
     
     // Hide turn message and input while waiting for program's turn
     turnMessageElement.style.display = 'none';
     userInputBox.style.display = 'none';
     submitButton.style.display = 'none';
     hintButton.style.display = 'none';
     hintMessageDisplay.style.display = 'none';
     
     try {
         const response = await fetch('/user_turn', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ 
                 word: word, 
                 time_remaining: timeRemaining, 
                 time_taken: timeTaken 
             })
         });
         const data = await response.json();

         if (data.status === 'success') {
             appendWord('user', data.word);
             userInputBox.value = '';
             isUserTurn = false;
             errorMessage.textContent = '';
             penaltyMessage.style.display = 'none';
             lastPrefixDisplay.textContent = data.prefix.toUpperCase();
             currentScoreDisplay.textContent = data.new_score;
             timeRemaining = data.new_time_remaining;

             boostMessage.textContent = `+${data.time_boost.toFixed(2)}s time bonus!`;
             boostMessage.style.display = 'block';

             setTimeout(() => {
                 boostMessage.style.display = 'none';
                 programTurn();
             }, 1500);

         } else if (data.status === 'invalid') {
             errorMessage.textContent = data.message;
             currentScoreDisplay.textContent = data.new_score;
             penaltyMessage.textContent = data.penalty_message;
             penaltyMessage.style.display = 'block';
             timeRemaining = data.new_time_remaining;
             userInputBox.value = '';
             
             // Show turn message and input again
             turnMessageElement.style.display = 'block';
             turnMessageElement.querySelector('#last-prefix-display').textContent = lastPrefixDisplay.textContent;
             userInputBox.style.display = 'block';
             submitButton.style.display = 'block';
             hintButton.style.display = 'block';
             
             startTimer();
         } else if (data.status === 'timeout') {
             gameOver(data.message, data.final_score, data.new_highscore);
         }
     } catch (error) {
         showError('Network error');
         startTimer();
     }
 }

 async function programTurn() {
     // Display a message while the program is thinking
     turnMessageElement.innerHTML = `Program's turn... <i class="fas fa-spinner fa-spin"></i>`;
     turnMessageElement.style.display = 'block';

     try {
         const response = await fetch('/program_turn', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' }
         });
         const data = await response.json();

         if (data.status === 'success') {
             appendWord('program', data.word);
             lastPrefixDisplay.textContent = data.prefix.toUpperCase();
             isUserTurn = true;
             userInputBox.focus();
             timeRemaining = data.new_time_remaining;
             hintsRemaining = data.hints_remaining;
             updateHintsDisplay();
             startTimer();
             
             // Restore user turn message and input elements
             turnMessageElement.innerHTML = `Your turn! Word must start with: <span class="turn-indicator" id="last-prefix-display"></span>`;
             turnMessageElement.querySelector('#last-prefix-display').textContent = data.prefix.toUpperCase();
             userInputBox.style.display = 'block';
             submitButton.style.display = 'block';
             hintButton.style.display = 'block';

         } else if (data.status === 'program_loses') {
             gameOver(data.message, data.final_score, data.new_highscore);
         }
     } catch (error) {
         showError('Network error');
     }
 }

 async function getHint() {
     if (hintsRemaining <= 0) return;
     
     try {
         const response = await fetch('/get_hint', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' }
         });
         const data = await response.json();
         
         if (data.status === 'success') {
             hintMessageDisplay.textContent = `Hint: Try a word like "${data.hint}"`;
             hintMessageDisplay.style.display = 'block';
             hintsRemaining = data.hints_remaining;
             updateHintsDisplay();
             if (hintsRemaining <= 0) {
                 hintButton.disabled = true;
             }
         } else if (data.status === 'no_words') {
             hintMessageDisplay.textContent = 'No words found for this prefix. It might be a losing game.';
             hintMessageDisplay.style.display = 'block';
         } else if (data.status === 'no_hints') {
             hintMessageDisplay.textContent = data.message;
             hintMessageDisplay.style.display = 'block';
             hintButton.disabled = true;
         }
     } catch (error) {
         showError('Network error getting hint');
     }
 }

 function updateHintsDisplay() {
     hintsDisplay.querySelector('span').textContent = `Hints Remaining: ${hintsRemaining}`;
     hintButton.disabled = hintsRemaining <= 0;
 }

 async function interruptGame() {
     try {
         const response = await fetch('/interrupt_game', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' }
         });
         const data = await response.json();
         
         if (data.status === 'interrupted') {
             gameOver(data.message, data.final_score, data.new_highscore);
         }
     } catch (error) {
         showError('Network error during interruption');
     }
 }

 function appendWord(player, word) {
     const wordElement = document.createElement('div');
     wordElement.classList.add('word', player);
     wordElement.textContent = word;
     gameBoard.appendChild(wordElement);
     gameBoard.scrollTop = gameBoard.scrollHeight;
 }

 function gameOver(message, finalScore, newHighscore) {
     stopTimer();
     const existingModal = document.querySelector('.game-over-modal');
     if (existingModal) {
         document.body.removeChild(existingModal);
     }

     const gameOverModal = document.createElement('div');
     gameOverModal.className = 'game-over-modal';
     gameOverModal.innerHTML = `
         <div class="game-over-content">
             <h2>Game Over</h2>
             <p>${message}</p>
             <p class="final-score">Final Score: ${finalScore || 0}</p>
             ${newHighscore ? '<p class="high-score">🎉 New High Score! 🎉</p>' : ''}
             <button class="primary-btn play-again-btn">Play Again</button>
         </div>
     `;
     document.body.appendChild(gameOverModal);

     if (newHighscore) {
         highScoreDisplay.textContent = finalScore;
     }

     document.querySelector('.play-again-btn').addEventListener('click', () => {
         // Reload the page to ensure the highscore is read from the file.
         window.location.reload();
     });
 }

 function showError(message) {
     errorMessage.textContent = message;
     setTimeout(() => errorMessage.textContent = '', 3000);
 }