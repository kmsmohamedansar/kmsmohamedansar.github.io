"""Made-up products for tests (the real data comes from Open Food Facts)."""
import itertools

import pandas as pd

NOUNS = {
    "Breakfast cereals": ["Honey Oat Cereal", "Corn Flakes Cereal", "Bran Cereal"],
    "Yogurts": ["Greek Yogurt", "Strawberry Yoghurt", "Vanilla Yogurt"],
    "Cheeses": ["Mature Cheddar Cheese", "Mozzarella Cheese", "Blue Cheese"],
    "Chocolates": ["Dark Chocolate", "Milk Chocolate Bar", "Mint Chocolate"],
    "Pasta": ["Penne Pasta", "Fusilli Pasta", "Wholewheat Pasta"],
    "Coffees": ["Ground Coffee", "Instant Coffee", "Espresso Coffee Beans"],
    "Teas": ["Green Tea", "Earl Grey Tea", "Chamomile Tea"],
    "Fruit juices": ["Orange Juice", "Apple Juice", "Pineapple Juice"],
    "Biscuits": ["Ginger Biscuits", "Oat Biscuits", "Shortbread Biscuits"],
    "Crisps": ["Sea Salt Crisps", "Cheese and Onion Crisps", "Paprika Crisps"],
    "Sodas": ["Lemon Soda", "Cola Soda", "Ginger Soda"],
    "Breads": ["Sourdough Bread", "Rye Bread", "Seeded Bread"],
    "Jams": ["Strawberry Jam", "Apricot Jam", "Raspberry Jam"],
    "Soups": ["Tomato Soup", "Lentil Soup", "Chicken Soup"],
    "Honeys": ["Clover Honey", "Manuka Honey", "Wildflower Honey"],
}
BRANDS = ["Northfield", "Green Lane", "Bramble & Co", "Harbour", "Kestrel", "Oakmoor", "Riverside", "Larkspur", "Millstone", "Willow", "Copperleaf", "Sundial"]


def products(per_category: int = 30) -> pd.DataFrame:
    rows, n = [], 0
    for cat, nouns in NOUNS.items():
        for brand, noun in itertools.islice(itertools.cycle(itertools.product(BRANDS, nouns)), per_category):
            n += 1
            rows.append({"code": f"T{n:05d}", "name": f"{brand} {noun}", "brand": brand, "category": cat})
    return pd.DataFrame(rows)
