

const express = require('express');
const fs = require('fs').promises;
const handlebars = require('handlebars');
const path = require('path');
const puppeteer = require('puppeteer');
const app = express();
const port = 4001;

const finalHtmlPath = path.join(__dirname, 'finalTemplate.html');

const { data } = require('./mockData');


function cleanData(data) {
    const fieldsToRemove = [
        'product_id'
        // 'po_product_id', 'Metal', 'stone_group', 'stone', 'shape', 'Cut',
        // 'quality', 'clarity', 'color', 'Size', 'Unit', 'setting_type', 'sessioncartid',
        // 'id', 'payment_method_id', 'customer_id', 'sales_person_id', 'location_id',
        // 'main_image', 'custom_cart_id', 'po_product_Id', 'UDID',
    ];

    function removeFields(item) {
        if (Array.isArray(item)) {
            return item.map(removeFields);
        } else if (item && typeof item === 'object') {
            return Object.entries(item).reduce((acc, [key, value]) => {
                if (!fieldsToRemove.includes(key)) {
                    acc[key] = removeFields(value);
                }
                return acc;
            }, {});
        }
        return item;
    }

    return removeFields(data);
}

app.use(express.static(__dirname));


app.get('/', async (req, res) => {
    try {

        const cleanedData = cleanData(data);
        const templatePath = path.join(__dirname, 'template.html');
        const headerPath = path.join(__dirname, 'partials', 'header.html');
        const footerPath = path.join(__dirname, 'partials', 'footer.html');
        const cssPath = path.join(__dirname, 'styles.css'); // Path to your CSS file in the root directory

        const templateHtml = await fs.readFile(templatePath, 'utf8');
        const headerHtml = await fs.readFile(headerPath, 'utf8');
        const footerHtml = await fs.readFile(footerPath, 'utf8');
        const cssContent = await fs.readFile(cssPath, 'utf8'); // Read the CSS content

        handlebars.registerPartial('header', headerHtml);
        handlebars.registerPartial('footer', footerHtml);
        const template = handlebars.compile(templateHtml);


        const finalHtml = template({ ...cleanedData });
        const htmlWithCss = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>${cssContent}</style>
            </head>
            <body>
                ${finalHtml}
            </body>
            </html>
        `;

        await fs.writeFile(finalHtmlPath, htmlWithCss, 'utf8');

        res.send(htmlWithCss);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred');
    }
});


app.get('/api/cleaned-data', async (req, res) => {
    try {
        const cleanedData = cleanData(data);
        res.json(cleanedData);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred');
    }
});

app.get('/generate-pdf', async (req, res) => {
    try {

        const html = await fs.readFile(finalHtmlPath, 'utf8');

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfPath = path.join(__dirname, 'output.pdf');
        console.log('PDF will be saved to:', pdfPath);
        await page.pdf({ path: pdfPath, format: 'A4' ,  printBackground: true   });
        await browser.close();

        res.send(`PDF generated and saved to ${pdfPath}.`);
    } catch (error) {
        console.error('Error during PDF generation:', error);
        res.status(500).send('An error occurred while generating the PDF.');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
