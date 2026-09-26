const { faker } = require('@faker-js/faker')

function generateFakeMaster(dropdownSelection = 'grocery_staples') {
    const title = faker.commerce.productName()
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    
    // Generate dates
    const datePicker = faker.date.future().toISOString().split('T')[0]
    const datetimePicker = faker.date.future().toISOString().replace('T', ' ').substring(0, 19)
    const timePicker = faker.date.future().toTimeString().split(' ')[0]

    return {
        text_title: title,
        slug: slug,
        email: faker.internet.email(),
        password_hash: faker.internet.password({ length: 12 }),
        website_url: faker.internet.url(),
        phone: faker.phone.number({ style: 'international' }).substring(0, 20),
        integer_qty: faker.number.int({ min: 1, max: 1000 }),
        decimal_price: parseFloat(faker.commerce.price({ min: 1, max: 500 })),
        tax_percentage: parseFloat(faker.number.float({ min: 0, max: 28, fractionDigits: 2 })),
        range_slider_value: faker.number.int({ min: 0, max: 100 }),
        short_notes: faker.lorem.paragraph(),
        rich_wysiwyg_content: `<h3>${faker.company.catchPhrase()}</h3><p>${faker.lorem.paragraphs(2)}</p>`,
        dropdown_selection: dropdownSelection,
        radio_selection: faker.helpers.arrayElement(['credit_card', 'paypal', 'cod_allowed', 'online_only', 'credit_approved']),
        checkbox_toggle: faker.number.int({ min: 0, max: 1 }),
        switch_active: faker.number.int({ min: 0, max: 1 }),
        date_picker: datePicker,
        datetime_picker: datetimePicker,
        time_picker: timePicker,
        primary_image_url: `uploads/faker/image_${faker.number.int({ min: 1, max: 10 })}.jpg`,
        document_file_url: `uploads/faker/doc_${faker.number.int({ min: 1, max: 10 })}.pdf`,
        gallery_images: JSON.stringify([
            `uploads/faker/gallery_${faker.number.int({ min: 1, max: 10 })}.jpg`,
            `uploads/faker/gallery_${faker.number.int({ min: 1, max: 10 })}.jpg`
        ]),
        multi_select_tags: JSON.stringify(faker.lorem.words(3).split(' ')),
        json_metadata: JSON.stringify({
            meta_title: title,
            meta_description: faker.lorem.sentence(),
            is_fake: true
        }),
        repeater_data: JSON.stringify([
            { label: faker.commerce.productAdjective(), value: faker.number.int({ min: 1, max: 100 }) },
            { label: faker.commerce.productAdjective(), value: faker.number.int({ min: 1, max: 100 }) }
        ])
    }
}

module.exports = {
    generateFakeMaster
}
