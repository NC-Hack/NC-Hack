(async function() {
let eValidBase = {
  title: true,
  desc: true,
  start: true,
  end: true
};

let eNewBase = {
  title: false,
  desc: false,
  start: false,
  end: false
};

let validator = {};

function checkValidation(id) {
  if (!Object.values(validator[id]).includes(false)) document.getElementById(`ui-form-${id}-btn`).removeAttribute("disabled");
  else if (!document.getElementById(`ui-form-${id}-btn`).disabled) document.getElementById(`ui-form-${id}-btn`).disabled = true;
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

//Editing...
  for (let t of document.getElementsByClassName("announcement-text")) {
    t.innerHTML = (new showdown.Converter()).makeHtml(t.innerHTML)
  }

  for (let e of document.getElementsByClassName("event-form")) {
    validator[e.id] = e.id === "new" ? eNewBase : eValidBase;
    e.getElementsByClassName("form-validate-title")[0].addEventListener("input", function () {
      if (!this.value) {
        markNegative(this, "Please enter a title");
        validator[e.id].title = false;
      } else {
        markPositive(this);
        validator[e.id].title = true;
      }
      checkValidation(e.id);
    });
    e.getElementsByClassName("form-validate-desc")[0].addEventListener("input", function () {
      if (!this.value) {
        markNegative(this, "Please enter a description");
        validator[e.id].desc = false;
        document.getElementById(`md-preview-card-${e.id}`).hidden = true;
      } else {
        document.getElementById(`md-preview-${e.id}`).innerHTML = (new showdown.Converter()).makeHtml(this.value);
        document.getElementById(`md-preview-card-${e.id}`).hidden = false;
        markPositive(this);
        validator[e.id].desc = true;
      }
      checkValidation(e.id);
    });
    e.getElementsByClassName("form-validate-start")[0].addEventListener("input", function() {
      if (!this.value) {
        markNegative(this, "Please enter a valid date");
        validator[e.id].start = false;
      } else {
        markPositive(this);
        validator[e.id].start = true;
      }
      checkValidation(e.id);
    });
    e.getElementsByClassName("form-validate-end")[0].addEventListener("input", function() {
      if (!this.value) {
        markNegative(this, "Please enter a valid date");
        validator[e.id].end = false;
      } else {
        markPositive(this);
        validator[e.id].end = true;
      }
      checkValidation(e.id);
    });
  }
})();
