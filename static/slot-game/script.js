const bearerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzbG90b3BvbCIsImV4cCI6NDg2NzQ0NzYxNywibmJmIjoxNzA2NjQ3NjE3LCJ1aWQiOjN9.6g2Hig9ErG8IbvzkPppry5F8HJsMunZPwuQzmetGh4c'; // Test token from README

document.addEventListener('DOMContentLoaded', () => {
    // Get DOM Elements
    const gameAliasTitle = document.getElementById('game-alias-title');
    const gameIdSpan = document.getElementById('game-id');
    const reelsContainer = document.querySelector('.reels');
    const betAmountInput = document.getElementById('betAmount');
    const linesInput = document.getElementById('lines');
    const spinButton = document.getElementById('spinButton');
    const balanceSpan = document.getElementById('balance');
    const lastWinSpan = document.getElementById('last-win');
    const gameStatusDiv = document.getElementById('game-status');
    let lastWinningAmount = 0.00; // New variable to store the last actual win
    let lastDisplayedScreen = []; // Stores the last displayed reel state

    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('gid');
    const selectedAlias = params.get('alias');
    // const initialWallet = parseFloat(params.get('wallet')) || 0; // Remove this line, we will fetch the current wallet

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

    // Display initial game info
    if (selectedAlias) {
        gameAliasTitle.textContent = selectedAlias;
    } else {
        gameAliasTitle.textContent = 'Generic Slot Game';
    }
    gameIdSpan.textContent = gameId || 'N/A';
    // balanceSpan.textContent = initialWallet.toFixed(2); // Remove this line
    lastWinSpan.textContent = lastWinningAmount.toFixed(2); // Initial last win

    // Fetch and update wallet balance immediately on load
    fetchAndUpdateWallet();

    // Placeholder symbols (map numerical IDs to visual representations)
    // Assuming backend sends integers for symbols
    const symbolMap = {
        0: "🍒", // Cherry
        1: "🍋", // Lemon
        2: "🍊", // Orange
        3: "🔔", // Bell
        4: "⭐", // Star
        5: "7️⃣", // Seven
        6: "🍇", // Grapes
        7: "💎",  // Diamond
        8: "♠️",  // Spade
        9: "♥️",  // Heart
        10: "♣️", // Club
        11: "♦️", // Diamond (playing card)
        12: "👑"   // Crown
    };

    // Animation Constants
    const SYMBOL_HEIGHT = 50; // Pixels, matches .symbol height in CSS
    const NUM_VISIBLE_SYMBOLS = 3; // Number of symbols visible in the reel window, matches .reels height / SYMBOL_HEIGHT
    const NUM_UNIQUE_SYMBOLS = Object.keys(symbolMap).length; // Number of unique symbols in the game

    // Function to render reels for static display (initial load, post-spin final state)
    function displayReels(screenData) {
        reelsContainer.innerHTML = ''; // Clear existing reels

        const numReels = 5;
        const numRows = 3;

        for (let r = 0; r < numReels; r++) {
            const reelDiv = document.createElement('div');
            reelDiv.classList.add('reel');
            reelDiv.id = `reel${r + 1}`;
            reelsContainer.appendChild(reelDiv);

            const reelStripDiv = document.createElement('div');
            reelStripDiv.classList.add('reel-strip');
            reelDiv.appendChild(reelStripDiv);

            // Populate with the actual symbols to be displayed
            const reelSymbols = (screenData && screenData[r] && Array.isArray(screenData[r])) ? screenData[r] : Array(numRows).fill(0);
            reelSymbols.forEach(symbolId => {
                const symbolChar = symbolMap[symbolId] || '❓';
                const symbolDiv = document.createElement('div');
                symbolDiv.classList.add('symbol');
                symbolDiv.textContent = symbolChar;
                reelStripDiv.appendChild(symbolDiv);
            });
            // Ensure the reel strip is positioned at the top for static display
            reelStripDiv.style.transform = `translateY(0px)`;
            reelStripDiv.classList.remove('spinning'); // Ensure no lingering spinning class
        }
    }

    // Function to prepare reels for spin animation
    // It takes the currently displayed screen and the target screen from the server
    function prepareReelsForSpin(currentScreen, targetScreen) {
        const numReels = 5;
        const numRows = 3;
        // This constant defines how many 'full' rotations of unique symbols
        // are included in the spinning part of the strip.
        // A higher number means a longer spin animation.
        const spinIterations = 3; 
        const symbolsPerSpinSection = NUM_UNIQUE_SYMBOLS * spinIterations; 

        for (let r = 0; r < numReels; r++) {
            const reelDiv = reelsContainer.querySelector(`#reel${r + 1}`);
            if (!reelDiv) {
                console.error(`Reel ${r + 1} not found during spin preparation.`);
                continue;
            }
            const reelStripDiv = reelDiv.querySelector('.reel-strip');
            reelStripDiv.innerHTML = ''; // Clear current symbols
            reelStripDiv.classList.remove('spinning'); // Ensure no lingering spinning class
            reelStripDiv.style.transform = `translateY(0px)`; // Reset transform to start animation from the top

            let animatedStripSymbols = [];
            const allSymbolIds = Object.keys(symbolMap).map(Number);

            // 1. Prepend current visible symbols (from lastDisplayedScreen)
            // This ensures the animation visually starts from what was last seen
            const currentVisibleSymbols = (currentScreen && currentScreen[r] && Array.isArray(currentScreen[r])) ? currentScreen[r] : Array(numRows).fill(0);
            animatedStripSymbols.push(...currentVisibleSymbols);

            // 2. Add enough random symbols to simulate spinning.
            for (let i = 0; i < symbolsPerSpinSection; i++) {
                animatedStripSymbols.push(allSymbolIds[Math.floor(Math.random() * allSymbolIds.length)]);
            }

            // 3. Append the actual target symbols from the server response
            // This ensures the reel will land on the correct symbols
            console.log(targetScreen+'dsd   ')
            const finalLandingSymbols = (targetScreen && targetScreen[r] && Array.isArray(targetScreen[r])) ? targetScreen[r] : Array(numRows).fill(0);
            animatedStripSymbols.push(...finalLandingSymbols);
            console.log(`Reel ${r + 1}: Final animatedStripSymbols length:`, animatedStripSymbols.length, 'Content:', animatedStripSymbols);
            
            // Populate the reel strip with the full animatedStripSymbols sequence
            animatedStripSymbols.forEach(symbolId => {
                const symbolChar = symbolMap[symbolId] || '❓';
                const symbolDiv = document.createElement('div');
                symbolDiv.classList.add('symbol');
                symbolDiv.textContent = symbolChar;
                reelStripDiv.appendChild(symbolDiv);
            });
        }
    }



    // Initial dummy reel display (before first spin)
    let initialScreen = [];
    const numReels = 5; // Assuming 5 reels
    const numRows = 3;  // Assuming 3 rows per reel
    for (let r = 0; r < numReels; r++) {
        const reelSymbols = [];
        for (let s = 0; s < numRows; s++) {
            reelSymbols.push(Math.floor(Math.random() * Object.keys(symbolMap).length));
        }
        initialScreen.push(reelSymbols);
    }
    displayReels(initialScreen); // Initial display of reels
    lastDisplayedScreen = initialScreen;


    // Spin Button Event Listener
    spinButton.addEventListener('click', async () => {
        if (!gameId) {
            gameStatusDiv.textContent = 'Error: No game ID available.';
            gameStatusDiv.style.color = 'red';
            return;
        }

        spinButton.disabled = true; // Disable button during spin
        gameStatusDiv.textContent = 'Spinning...';
        gameStatusDiv.style.color = 'blue';

        const betAmount = parseInt(betAmountInput.value);
        const lines = parseInt(linesInput.value);

        if (isNaN(betAmount) || betAmount < 1) {
            gameStatusDiv.textContent = 'Please enter a valid bet amount.';
            gameStatusDiv.style.color = 'red';
            spinButton.disabled = false;
            return;
        }
        if (isNaN(lines) || lines < 1 || lines > 20) {
            gameStatusDiv.textContent = 'Please enter valid number of lines (1-20).';
            gameStatusDiv.style.color = 'red';
            spinButton.disabled = false;
            return;
        }

        try {
            const response = await fetch('/slot/spin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${bearerToken}`
                },
                body: JSON.stringify({
                    "gid": parseInt(gameId),
                    "bet": betAmount,
                    "sel": lines
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            console.log('Spin API Response:', data); // Log the full response

            console.log('Before prepareReelsForSpin, lastDisplayedScreen:', JSON.parse(JSON.stringify(lastDisplayedScreen)));
            // Prepare reels for animation AFTER receiving server data
            prepareReelsForSpin(lastDisplayedScreen, data.game.scr);

            const newReels = reelsContainer.querySelectorAll('.reel');
            // Start spinning animation by adding the CSS class
            newReels.forEach(reel => reel.querySelector('.reel-strip').classList.add('spinning'));

            const initialSpinDuration = 3000; // How long reels spin before stopping starts
            const staggerDelayPerReel = 150; // Delay between each reel stopping
            const transitionDuration = 500; // Match CSS transition duration for smooth stop

            setTimeout(() => {
                let currentReelStopDelay = 0;
                newReels.forEach((reel, index) => {
                    console.log(`Processing reel index: ${index}, total reels: ${newReels.length}`);
                    setTimeout(() => {
                        const reelStripDiv = reel.querySelector('.reel-strip');
                        reelStripDiv.classList.remove('spinning'); // Stop CSS animation

                        // Force reflow/repaint to ensure CSS transition is registered
                        reelStripDiv.offsetHeight; 

                        // Calculate the precise landing position for the new strip structure
                        // The `prepareReelsForSpin` function builds the strip as:
                        // [lastDisplayedScreen symbols] + [random spin symbols] + [data.game.scr symbols]
                        // The lastDisplayedScreen symbols are at the very top (index 0).
                        // The random spin symbols follow.
                        // The data.game.scr symbols start after these.
                        
                        const spinIterations = 3; // Must match value in prepareReelsForSpin
                        const symbolsPerSpinSection = NUM_UNIQUE_SYMBOLS * spinIterations;
                        const currentVisibleSymbolsCount = (lastDisplayedScreen[index] || Array(numRows).fill(0)).length;

                        // This is the number of symbols *before* the target data.game.scr symbols
                        const offsetBeforeTarget = currentVisibleSymbolsCount + symbolsPerSpinSection;
                        const targetSymbolOffset = offsetBeforeTarget * SYMBOL_HEIGHT;
                        
                        console.log(`Reel ${index + 1}: Applying transform. Current transform: ${reelStripDiv.style.transform}. Target offset: -${targetSymbolOffset}px.`);
                        reelStripDiv.style.transform = `translateY(-${targetSymbolOffset}px)`;
                        
                        // After the transition completes, update lastDisplayedScreen
                        // and re-render to a shorter, cleaner strip showing only the final result
                        if (index === newReels.length - 1) { // Only do this for the last reel to stop
                            console.log(`Attaching transitionend listener to reel ${index + 1} (last reel).`);
                            reelStripDiv.addEventListener('transitionend', function handler() {
                                reelStripDiv.removeEventListener('transitionend', handler);
                                lastDisplayedScreen = data.game.scr; // Update last displayed screen
                                console.log('After transitionend: lastDisplayedScreen updated to:', JSON.parse(JSON.stringify(lastDisplayedScreen)));
                                displayReels(lastDisplayedScreen); // Redraw with minimal strip

                                balanceSpan.textContent = (data.wallet || 0).toFixed(2);
                                if (data.game.gain > 0) {
                                    lastWinningAmount = data.game.gain;
                                }
                                lastWinSpan.textContent = lastWinningAmount.toFixed(2);

                                let message = `Spun! Gain: $${(data.game.gain || 0).toFixed(2)}. `;
                                if (data.wins && data.wins.length > 0) {
                                    message += `Wins: ${data.wins.length} lines.`;
                                    gameStatusDiv.style.color = 'green';
                                } else {
                                    message += `No win.`;
                                    gameStatusDiv.style.color = 'orange';
                                }
                                gameStatusDiv.textContent = message;
                            });
                        }

                    }, currentReelStopDelay);
                    currentReelStopDelay += staggerDelayPerReel;
                });
            }, initialSpinDuration);

        } catch (error) {
            console.error('Error performing slot spin:', error);
            gameStatusDiv.textContent = `Failed to perform spin: ${error.message}`;
            gameStatusDiv.style.color = 'red';
        } finally {
            spinButton.disabled = false; // Re-enable button
        }
    });
});