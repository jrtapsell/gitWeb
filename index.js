/**
 * Creates a new card.
 *
 * @param image
 *  The URL of the image to use as the background
 * @param title
 *  The title of the card
 * @constructor
 */
function Card(image, title) {
  this.root = $('<div/>', {'class': 'demo-card-wide mdl-card mdl-shadow--2dp', 'id': 'branch-' + title});

  this.heading = $('<div/>', {'class': 'mdl-card__title'});
  this.heading.css('background', 'url(\'' + image + '\') center / cover');

  this.title = $('<h2/>', {'class': 'mdl-card__title-text'});
  this.title.html(title);

  this.heading.append(this.title);
  this.root.append(this.heading);

  /**
   * Adds a row to the card.
   *
   * @param html
   *  The contents of the row as html
   * @param classes
   *  The classes to add
   */
  this.addRow = function (html, classes) {
      var subtext = $('<div/>', {
        'class': 'mdl-card__actions mdl-card--border',
        'html': html
      });
      $.each(classes, function (index, value) {
        subtext.addClass(value);
      });
      this.root.append(subtext);
  };
}

var loaded;

function showBranch(github, repo, branch) {
  function callback(error, info) {
    console.log(info);
    var commits = info.commits;
    var lastCommon = info.merge_base_commit;
    var last_commit;
    if (commits.length > 0) {
      last_commit = commits[commits.length - 1];
    } else {
      last_commit = lastCommon;
    }
    var image = last_commit.author.avatar_url;
    var name = branch.name;
    var ahead = info.ahead_by;
    var behind = info.behind_by;
    var login = last_commit.author.login;
    var status = info.status;
    console.log(last_commit);
    var card = new Card(image, name);
    card.addRow(login);
    card.addRow("Ahead by: " + ahead + " Behind by: " + behind);
    card.addRow("Last commit:<br>" + getCommitDate(last_commit));
    card.addRow("Split date:<br>" + getCommitDate(lastCommon));
    card.addRow("Status: " + status.toUpperCase(), ["status-" + status, "status"]);
    $("#cards").append(card.root);
  }
  return callback;
}

function getCommitDate(cm) {
  return cm.commit.committer.date;
}

function showError(errorMessage) {
  $("#error").show();
  $("#errorWindow").text(errorMessage);
}

function listBranches(github, repo) {
  function callback(error, value) {
    if (error != null) {
      var errorMessage;
      switch (error.response.status) {
        case 404:
          errorMessage = "Bad repository details";
          break;
        case 401:
          errorMessage = "Bad authentication token";
          break;
        default:
          errorMessage = String(error);
          break;
      }
      showError(errorMessage);
      return;
    } 
    $("#error").hide();
    var all = [];
    loaded = value.length;
    $.each(value, function (index, branch) {
      if (branch.name == "master") {
        return;
      }
      all.push(repo.compareBranches("master", branch.name, showBranch(github, repo, branch)));
    });
    $("#p1").addClass("mdl-progress__indeterminate");
    var prom = Promise.all(all);
    prom.then(function () {
        $("#settings").hide();
        $("#branches").show();
        $("#p1").removeClass("mdl-progress__indeterminate");
    },
    function(x, y, z) {
      console.log(x, y, z)
    });
  }
  return callback;
}

function run() {
  var authKey = $("#keyF").val();
  var teamName = $("#teamF").val();
  var repoName = $("#repoF").val();

  localStorage.setItem("team", teamName);
  localStorage.setItem("key", authKey);
  localStorage.setItem("repo", repoName);

  var gitHub = new GitHub({
    token: authKey
  });
  var repo = gitHub.getRepo(teamName, repoName);
  repo.listBranches(listBranches(gitHub, repo));
  $('#get').prop('disabled', false);
}

$(function () {
  $("#keyF").val(localStorage.getItem("key"));
  $("#teamF").val(localStorage.getItem("team"));
  $("#repoF").val(localStorage.getItem("repo"));
});