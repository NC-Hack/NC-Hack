(async function() {
  const removeFn = function() {
    this.parentElement.parentElement.removeChild(this.parentElement);
  };

if (document.getElementById("add-btn")) document.getElementById("add-btn").addEventListener("click", function() {
  let criteriaDiv = document.createElement("div");
  criteriaDiv.classList.add("criteria-input");
  let criteriaInput = document.createElement("input");
  criteriaInput.type = "text";
  criteriaInput.name = "criteria[criteria]";
  criteriaInput.placeholder = "Criteria";
  criteriaDiv.appendChild(criteriaInput);
  criteriaDiv.appendChild(document.createElement("br"));
  let criteriaWorth = document.createElement("input");
  criteriaWorth.type = "number";
  criteriaWorth.name = "criteria[worth]";
  criteriaWorth.placeholder = "Worth";
  criteriaWorth.min = "1";
  criteriaDiv.appendChild(criteriaWorth);
  criteriaDiv.appendChild(document.createElement("br"));
  let criteriaRm = document.createElement("button");
  criteriaRm.type = "button";
  criteriaRm.classList.add("btn", "btn-danger", "remove-btn");
  criteriaRm.innerHTML = "<i class=\"material-icons\">remove_circle_outline</i> Remove Criteria";
  criteriaDiv.appendChild(criteriaRm);
  criteriaRm.addEventListener("click", removeFn);

  document.getElementById("criteria-area").appendChild(criteriaDiv);
});

  for (let e of document.getElementsByClassName("remove-btn")) {
    e.addEventListener("click", removeFn)
  }

  for (let e of document.getElementsByClassName("judge-criteria")) {
    e.addEventListener("click", removeFn)
  }

  let checkObj = {};

  for (let e of document.getElementsByClassName("results-id")) {
    let id = e.innerHTML;
    checkObj[id] = {};
    for (let s of document.getElementsByClassName(`result-criteria-${id}`)) {
      checkObj[id][s.id] = !!s.value;
      checkValidJudging(id);
      s.addEventListener("input", function() {
        if (this.value) {
          checkObj[id][s.id] = true;
        } else checkObj[id][s.id] = true;
        checkValidJudging(id);
      });
    }
  }

  function checkValidJudging(id) {
    let btn = document.getElementById(`ui-results-btn-${id}`);
    console.log(checkObj[id])
    if (Object.values(checkObj[id]).includes(false)) {
      if (!btn.disabled) btn.disabled = true;
    } else if (!btn.classList.contains("aj")) {
      if (btn.disabled) btn.disabled = false;
    }
  }

})();
