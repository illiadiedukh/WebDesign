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
	return value.trim().length >= 2;
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
	return value.trim().length >= 10;
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
	let returnFocusTarget;

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

		if (successDialog && closeDialogButton) {
			event.preventDefault();
			returnFocusTarget = event.submitter ?? form.querySelector('[type="submit"]');
			successDialog.showModal();
			closeDialogButton.focus();
		}
	});
});
