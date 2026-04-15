const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");
const formStartedAtInput = document.getElementById("formStartedAt");

if (formStartedAtInput) {
    formStartedAtInput.value = String(Date.now());
}

if (contactForm && formStatus) {
    contactForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!contactForm.checkValidity()) {
            formStatus.textContent = "Please complete all fields with valid information.";
            return;
        }

        const formData = new FormData(contactForm);
        const payload = {
            name: String(formData.get("name") || "").trim(),
            email: String(formData.get("email") || "").trim(),
            subject: String(formData.get("subject") || "").trim(),
            message: String(formData.get("message") || "").trim(),
            company: String(formData.get("company") || "").trim(),
            formStartedAt: String(formData.get("formStartedAt") || "").trim()
        };

        formStatus.textContent = "Sending your message...";

        try {
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                if (response.status === 429) {
                    formStatus.textContent = "Too many attempts. Please wait and try again.";
                    return;
                }

                formStatus.textContent = result.error || "Unable to send message right now.";
                return;
            }

            formStatus.textContent = "Thanks. Your message has been sent successfully.";
            contactForm.reset();

            if (formStartedAtInput) {
                formStartedAtInput.value = String(Date.now());
            }
        } catch (_error) {
            formStatus.textContent = "Network error. Please try again in a moment.";
        }
    });
}