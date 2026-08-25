// ============================================================
// CONTENT.JS
// ============================================================


// ============================================================
// "SKICKA TILL GOOGLE SHEETS" TOOLBAR BUTTON
// ============================================================

function insertSheetsButtons() {

    const reminderSpans =
        document.querySelectorAll(
            'span[data-testid="document-reminder-dropdown"]'
        );

    reminderSpans.forEach(
        reminderSpan => {

            if (!reminderSpan.parentElement) {
                return;
            }

            const alreadyInserted =
                reminderSpan
                    .parentElement
                    .querySelector(
                        ":scope > .sheets-toolbar-button"
                    );

            if (alreadyInserted) {
                return;
            }


            const wrapper =
                document.createElement("span");

            wrapper.className =
                "sheets-toolbar-button";

            wrapper.innerHTML = `
                <div class="Flex-sc-1n1nens-0 eCsstv">
                    <div class="Box-sc-gt8xp8-0 cljbiP">
                        <button data-testid="op-button" type="button"
                            class="Styles__StyledButton-sc-8j32ls-0 cRonsw"
                            title="Skicka till Google Sheets">
                            <div class="Styles__ButtonRelativeContainer-sc-8j32ls-1 cHwsqr">
                                <div class="Styles__StyledToolbarIcon-sc-11ygxzw-0 kUPfis">
                                    <span class="Styles__StyledIcon-sc-1u4bljh-1 kyddQz">
                                        <div>
                                            <svg aria-hidden="true" focusable="false" viewBox="0 0 512 512"
                                                color="#61616b" style="font-size: 24px;" width="1em" height="1em">
                                                <path fill="currentColor" d="M448 96v320c0 26.5-21.5 48-48 48H112c-26.5 0-48-21.5-48-48V96c0-26.5 21.5-48 48-48h288c26.5 0 48 21.5 48 48zM160 128v64h192v-64H160zm0 96v64h80v-64h-80zm112 0v64h80v-64h-80zm-112 96v64h80v-64h-80zm112 0v64h80v-64h-80z"></path>
                                            </svg>
                                        </div>
                                    </span>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            `;

            reminderSpan.parentElement.insertBefore(
                wrapper,
                reminderSpan
            );

            wrapper
                .querySelector("button")
                .addEventListener(
                    "click",
                    handleSheetsButtonClick
                );
        }
    );
}


function handleSheetsButtonClick(event) {

    event.preventDefault();
    event.stopPropagation();


    try {

        const result =
            extractFromPage();

        if (!result.success) {

            alert(
                "Kunde inte läsa konteringsdata:\n\n" +
                result.error
            );

            return;
        }


        const transformedData =
            transformAccountingData(
                result.data
            );


        chrome.runtime.sendMessage({

            type: "APPROVAL_CLICKED",

            data: transformedData

        });


    } catch (error) {

        alert(
            "Fel:\n\n" +
            error.message
        );
    }
}


const sheetsButtonObserver =
    new MutationObserver(() => {
        insertSheetsButtons();
    });

sheetsButtonObserver.observe(
    document.body,
    {
        childList: true,
        subtree: true
    }
);

insertSheetsButtons();


// ============================================================
// TRANSFORM ACCOUNTING DATA
// ============================================================

function transformAccountingData(data) {

    const result = [];


    // --------------------------------------------------------
    // Filter rows
    // --------------------------------------------------------

    const filteredData =
        data.filter(row => {

            const konto =
                row["Konto"];

            return (
                konto !== "4999" &&
                konto !== "2440" &&
                konto !== "2423"
            );
        });


    // --------------------------------------------------------
    // Find first 4999 row
    // --------------------------------------------------------

    const first4999Row =
        data.find(
            row => row["Konto"] === "4999"
        );


    let lobare = "";
    let supplier = "";


    if (first4999Row) {

        const description =
            first4999Row["Text"] || "";


        // Remove numeric ID prefix
        // Example: 181738/ABC AB
        const name =
            description.replace(
                /^\d+\//,
                ""
            );


        if (
            name.endsWith(" LoB")
        ) {

            lobare =
                name.slice(0, -4);

        } else {

            supplier =
                name;
        }
    }


    // --------------------------------------------------------
    // Calculate Q
    //
    // Q3 = Jan-Mar
    // Q4 = Apr-Jun
    // Q1 = Jul-Sep
    // Q2 = Oct-Dec
    // --------------------------------------------------------

    let q = "";


    if (first4999Row) {

        const timestamp =
            first4999Row[
                "Skapad / Ändrad (timestamp)"
            ];


        const date =
            new Date(timestamp);


        if (!isNaN(date.getTime())) {

            const month =
                date.getMonth() + 1;


            if (
                month >= 1 &&
                month <= 3
            ) {

                q = "Q3";

            } else if (
                month >= 4 &&
                month <= 6
            ) {

                q = "Q4";

            } else if (
                month >= 7 &&
                month <= 9
            ) {

                q = "Q1";

            } else {

                q = "Q2";
            }
        }
    }


    // --------------------------------------------------------
    // Create transformed rows
    // --------------------------------------------------------

    for (const row of filteredData) {

        const transformedRow = {

            "Datum":
                parseDate(
                    row[
                        "Skapad / Ändrad (timestamp)"
                    ]
                ),

            "Leverantör":
                supplier,

            "Konto":
                row["Konto"] || "",

            "Belopp":
                row["Debet"] || "",

            "Kommentar":
                "",

            "Lobare":
                lobare,

            "Q":
                q
        };


        result.push(
            transformedRow
        );
    }


    return result;
}


