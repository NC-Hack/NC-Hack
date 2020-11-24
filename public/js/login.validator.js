let validator = {
  name: false,
  password: false
};

document.getElementById("form-username").addEventListener("input", async function () {
  if (!this.value) {
    markNegative(this, "Please enter your username or email!");
    validator.name = false;
  } else {
    markPositive(this);
    validator.name = true;
  }
  checkValidation();
});

document.getElementById("form-password").addEventListener("input", function () {
  if (!this.value) {
    markNegative(this, "Please enter your password");
    validator.password = false;
  } else {
    markPositive(this);
    validator.password = true;
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
