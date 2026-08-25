// ============================================================
// REVIEW.JS
// ============================================================

const statusElement = document.getElementById("status");
const errorElement = document.getElementById("error");
const sheetTable = document.getElementById("sheet-table");
const sendSheetsButton = document.getElementById("sendSheets");
const cancelButton = document.getElementById("cancel");

let rows = [];


// ============================================================
// LOAD PENDING APPROVAL DATA
// ============================================================

chrome.storage.local.get(
    ["pendingApprovalData"],
    result => {

        rows = result.pendingApprovalData || [];

        if (!rows.length) {

            statusElement.textContent =
                "Ingen väntande data hittades.";

            return;
        }

        renderRows();

        statusElement.textContent =
            `${rows.length} rader inlästa.`;

        sendSheetsButton.disabled = false;
    }
);


// ============================================================
// RENDER ROWS
// ============================================================

function renderRows() {

    sheetTable.innerHTML = "";

    const fields = Object.keys(rows[0]);


    // ----------------------------------------------------
    // Header
    // ----------------------------------------------------

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    const numberHeader = document.createElement("th");
    numberHeader.textContent = "#";
    headerRow.appendChild(numberHeader);

    fields.forEach(field => {
        const th = document.createElement("th");
        th.textContent = field;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    sheetTable.appendChild(thead);


    // ----------------------------------------------------
    // Body
    // ----------------------------------------------------

    const tbody = document.createElement("tbody");

    rows.forEach((row, index) => {

        const tr = document.createElement("tr");

        const numberCell = document.createElement("td");
        numberCell.className = "row-number";
        numberCell.textContent = index + 1;
        tr.appendChild(numberCell);

        fields.forEach(field => {

            const td = document.createElement("td");

            const input = document.createElement("input");
            input.type = "text";
            input.value = row[field];

            input.addEventListener("input", () => {
                rows[index][field] = input.value;
            });

            td.appendChild(input);
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    sheetTable.appendChild(tbody);
}


// ============================================================
// SHOW MESSAGE
// ============================================================

function showError(message) {
    errorElement.innerHTML =
        `<div class="error">${message}</div>`;
}

function showSuccess(message) {
    errorElement.innerHTML =
        `<div class="success">${message}</div>`;
}


// ============================================================
// SKICKA TILL GOOGLE SHEETS BUTTON
// ============================================================

sendSheetsButton.addEventListener("click", () => {

    sendSheetsButton.disabled = true;

    chrome.runtime.sendMessage(
        {
            type: "SEND_TO_SHEETS",
            data: rows
        },
        response => {

            if (!response || !response.success) {

                sendSheetsButton.disabled = false;

                showError(
                    "Kunde inte skicka till Google Sheets: " +
                    (response?.error || "Okänt fel")
                );

                return;
            }

            window.close();
        }
    );
});


// ============================================================
// AVBRYT BUTTON
// ============================================================

cancelButton.addEventListener("click", () => {
    window.close();
});
