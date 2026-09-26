const { faker } = require('@faker-js/faker')

function generateFakeCategory() {
    return {
        name: faker.commerce.department(),
        description: faker.commerce.productDescription(),
        image_url: faker.image.url({ width: 640, height: 480 }),
        parent_id: null
    }
}

module.exports = {
    generateFakeCategory
}
