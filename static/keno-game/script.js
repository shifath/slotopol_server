const bearerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzbG90b3BvbCIsImV4cCI6NDg2NzQ0NzYxNywibmJmIjoxNzA2NjQ3NjE3LCJ1aWQiOjN9.6g2Hig9ErG8IbvzkPppry5F8HJsMunZPwuQzmetGh4c'; // Test token from README

document.addEventListener('DOMContentLoaded', () => {
    // Get DOM Elements
    const gameAliasTitle = document.getElementById('game-alias-title');
    const gameIdSpan = document.getElementById('game-id');
    const kenoBoardDiv = document.querySelector('.keno-board');
    const selectedNumbersDisplay = document.getElementById('selected-numbers-display');
    const betAmountInput = document.getElementById('betAmount');
    const playButton = document.getElementById('playButton');
    const clearSelectionButton = document.getElementById('clearSelectionButton');
    const balanceSpan = document.getElementById('balance');
    const lastWinSpan = document.getElementById('last-win');
    const gameStatusDiv = document.getElementById('game-status');

    const MAX_SELECTED_NUMBERS = 10;
    let selectedNumbers = new Set();
    let lastWinningAmount = 0.00;

    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('gid');
    const selectedAlias = params.get('alias');

    // Function to fetch and update wallet balance
    async function fetchAndUpdateWallet() {
        try {
            // Use UID=3 (player) and CID=1 (virtual club) to fetch wallet
            const response = await fetch('/prop/wallet/get', {
                method: 'POST', // ApiPropsWalletGet expects POST
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${bearerToken}` // Use the player's bearerToken
                },
                body: JSON.stringify({
                    "uid": 3,
                    "cid": 1
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            if (data && typeof data.wallet === 'number') {
                balanceSpan.textContent = data.wallet.toFixed(2);
            } else {
                console.error('Failed to get wallet from response:', data);
                balanceSpan.textContent = 'N/A';
            }
        } catch (error) {
            console.error('Error fetching wallet balance:', error);
            balanceSpan.textContent = 'Error';
        }
    }

    // Initialize game info
    if (selectedAlias) {
        gameAliasTitle.textContent = selectedAlias;
    } else {
        gameAliasTitle.textContent = 'Keno Game';
    }
    gameIdSpan.textContent = gameId || 'N/A';
    lastWinSpan.textContent = lastWinningAmount.toFixed(2);
    fetchAndUpdateWallet();

    // --- Keno Board Generation and Interaction ---
    function generateKenoBoard() {
        kenoBoardDiv.innerHTML = ''; // Clear existing board
        for (let i = 1; i <= 80; i++) {
            const numberDiv = document.createElement('div');
            numberDiv.classList.add('keno-number');
            numberDiv.textContent = i;
            numberDiv.dataset.number = i; // Store number in dataset
            numberDiv.addEventListener('click', () => toggleNumberSelection(i, numberDiv));
            kenoBoardDiv.appendChild(numberDiv);
        }
    }

    function toggleNumberSelection(number, element) {
        if (selectedNumbers.has(number)) {
            selectedNumbers.delete(number);
            element.classList.remove('selected');
        } else {
            if (selectedNumbers.size < MAX_SELECTED_NUMBERS) {
                selectedNumbers.add(number);
                element.classList.add('selected');
            } else {
                gameStatusDiv.textContent = `You can select a maximum of ${MAX_SELECTED_NUMBERS} numbers.`;
                gameStatusDiv.style.color = 'orange';
                return;
            }
        }
        updateSelectedNumbersDisplay();
        updatePlayButtonState();
    }

    function updateSelectedNumbersDisplay() {
        if (selectedNumbers.size > 0) {
            selectedNumbersDisplay.textContent = Array.from(selectedNumbers).sort((a, b) => a - b).join(', ');
        } else {
            selectedNumbersDisplay.textContent = 'None';
        }
    }

    function updatePlayButtonState() {
        playButton.disabled = selectedNumbers.size === 0;
    }

    function clearSelections() {
        selectedNumbers.clear();
        document.querySelectorAll('.keno-number').forEach(el => {
            el.classList.remove('selected', 'drawn', 'hit');
        });
        updateSelectedNumbersDisplay();
        updatePlayButtonState();
        gameStatusDiv.textContent = ''; // Clear status message
        gameStatusDiv.style.color = '';
    }

    // --- Keno Game Logic ---
    async function performKenoDraw() {
        if (selectedNumbers.size === 0) {
            gameStatusDiv.textContent = 'Please select at least one number.';
            gameStatusDiv.style.color = 'red';
            return;
        }
        if (selectedNumbers.size > MAX_SELECTED_NUMBERS) {
            gameStatusDiv.textContent = `You can select a maximum of ${MAX_SELECTED_NUMBERS} numbers.`;
            gameStatusDiv.style.color = 'red';
            return;
        }

        playButton.disabled = true;
        clearSelectionButton.disabled = true;
        gameStatusDiv.textContent = 'Drawing numbers...';
        gameStatusDiv.style.color = 'blue';

        const betAmount = parseInt(betAmountInput.value);
        if (isNaN(betAmount) || betAmount < 1) {
            gameStatusDiv.textContent = 'Please enter a valid bet amount.';
            gameStatusDiv.style.color = 'red';
            playButton.disabled = false;
            clearSelectionButton.disabled = false;
            return;
        }

        // Clear previous draw highlights, keep selections
        document.querySelectorAll('.keno-number').forEach(el => {
            el.classList.remove('drawn', 'hit');
        });

        try {
            const response = await fetch('/keno/spin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${bearerToken}`
                },
                body: JSON.stringify({
                    "gid": parseInt(gameId),
                    "bet": betAmount,
                    "sel": Array.from(selectedNumbers).sort((a, b) => a - b) // Send sorted selected numbers
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            console.log('Keno Spin API Response:', data);

            // Display results
            displayKenoResults(data);

        } catch (error) {
            console.error('Error performing Keno draw:', error);
            gameStatusDiv.textContent = `Failed to perform draw: ${error.message}`;
            gameStatusDiv.style.color = 'red';
        } finally {
            playButton.disabled = false;
            clearSelectionButton.disabled = false;
            fetchAndUpdateWallet(); // Always update wallet after a draw
        }
    }

    function displayKenoResults(data) {
        const drawnNumbers = new Set(data.game.draw || []);
        const hits = new Set(data.game.hits || []); // Numbers selected by user AND drawn

        document.querySelectorAll('.keno-number').forEach(el => {
            const num = parseInt(el.dataset.number);
            if (drawnNumbers.has(num)) {
                el.classList.add('drawn');
            }
            if (hits.has(num)) {
                el.classList.add('hit');
            }
        });

        balanceSpan.textContent = (data.wallet || 0).toFixed(2);
        if (data.game.gain > 0) {
            lastWinningAmount = data.game.gain;
            lastWinSpan.textContent = lastWinningAmount.toFixed(2);
        } else {
            lastWinSpan.textContent = "0.00"; // Clear last win if no win
        }

        let message = `Drawn ${drawnNumbers.size} numbers. `;
        if (hits.size > 0) {
            message += `You hit ${hits.size} numbers! Gain: $${(data.game.gain || 0).toFixed(2)}.`;
            gameStatusDiv.style.color = 'green';
        } else {
            message += `No hits. Better luck next time!`;
            gameStatusDiv.style.color = 'orange';
        }
        gameStatusDiv.textContent = message;
    }


    // --- Event Listeners ---
    playButton.addEventListener('click', performKenoDraw);
    clearSelectionButton.addEventListener('click', clearSelections);
    betAmountInput.addEventListener('change', () => {
        gameStatusDiv.textContent = ''; // Clear messages on bet change
        gameStatusDiv.style.color = '';
    });


    // Initial setup calls
    generateKenoBoard();
    updateSelectedNumbersDisplay();
    updatePlayButtonState();
});