// Select the table element
const table = document.querySelector(
    'body > div.wrapper > div.container.content > div > div:nth-child(4) > div > table'
);

function get_contests() {
    const options = {
        '2022 Southeast USA Regional Programming Contest Division 2':
            'ser2022-div2',
        '2021 Southeast USA Regional Programming Contest Division 2':
            'ser2021-div2',
        '2020 Southeast USA Regional Programming Contest Division 2':
            'ser2020-div2',
    };

    return options;
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

const contests = get_contests();

// Check if the table exists
if (table) {
    // Get all the rows in the tbody
    const rows = table.querySelectorAll('tbody tr');

    // Loop through each row and add a new cell
    rows.forEach((row, index) => {
        const newCell = document.createElement('td');
        const select = document.createElement('select');

        const options = ['없음', ...Object.keys(contests)];
        options.forEach((option) => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            select.appendChild(optionElement);
        });

        const [groupId, practiceId] = parse_group_practice_id(row);
        const practice = get_practice(groupId, practiceId);

        select.value = practice['contest_name'] || options[0]; // Default to the first option
        /*
        <tr class="">
            <td><a href="/group/practice/view/13872/65">2022 Southeast USA Regional Programming Contest DIvision 2</a></td>
            <td><span data-timestamp="1727757000" class="update-local-time" data-remove-second="true">2024년 10월 1일 13:30</span>
            </td>
            <td><span data-timestamp="1727767800" class="update-local-time" data-remove-second="true">2024년 10월 1일 16:30</span>
            </td>
            <td>종료</td>
            <td><a href="/status?group_id=13872&amp;practice_id=65">채점 현황</a></td>
            <td><a href="/group/practice/edit/13872/65">수정</a></td>
            <td><select>
                    <option value="없음">없음</option>
                    <option value="2022 Southeast USA Regional Programming Contest Division 2">2022 Southeast USA Regional
                        Programming Contest Division 2</option>
                    <option value="2021 Southeast USA Regional Programming Contest Division 2">2021 Southeast USA Regional
                        Programming Contest Division 2</option>
                    <option value="2020 Southeast USA Regional Programming Contest Division 2">2020 Southeast USA Regional
                        Programming Contest Division 2</option>
                </select></td>
        </tr>
        */
        const practice_start =
            row.children[1].children[0].getAttribute('data-timestamp');
        const practice_end =
            row.children[2].children[0].getAttribute('data-timestamp');

        practice['practice_start'] = parseInt(practice_start);
        practice['practice_end'] = parseInt(practice_end);
        localStorage.setItem(
            `iguana/group/${groupId}/practice/${practiceId}`,
            JSON.stringify(practice)
        );

        // Store data in localStorage when the selection changes
        select.addEventListener('change', () => {
            practice['contest_id'] = contests[select.value];
            practice['contest_name'] =
                select.value === '없음' ? undefined : select.value;
            console.log(practice);
            localStorage.setItem(
                `iguana/group/${groupId}/practice/${practiceId}`,
                JSON.stringify(practice)
            );
        });

        newCell.appendChild(select);
        row.appendChild(newCell);
    });
}
