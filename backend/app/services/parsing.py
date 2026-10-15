"""Unit conversions used by offer quantities.

The old CSV parser was removed. These factors stay because tests and
landed-cost math still need a single definition of kg per unit.
"""

UNIT_CONVERSIONS = {
    "kg": 1.0,
    "g": 0.001,
    "lb": 0.453592,
    "lbs": 0.453592,
    "head": 0.5,
}


def convert_to_kg(quantity: float, unit: str) -> float:
    """Convert a quantity in `unit` to kilograms.

    Unknown units raise ValueError. "head" uses the historical 0.5 kg assumption.
    """
    key = (unit or "").strip().lower()
    factor = UNIT_CONVERSIONS.get(key)
    if factor is None:
        raise ValueError(f"Unknown unit: {unit}")
    return float(quantity) * factor
