(async function() {
let validator = {
  name: false,
  email: false,
  username: false,
  password: false,
  rePassword: false,
  terms: false
};

document.getElementById("form-name").addEventListener("input", function() {
  if (!this.value) {
    markNegative(this, "Please enter your name");
    validator.name = false;
  } else {
    markPositive(this);
    validator.name = true;
  }
  checkValidation();
});

document.getElementById("form-username").addEventListener("input", async function () {
  if (!this.value) {
    markNegative(this, "Please enter a username!");
    validator.username = false;
  } else if (!/^[a-z0-9].*/.test(this.value.toLowerCase())) {
    markNegative(this, "Usernames must start with a letter or number");
    validator.username = false;
  } else if (!/^[a-z0-9_-]+$/.test(this.value.toLowerCase())) {
    markNegative(this, "Usernames can only contain letters, numbers, hypens, and dashes");
    validator.username = false;
  } else if ((await userExists(this.value, "username"))) {
    markNegative(this, "This username has already been taken by another user!");
    validator.username = false;
  } else {
    markPositive(this);
    validator.username = true;
  }
  checkValidation();
});

document.getElementById("form-email").addEventListener("input", async function () {
  if (!this.value) {
    markNegative(this, "Please enter an email!");
    validator.email = false;
  } else if (!validateEmail(this.value)) {
    markNegative(this, "Invalid email! Make sure to specify your full email (ex. \"team@nchack.org\")");
    validator.email = false;
  } else if ((await userExists(this.value, "email"))) {
    markNegative(this, "This email is already associated with an account");
    validator.email = false;
  } else {
    markPositive(this);
    validator.email = true;
  }
  checkValidation();
});

document.getElementById("form-password").addEventListener("input", function () {
  if (!this.value) {
    markNegative(this, "Please enter a password!");
    validator.password = false;
  } else if (!validatePassword(this.value)[0]) {
    markNegative(this, `Make sure your password meets the following criteria:<br><ul style="list-style-type: disc; list-style-position: inside;"><li>${validatePassword(this.value)[1].join("</li><li>")}</li></ul>`);
    validator.password = false;
  } else {
    markPositive(this);
    validator.password = true;
  }
  checkValidation();
});

document.getElementById("form-repassword").addEventListener("input", function() {
  if (this.value !== document.getElementById("form-password").value) {
    markNegative(this, "Make sure your password matches the one you just entered!");
    validator.rePassword = false;
  } else {
    markPositive(this);
    validator.rePassword = true;
  }
  checkValidation();
});

document.getElementById("terms-check").addEventListener("change", function() {
  validator.terms = this.checked;
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

function validatePassword(password) {
  const regex = [{
    regex: /(?=[0-9])/,
    criteria: "At least one number"
  }, {
    regex: /(?=[a-z])/,
    criteria: "At least one lowercase letter"
  }, {
    regex: /(?=[A-Z])/,
    criteria: "At least one uppercase letter"
  }, {
    regex: /[\s\S]{8,}/,
    criteria: "At least 8 characters long"
  }];
  let missing = regex.filter(r => !r.regex.test(String(password))).map(r => r.criteria);
  return [(missing.length === 0), missing];
}

async function userExists(search, type) {
  return await fetch(`${window.location.protocol}//${window.location.hostname}:${window.location.port}/api/check-user-availability/${type}/${search}`).then(res => {
    return res.status !== 404;
  });
}
})();
