import { render, screen, fireEvent } from '@testing-library/react';
import ProductOffers from './ProductOffers';

describe('ProductOffers Component', () => {

    // 1. Test rendering with a simple array of strings
    test('renders offers from array', () => {
        const offers = ["Offer 1", "Offer 2"];
        render(<ProductOffers offers={offers} />);

        expect(screen.getByText("Available offers")).toBeInTheDocument();
        expect(screen.getByText("Offer 1")).toBeInTheDocument();
        expect(screen.getByText("Offer 2")).toBeInTheDocument();
    });

    // 2. Test rendering with a JSON string (parsing logic)
    test('renders offers from JSON string', () => {
        const offersString = JSON.stringify(["Bank Offer 5%", "Special Discount"]);
        render(<ProductOffers offers={offersString} />);

        expect(screen.getByText("Bank Offer 5%")).toBeInTheDocument();
        expect(screen.getByText("Special Discount")).toBeInTheDocument();
    });

    // 3. Test that it renders nothing if offers are empty/null
    test('renders nothing if no offers', () => {
        const { container } = render(<ProductOffers offers={[]} />);
        expect(container.firstChild).toBeNull();

        const { container: container2 } = render(<ProductOffers offers={null} />);
        expect(container2.firstChild).toBeNull();
    });

    // 4. Test View More / View Less functionality
    test('shows only 4 offers initially and expands on click', () => {
        const manyOffers = [
            "Offer 1", "Offer 2", "Offer 3", "Offer 4",
            "Offer 5", "Offer 6"
        ];

        render(<ProductOffers offers={manyOffers} />);

        // Initally should see first 4
        expect(screen.getByText("Offer 1")).toBeInTheDocument();
        expect(screen.getByText("Offer 4")).toBeInTheDocument();

        // Should NOT see Offer 5 yet
        expect(screen.queryByText("Offer 5")).not.toBeInTheDocument();

        // Check for button text
        const button = screen.getByRole('button', { name: /view 2 more offers/i });
        expect(button).toBeInTheDocument();

        // Click View More
        fireEvent.click(button);

        // Now should see Offer 5
        expect(screen.getByText("Offer 5")).toBeInTheDocument();

        // Button should change toView Less
        expect(button).toHaveTextContent("View Less");

        // Click View Less
        fireEvent.click(button);
        expect(screen.queryByText("Offer 5")).not.toBeInTheDocument();
    });
});
