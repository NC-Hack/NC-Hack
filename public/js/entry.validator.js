(async function() {
let validator = {
  repo: false,
  desc: false
};

if (document.getElementById("form-entry-link")) document.getElementById("form-entry-link").addEventListener("input", async function() {
  if (!this.value) {
    markNegative(this, "Please select a repository");
    validator.repo = false;
  } else {
    markPositive(this);
    validator.repo = true;
  }
  checkValidation();
});

  if (document.getElementById("form-entry-desc")) document.getElementById("form-entry-desc").addEventListener("input", function() {
    if (!this.value) {
      markNegative(this, "Please enter a description");
      validator.desc = false;
    } else if (this.value.length < 300) {
      markNegative(this, "Your description must be 300 characters or more in length. Make sure it describes your project well so the judges know what to look for!");
      validator.desc = false;
    } else {
      markPositive(this);
      validator.desc = true;
    }
    checkValidation();
  });

function checkValidation() {
  if (!Object.values(validator).includes(false)) document.getElementById("ui-submit-btn").removeAttribute("disabled");
  else if (!document.getElementById("ui-submit-btn").disabled) document.getElementById("ui-submit-btn").disabled = true;
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
})();