// ============================================================
// PARSE DATE
// ============================================================

function parseDate(timestamp) {

    if (!timestamp) {
        return "";
    }


    const months = {

        januari: "01",
        februari: "02",
        mars: "03",
        april: "04",
        maj: "05",
        juni: "06",
        juli: "07",
        augusti: "08",
        september: "09",
        oktober: "10",
        november: "11",
        december: "12"

    };


    const match =
        timestamp.match(
            /den (\d{1,2}) (\w+) (\d{4})/
        );


    if (!match) {
        return "";
    }


    const [
        ,
        day,
        month,
        year
    ] = match;


    return (
        `${day.padStart(2, "0")}/` +
        `${months[month] || ""}/` +
        `${year}`
    );
}


// ============================================================
// EXTRACT DATA FROM OPTO PAGE
// ============================================================

function extractFromPage() {

    try {

        // ----------------------------------------------------
        // Find visible optoView
        // ----------------------------------------------------

        const views = [
            ...document.querySelectorAll(
                '.app-content.DocumentIndex[id^="optoView"]'
            )
        ];


        const visibleView =
            views.find(view => {

                const style =
                    getComputedStyle(view);


                return (

                    style.display !== "none" &&

                    style.visibility !== "hidden" &&

                    view.getClientRects().length > 0

                );
            });


        if (!visibleView) {

            return {

                success: false,

                error:
                    "No visible optoView found."

            };
        }


        // ----------------------------------------------------
        // Find tables
        // ----------------------------------------------------

        const headerTable =
            visibleView.querySelector(
                ".op-table-header"
            );


        const dataTable =
            visibleView.querySelector(
                ".op-table-rows"
            );


        if (
            !headerTable ||
            !dataTable
        ) {

            return {

                success: false,

                error:
                    `No table found inside ${visibleView.id}.`

            };
        }


        // ----------------------------------------------------
        // Extract headers
        // ----------------------------------------------------

        const headers = [

            ...headerTable.querySelectorAll(
                "thead th"
            )

        ]

            .map(th => {

                const sortElement =
                    th.querySelector(
                        "[data-opto-table-sort]"
                    );


                return sortElement

                    ? sortElement.textContent
                        .trim()
                        .replace(
                            /\s+/g,
                            " "
                        )

                    : null;

            })

            .filter(Boolean);


        // ----------------------------------------------------
        // Extract rows
        // ----------------------------------------------------

        const rows = [

            ...dataTable.querySelectorAll(
                "tbody > tr"
            )

        ];


        const data =
            rows.map(row => {

                const cells =
                    [...row.children];


                // --------------------------------------------
                // Remove selector/details and actions
                // --------------------------------------------

                const dataCells =
                    cells

                        .slice(1, -1)

                        .filter(
                            cell =>
                                !cell.classList.contains(
                                    "inline-edit"
                                )
                        );


                const result = {};


                // --------------------------------------------
                // Normal table columns
                // --------------------------------------------

                headers.forEach(
                    (header, index) => {

                        const cell =
                            dataCells[index];


                        result[header] =
                            cell

                                ? cell.innerText
                                    .trim()
                                    .replace(
                                        /\s+/g,
                                        " "
                                    )

                                : "";
                    }
                );


                // --------------------------------------------
                // Created / changed
                // --------------------------------------------

                const details =
                    cells[0]
                        ?.querySelector(
                            ".details"
                        );


                const detailSpans =
                    details

                        ? [
                            ...details.querySelectorAll(
                                ":scope > span"
                            )
                        ]

                        : [];


                const createdInfo =
                    detailSpans[0];


                const userInfo =
                    detailSpans[1];


                result[
                    "Skapad / Ändrad"
                ] =

                    createdInfo

                        ?.querySelector(
                            ".subtle-text"
                        )
                        ?.textContent
                        ?.trim()

                    || "";


                result[
                    "Skapad / Ändrad (timestamp)"
                ] =

                    createdInfo

                        ?.querySelector(
                            "[data-tooltip]"
                        )
                        ?.getAttribute(
                            "data-tooltip"
                        )

                    || "";


                result[
                    "Skapad / Ändrad av"
                ] =

                    userInfo

                        ?.querySelector(
                            "[data-tooltip]"
                        )
                        ?.getAttribute(
                            "data-tooltip"
                        )

                    || "";


                result[
                    "Skapad / Ändrad av (namn)"
                ] =

                    userInfo

                        ?.querySelector(
                            ".subtle-text"
                        )
                        ?.textContent
                        ?.trim()
                        .replace(
                            /^\(|\)$/g,
                            ""
                        )

                    || "";


                // --------------------------------------------
                // Approval status
                // --------------------------------------------

                const approval =
                    cells[cells.length - 1]
                        ?.querySelector(
                            ".approvalLog-btn"
                        );


                if (
                    approval?.classList.contains(
                        "approved"
                    )
                ) {

                    result[
                        "Kontering status"
                    ] =
                        "Godkänd";


                } else if (
                    approval?.classList.contains(
                        "to-be-approved-by-me"
                    )
                ) {

                    result[
                        "Kontering status"
                    ] =
                        "Att godkännas av mig";


                } else {

                    result[
                        "Kontering status"
                    ] =
                        "";
                }


                return result;

            });


        return {

            success: true,

            viewId:
                visibleView.id,

            headers,

            rowCount:
                data.length,

            data

        };


    } catch (error) {

        return {

            success: false,

            error:
                error.message

        };
    }
}