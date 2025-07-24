document.addEventListener('DOMContentLoaded', () => {
    const langSelect = document.getElementById('lang-select');
    const createAgentForm = document.getElementById('create-agent-form');
    const agentNameInput = document.getElementById('agent-name');
    const agentPurposeTextarea = document.getElementById('agent-purpose');
    const automationStepsCodeTextarea = document.getElementById('automation-steps-code'); // Renamed ID
    const statusMessageDiv = document.getElementById('status-message');

    // No-Code Specific Elements
    const buildMethodRadios = document.querySelectorAll('input[name="build_method"]');
    const codeBuilderDiv = document.getElementById('code-builder');
    const noCodeBuilderDiv = document.getElementById('no-code-builder');
    const noCodeStepsContainer = document.getElementById('no-code-steps-container');
    const addNoCodeStepButton = document.getElementById('add-no-code-step');

    let translations = {}; // Stores loaded translations

    // --- Internationalization (i18n) Logic ---
    async function loadTranslations(lang) {
        try {
            const response = await fetch(`locales/${lang}/translation.json`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            translations = await response.json();
            applyTranslations();
            // Set HTML direction (dir) and lang attribute
            document.documentElement.setAttribute('lang', lang);
            document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        } catch (error) {
            console.error('Error loading translations:', error);
            // Fallback to default or show error message
        }
    }

    function applyTranslations() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (translations[key]) {
                // Handle placeholder translation for code-based textarea
                if (element.tagName === 'TEXTAREA' && element.id === 'automation-steps-code') {
                    element.placeholder = translations[key];
                } else {
                    element.textContent = translations[key];
                }
            }
        });

        // Special handling for the dynamic step numbering within no-code builder
        updateStepNumbers();
    }

    // Initialize with preferred language (e.g., from browser or default to Arabic)
    const initialLang = localStorage.getItem('appLang') || 'ar'; // Default to Arabic
    langSelect.value = initialLang;
    loadTranslations(initialLang);

    langSelect.addEventListener('change', (event) => {
        const selectedLang = event.target.value;
        localStorage.setItem('appLang', selectedLang); // Remember user's choice
        loadTranslations(selectedLang);
    });

    // --- Build Method Switching Logic ---
    buildMethodRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            if (event.target.value === 'code') {
                codeBuilderDiv.classList.remove('hidden');
                noCodeBuilderDiv.classList.add('hidden');
                automationStepsCodeTextarea.setAttribute('required', 'true');
            } else { // no-code
                codeBuilderDiv.classList.add('hidden');
                noCodeBuilderDiv.classList.remove('hidden');
                automationStepsCodeTextarea.removeAttribute('required'); // No longer required for no-code
                // Ensure no-code steps are generated if empty on switch
                if (noCodeStepsContainer.children.length === 0) {
                    addNoCodeStep();
                }
            }
        });
    });

    // --- No-Code Builder Logic ---
    addNoCodeStepButton.addEventListener('click', addNoCodeStep);

    function addNoCodeStep() {
        const stepCount = noCodeStepsContainer.children.length;
        const stepDiv = document.createElement('div');
        stepDiv.classList.add('no-code-step');
        stepDiv.setAttribute('data-step-index', stepCount);

        const stepHeader = document.createElement('div');
        stepHeader.classList.add('step-header');
        const stepTitle = document.createElement('span');
        stepTitle.textContent = translations['step_number'].replace('{{number}}', stepCount + 1);
        stepTitle.classList.add('step-title');
        const removeButton = document.createElement('button');
        removeButton.classList.add('remove-step-button');
        removeButton.textContent = 'X'; // Simple X for remove
        removeButton.addEventListener('click', () => {
            stepDiv.remove();
            updateStepNumbers(); // Re-number steps after removal
        });

        stepHeader.appendChild(stepTitle);
        stepHeader.appendChild(removeButton);
        stepDiv.appendChild(stepHeader);

        const selectType = document.createElement('select');
        selectType.classList.add('step-type-select');
        selectType.innerHTML = `
            <option value="">${translations['select_step_type']}</option>
            <option value="llm_call">${translations['step_type_llm_call']}</option>
            <option value="save_data">${translations['step_type_save_data']}</option>
            <option value="send_email">${translations['step_type_send_email']}</option>
        `;
        selectType.addEventListener('change', (event) => {
            renderStepOptions(stepDiv, event.target.value);
        });
        stepDiv.appendChild(selectType);

        // Div to hold dynamic options based on step type
        const optionsDiv = document.createElement('div');
        optionsDiv.classList.add('step-options');
        stepDiv.appendChild(optionsDiv);

        noCodeStepsContainer.appendChild(stepDiv);
        updateStepNumbers(); // Initial numbering
    }

    function renderStepOptions(stepDiv, stepType) {
        const optionsDiv = stepDiv.querySelector('.step-options');
        optionsDiv.innerHTML = ''; // Clear previous options

        if (stepType === 'llm_call') {
            optionsDiv.innerHTML = `
                <label>${translations['llm_prompt_label']}</label>
                <textarea class="llm-prompt" rows="3" required></textarea>
            `;
        } else if (stepType === 'save_data') {
            optionsDiv.innerHTML = `
                <label>${translations['data_to_save_label']}</label>
                <textarea class="data-to-save" rows="3" placeholder='{"key": "value"}' required></textarea>
            `;
        } else if (stepType === 'send_email') {
            optionsDiv.innerHTML = `
                <label>${translations['email_recipient_label']}</label>
                <input type="text" class="email-recipient" placeholder="example@domain.com" required>
                <label>${translations['email_subject_label']}</label>
                <input type="text" class="email-subject" required>
                <label>${translations['email_body_label']}</label>
                <textarea class="email-body" rows="3" required></textarea>
            `;
        }
    }

    function updateStepNumbers() {
        const steps = noCodeStepsContainer.querySelectorAll('.no-code-step');
        steps.forEach((step, index) => {
            const stepTitle = step.querySelector('.step-title');
            if (stepTitle) {
                stepTitle.textContent = translations['step_number'].replace('{{number}}', index + 1);
            }
        });
    }

    // --- Form Submission Logic ---
    createAgentForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        const agentName = agentNameInput.value.trim();
        const agentPurpose = agentPurposeTextarea.value.trim();
        let automationSteps;
        const selectedBuildMethod = document.querySelector('input[name="build_method"]:checked').value;

        if (!agentName || !agentPurpose) {
            showStatusMessage(translations['missing_fields_error'], 'error');
            return;
        }

        if (selectedBuildMethod === 'code') {
            automationSteps = automationStepsCodeTextarea.value.trim();
            if (!automationSteps) {
                showStatusMessage(translations['missing_fields_error'], 'error');
                return;
            }
            try {
                // Validate JSON format for automation steps
                JSON.parse(automationSteps);
            } catch (e) {
                showStatusMessage(translations['invalid_json_error'], 'error');
                return;
            }
        } else { // no-code
            const noCodeSteps = [];
            const stepElements = noCodeStepsContainer.querySelectorAll('.no-code-step');

            if (stepElements.length === 0) {
                showStatusMessage(translations['no_code_steps_empty_error'], 'error');
                return;
            }

            let allNoCodeFieldsFilled = true;
            stepElements.forEach(stepEl => {
                const stepType = stepEl.querySelector('.step-type-select').value;
                if (!stepType) {
                    allNoCodeFieldsFilled = false;
                    return;
                }

                let stepData = { action: stepType };
                if (stepType === 'llm_call') {
                    const prompt = stepEl.querySelector('.llm-prompt').value.trim();
                    if (!prompt) { allNoCodeFieldsFilled = false; return; }
                    stepData.prompt = prompt;
                } else if (stepType === 'save_data') {
                    const dataToSave = stepEl.querySelector('.data-to-save').value.trim();
                    if (!dataToSave) { allNoCodeFieldsFilled = false; return; }
                    try {
                        stepData.data = JSON.parse(dataToSave);
                    } catch (e) {
                        showStatusMessage(translations['invalid_json_error'], 'error');
                        allNoCodeFieldsFilled = false;
                        return;
                    }
                } else if (stepType === 'send_email') {
                    const recipient = stepEl.querySelector('.email-recipient').value.trim();
                    const subject = stepEl.querySelector('.email-subject').value.trim();
                    const body = stepEl.querySelector('.email-body').value.trim();
                    if (!recipient || !subject || !body) { allNoCodeFieldsFilled = false; return; }
                    stepData.recipient = recipient;
                    stepData.subject = subject;
                    stepData.body = body;
                }
                noCodeSteps.push(stepData);
            });

            if (!allNoCodeFieldsFilled) {
                showStatusMessage(translations['missing_fields_error'], 'error');
                return;
            }
            automationSteps = JSON.stringify(noCodeSteps); // Convert array of objects to JSON string
        }

        // Simulating API call to a backend (replace with your actual backend endpoint)
        const BACKEND_API_URL = 'http://localhost:5000/api/create-agent'; // Make sure this matches your Flask/FastAPI endpoint

        try {
            const response = await fetch(BACKEND_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json' // Request JSON response
                },
                body: JSON.stringify({
                    name: agentName,
                    purpose: agentPurpose,
                    automation_steps: automationSteps
                })
            });

            const result = await response.json();

            if (response.ok) { // Status codes 200-299
                showStatusMessage(translations['agent_creation_success'], 'success');
                createAgentForm.reset(); // Clear form on success
                // Reset no-code builder too
                if (selectedBuildMethod === 'no-code') {
                    noCodeStepsContainer.innerHTML = ''; // Clear all steps
                    addNoCodeStep(); // Add one initial step
                }
            } else {
                showStatusMessage(result.error || translations['agent_creation_error'], 'error');
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            showStatusMessage(translations['agent_creation_error'], 'error');
        }
    });

    // Helper function to show status messages
    function showStatusMessage(message, type) {
        statusMessageDiv.textContent = message;
        statusMessageDiv.className = `status-message ${type}`; // Add type class (success/error)
        statusMessageDiv.style.display = 'block'; // Make it visible

        // Hide message after a few seconds
        setTimeout(() => {
            statusMessageDiv.style.display = 'none';
        }, 5000);
    }

    // Initial load: Add one no-code step if no-code is selected by default (though code is default in HTML)
    // If you want no-code to be default: document.getElementById('method-no-code').click();
    // For now, it will only show when switched to
});
