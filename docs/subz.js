function clearPlan() {
    localStorage.removeItem('savedPlan');
    localStorage.removeItem('savedPositions');
    document.getElementById('planOutput').innerHTML = '';
}

document.addEventListener('DOMContentLoaded', function () {
    const totalPlayersInput = document.getElementById('total_players');
    const useCustomNamesCheckbox = document.getElementById('use_custom_names');
    const playerNamesDiv = document.getElementById('player_names');
    const goalkeeperSelect = document.getElementById('goalkeeper_name');
    const excludedSelect = document.getElementById('excluded_player');

    // *** ADDED: Create Save Positions button dynamically and append it ***
    const savePositionsBtn = document.createElement('button');
    savePositionsBtn.id = 'savePositionsBtn';
    savePositionsBtn.textContent = 'Save Positions';
    // Insert button below the planOutput container
    const planOutput = document.getElementById('planOutput');
    document.getElementById('subForm').appendChild(savePositionsBtn);


    function updatePlayerFields() {
        const total = parseInt(totalPlayersInput.value);
        playerNamesDiv.innerHTML = '';

        const players = [];
        for (let i = 0; i < total; i++) {
            const name = useCustomNamesCheckbox.checked ? '' : `Player ${i + 1}`;
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = `Player ${i + 1}`;
            input.value = name;
            input.dataset.index = i;
            playerNamesDiv.appendChild(input);
            players.push(input);
        }

        updateDropdowns(players);
    }

    function updateDropdowns(playerInputs) {
        goalkeeperSelect.innerHTML = '';
        excludedSelect.innerHTML = '<option value="None">None</option>';

        playerInputs.forEach((input, i) => {
            const name = input.value || `Player ${i + 1}`;
            const option1 = new Option(name, name);
            const option2 = new Option(name, name);
            goalkeeperSelect.appendChild(option1);
            excludedSelect.appendChild(option2);
        });
    }

    playerNamesDiv.addEventListener('input', () => {
        const inputs = Array.from(playerNamesDiv.querySelectorAll('input'));
        updateDropdowns(inputs);
    });

    totalPlayersInput.addEventListener('change', updatePlayerFields);
    useCustomNamesCheckbox.addEventListener('change', updatePlayerFields);
    updatePlayerFields();

    document.getElementById('subForm').addEventListener('submit', function (e) {
        e.preventDefault();
        const inputs = Array.from(playerNamesDiv.querySelectorAll('input'));
        const players = inputs.map((input, i) => input.value || `Player ${i + 1}`);
        const goalkeeper = goalkeeperSelect.value;
        const excluded = excludedSelect.value;

        const onField = parseInt(document.getElementById('on_field').value);
        const totalMinutes = parseInt(document.getElementById('total_minutes').value);
        const subInterval = parseFloat(document.getElementById('sub_interval').value);

        function generatePlan(players, onField, totalMinutes, subInterval, goalkeeper, excluded) {
            if (!players.includes(goalkeeper)) {
                return "<p>Error: Goalkeeper must be one of the players.</p>";
            }

            const outfieldPlayers = players.filter(p => p !== goalkeeper);
            if (excluded !== "None") {
                const index = outfieldPlayers.indexOf(excluded);
                if (index > -1) outfieldPlayers.splice(index, 1);
            }

            const intervals = Math.ceil(totalMinutes / subInterval);
            const playerMinutes = Object.fromEntries(players.map(p => [p, 0]));
            const rotation = [];

            let previousPlayers = [];

            for (let interval = 0; interval < intervals; interval++) {
                const start = (interval * (onField - 1)) % outfieldPlayers.length;
                const currentPlayers = [goalkeeper];

                if (interval === 1 && excluded !== "None") {
                    outfieldPlayers.push(excluded);
                }

                for (let i = 0; i < onField - 1; i++) {
                    const player = outfieldPlayers[(start + i) % outfieldPlayers.length];
                    currentPlayers.push(player);
                    playerMinutes[player] += subInterval;
                }
                playerMinutes[goalkeeper] += subInterval;

                const subOut = interval > 0 ? previousPlayers.filter(p => !currentPlayers.includes(p)) : [];
                const subIn = interval > 0 ? currentPlayers.filter(p => !previousPlayers.includes(p)) : [];

                rotation.push({
                    interval: interval + 1,
                    start: interval * subInterval,
                    end: (interval + 1) * subInterval,
                    players: currentPlayers,
                    subOut,
                    subIn
                });

                previousPlayers = currentPlayers;
            }

            let output = "<h3>Substitution Plan</h3>";
            rotation.forEach(r => {
                output += `<h4>Interval ${r.interval} (${r.start} - ${r.end} mins)</h4>`;
                output += `<p><strong>Players on field:</strong>`;

                let row = '';
                r.players.forEach((player, index) => {
                    row += `
                        <span><strong>${player}</strong>
                        <input type="text" maxlength="2" placeholder="00" class="player-input" data-interval="${r.interval}" data-player="${player}" />
                        </span>
                    `;

                    if ((index + 1) % 4 === 0 || index === r.players.length - 1) {
                        output += `<div class="player-row">${row}</div>`;
                        row = '';
                    }
                });

                if (r.subIn.length || r.subOut.length) {
                    output += `<p><strong>Subbed In:</strong> ${r.subIn.join(', ')}</p>`;
                    output += `<p><strong>Subbed Out:</strong> ${r.subOut.join(', ')}</p>`;
                }
                output += "<hr>";
            });

            output += "<h3>Total Minutes Per Player</h3><ul>";
            for (const [player, minutes] of Object.entries(playerMinutes)) {
                output += `<li>${player}: ${minutes} mins</li>`;
            }
            output += "</ul>";

            return output;
        }

        const output = generatePlan(players, onField, totalMinutes, subInterval, goalkeeper, excluded);
        const container = document.getElementById('planOutput');
        container.innerHTML = output;
        localStorage.setItem('savedPlan', output);

        // Save position inputs after a short delay (inputs are just added)
        setTimeout(() => {
            const inputs = container.querySelectorAll('.player-input');
            const positionsData = {};
            inputs.forEach(input => {
                const interval = input.dataset.interval;
                const player = input.dataset.player;
                positionsData[`${interval}_${player}`] = input.value;
            });
            localStorage.setItem('savedPositions', JSON.stringify(positionsData));
        }, 100);
    });

    // *** ADDED: Save Positions button click handler ***
    savePositionsBtn.addEventListener('click', () => {
        const container = document.getElementById('planOutput');
        const inputs = container.querySelectorAll('.player-input');
        const positionsData = {};

        inputs.forEach(input => {
            const interval = input.dataset.interval;
            const player = input.dataset.player;
            positionsData[`${interval}_${player}`] = input.value;
        });

        localStorage.setItem('savedPositions', JSON.stringify(positionsData));
        alert('Positions saved!');
    });

    // Load saved plan and positions on page load
    const savedPlan = localStorage.getItem('savedPlan');
    if (savedPlan) {
        const container = document.getElementById('planOutput');
        container.innerHTML = savedPlan;

        const savedPositions = localStorage.getItem('savedPositions');
        if (savedPositions) {
            const positionsData = JSON.parse(savedPositions);
            const inputs = container.querySelectorAll('.player-input');
            inputs.forEach(input => {
                const interval = input.dataset.interval;
                const player = input.dataset.player;
                const key = `${interval}_${player}`;
                if (positionsData[key]) {
                    input.value = positionsData[key];
                }
            });
        }
    }

    const navScroll = document.querySelector('.nav-scroll-container');

    function checkScroll() {
        const scrollLeft = navScroll.scrollLeft;
        const maxScrollLeft = navScroll.scrollWidth - navScroll.clientWidth;

        if (scrollLeft >= maxScrollLeft - 1) {  // Allow slight fuzziness
            navScroll.classList.add('scrolled-end');
        } else {
            navScroll.classList.remove('scrolled-end');
        }
    }

    // Listen for scroll events
    navScroll.addEventListener('scroll', checkScroll);

    // Initial check
    checkScroll();
});
