const sheetsUrl =
    "https://script.google.com/macros/s/AKfycbxMWjuX_Ef13wb3zKeveIjga94rIqpIr-6qkTyDefA13YKbqExggPBgzmHk-8lPs-PE/exec";

const statusElement = document.getElementById("status");
const listElement = document.getElementById("list");
const copyButton = document.getElementById("copy");


// ============================================================
// LOAD LOBARE LIST FROM GOOGLE SHEETS
// ============================================================

async function loadLobare() {

    // ----------------------------------------------------
    // Show cached list instantly, if we have one.
    // ----------------------------------------------------

    const cache =
        await chrome.storage.local.get(["cachedLobare"]);

    if (cache.cachedLobare) {

        listElement.value =
            cache.cachedLobare.join("\n");

        statusElement.textContent =
            `${cache.cachedLobare.length} lobare (cache)`;

        await navigator.clipboard.writeText(
            listElement.value
        );

    } else {

        statusElement.textContent = "Laddar...";
    }


    // ----------------------------------------------------
    // Always revalidate against Google Sheets.
    // ----------------------------------------------------

    try {

        const response =
            await fetch(sheetsUrl);

        const text =
            await response.text();

        let result;

        try {
            result = JSON.parse(text);
        } catch {
            throw new Error(
                "Google returned non-JSON response: " + text
            );
        }

        if (!result.success) {
            throw new Error(
                result.error || "Google Sheets error"
            );
        }

        listElement.value =
            result.lobare.join("\n");

        statusElement.textContent =
            `${result.lobare.length} lobare`;

        await navigator.clipboard.writeText(
            listElement.value
        );

        chrome.storage.local.set({
            cachedLobare: result.lobare
        });

    } catch (error) {

        if (cache.cachedLobare) {

            statusElement.textContent +=
                " (kunde inte uppdatera: " +
                error.message +
                ")";

        } else {

            statusElement.textContent =
                "Fel: " + error.message;
        }
    }
}


// ============================================================
// COPY LIST
// ============================================================

copyButton.addEventListener("click", async () => {

    await navigator.clipboard.writeText(
        listElement.value
    );

    statusElement.textContent =
        "Kopierat till urklipp.";
});


loadLobare();

