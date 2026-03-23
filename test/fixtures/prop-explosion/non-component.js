// Regular utility function with many params — NOT a component
function formatAddress({ street, city, state, zip, country, apt, building, floor }) {
  return `${building} ${street}, Apt ${apt}, Floor ${floor}, ${city}, ${state} ${zip}, ${country}`;
}

// Another utility (arrow function, lowercase)
const processPayment = ({ amount, currency, cardNumber, expiry, cvv, billingAddress, name, email }) => {
  return { status: 'ok' };
};

module.exports = { formatAddress, processPayment };
