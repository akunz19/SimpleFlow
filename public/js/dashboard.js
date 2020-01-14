// import { TableHints } from "sequelize/types";

var token = window.localStorage.getItem("Authorization");

var jwtToken = "Bearer " + token;
console.log(token); //commented out jwt logic temporarily due to login page css messed up
if (!token) {
  window.location.pathname = "/login"; //if no token redirect to login
}

$.ajax({
  url: "/api/dashboard",
  method: "POST",
  headers: { authorization: jwtToken }
}).then(function(response) {
  var task = response;
  console.log(task);
  for (var i = 0; i < task.length; i++) {
    var taskObj = {
      name: task[i].task_title,
      description: task[i].task_text,
      id: task[i].task_id
    };
    addCols(taskObj);
  }
});

$(".dragbox").sortable({
  connectWith: ".drag-column",
  items: ".dynamicCard, .to-do-cont, .in-progress, .task-completed",
  dropOnEmpty: false,
  revert: true,
  forcePlaceholderSize: true
});

function addCols(taskObj) {
  console.log(taskObj);
  console.log("adding columns");
  var myCol = $(
    `<div id="dynamicCard" class="dynamicCard" value="${taskObj.id}"></div>`
  );
  var myPanel = $(
    `<div class="ui-state-default draggable" id="Panel"><div class="block"><div class="title"><h5 class"editTextTitle"><span id='editTextTitle'>${taskObj.name}</span></h5><button type="button" class="closeCard" data-target="#Panel" data-dismiss="alert"><span class="float-right"><i id="removeTask" class="fas fa-user-minus"></i></span></button></div><p class="editTextP">${taskObj.description}</p></div></div>`
  );
  myPanel.appendTo(myCol);
  myCol.appendTo(".to-do");
  $("#editTextTitle").click(divClickedTitle);
  $(".editTextP").click(divClickedP);
  showhideImage();
}
