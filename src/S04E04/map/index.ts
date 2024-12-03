import { pipe } from 'fp-ts/function';
import { Jimp, JimpMime } from 'jimp';
import path from 'path';
import { openAiClient } from '../../infrustructure/openai';
import { toPromise } from '../../util/functional.ts';
import { imgDescriptionMessages } from './prompt.ts';

const filePath = path.join(__dirname, 'map.jpeg');

export const buildMapTails = async () => {
  const image = await Jimp.read(filePath);
  const { width, height } = image.bitmap;

  const pieceWSize = width / 4;
  const pieceHSize = height / 4;
  const location: string[][] = [];
  for (let row = 0; row < 4; row++) {
    location.push([]);
    for (let col = 0; col < 4; col++) {
      const x = col * pieceWSize;
      const y = row * pieceHSize;
      const tail = image.clone().crop({ x, y, w: pieceWSize, h: pieceHSize });
      const imgBase64 = await tail.getBase64(JimpMime.jpeg);
      location[row].push(await getShortDescription(imgBase64));
    }
  }
  return location;
};

const getShortDescription = (imgBase64: string) =>
  pipe(
    openAiClient.completionWithText({
      model: 'gpt-4o-mini',
      messages: imgDescriptionMessages(imgBase64),
    }),
    toPromise,
  );
