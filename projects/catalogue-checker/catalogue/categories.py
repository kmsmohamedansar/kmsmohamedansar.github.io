"""The 15 grocery categories used, with their Open Food Facts tags.

Each has a plain name (what the AI checkers compare against) and the
keywords the simple keyword checker looks for in a product name.
"""

CATEGORIES = {
    "Breakfast cereals": {"tag": "en:breakfast-cereals", "words": ["cereal"]},
    "Yogurts": {"tag": "en:yogurts", "words": ["yogurt", "yoghurt"]},
    "Cheeses": {"tag": "en:cheeses", "words": ["cheese"]},
    "Chocolates": {"tag": "en:chocolates", "words": ["chocolate"]},
    "Pasta": {"tag": "en:pastas", "words": ["pasta"]},
    "Coffees": {"tag": "en:coffees", "words": ["coffee"]},
    "Teas": {"tag": "en:teas", "words": ["tea"]},
    "Fruit juices": {"tag": "en:fruit-juices", "words": ["juice"]},
    "Biscuits": {"tag": "en:biscuits", "words": ["biscuit"]},
    "Crisps": {"tag": "en:crisps", "words": ["crisp"]},
    "Sodas": {"tag": "en:sodas", "words": ["soda"]},
    "Breads": {"tag": "en:breads", "words": ["bread"]},
    "Jams": {"tag": "en:jams", "words": ["jam"]},
    "Soups": {"tag": "en:soups", "words": ["soup"]},
    "Honeys": {"tag": "en:honeys", "words": ["honey"]},
}

NAMES = list(CATEGORIES)
TAG_TO_NAME = {v["tag"]: k for k, v in CATEGORIES.items()}
