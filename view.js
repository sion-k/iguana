async function get_competition_scoreboard(contest_id) {
    const practice = JSON.parse(
        localStorage.getItem(`iguana/group/${groupId}/practice/${practiceId}`)
    );

    if ('competition_scoreboard' in practice) {
        return practice['competition_scoreboard'];
    } else {
        const url = `https://raw.githubusercontent.com/sion-k/iguana-scoreboard/refs/heads/main/${contest_id}.json`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            console.log(data);
            practice['competition_scoreboard'] = data;
            localStorage.setItem(
                `iguana/group/${groupId}/practice/${practiceId}`,
                JSON.stringify(practice)
            );
            return data; // Return the data for further processing
        } catch (error) {
            console.error('Error fetching the scoreboard:', error);
        }
    }
}

function rewind(scoreboard, now) {
    const new_scoreboard = JSON.parse(JSON.stringify(scoreboard));

    new_scoreboard['standings'] = new_scoreboard['standings'].map(
        (standing) => {
            standing['judge'] = standing['judge'].map((judge) => {
                if (judge['status'] === 'wronganswer') {
                    judge['time'] = scoreboard['duration'];
                }
                return judge;
            });

            standing['judge'] = standing['judge'].map((judge) => {
                if (judge['status'] !== null && now < judge['time']) {
                    judge['status'] = 'wronganswer';
                    if (now < judge['time'] / judge['submission']) {
                        judge['status'] = null;
                    }
                    judge['submission'] = Math.floor(
                        now / (parseFloat(judge['time']) / judge['submission'])
                    );
                    judge['time'] = null;
                    judge['penalty'] = null;
                }
                return judge;
            });
            standing['solve'] = standing['judge'].filter(
                (judge) => judge['status'] === 'accepted'
            ).length;
            standing['penalty'] = standing['judge']
                .filter((judge) => judge['status'] === 'accepted')
                .reduce((acc, judge) => acc + judge['penalty'], 0);

            return standing;
        }
    );

    new_scoreboard['standings'].sort((a, b) => {
        if (a['solve'] !== b['solve']) {
            return b['solve'] - a['solve'];
        } else {
            return a['penalty'] - b['penalty'];
        }
    });

    return new_scoreboard;
}

function get_practice_scoreboard() {
    const practice = JSON.parse(
        localStorage.getItem(`iguana/group/${groupId}/practice/${practiceId}`)
    );

    if ('practice_scoreboard' in practice) {
        return practice['practice_scoreboard'];
    } else {
        const results = scrape();
        const scoreboard = parse(results);
        practice['practice_scoreboard'] = scoreboard;

        localStorage.setItem(
            `iguana/group/${groupId}/practice/${practiceId}`,
            JSON.stringify(practice)
        );
        return scoreboard;
    }
}

/*
[
    ['랭킹', '아이디', 'A', 'B', ''],
    [1, 'siok', '2 / 37', '1 / 12', '3 / 49'],
    [null, null, 'accepted', 'wronganswer', null]
]
*/
function scrape() {
    const results = [];

    const table = document.querySelector('#contest_scoreboard');

    const head = table.querySelector('thead tr');
    const headers = Array.from(head.querySelectorAll('th')).map((th) =>
        th.textContent.trim()
    );
    results.push(headers);

    const body = table.querySelector('tbody');
    const rows = Array.from(body.querySelectorAll('tr'));
    rows.forEach((row) => {
        const heads = Array.from(row.querySelectorAll('th')).map((th) =>
            th.textContent.trim()
        );
        const cells = Array.from(row.querySelectorAll('td')).map((td) =>
            td.textContent.trim()
        );
        const color = Array.from(row.querySelectorAll('td')).map((td) =>
            td.getAttribute('class')
        );
        results.push([...heads, ...cells]);
        results.push([null, null, ...color]);
    });

    return results;
}

function parse(table) {
    const scoreboard = {};

    scoreboard['contestants'] = [];
    for (let i = 1; i < table.length; i += 2) {
        const [_, contestant_id, ...rest] = table[i];
        scoreboard['contestants'].push({
            contestant_id,
            contestant_name: contestant_id,
        });
    }

    scoreboard['problems'] = [];
    const [_rank, _id, ...problems] = table[0];
    for (let i = 0; i < problems.length - 1; i++) {
        const problem_id = problems[i];
        scoreboard['problems'].push({ problem_id });
    }

    scoreboard['standings'] = [];
    for (let i = 1; i < table.length; i += 2) {
        const [_, contestant_id, ...rest] = table[i];

        const judge = [];
        for (let j = 0; j < problems.length - 1; j++) {
            const problem_id = table[0][j + 2];
            const status = table[i + 1][j + 2];
            const [submission, penalty] = rest[j]
                .split('/')
                .map((x) => x.trim())
                .map((x) => (isNaN(parseInt(x)) ? null : parseInt(x)));
            const time =
                penalty !== null ? penalty - (submission - 1) * 20 : null;
            judge.push({
                problem_id,
                problem_name: problem_id,
                status,
                submission,
                time,
                penalty,
            });
        }

        const [solve, penalty] = rest[rest.length - 1]
            .split('/')
            .map((x) => x.trim())
            .map((x) => (isNaN(parseInt(x)) ? null : parseInt(x)));
        scoreboard['standings'].push({
            contestant_id,
            contestant_name: contestant_id,
            solve,
            penalty,
            judge,
        });
    }

    return scoreboard;
}

