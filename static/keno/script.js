const bearerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzbG90b3BvbCIsImV4cCI6NDg2NzQ0NzYxNywibmJmIjoxNzA2NjQ3NjE3LCJ1aWQiOjN9.6g2Hig9ErG8IbvzkPppry5F8HJsMunZPwuQzmetGh4c'; // Test token from README

document.addEventListener('DOMContentLoaded', () => {
    // Get DOM Elements
    const gameAliasTitle = document.getElementById('game-alias-title');
    const gameIdSpan = document.getElementById('game-id');
    const balanceSpan = document.getElementById('balance');
    const spinButton = document.getElementById('spinButton');
    const gameStatusDiv = document.getElementById('game-status');

    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('gid');
    const selectedAlias = params.get('alias');
    const initialWallet = parseFloat(params.get('wallet')) || 0; // Get initial wallet from URL

    // Display initial game info
    if (selectedAlias) {
        gameAliasTitle.textContent = selectedAlias;
    } else {
        gameAliasTitle.textContent = 'Keno Game';
    }
    gameIdSpan.textContent = gameId || 'N/A';
    balanceSpan.textContent = initialWallet.toFixed(2); // Initial balance from URL


    // Function to perform a Keno spin
    async function performKenoSpin() {
        if (!gameId) {
            gameStatusDiv.textContent = 'Error: No game ID available.';
            gameStatusDiv.style.color = 'red';
            return;
        }

        spinButton.disabled = true; // Disable button during spin
        gameStatusDiv.textContent = `Performing Keno spin for GID: ${gameId}...`;
        gameStatusDiv.style.color = 'blue';

        try {
            const response = await fetch('/keno/spin', { // Correct Keno spin endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${bearerToken}`
                },
                body: JSON.stringify({
                    "gid": parseInt(gameId)
                    // Add other Keno spin parameters here if needed, e.g., selected numbers, bet amount
                    // For now, let's just make a basic spin request
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            console.log('Keno Spin API Response:', data); // Log the full response

            // Update balance
            balanceSpan.textContent = data.wallet.toFixed(2);

            let message = `Keno Spun! Win: $${(data.gain || 0).toFixed(2)}. `;
            // You would parse and display Keno specific results here (e.g., drawn numbers, matched numbers)
            gameStatusDiv.textContent = message;
            gameStatusDiv.style.color = 'green';

        } catch (error) {
            console.error('Error performing Keno spin:', error);
            gameStatusDiv.textContent = `Failed to perform spin: ${error.message}`;
            gameStatusDiv.style.color = 'red';
        } finally {
            spinButton.disabled = false; // Re-enable button
        }
    }

    spinButton.addEventListener('click', performKenoSpin);
});