async function get_contests() {
    const url = `https://raw.githubusercontent.com/sion-k/iguana-scoreboard/refs/heads/main/contests.json`;
    const response = await fetch(url);
    const contests = await response.json();
    return contests;
}

function parse_group_practice_id(row) {
    const href = row.children[0].children[0].getAttribute('href');
    const match = href.match(/\/group\/practice\/view\/(\d+)\/(\d+)/);

    if (match) {
        const groupId = match[1]; // First integer
        const practiceId = match[2]; // Second integer

        return [groupId, practiceId];
    } else {
        throw new Error('Cannot parse group/practice id');
    }
}

function get_practice(group_id, practice_id) {
    const practice =
        JSON.parse(
            localStorage.getItem(
                `iguana/group/${group_id}/practice/${practice_id}`
            )
        ) || {};
    return practice;
}

async function display() {
    /*
    [
        {
            "contest_id": "ser2021-div2",
            "contest_name": "2021 Southeast USA Regional Programming Contest Division 2",
            "location": "ser2021-div2.json"
        },
        {
            "contest_id": "ser2022-div2",
            "contest_name": "2022 Southeast USA Regional Programming Contest Division 2",
            "location": "ser2022-div2.json"
        }
    ]
    */
    const contests = await get_contests();

    const contest_name_id_dict = {};
    contests.forEach((contest) => {
        contest_name_id_dict[contest['contest_name']] = contest['contest_id'];
    });

    const table = document.querySelector(
        'body > div.wrapper > div.container.content > div > div:nth-child(4) > div > table'
    );
    if (!table) {
        return;
    }

    // Check if the table exists
    // Get all the rows in the tbody
    const rows = table.querySelectorAll('tbody tr');

    // Loop through each row and add a new cell
    rows.forEach((row, index) => {
        const newCell = document.createElement('td');
        const input = document.createElement('input');
        // add input to textoverflow
        input.style.textOverflow = 'ellipsis';
        input.setAttribute('list', 'contest-options');

        const datalist = document.createElement('datalist');
        datalist.id = 'contest-options';

        const options = [...Object.keys(contest_name_id_dict)];
        options.forEach((option) => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            datalist.appendChild(optionElement);
        });

        const [groupId, practiceId] = parse_group_practice_id(row);
        const practice = get_practice(groupId, practiceId);

        input.value = practice['contest_name'] || '';

        newCell.appendChild(input);
        newCell.appendChild(datalist);
        const practice_start =
            row.children[1].children[0].getAttribute('data-timestamp');
        const practice_end =
            row.children[2].children[0].getAttribute('data-timestamp');

        practice['practice_start'] = parseInt(practice_start);
        practice['practice_end'] = parseInt(practice_end);
        delete practice['competition_scoreboard'];

        localStorage.setItem(
            `iguana/group/${groupId}/practice/${practiceId}`,
            JSON.stringify(practice)
        );

        // Store data in localStorage when the selection changes
        input.addEventListener('change', () => {
            practice['contest_id'] = contest_name_id_dict[input.value];
            practice['contest_name'] =
                input.value === '' ? undefined : input.value;
            delete practice['competition_scoreboard'];
            localStorage.setItem(
                `iguana/group/${groupId}/practice/${practiceId}`,
                JSON.stringify(practice)
            );
        });

        row.appendChild(newCell);
    });
}

display();
