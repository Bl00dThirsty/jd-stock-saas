"""Generic status state-machine for entity lifecycles.

See schema-enrichment-prompt.md §8e. Transitions are declared as a mapping of
``current -> {allowed next states}``; ``validate`` raises on illegal moves.
"""


class IllegalTransition(ValueError):
    """Raised when a status change violates the declared state machine."""


class StatusMachine:
    def __init__(self, transitions: dict[str, set[str]], initial: str) -> None:
        self.transitions = transitions
        self.initial = initial

    @property
    def states(self) -> set[str]:
        out = {self.initial}
        for src, dsts in self.transitions.items():
            out.add(src)
            out |= dsts
        return out

    def can(self, current: str, target: str) -> bool:
        return target in self.transitions.get(current, set())

    def validate(self, current: str, target: str) -> None:
        if current == target:
            return
        if not self.can(current, target):
            raise IllegalTransition(
                f"Illegal status transition: {current} → {target}. "
                f"Allowed: {sorted(self.transitions.get(current, set()))}"
            )


# ── Concrete lifecycles (mirrors the prompt's machines) ──────────────────

STOCK_STATUS = StatusMachine(
    {
        "LISTING": {"SUSPENDED", "DELISTED"},
        "SUSPENDED": {"LISTING", "DELISTED"},
        "DELISTED": {"LISTING"},  # reinstated
    },
    initial="LISTING",
)

ALERT_STATUS = StatusMachine(
    {
        "ACTIVE": {"TRIGGERED", "DISABLED", "EXPIRED"},
        "TRIGGERED": {"ACKNOWLEDGED", "ACTIVE", "DISABLED"},
        "ACKNOWLEDGED": {"ACTIVE", "DISABLED"},
        "DISABLED": {"ACTIVE"},
        "EXPIRED": set(),
    },
    initial="ACTIVE",
)

PORTFOLIO_STATUS = StatusMachine(
    {
        "ACTIVE": {"ARCHIVED", "CLOSED"},
        "ARCHIVED": {"ACTIVE", "CLOSED"},
        "CLOSED": set(),
    },
    initial="ACTIVE",
)
