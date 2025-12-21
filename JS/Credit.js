// --- JS/Credit.js ---

document.addEventListener('DOMContentLoaded', () => {
    // This function will be used to attach the event listener.
    const setupCreditButton = () => {
        const creditBtn = document.getElementById('credit-btn');
        if (creditBtn) {
            creditBtn.addEventListener('click', () => {
                //copyright info.
                alert("Copyright © Joshua Z 2025");
            });
        }
    };

    // Call the function to set up the button.
    setupCreditButton();
});