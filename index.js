const express = require('express');
const fs = require('fs').promises;
const Handlebars = require('handlebars'); // Use the correct import
const path = require('path');
const puppeteer = require('puppeteer');
const app = express();
const port = 4001;

const finalHtmlPath = path.join(__dirname, 'finalTemplate.html');
const { data } = require('./mockData');

// Create a new Handlebars instance
const hbs = Handlebars.create();

// console.log('Original Data:', JSON.stringify(data, null, 2));


// function cleanData(data) {
//     const fieldsToRemove = [/* List fields to remove */];

//     function removeFields(item) {
//         if (Array.isArray(item)) {
//             return item.map(removeFields);
//         } else if (item && typeof item === 'object') {
//             return Object.entries(item).reduce((acc, [key, value]) => {
//                 if (!fieldsToRemove.includes(key)) {
//                     acc[key] = removeFields(value);
//                 }
//                 return acc;
//             }, {});
//         }
//         return item;
//     }

//     const cleaned = removeFields(data);
//     console.log('Cleaned Data:', cleaned); 
//     return cleaned;
// }

hbs.registerHelper('compare', function (variableOne, comparator, variableTwo, options) {
    let result;
    switch (comparator) {
        case '==':
            result = variableOne == variableTwo;
            break;
        case '===':
            result = variableOne === variableTwo;
            break;
        case '!=':
            result = variableOne != variableTwo;
            break;
        case '!==':
            result = variableOne !== variableTwo;
            break;
        default:
            result = false;
    }
    return result ? options.fn(this) : options.inverse(this);
});

app.use(express.static(__dirname));

app.get('/', async (req, res) => {
    try {
        const originalData = data;

        const templatePath = path.join(__dirname, 'template.html');
        const headerPath = path.join(__dirname, 'partials', 'header.html');
        const footerPath = path.join(__dirname, 'partials', 'footer.html');
        const cssPath = path.join(__dirname, 'styles.css');

        const templateHtml = await fs.readFile(templatePath, 'utf8');
        const headerHtml = await fs.readFile(headerPath, 'utf8');
        const footerHtml = await fs.readFile(footerPath, 'utf8');
        const cssContent = await fs.readFile(cssPath, 'utf8');

        // Register partials with the same Handlebars instance
        hbs.registerPartial('header', headerHtml);
        hbs.registerPartial('footer', footerHtml);

        // Compile the template with the Handlebars instance where the helper is registered
        const template = hbs.compile(templateHtml);
        const finalHtml = template({ ...originalData, cssContent });

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

app.get('/generate-pdf', async (req, res) => {
    try {
        const html = await fs.readFile(finalHtmlPath, 'utf8');

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfPath = path.join(__dirname, 'output.pdf');
        await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
        console.log(data);
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
