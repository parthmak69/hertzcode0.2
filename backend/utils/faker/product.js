const { faker } = require('@faker-js/faker')

function generateFakeProduct() {
    return {
        name: faker.commerce.productName(),
        price: parseFloat(faker.commerce.price({ min: 10, max: 1000 })),
        stock: faker.number.int({ min: 0, max: 200 })
    }
}

module.exports = {
    generateFakeProduct
}
