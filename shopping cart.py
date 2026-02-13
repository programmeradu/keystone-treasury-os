# Shopping Cart Program
#
# Creativity: In addition to storing item names and prices in parallel lists,
# this program also tracks a quantity for each item and displays a
# receipt-style table with aligned columns, including per-item subtotals.


def display_menu():
    print()
    print("Please select one of the following: ")
    print("1. Add item")
    print("2. View cart")
    print("3. Remove item")
    print("4. Compute total")
    print("5. Quit")


def add_item(names, prices, quantities):
    item_name = input("What item would you like to add? ").strip()

    while True:
        price_text = input(f"What is the price of '{item_name}'? ").strip()
        try:
            item_price = float(price_text)
            if item_price < 0:
                print("Price cannot be negative. Please enter a non-negative value.")
                continue
            break
        except ValueError:
            print("Invalid price. Please enter a numeric value.")

    while True:
        quantity_text = input(f"How many '{item_name}' would you like to add? ").strip()
        try:
            quantity = int(quantity_text)
            if quantity <= 0:
                print("Quantity must be at least 1. Please try again.")
                continue
            break
        except ValueError:
            print("Invalid quantity. Please enter a whole number.")

    names.append(item_name)
    prices.append(item_price)
    quantities.append(quantity)

    print(f"'{item_name}' (x{quantity}) has been added to the cart.")


def view_cart(names, prices, quantities):
    if not names:
        print("Your shopping cart is empty.")
        return

    print("The contents of the shopping cart are:")

    header = f"{'No.':>3}  {'Item':<20}  {'Qty':>3}  {'Price':>10}  {'Subtotal':>10}"
    print(header)
    print("-" * len(header))

    for index, (name, price, qty) in enumerate(zip(names, prices, quantities), start=1):
        subtotal = price * qty
        print(
            f"{index:>3}.  "
            f"{name:<20}  "
            f"{qty:>3}  "
            f"${price:>9.2f}  "
            f"${subtotal:>9.2f}"
        )


def remove_item(names, prices, quantities):

    if not names:
        print("Your shopping cart is empty. There is nothing to remove.")
        return

    view_cart(names, prices, quantities)
    print()

    choice_text = input("Which item would you like to remove? ").strip()


    try:
        choice_number = int(choice_text)
    except ValueError:
        print("Sorry, that is not a valid item number.")
        return

    index = choice_number - 1

    if 0 <= index < len(names):
        removed_name = names.pop(index)
        prices.pop(index)
        quantities.pop(index)
        print(f"'{removed_name}' has been removed from the cart.")
    else:
        print("Sorry, that is not a valid item number.")


def compute_total(prices, quantities):

    if not prices:
        print("Your shopping cart is empty. The total is $0.00")
        return

    total = 0.0
    for price, qty in zip(prices, quantities):
        total += price * qty

    print(f"The total price of the items in the shopping cart is ${total:.2f}")


def main():

    print("Welcome to the Shopping Cart Program!")

    item_names = []
    item_prices = []
    item_quantities = []

    while True:
        display_menu()
        action = input("Please enter an action: ").strip()

        if action == "1":
            add_item(item_names, item_prices, item_quantities)
        elif action == "2":
            view_cart(item_names, item_prices, item_quantities)
        elif action == "3":
            remove_item(item_names, item_prices, item_quantities)
        elif action == "4":
            compute_total(item_prices, item_quantities)
        elif action == "5":
            print("Thank you. Goodbye.")
            break
        else:
            print("Invalid option. Please choose a number from 1 to 5.")


if __name__ == "__main__":
    main()

