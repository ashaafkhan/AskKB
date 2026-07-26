import fs from 'fs';
import pdfParse from 'pdf-parse';
import { ExtractedBlock } from './types';

export async function extractPDF(filePath: string): Promise<ExtractedBlock[]> {
  const dataBuffer = fs.readFileSync(filePath);
  
  const blocks: ExtractedBlock[] = [];
  let currentPage = 1;

  const render_page = async (pageData: any) => {
    // pdf-parse provides a default render function, we override to capture per-page text
    const render_options = {
      normalizeWhitespace: false,
      disableCombineTextItems: false
    };
    const textContent = await pageData.getTextContent(render_options);
    let lastY, text = '';
    for (let item of textContent.items) {
      if (lastY == item.transform[5] || !lastY){
          text += item.str;
      } else {
          text += '\n' + item.str;
      }
      lastY = item.transform[5];
    }
    
    blocks.push({
      text,
      metadata: { page_number: currentPage }
    });
    currentPage++;
    return text;
  };

  const options = {
    pagerender: render_page
  };

  await pdfParse(dataBuffer, options);
  
  return blocks;
}
