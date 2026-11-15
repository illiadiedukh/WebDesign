(function (window, document) {
  function initializeFootyStatsStandings() {
    var container = document.getElementById("fs-standings");
    if (!container || container.dataset.footyStatsInitialized === "true") {
      return;
    }

    container.dataset.footyStatsInitialized = "true";

    var embedName = "mw";
    var embed = window[embedName];

    if (typeof embed !== "function") {
      embed = function () {
        (embed.q = embed.q || []).push(arguments);
      };
      window[embedName] = embed;
      window.fsStandingsEmbed = embedName;
    }

    embed("params", { leagueID: 17191 });

    if (!document.getElementById(embedName)) {
      var script = document.createElement("script");
      script.id = embedName;
      script.src = "https://cdn.footystats.org/embeds/standings.js";
      script.async = true;
      (document.head || document.body).appendChild(script);
    }
  }

  window.initFootyStatsStandings = initializeFootyStatsStandings;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeFootyStatsStandings, { once: true });
  } else {
    initializeFootyStatsStandings();
  }
})(window, document);
