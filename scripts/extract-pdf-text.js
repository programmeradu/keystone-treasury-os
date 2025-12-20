
const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');

async function readPdf(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        console.log(`\n\n--- CONTENT OF ${path.basename(filePath)} ---\n`);
        console.log(data.text);
        console.log(`\n--- END OF ${path.basename(filePath)} ---\n`);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
    }
}

async function main() {
    const docsDir = path.join(process.cwd(), 'docs');
    const files = [
        path.join(docsDir, 'Keystone pitch.pdf'),
        path.join(docsDir, 'Keystone Sample Plan.pdf')
    ];

    for (const file of files) {
        if (fs.existsSync(file)) {
            await readPdf(file);
        } else {
            console.error(`File not found: ${file}`);
        }
    }
}

main();
