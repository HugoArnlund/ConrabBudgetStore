// ============================================================
// BACKGROUND.JS
// ============================================================

const sheetsUrl =
    "https://script.google.com/macros/s/AKfycbxMWjuX_Ef13wb3zKeveIjga94rIqpIr-6qkTyDefA13YKbqExggPBgzmHk-8lPs-PE/exec";


// Keep track of review window
let reviewWindowId = null;


// ============================================================
// MESSAGES
// ============================================================

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {


        // ====================================================
        // GODKÄNN CLICKED
        // ====================================================

        if (
            message.type ===
            "APPROVAL_CLICKED"
        ) {

            console.log(
                "Approval received from tab:",
                sender.tab?.id
            );


            // ------------------------------------------------
            // Save data and originating tab
            // ------------------------------------------------

            chrome.storage.local.set({

                pendingApprovalData:
                    message.data

            });


            // ------------------------------------------------
            // If review window already exists, focus it.
            // ------------------------------------------------

            if (
                reviewWindowId !== null
            ) {

                chrome.windows.update(
                    reviewWindowId,
                    {
                        focused: true
                    }
                )
                .catch(() => {

                    reviewWindowId =
                        null;

                    openReviewWindow();

                });

            } else {

                openReviewWindow();

            }


            return;
        }


        // ====================================================
        // SEND TO GOOGLE SHEETS
        // ====================================================

        if (
            message.type ===
            "SEND_TO_SHEETS"
        ) {

            postToSheets(
                message.data
            )

                .then(result => {

                    sendResponse({

                        success: true,

                        result

                    });

                })

                .catch(error => {

                    console.error(
                        "Google Sheets error:",
                        error
                    );


                    sendResponse({

                        success: false,

                        error:
                            error.message

                    });

                });


            // Keep sendResponse alive
            return true;
        }
    }
);


// ============================================================
// OPEN REVIEW WINDOW
// ============================================================

function openReviewWindow() {

    chrome.windows.create({

        url:
            chrome.runtime.getURL(
                "review.html"
            ),

        type: "popup",

        width: 800,

        height: 750

    })
    .then(window => {

        reviewWindowId =
            window.id;

    })
    .catch(error => {

        console.error(
            "Could not open review window:",
            error
        );

    });
}


// ============================================================
// REVIEW WINDOW CLOSED
// ============================================================

chrome.windows.onRemoved.addListener(
    windowId => {

        if (
            windowId ===
            reviewWindowId
        ) {

            reviewWindowId =
                null;
        }
    }
);


// ============================================================
// POST TO GOOGLE SHEETS
// ============================================================

async function postToSheets(data) {

    console.log(
        "Posting to Google Sheets:",
        data
    );


    const response =
        await fetch(
            sheetsUrl,
            {

                method: "POST",

                headers: {

                    "Content-Type":
                        "text/plain;charset=utf-8"

                },

                body:
                    JSON.stringify(data)

            }
        );


    const text =
        await response.text();


    console.log(
        "Google response:",
        text
    );


    let result;


    try {

        result =
            JSON.parse(text);

    } catch {

        throw new Error(
            "Google returned non-JSON response: " +
            text
        );
    }


    if (
        !result.success
    ) {

        throw new Error(
            result.error ||
            "Google Sheets error"
        );
    }


    return result;
}