const squadFilters = document.querySelector(".squad-filters");
const squadGrid = document.querySelector(".squad-grid");
const emptyRosterMessage = document.querySelector("[data-roster-empty]");

if (squadFilters && squadGrid && emptyRosterMessage) {
  const filterButtons = squadFilters.querySelectorAll("[data-filter]");
  const playerCards = squadGrid.querySelectorAll("[data-position]");

  squadFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button || !squadFilters.contains(button)) return;

    const filter = button.dataset.filter;
    let visiblePlayers = 0;

    filterButtons.forEach((filterButton) => {
      const isActive = filterButton === button;
      filterButton.setAttribute("aria-pressed", String(isActive));
      filterButton.classList.toggle("button-primary", isActive);
    });

    playerCards.forEach((playerCard) => {
      const isVisible = filter === "all" || playerCard.dataset.position === filter;
      playerCard.hidden = !isVisible;
      if (isVisible) visiblePlayers += 1;
    });

    emptyRosterMessage.hidden = visiblePlayers > 0;
  });
}
