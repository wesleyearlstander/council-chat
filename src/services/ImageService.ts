const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const generateImage = async (prompt: string, apiKey: string): Promise<string> => {
  let attempts = 0;
  
  while (attempts < MAX_RETRIES) {
    try {
      attempts++;
      console.log(`Attempting to generate image (attempt ${attempts}/${MAX_RETRIES})...`);
      
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt: `${prompt}, centered character, simple flat vector art style, clean edges, minimalist design, pure white background (#FFFFFF), full body visible from head to toe, professional illustration, high contrast between character and background, solid white background, no shadows`,
          n: 1,
          size: '1024x1024', // Larger size for better quality
          response_format: 'url',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Image generation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        if (response.status === 504) {
          if (attempts < MAX_RETRIES) {
            console.log(`Gateway timeout, retrying in ${RETRY_DELAY/1000} seconds...`);
            await sleep(RETRY_DELAY);
            continue;
          }
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (!data.data?.[0]?.url) {
        throw new Error('Invalid response format from image generation API');
      }
      
      console.log('Image generated successfully');
      return data.data[0].url;
    } catch (error) {
      console.error(`Attempt ${attempts} failed:`, error);
      
      if (attempts < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY/1000} seconds...`);
        await sleep(RETRY_DELAY);
      } else {
        console.error('All attempts failed');
        return '';
      }
    }
  }
  
  return '';
}; 