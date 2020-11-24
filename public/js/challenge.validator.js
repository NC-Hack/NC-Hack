(async function() {
  let edit = !!document.getElementById("edit");
let validator = {
  title: edit,
  sponsor: true,
  sponsorlink: true,
  short: edit,
  long: edit,
  start: edit,
  end: edit
};

document.getElementById("form-c-title").addEventListener("input", function() {
  if (!this.value) {
    markNegative(this, "Please enter a title");
    validator.title = false;
  } else {
    markPositive(this);
    validator.title = true;
  }
  checkValidation();
});

  document.getElementById("form-short").addEventListener("input", function() {
    if (!this.value) {
      markNegative(this, "Please enter a short description");
      validator.short = false;
    } else {
      markPositive(this);
      validator.short = true;
    }
    checkValidation();
  });

  document.getElementById("form-long").addEventListener("input", function() {
    if (!this.value) {
      markNegative(this, "Please enter a long description");
      validator.long = false;
      document.getElementById("md-preview-c-card").hidden = true;
    } else {
      document.getElementById("md-preview-c").innerHTML = (new showdown.Converter()).makeHtml(this.value);
      document.getElementById("md-preview-c-card").hidden = false;
      markPositive(this);
      validator.long = true;
    }
    checkValidation();
  });

  document.getElementById("form-sponsor").addEventListener("input", function() {
    if (this.value && !validator.sponsorlink) {
      validator.sponsorlink = true;
      markPositive(document.getElementById("form-sponsorlink"));
      checkValidation();
    }
    markPositive(this);
  });

  document.getElementById("form-sponsorlink").addEventListener("input", function() {
    if (this.value && !document.getElementById("form-sponsor").value) {
      validator.sponsorlink = false;
      markNegative(this, "This link will not be shown because no sponsor has been set");
    } else {
      validator.sponsorlink = true;
      markPositive(this);
      checkValidation();
    }
  });

  document.getElementById("form-c-start").addEventListener("input", function() {
    if (!this.value) {
      markNegative(this, "Please enter a valid date");
      validator.start = false;
    } else {
      markPositive(this);
      validator.start = true;
    }
    checkValidation();
  });

  document.getElementById("form-c-end").addEventListener("input", function() {
    if (!this.value) {
      markNegative(this, "Please enter a valid date");
      validator.end = false;
    } else {
      markPositive(this);
      validator.end = true;
    }
    checkValidation();
  });


function checkValidation() {
  if (!Object.values(validator).includes(false)) document.getElementById("ui-create-btn").removeAttribute("disabled");
  else if (!document.getElementById("ui-create-btn").disabled) document.getElementById("ui-create-btn").disabled = true;
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
