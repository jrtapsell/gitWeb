(function () {
  const INVALID_CLASS = "is-invalid";

  var teamField;
  var repoField;
  var keyField;
  var loginForm;
  var loginButton;
  var progressBar;
  var branchPanel;
  var loginPanel;
  var cardsArea;
  var userRows;

  $(function () {
    keyField = $("#keyF");
    teamField = $("#teamF");
    repoField = $("#repoF");
    loginForm = $("#login-form");
    loginButton = $("#get");
    progressBar = $("#p1");
    cardsArea = $("#cards");
    loginPanel = $("#settings");
    branchPanel = $("#branches");
    userRows = $("#user_rows");
  });

  function markValid(field) {
    field.parent().removeClass(INVALID_CLASS);
  }


  function markInvalid(field) {
    field.parent().addClass(INVALID_CLASS);
  }

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
    this.root = $('<div/>', {'class': 'demo-card-wide mdl-card mdl-shadow--2dp branch-card', 'id': 'branch-' + title});

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

    this.setLink = function (url) {
      this.root.click(function () {
        window.open(url);
      })
    }
  }

  function showBranch(github, repo, branch) {
    function callback(error, info) {
      if (error != undefined) {
        alert("Loading error");
        console.log("Loading error", error);
        return;
      }
      console.groupCollapsed(branch.name);
      console.log("GitHub", github);
      console.log("Repo", repo);
      console.log("Branch", branch);
      console.log("Info", info);
      console.groupEnd();
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
      var card = new Card(image, name);
      card.addRow(login);
      card.addRow("<span class='left'>Ahead by: <span id=ahead class='status-number'>" + ahead + "</span></span> <span class='right'>Behind by: <span id=behind class='status-number'>" + behind + "</span></span>");
      card.addRow("Last commit:<br>" + stringifyDate(getCommitDate(last_commit)));
      card.addRow("Split date:<br>" + stringifyDate(getCommitDate(lastCommon)));
      card.addRow("Status: " + status.toUpperCase(), ["status-" + status, "status"]);
      card.setLink(info.html_url);
      cardsArea.append(card.root);
    }

    return callback;
  }

  /**
   * Gets a given commit's commit date.
   *
   * @param commit
   *  The commit to get the date of
   * @returns {Date}
   */
  function getCommitDate(commit) {
    return new Date(commit.commit.committer.date);
  }

  function contributorStats(github, repo) {
    function callback(error, stats) {
      stats.reverse();
      $.each(stats, function(_, person) {
        var row = $("<tr/>");
        var username = $("<td/>")
        row.append(username);
        console.log(person);
        username.text(person.author.login);
        var weeks = person.weeks;
        var thisWeek = weeks[weeks.length - 1];
        var totalAdd = 0;
        var totalChange = 0;
        var totalDelete = 0;
        $.each(weeks, function (_, week) {
          totalAdd += week.a;
          totalDelete += week.d;
          totalChange += week.c;
        });
        var commits = $("<td/>");
        commits.text(person.total);
        row.append(commits);
        var adds = $("<td/>");
        adds.text(totalAdd);
        row.append(adds);
        var deletes = $("<td/>");
        deletes.text(totalDelete);
        row.append(deletes);
        var lastCommit = $("<td/>");
        lastCommit.text(totalDelete);
        row.append(lastCommit);
        repo.listCommits(
          {'author':person.author.login},
          function(_, a) {
            const message = a[0].commit.committer.date;
            lastCommit.text(stringifyDate(new Date(message)));
          }
        );
        userRows.append(row);
      });
    }
    return callback;
  }

  /**
   * Called for each branch.
   *
   * @param github
   *  The github connector reference
   * @param repo
   *  The repo connector reference
   * @returns {callback}
   *  The callback to call for each branch
   */
  function listBranches(github, repo) {
    function callback(error, value) {
      if (error != null) {
        var errorMessage;
        switch (error.response.status) {
          case 404:
            errorMessage = "Bad repository details";
            markInvalid(repoField);
            markInvalid(teamField);
            break;
          case 401:
            errorMessage = "Bad authentication token";
            markInvalid(keyField);
            break;
          default:
            errorMessage = String(error);
            markInvalid(teamField);
            markInvalid(repoField);
            markInvalid(keyField);
            break;
        }
        loginButton.prop('disabled', false);
        return;
      }
      var detailsProm = repo.getContributorStats(contributorStats(github, repo));
      var all = [detailsProm];
      $.each(value, function (index, branch) {
        if (branch.name == "master") {
          return;
        }
        all.push(repo.compareBranches("master", branch.name, showBranch(github, repo, branch)));
      });
      progressBar.addClass("mdl-progress__indeterminate");
      var prom = Promise.all(all);
      prom.then(function () {
          loginPanel.hide();
          branchPanel.show();
          progressBar.removeClass("mdl-progress__indeterminate");
        },
        function (x, y, z) {
          console.log(x, y, z)
        });
    }

    return callback;
  }

  /**
   * Turns a date into a time difference from now.
   *
   * @param date
   *  The date to get the time difference since
   * @returns {string}
   *  The date as a string
   *  [0-9]+ days [0-9]+ hours [0-9]+ minutes [0-9]+ seconds
   */
  function stringifyDate(date) {
    var delta = new Date() - date;
    delta /= 1000;
    var ret = parseInt((delta % 60) + "") + " seconds";
    delta /= 60;
    ret = parseInt((delta % 60) + "") + " minutes " + ret;
    delta /= 60;
    ret = parseInt((delta % 24) + "") + " hours " + ret;
    delta /= 24;
    ret = parseInt(delta + "") + " days " + ret;
    return ret;
  }

  /** Called when the button is clicked. */
  function onLogin() {
    loginButton.prop('disabled', true);
    markValid(teamField);
    markValid(repoField);
    markValid(repoField);

    localStorage.setItem("team", teamField.val());
    localStorage.setItem("key", keyField.val());
    localStorage.setItem("repo", repoField.val());

    var gitHub = new GitHub({
      token: keyField.val()
    });

    var repo = gitHub.getRepo(teamField.val(), repoField.val());
    repo.listBranches(listBranches(gitHub, repo));
    return false;
  }

  /** Runs when the page has finished loading. */
  $(function () {
    keyField.val(localStorage.getItem("key"));
    keyField.parent().addClass('is-dirty');
    teamField.val(localStorage.getItem("team"));
    teamField.parent().addClass('is-dirty');
    repoField.val(localStorage.getItem("repo"));
    repoField.parent().addClass('is-dirty');
    loginForm.submit(onLogin)
  });
})();