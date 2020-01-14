var token = window.localStorage.getItem("Authorization");
var jwtToken = "Bearer " + token;
// eslint-disable-next-line no-unused-vars
function searchToggle(obj, evt) {
  var container = $(obj).closest(".search-wrapper");
  if (!container.hasClass("active")) {
    container.addClass("active");
    evt.preventDefault();
  } else if (
    container.hasClass("active") &&
    $(obj).closest(".input-holder").length == 0 &&
    $(obj).closest(".textarea").length == 0
  ) {
    container.removeClass("active");
    // clear input
    container.find(".search-input").val("");
    container.find(".searcharea").val("");
  }
}
$(".search-icon").on("click", function(e) {
  if (this.hasAttribute("id", "open")) {
    e.preventDefault();
    var task = {
      name: $(".search-input")
        .val()
        .trim(),
      description: $(".searcharea")
        .val()
        .trim(),
      status: "to-do",
      id: ""
    };
    console.log("I've been clicked");
    if (task.name.length > 0 && task.description.length > 0) {
      console.log(task);
      $.ajax({
        url: "/api/createtask",
        method: "POST",
        headers: { authorization: jwtToken },
        data: task
      }).then(function(response) {
        task.id = response.task_id;
        addCols(task);
        console.log(task.id);
      });
    } else {
      return false;
    }
  } else {
    e.preventDefault();
    $(this).attr("id", "open");
    $(".searcharea").show("slow", "swing");
    $(".textarea").show("slow", "swing");
    console.log($(this));
  }
});

$("#close-textarea").on("click", function() {
  $(".search-icon").removeAttr("id");
  $(".textarea").hide("slow", "swing");
});
function addCols(task) {
  console.log(task);
  console.log("adding columns");
  var myCol = $(
    `<div id="dynamicCard" class="dynamicCard" value="${task.id}"></div>`
  );
  var myPanel = $(
    `<div class="ui-state-default draggable" id="Panel"><div class="block"><div class="title"><span>${task.name}</span><button type="button" class="closeCard" data-target="#Panel" data-dismiss="alert"><span class="float-right"><i id="removeTask" class="fas fa-user-minus"></i></span></button></div><p>${task.description}</p></div></div>`
  );
  myPanel.appendTo(myCol);
  myCol.appendTo(".to-do");
}
$(document).on("click", ".closeCard", function(e) {
  var cardValJQuery = $(this).parents()[3];
  var cardValJS = cardValJQuery.getAttribute("value");
  var taskId = {
    value: cardValJS
  };
  e.stopPropagation();
  var $target = $(this).parents("#dynamicCard");
  $target.hide("slow", function() {
    $target.remove();
  });
});
