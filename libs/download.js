var axios = require('axios');
var fs = require('fs');

const downloadImage = async (imageUrl, outputPath) => {
  try {
    const response = await axios.get(imageUrl, { responseType: 'stream' });
    response.data.pipe(fs.createWriteStream(outputPath));

    return new Promise((resolve, reject) => {
      response.data.on('end', () => {
        resolve();
      });

      response.data.on('error', (err) => {
        reject(err);
      });
    });
  } catch (error) {
    throw new Error(`Error downloading the image: ${error}`);
  }
};

module.exports = {
  downloadImage,
  default: {
    downloadImage
  }
};