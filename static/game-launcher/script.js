const bearerToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzbG90b3BvbCIsImV4cCI6MTc2NDcwMTUzMSwibmJmIjoxNzY0NjE1MTMxLCJ1aWQiOjF9.CfJEwWCM77KNNy881_UawP_BqKcmyFdIxrVM_5wd4WE';

document.addEventListener('DOMContentLoaded', () => {
    const gameAliasSpan = document.getElementById('game-alias');
    const startGameButton = document.getElementById('startGameButton');
    const addCoinsButton = document.getElementById('addCoinsButton'); // New
    const statusMessageDiv = document.getElementById('status-message');
    const walletStatusMessageDiv = document.getElementById('wallet-status-message'); // New

    const params = new URLSearchParams(window.location.search);
    const selectedAlias = params.get('alias');

    if (selectedAlias) {
        gameAliasSpan.textContent = selectedAlias;
        startGameButton.style.display = 'block'; // Show button if alias is present
        addCoinsButton.style.display = 'block'; // Show add coins button
    } else {
        gameAliasSpan.textContent = 'No game selected.';
        startGameButton.style.display = 'none'; // Hide button if no alias
        addCoinsButton.style.display = 'none'; // Hide add coins button
        statusMessageDiv.textContent = 'Please go back to the lobby and select a game.';
        statusMessageDiv.style.color = 'orange';
    }

    startGameButton.addEventListener('click', async () => {
        if (!selectedAlias) {
            statusMessageDiv.textContent = 'Cannot start game: No alias selected.';
            statusMessageDiv.style.color = 'red';
            return;
        }

        statusMessageDiv.textContent = `Creating game for ${selectedAlias}...`;
        statusMessageDiv.style.color = 'blue';

        try {
            const response = await fetch('/game/new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${bearerToken}`
                },
                body: JSON.stringify({
                    "cid": 1, // Club ID (example from README)
                    "uid": 3, // User ID (example from README)
                    "alias": selectedAlias
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            if (data && data.gid) {
                const gameId = data.gid;
                const initialWallet = data.wallet || 0; // Get initial wallet, default to 0 if not present
                statusMessageDiv.textContent = `Game created! GID: ${gameId}. Initial Balance: $${initialWallet.toFixed(2)}. Redirecting to game...`;
                statusMessageDiv.style.color = 'green';
            
                // Determine redirection based on alias
                let redirectPath = '';
                const commonParams = `gid=${gameId}&alias=${encodeURIComponent(selectedAlias)}&wallet=${initialWallet}`;

                if (selectedAlias.toLowerCase().includes('keno')) {
                    redirectPath = `/static/keno/index.html?${commonParams}`;
                } else {
                    // Assuming all other games are slot games for now
                    redirectPath = `/static/slot-game/index.html?${commonParams}`;
                }
                window.location.href = redirectPath;
            
            } else {
                throw new Error('Failed to get GID from new game response.');
            }
        } catch (error) {
            console.error('Error creating new game:', error);
            statusMessageDiv.textContent = `Failed to create game: ${error.message}`;
            statusMessageDiv.style.color = 'red';
        }
    });

    // Event listener for Add Coins button
                addCoinsButton.addEventListener('click', async () => {
                    walletStatusMessageDiv.textContent = 'Adding 1000 coins...';
                    walletStatusMessageDiv.style.color = 'blue';
    
                    try {
                        const response = await fetch('/prop/wallet/add', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${bearerToken}`
                            },
                            body: JSON.stringify({
                                "uid": 3,   // Player User ID
                                "cid": 1,   // Club ID from README example
                                "sum": 1000 // Amount to add
                            })
                        });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const data = await response.json();
            walletStatusMessageDiv.textContent = `Successfully added 1000 coins. New balance (approx): $${data.wallet ? data.wallet.toFixed(2) : 'N/A'}`;
            walletStatusMessageDiv.style.color = 'green';
        } catch (error) {
            console.error('Error adding coins:', error);
            walletStatusMessageDiv.textContent = `Failed to add coins: ${error.message}`;
            walletStatusMessageDiv.style.color = 'red';
        }
    });
});
