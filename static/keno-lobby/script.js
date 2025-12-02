document.addEventListener('DOMContentLoaded', () => {
    const gamesContainer = document.getElementById('games-container');
    const apiUrl = '/game/algs'; // Endpoint to fetch all game algorithms

    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            gamesContainer.innerHTML = ''; // Clear "Loading Keno games..."
            let kenoGamesFound = false;

            if (data && data.length > 0) {
                data.forEach(game => {
                    // Filter for Keno games (assuming gt: 2 is Keno)
                    // Or you can check if alias contains "keno"
                    if (game.gt === 2 && game.aliases && game.aliases.length > 0) { // Assuming gt 2 is Keno
                        kenoGamesFound = true;
                        game.aliases.forEach(alias => {
                            const gameCard = document.createElement('div');
                            gameCard.classList.add('game-card');
                            const fullAlias = `${alias.prov || 'N/A'}/${alias.name || 'N/A'}`;
                            gameCard.innerHTML = `
                                <h2><a href="/static/game-launcher/index.html?alias=${encodeURIComponent(fullAlias)}">${fullAlias}</a></h2>
                                <p>Provider: ${alias.prov || 'N/A'}</p>
                            `;
                            gamesContainer.appendChild(gameCard);
                        });
                    }
                });
            }

            if (!kenoGamesFound) {
                gamesContainer.innerHTML = '<p>No Keno games found.</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching Keno games:', error);
            gamesContainer.innerHTML = `<p class="error-message">Failed to load Keno games: ${error.message}.</p>`;
        });
});
