let validator = {
  email: false
};

document.getElementById("form-email").addEventListener("input", async function () {
  if (!this.value) {
    markNegative(this, "Please enter the email associated with your account!");
    validator.email = false;
  } else if (!validateEmail(this.value)) {
    markNegative(this, "Invalid email! Make sure to specify your full email (ex. \"team@nchack.org\")");
    validator.email = false;
  } else {
    markPositive(this);
    validator.email = true;
  }
  checkValidation();
});

function checkValidation() {
  if (!Object.values(validator).includes(false)) document.getElementById("submit-button").removeAttribute("disabled");
  else if (!document.getElementById("submit-button").disabled) document.getElementById("submit-button").disabled = true;
}

function markPositive(element) {
  element.parentElement.parentElement.classList.remove("errorBox");
  element.parentElement.parentElement.classList.add("successBox");
  document.getElementById(`${element.id}-help`).hidden = true;
}

function markNegative(element, msg) {
  element.parentElement.parentElement.classList.add("errorBox");
  element.parentElement.parentElement.classList.remove("successBox");
  let notice = document.getElementById(`${element.id}-help`);
  notice.innerHTML = msg;
  notice.hidden = false;
}

function validateEmail(email) {
  const regex = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(String(email).toLowerCase());
}
