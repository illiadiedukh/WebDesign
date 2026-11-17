const fieldDefinitions = [
	{
		id: "userName",
		aliases: ["username"],
		errorIds: ["nameError"],
		message: "Введіть ім’я (не менше 2 символів)"
	},
	{
		id: "userEmail",
		aliases: ["email"],
		errorIds: ["emailError"],
		message: "Введіть коректну електронну адресу"
	},
	{
		id: "userPhone",
		aliases: ["phone"],
		errorIds: ["phoneError"],
		message: "Вкажіть повний номер телефону у форматі +380XXXXXXXXX"
	},
	{
		id: "userMessage",
		aliases: ["message"],
		errorIds: ["messageError"],
		message: "Повідомлення має містити щонайменше 10 символів"
	},
	{
		id: "privacyConsent",
		aliases: ["agreement"],
		errorIds: ["privacyConsentError"],
		message: "Необхідно дати згоду"
	}
];

function isUsernameValid(value) {
	return /^[\p{L}\s'’ʼ-]{2,50}$/u.test(value.trim());
}

function isEmailValid(value) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isPhoneValid(value) {
	return /^\+380\d{9}$/.test(value.trim());
}

function phoneCaretPosition(value, digitCount) {
	let digitsSeen = 0;
	let position = value.startsWith("+") ? 1 : 0;

	while (position < value.length && digitsSeen < digitCount) {
		if (/\d/.test(value[position])) {
			digitsSeen += 1;
		}
		position += 1;
	}

	return position;
}

function normalizePhoneInput(
	control,
	selectionStart = control.selectionStart ?? control.value.length,
	selectionEnd = control.selectionEnd ?? selectionStart,
	forceSelectionUpdate = false
) {
	const value = control.value;
	const prefix = value.trimStart().startsWith("+") ? "+" : "";
	const digits = value.replace(/\D/g, "");
	const nationalNumber = !prefix && digits.startsWith("0");
	const normalized = nationalNumber
		? `+38${digits.slice(0, 10)}`
		: `${prefix}${digits.slice(0, 12)}`;
	const digitsBeforeStart = value.slice(0, selectionStart).replace(/\D/g, "").length;
	const digitsBeforeEnd = value.slice(0, selectionEnd).replace(/\D/g, "").length;
	const prefixDigits = nationalNumber ? 2 : 0;

	if (value === normalized && !forceSelectionUpdate) {
		return;
	}

	control.value = normalized;
	control.setSelectionRange(
		phoneCaretPosition(normalized, digitsBeforeStart ? digitsBeforeStart + prefixDigits : 0),
		phoneCaretPosition(normalized, digitsBeforeEnd ? digitsBeforeEnd + prefixDigits : 0)
	);
}

function isMessageValid(value) {
	const length = Array.from(value.trim()).length;
	return length >= 10 && length <= 500;
}

function isAgreementValid(control) {
	return control.checked;
}

function findControl(form, definition) {
	return [definition.id, ...definition.aliases]
		.map((id) => form.elements.namedItem(id))
		.find(Boolean);
}

function findError(form, definition) {
	return definition.errorIds
		.map((id) => form.querySelector(`[id="${id}"]`))
		.find(Boolean);
}

function validateField(control, definition, error) {
	const validators = {
		userName: () => isUsernameValid(control.value),
		userEmail: () => isEmailValid(control.value),
		userPhone: () => isPhoneValid(control.value),
		userMessage: () => isMessageValid(control.value),
		privacyConsent: () => isAgreementValid(control)
	};
	const isValid = validators[definition.id]();
	const field = control.closest(".contact-field, .form-field, .contact-consent, .form-consent");

	control.classList.toggle("border-red-500", !isValid);
	control.classList.toggle("border-green-500", isValid);
	control.setAttribute("aria-invalid", String(!isValid));
	field.classList.toggle("is-invalid", !isValid);
	field.classList.toggle("is-valid", isValid);
	error.textContent = isValid ? "" : definition.message;
	error.classList.toggle("hidden", isValid);
	error.classList.toggle("block", !isValid);

	return isValid;
}

// Attach validation to the current and legacy feedback form IDs.
document.querySelectorAll("#feedbackForm, .contact-form").forEach((form) => {
	const fields = fieldDefinitions.map((definition) => {
		const control = findControl(form, definition);
		const error = findError(form, definition);

		if (!control || !error) {
			throw new Error(`Missing control or error message for "${definition.id}"`);
		}

		return { control, definition, error };
	});
	const successDialog = document.getElementById("successDialog");
	const closeDialogButton = document.getElementById("successDialogClose");
	const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
	const submissionStatus = document.createElement("p");
	let returnFocusTarget;
	let isSubmitting = false;

	submissionStatus.className = "form-submit-error text-red-500 text-sm";
	submissionStatus.setAttribute("role", "alert");
	submissionStatus.setAttribute("aria-live", "assertive");
	submissionStatus.hidden = true;
	if (submitButton) {
		submitButton.insertAdjacentElement("afterend", submissionStatus);
	}

	if (successDialog && closeDialogButton) {
		closeDialogButton.addEventListener("click", () => {
			successDialog.close();
		});

		successDialog.addEventListener("close", () => {
			returnFocusTarget?.focus();
		});
	}

	fields.forEach(({ control, definition, error }) => {
		const validateAfterInteraction = () => {
			control.dataset.touched = "true";
			validateField(control, definition, error);
		};

		if (definition.id === "userPhone") {
			control.maxLength = 13;
			control.addEventListener("input", () => {
				normalizePhoneInput(control);
				validateAfterInteraction();
			});
			control.addEventListener("paste", (event) => {
				event.preventDefault();
				const pastedText = event.clipboardData?.getData("text") ?? "";
				const start = control.selectionStart ?? control.value.length;
				const end = control.selectionEnd ?? start;

				control.value = control.value.slice(0, start) + pastedText + control.value.slice(end);
				const caret = start + pastedText.length;
				normalizePhoneInput(control, caret, caret, true);
				validateAfterInteraction();
			});
		} else {
			control.addEventListener("input", validateAfterInteraction);
		}
		control.addEventListener("change", validateAfterInteraction);
		control.addEventListener("blur", () => {
			validateAfterInteraction();
		});
	});

	form.addEventListener("submit", (event) => {
		let firstInvalidField;

		fields.forEach(({ control, definition, error }) => {
			control.dataset.touched = "true";
			if (!validateField(control, definition, error) && !firstInvalidField) {
				firstInvalidField = control;
			}
		});

		if (firstInvalidField) {
			event.preventDefault();
			firstInvalidField.focus();
			return;
		}

		event.preventDefault();
		if (isSubmitting) {
			return;
		}

		isSubmitting = true;
		submissionStatus.hidden = true;
		submissionStatus.textContent = "";
		returnFocusTarget = event.submitter ?? submitButton;

		const originalButtonContent = submitButton?.innerHTML;
		if (submitButton) {
			submitButton.disabled = true;
			submitButton.setAttribute("aria-busy", "true");
			submitButton.textContent = "Надсилання…";
		}

		const formData = new FormData(form);
		const payload = {
			userName: formData.get("userName"),
			userEmail: formData.get("userEmail"),
			userPhone: formData.get("userPhone"),
			userMessage: formData.get("userMessage"),
			privacyConsent: formData.has("privacyConsent")
		};

		(async () => {
			try {
				let response;
				try {
					response = await fetch(form.dataset.endpoint || "send.php", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"Accept": "application/json"
						},
						body: JSON.stringify(payload)
					});
				} catch {
					submissionStatus.textContent = "Не вдалося з’єднатися із сервером. Перевірте з’єднання та спробуйте ще раз.";
					submissionStatus.hidden = false;
					return;
				}

				let result;
				try {
					result = JSON.parse(await response.text());
				} catch {
					const contentType = response.headers.get("content-type") || "";
					submissionStatus.textContent = contentType.includes("application/json")
						? "Сервер повернув некоректну відповідь. Спробуйте пізніше."
						: "Сервер не обробив send.php. Запустіть сайт через PHP-сервер, а не Live Server або відкриття HTML-файлу.";
					submissionStatus.hidden = false;
					return;
				}

				if (!response.ok || !result || typeof result !== "object" || result.success !== true) {
					submissionStatus.textContent = typeof result?.message === "string"
						? result.message
						: "Не вдалося надіслати повідомлення. Спробуйте ще раз пізніше.";
					submissionStatus.hidden = false;
					return;
				}

				form.reset();
				fields.forEach(({ control, error }) => {
					control.classList.remove("border-red-500", "border-green-500");
					control.removeAttribute("aria-invalid");
					control.removeAttribute("data-touched");
					control.closest(".contact-field, .form-field, .contact-consent, .form-consent")
						?.classList.remove("is-invalid", "is-valid");
					error.textContent = "";
					error.classList.add("hidden");
					error.classList.remove("block");
				});

				if (successDialog && closeDialogButton) {
					successDialog.showModal();
					closeDialogButton.focus();
				}
			} catch (error) {
				console.error("Contact form submission failed:", error);
				submissionStatus.textContent = "Не вдалося надіслати повідомлення. Спробуйте ще раз пізніше.";
				submissionStatus.hidden = false;
			} finally {
				isSubmitting = false;
				if (submitButton) {
					submitButton.disabled = false;
					submitButton.removeAttribute("aria-busy");
					submitButton.innerHTML = originalButtonContent;
				}
			}
		})();
	});
});