function merge(scoreboard1, scoreboard2) {
    const merged = {};

    merged['contestants'] = [
        ...scoreboard1['contestants'],
        ...scoreboard2['contestants'],
    ].reduce((acc, contestant) => {
        const key = contestant['contestant_id'];
        if (!acc[key]) {
            acc[key] = contestant;
        }
        return acc;
    }, {});
    merged['contestants'] = Object.values(merged['contestants']);

    merged['problems'] = [
        ...scoreboard1['problems'],
        ...scoreboard2['problems'],
    ].reduce((acc, problem) => {
        const key = problem['problem_id'];
        if (!acc[key]) {
            acc[key] = problem;
        }
        return acc;
    }, {});
    merged['problems'] = Object.values(merged['problems']);

    merged['standings'] = [
        ...scoreboard1['standings'],
        ...scoreboard2['standings'],
    ];

    merged['standings'].sort((a, b) => {
        if (a['solve'] !== b['solve']) {
            return b['solve'] - a['solve'];
        } else {
            return a['penalty'] - b['penalty'];
        }
    });

    return merged;
}

function display(scoreboard) {
    // <table class="table table-bordered" style="width:100%;" id="contest_scoreboard">
    // create table and replace
    const table = document.createElement('table');
    table.setAttribute('class', 'table table-bordered');
    table.setAttribute('style', 'width:100%');
    table.setAttribute('id', 'contest_scoreboard');

    // copy thead from old table
    const thead = document
        .querySelector('#contest_scoreboard thead')
        .cloneNode(true);
    table.appendChild(thead);

    // take min of current problems number in html and scoreboard's problems number
    const thead_problem_count = thead.querySelectorAll('th').length - 3;
    const scoreboard_problem_count = scoreboard['problems'].length;
    const problem_min = Math.min(thead_problem_count, scoreboard_problem_count);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    // create tr for each standing
    /*
    <tr>
        <th>1</th>
        <th><a href="/user/siok">siok</a></th>
        <td class="accepted">2&nbsp;/&nbsp;37</td>
        <td class="accepted">1&nbsp;/&nbsp;12</td>
        <td>0&nbsp;/&nbsp;--</td>
        <td class="accepted">1&nbsp;/&nbsp;113</td>
        <td class="accepted">2&nbsp;/&nbsp;173</td>
        <td class="wronganswer">2&nbsp;/&nbsp;--</td>
        <td class="accepted">1&nbsp;/&nbsp;6</td>
        <td class="accepted">1&nbsp;/&nbsp;6</td>
        <td>0&nbsp;/&nbsp;--</td>
        <td class="wronganswer">1&nbsp;/&nbsp;--</td>
        <td class="accepted">4&nbsp;/&nbsp;139</td>
        <td class="wronganswer">7&nbsp;/&nbsp;--</td>
        <td class="wronganswer">2&nbsp;/&nbsp;--</td>
        <td>7&nbsp;/&nbsp;486</td>
    </tr>
    */
    scoreboard['standings'].forEach((standing, index) => {
        const tr = document.createElement('tr');
        tbody.appendChild(tr);

        const rank = document.createElement('th');
        rank.textContent = index + 1;
        tr.appendChild(rank);

        const contestant_name = document.createElement('th');
        contestant_name.textContent = standing['contestant_name'];
        tr.appendChild(contestant_name);

        standing['judge'].forEach((judge) => {
            const td = document.createElement('td');
            if (judge['status'] === 'accepted') {
                td.setAttribute('class', 'accepted');
            } else if (judge['status'] === 'wronganswer') {
                td.setAttribute('class', 'wronganswer');
            }
            const penalty = judge['penalty'] === null ? '--' : judge['penalty'];
            td.innerHTML = `${judge['submission']}&nbsp;/&nbsp;${penalty}`;
            tr.appendChild(td);
        });

        const solve = standing['solve'];
        const penalty =
            standing['penalty'] === null ? '--' : standing['penalty'];

        const td = document.createElement('td');
        td.innerHTML = `${solve}&nbsp;/&nbsp;${penalty}`;

        tr.appendChild(td);
    });

    // replace the table with new table
    const old_table = document.querySelector('#contest_scoreboard');
    old_table.parentNode.replaceChild(table, old_table);
}

function parse_group_practice_id() {
    // body > div.wrapper > div.container.content > div > div:nth-child(2) > ul > li.active > a
    const href = document
        .querySelector(
            'body > div.wrapper > div.container.content > div > div:nth-child(2) > ul > li.active > a'
        )
        .getAttribute('href');
    const match = href.match(/\/group\/practice\/view\/(\d+)\/(\d+)/);

    if (match) {
        const groupId = match[1]; // First integer
        const practiceId = match[2]; // Second integer

        return [groupId, practiceId];
    } else {
        throw new Error('Cannot parse group/practice id');
    }
}

const [groupId, practiceId] = parse_group_practice_id();
const practice = JSON.parse(
    localStorage.getItem(`iguana/group/${groupId}/practice/${practiceId}`)
);

const timeSlider = document.createElement('input');
timeSlider.type = 'range';
timeSlider.min = 0;
timeSlider.max = (practice['practice_end'] - practice['practice_start']) / 60;
timeSlider.value = timeSlider.max;

async function draw(contest_id, time_passed) {
    const competition_scoreboard = await get_competition_scoreboard(contest_id);
    if ('contest_id' in practice && competition_scoreboard) {
        const competition = rewind(competition_scoreboard, time_passed);
        const practice = get_practice_scoreboard();

        const virtual = merge(competition, practice);
        display(virtual);
    }
}

timeSlider.addEventListener('input', () => {
    draw(practice['contest_id'], parseInt(timeSlider.value));
});

document
    .querySelector(
        'body > div.wrapper > div.container.content > div > div.col-md-10 > div.table-responsive'
    )
    .prepend(timeSlider);

draw(practice['contest_id'], parseInt(timeSlider.value));
